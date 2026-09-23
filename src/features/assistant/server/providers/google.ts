import "server-only";

import { AssistantError, type AssistantCitation } from "@/features/assistant/model";
import { ASSISTANT_POLICY } from "@/features/assistant/policy";

import { sseData } from "./sse";
import type { AssistantProvider, ProviderChunk, ProviderRequest } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function groundedCitations(value: unknown): readonly AssistantCitation[] {
  if (!isRecord(value)) return [];
  const chunks = value["groundingChunks"] ?? value["grounding_chunks"];
  if (!Array.isArray(chunks)) return [];
  const citations: AssistantCitation[] = [];
  for (const chunk of chunks.slice(0, 10)) {
    if (!isRecord(chunk)) continue;
    const web = isRecord(chunk["web"]) ? chunk["web"] : undefined;
    const url = web?.["uri"];
    const title = web?.["title"];
    if (typeof url !== "string" || !url.startsWith("https://")) continue;
    citations.push({
      url: url.slice(0, 2_048),
      title: typeof title === "string" ? title.slice(0, 180) : new URL(url).hostname,
    });
  }
  return citations;
}

export class GoogleAssistantProvider implements AssistantProvider {
  readonly name = "google" as const;

  constructor(
    readonly model: string,
    private readonly apiKey: string,
    readonly grounded: boolean,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async *stream(request: ProviderRequest): AsyncGenerator<ProviderChunk> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:streamGenerateContent?alt=sse`;
    let response: Response;
    try {
      response = await this.fetcher(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: request.systemPrompt }] },
          contents: request.messages.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          })),
          generation_config: {
            temperature: 0.35,
            max_output_tokens: 2_048,
          },
          ...(this.grounded && request.mode === "web"
            ? { tools: [{ google_search: {} }] }
            : {}),
        }),
        cache: "no-store",
        signal: request.signal,
      });
    } catch (error) {
      throw new AssistantError("ASSISTANT_PROVIDER_UNAVAILABLE", { cause: error });
    }

    let outputCharacters = 0;
    const seenCitations = new Set<string>();
    for await (const data of sseData(response)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data) as unknown;
      } catch {
        continue;
      }
      if (!isRecord(parsed)) continue;
      const candidates = parsed["candidates"];
      const candidate = Array.isArray(candidates) && isRecord(candidates[0])
        ? candidates[0]
        : undefined;
      const content = candidate && isRecord(candidate["content"])
        ? candidate["content"]
        : undefined;
      const parts = Array.isArray(content?.["parts"]) ? content["parts"] : [];
      for (const part of parts) {
        if (!isRecord(part) || typeof part["text"] !== "string") continue;
        outputCharacters += part["text"].length;
        if (outputCharacters > ASSISTANT_POLICY.maxOutputCharacters) return;
        yield { type: "delta", text: part["text"] };
      }
      const metadata = candidate?.["groundingMetadata"] ?? candidate?.["grounding_metadata"];
      const citations = groundedCitations(metadata).filter((citation) => {
        if (seenCitations.has(citation.url)) return false;
        seenCitations.add(citation.url);
        return true;
      });
      if (citations.length > 0) yield { type: "citations", citations };
    }
  }
}
