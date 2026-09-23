import { describe, expect, it, vi } from "vitest";

import type { AssistantMessage } from "@/features/assistant/model";

import { CloudflareAssistantProvider } from "./cloudflare";
import { GroqAssistantProvider } from "./groq";

const message: AssistantMessage = {
  id: "message-1",
  role: "user",
  content: "Hello",
  createdAt: 1,
  citations: [],
};

function streamResponse(events: readonly unknown[]): Response {
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), {
    headers: { "content-type": "text/event-stream" },
  });
}

describe("assistant provider adapters", () => {
  it("normalizes Groq streaming deltas without exposing the key in the URL", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void input;
      void init;
      return streamResponse([
        { choices: [{ delta: { content: "Hello" } }] },
        { choices: [{ delta: { content: " world" } }] },
      ]);
    });
    const provider = new GroqAssistantProvider("model", "secret", fetcher as typeof fetch);
    const chunks = [];
    for await (const chunk of provider.stream({ messages: [message], systemPrompt: "system", mode: "general", signal: new AbortController().signal })) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual([
      { type: "delta", text: "Hello" },
      { type: "delta", text: " world" },
    ]);
    expect(String(fetcher.mock.calls[0]?.[0])).not.toContain("secret");
  });

  it("normalizes Cloudflare OpenAI-compatible deltas without exposing credentials", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void input;
      void init;
      return streamResponse([
        { choices: [{ delta: { content: "Cloudflare" } }] },
        { choices: [{ delta: { content: " answer" } }] },
      ]);
    });
    const provider = new CloudflareAssistantProvider(
      "@cf/zai-org/glm-4.7-flash",
      "0123456789abcdef0123456789abcdef",
      "secret-token",
      "folmetry",
      fetcher as typeof fetch,
    );
    const chunks = [];
    for await (const chunk of provider.stream({ messages: [message], systemPrompt: "system", mode: "web", signal: new AbortController().signal })) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual([
      { type: "delta", text: "Cloudflare" },
      { type: "delta", text: " answer" },
    ]);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("0123456789abcdef0123456789abcdef");
    expect(String(fetcher.mock.calls[0]?.[0])).not.toContain("secret-token");
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer secret-token",
      "cf-aig-gateway-id": "folmetry",
    });
    const body = fetcher.mock.calls[0]?.[1]?.body;
    expect(JSON.parse(String(body))).toMatchObject({
      model: "@cf/zai-org/glm-4.7-flash",
      stream: true,
    });
  });
});
