import "server-only";

import {
  AssistantError,
  isAssistantMode,
  isAssistantProviderPreference,
  type AssistantCitation,
  type AssistantStreamEvent,
} from "@/features/assistant/model";
import { ASSISTANT_POLICY } from "@/features/assistant/policy";
import { getRequestSession } from "@/features/auth/server/session";

import { readAssistantServerConfig } from "./config";
import { assistantSystemPrompt, boundedHistory, resolveAssistantMode } from "./prompt";
import { AssistantRepository } from "./repository";
import { providerCandidates } from "./router";
import type { AssistantProvider, ProviderChunk } from "./providers";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "text/event-stream; charset=utf-8",
  "X-Accel-Buffering": "no",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

function requestId(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 20);
}

function safeError(error: unknown): AssistantError {
  return error instanceof AssistantError
    ? error
    : new AssistantError("ASSISTANT_PROVIDER_UNAVAILABLE", { cause: error });
}

function errorResponse(error: unknown): Response {
  const safe = safeError(error);
  const headers = new Headers({
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  });
  if (safe.retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(safe.retryAfterSeconds));
  }
  return Response.json({
    code: safe.code,
    requestId: requestId(),
    ...(safe.retryAfterSeconds === undefined
      ? {}
      : { retryAfterSeconds: safe.retryAfterSeconds }),
  }, { status: safe.status, headers });
}

function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin === null) throw new AssistantError("ASSISTANT_INVALID_REQUEST");
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const expectedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? requestUrl.host;
    const expectedProtocol = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
    if (
      originUrl.host !== expectedHost ||
      originUrl.protocol !== `${expectedProtocol}:` ||
      (originUrl.protocol !== "http:" && originUrl.protocol !== "https:")
    ) throw new AssistantError("ASSISTANT_INVALID_REQUEST");
  } catch (error) {
    if (error instanceof AssistantError) throw error;
    throw new AssistantError("ASSISTANT_INVALID_REQUEST", { cause: error });
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim() !== "application/json") {
    throw new AssistantError("ASSISTANT_INVALID_REQUEST");
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > ASSISTANT_POLICY.maxRequestBodyBytes) {
    throw new AssistantError("ASSISTANT_INVALID_REQUEST");
  }
  const reader = request.body?.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let received = 0;
  let text = "";
  if (reader !== undefined) {
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        received += chunk.value.byteLength;
        if (received > ASSISTANT_POLICY.maxRequestBodyBytes) {
          await reader.cancel();
          throw new AssistantError("ASSISTANT_INVALID_REQUEST");
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    } catch (error) {
      if (error instanceof AssistantError) throw error;
      throw new AssistantError("ASSISTANT_INVALID_REQUEST", { cause: error });
    }
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new AssistantError("ASSISTANT_INVALID_REQUEST");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AssistantError) throw error;
    throw new AssistantError("ASSISTANT_INVALID_REQUEST", { cause: error });
  }
}

function isConversationId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sse(event: AssistantStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

async function authenticatedRepository(request: Request): Promise<AssistantRepository | Response> {
  const session = await getRequestSession(request);
  return session === null
    ? Response.json({ code: "UNAUTHORIZED" }, { status: 401 })
    : new AssistantRepository(session.user.id);
}

async function selectProvider(
  providers: readonly AssistantProvider[],
  requestFor: (provider: AssistantProvider) => Parameters<AssistantProvider["stream"]>[0],
): Promise<{
  readonly provider: AssistantProvider;
  readonly iterator: AsyncGenerator<ProviderChunk>;
  readonly first: IteratorResult<ProviderChunk>;
}> {
  for (const provider of providers) {
    const iterator = provider.stream(requestFor(provider));
    try {
      const first = await iterator.next();
      if (!first.done) return { provider, iterator, first };
    } catch {
      await iterator.return(undefined).catch(() => undefined);
    }
  }
  throw new AssistantError("ASSISTANT_PROVIDER_UNAVAILABLE");
}

export async function handleAssistantGet(request: Request): Promise<Response> {
  const repository = await authenticatedRepository(request);
  if (repository instanceof Response) return repository;
  try {
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource");
    if (resource === "status") {
      try {
        const config = readAssistantServerConfig();
        return Response.json({
          configured: true,
          providers: [...config.providers.keys()],
          liveWeb: config.liveWebEnabled,
        }, { headers: { "Cache-Control": "no-store" } });
      } catch {
        return Response.json({ configured: false, providers: [], liveWeb: false }, {
          headers: { "Cache-Control": "no-store" },
        });
      }
    }
    if (resource === "conversations") {
      return Response.json({ conversations: await repository.listConversations() }, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (resource === "conversation") {
      const id = url.searchParams.get("id");
      if (!isConversationId(id)) throw new AssistantError("ASSISTANT_INVALID_REQUEST");
      const conversation = await repository.getConversation(id);
      if (conversation === undefined) {
        throw new AssistantError("ASSISTANT_CONVERSATION_NOT_FOUND");
      }
      return Response.json({ conversation }, { headers: { "Cache-Control": "no-store" } });
    }
    throw new AssistantError("ASSISTANT_INVALID_REQUEST");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleAssistantDelete(request: Request): Promise<Response> {
  const repository = await authenticatedRepository(request);
  if (repository instanceof Response) return repository;
  try {
    assertSameOrigin(request);
    const body = await readBody(request);
    if (!isConversationId(body["conversationId"])) {
      throw new AssistantError("ASSISTANT_INVALID_REQUEST");
    }
    await repository.deleteConversation(body["conversationId"]);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleAssistantPost(request: Request): Promise<Response> {
  const repository = await authenticatedRepository(request);
  if (repository instanceof Response) return repository;
  try {
    assertSameOrigin(request);
    const config = readAssistantServerConfig();
    const body = await readBody(request);
    const message = typeof body["message"] === "string" ? body["message"].trim() : "";
    const mode = body["mode"];
    const providerPreference = body["provider"] ?? "auto";
    const conversationId = body["conversationId"];
    const locale = body["locale"] === "vi" ? "vi" : "en";
    const pathname = typeof body["pathname"] === "string" &&
      /^\/[a-z0-9/_-]{0,160}$/i.test(body["pathname"])
      ? body["pathname"]
      : undefined;
    if (
      message.length === 0 ||
      message.length > ASSISTANT_POLICY.maxMessageCharacters ||
      !isAssistantMode(mode) ||
      !isAssistantProviderPreference(providerPreference) ||
      (conversationId !== undefined && !isConversationId(conversationId))
    ) throw new AssistantError("ASSISTANT_INVALID_REQUEST");

    if (providerPreference !== "auto" && !config.providers.has(providerPreference)) {
      throw new AssistantError("ASSISTANT_NOT_CONFIGURED");
    }

    const detectedMode = resolveAssistantMode(mode, message);
    if (mode === "web" && !config.liveWebEnabled) {
      throw new AssistantError("ASSISTANT_NOT_CONFIGURED");
    }
    const resolvedMode = detectedMode === "web" && !config.liveWebEnabled
      ? "general"
      : detectedMode;
    const turn = await repository.beginTurn(conversationId, mode, message);
    const providers = providerCandidates(config, providerPreference, turn.conversationId);
    const timeoutSignal = AbortSignal.timeout(ASSISTANT_POLICY.providerTimeoutMs);
    const signal = AbortSignal.any([request.signal, timeoutSignal]);
    const selection = await selectProvider(providers, (provider) => ({
      messages: boundedHistory(turn.messages),
      systemPrompt: assistantSystemPrompt(
        resolvedMode,
        locale,
        pathname,
        provider.grounded,
      ),
      mode: resolvedMode,
      signal,
    }));
    const assistantMessageId = crypto.randomUUID();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const output: string[] = [];
        const citationMap = new Map<string, AssistantCitation>();
        const consume = (chunk: ProviderChunk): void => {
          if (chunk.type === "delta") {
            output.push(chunk.text);
            controller.enqueue(sse({ type: "delta", text: chunk.text }));
          } else {
            for (const citation of chunk.citations) citationMap.set(citation.url, citation);
            controller.enqueue(sse({ type: "citations", citations: [...citationMap.values()] }));
          }
        };
        try {
          controller.enqueue(sse({
            type: "meta",
            conversationId: turn.conversationId,
            messageId: assistantMessageId,
            mode: resolvedMode,
            provider: selection.provider.name,
            model: selection.provider.model,
            grounded: selection.provider.grounded,
          }));
          if (!selection.first.done) consume(selection.first.value);
          for await (const chunk of selection.iterator) consume(chunk);
          const content = output.join("").trim();
          if (content.length === 0) {
            throw new AssistantError("ASSISTANT_PROVIDER_UNAVAILABLE");
          }
          await repository.completeTurn(
            assistantMessageId,
            turn.conversationId,
            content,
            selection.provider.name,
            selection.provider.model,
            [...citationMap.values()],
          );
          controller.enqueue(sse({ type: "done" }));
        } catch (error) {
          const safe = safeError(error);
          controller.enqueue(sse({
            type: "error",
            code: safe.code,
            requestId: requestId(),
            ...(safe.retryAfterSeconds === undefined
              ? {}
              : { retryAfterSeconds: safe.retryAfterSeconds }),
          }));
        } finally {
          controller.close();
        }
      },
      cancel() {
        void selection.iterator.return(undefined).catch(() => undefined);
      },
    });
    return new Response(stream, { status: 200, headers: responseHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}
