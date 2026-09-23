import "server-only";

import { AssistantError } from "@/features/assistant/model";
import { ASSISTANT_POLICY } from "@/features/assistant/policy";

import { sseData } from "./sse";
import type { AssistantProvider, ProviderChunk, ProviderRequest } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class CloudflareAssistantProvider implements AssistantProvider {
  readonly name = "cloudflare" as const;
  readonly grounded = false;

  constructor(
    readonly model: string,
    private readonly accountId: string,
    private readonly apiToken: string,
    private readonly gatewayId: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async *stream(request: ProviderRequest): AsyncGenerator<ProviderChunk> {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/v1/chat/completions`;
    let response: Response;
    try {
      response = await this.fetcher(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "cf-aig-gateway-id": this.gatewayId,
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
    }
  }
}
