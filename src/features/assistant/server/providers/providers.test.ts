import { describe, expect, it, vi } from "vitest";

import type { AssistantMessage } from "@/features/assistant/model";

import { GoogleAssistantProvider } from "./google";
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

  it("normalizes Gemini deltas and grounded citations", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void input;
      void init;
      return streamResponse([{
        candidates: [{
          content: { parts: [{ text: "Grounded answer" }] },
          groundingMetadata: { groundingChunks: [{ web: { uri: "https://example.com/source", title: "Source" } }] },
        }],
      }]);
    });
    const provider = new GoogleAssistantProvider("gemini-model", "secret", true, fetcher as typeof fetch);
    const chunks = [];
    for await (const chunk of provider.stream({ messages: [message], systemPrompt: "system", mode: "web", signal: new AbortController().signal })) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual([
      { type: "delta", text: "Grounded answer" },
      { type: "citations", citations: [{ url: "https://example.com/source", title: "Source" }] },
    ]);
    const body = fetcher.mock.calls[0]?.[1]?.body;
    expect(JSON.parse(String(body))).toMatchObject({ tools: [{ google_search: {} }] });
  });
});
