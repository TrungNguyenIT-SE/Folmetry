import "server-only";

import { AssistantError, type AssistantCitation } from "@/features/assistant/model";
import { ASSISTANT_POLICY } from "@/features/assistant/policy";

import { sseData } from "./sse";
import type { AssistantProvider, ProviderChunk, ProviderRequest } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function citationsFrom(value: unknown): readonly AssistantCitation[] {
  if (!Array.isArray(value)) return [];
  const citations: AssistantCitation[] = [];
  for (const item of value.slice(0, 10)) {
    if (!isRecord(item)) continue;
    const url = item["url"];
    const title = item["title"];
    if (typeof url !== "string" || !url.startsWith("https://")) continue;
    citations.push({
      url: url.slice(0, 2_048),
      title: typeof title === "string" ? title.slice(0, 180) : new URL(url).hostname,
    });
  }
  return citations;
}

export class GroqAssistantProvider implements AssistantProvider {
  readonly name = "groq" as const;
  readonly grounded = false;

  constructor(
    readonly model: string,
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async *stream(request: ProviderRequest): AsyncGenerator<ProviderChunk> {
    let response: Response;
    try {
      response = await this.fetcher("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          stream: true,
          temperature: 0.35,
          max_completion_tokens: 2_048,
          messages: [
            { role: "system", content: request.systemPrompt },
            ...request.messages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          ],
        }),
        cache: "no-store",
        signal: request.signal,
      });
    } catch (error) {
      throw new AssistantError("ASSISTANT_PROVIDER_UNAVAILABLE", { cause: error });
    }

    let outputCharacters = 0;
    for await (const data of sseData(response)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data) as unknown;
      } catch {
        continue;
      }
      if (!isRecord(parsed)) continue;
      const choices = parsed["choices"];
      const first = Array.isArray(choices) && isRecord(choices[0]) ? choices[0] : undefined;
      const delta = first && isRecord(first["delta"]) ? first["delta"] : undefined;
      const text = delta?.["content"];
      if (typeof text === "string" && text.length > 0) {
        outputCharacters += text.length;
        if (outputCharacters > ASSISTANT_POLICY.maxOutputCharacters) return;
        yield { type: "delta", text };
      }
      const citations = citationsFrom(parsed["citations"]);
      if (citations.length > 0) yield { type: "citations", citations };
    }
  }
}
