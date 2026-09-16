import { describe, expect, it } from "vitest";

import type { PublicStoryProvider } from "../model";
import type { StoryServerConfig } from "./env";
import { handleHighlightItems, handleStoryLookup } from "./routes";

const config: StoryServerConfig = {
  enabled: true,
  provider: "instagapi",
  apiKey: "server-secret",
  mediaTokenKeys: new Map([["v1", new Uint8Array(32).fill(3)]]),
  activeMediaKeyVersion: "v1",
  mediaHosts: new Set(["cdn.example"]),
  providerBaseUrl: "https://provider.example",
};

const provider: PublicStoryProvider = {
  providerId: "mock",
  getActiveStories: async () => ({ items: [{ id: "s1", mediaType: "image", mediaUrl: "https://cdn.example/s.jpg" }], requestId: "safe-id" }),
  getHighlights: async () => ({ collections: [{ id: "highlight:1", title: "One", itemCount: 1, coverUrl: "https://cdn.example/c.jpg" }] }),
  getHighlightItems: async () => ({ items: [{ id: "h1", mediaType: "video", mediaUrl: "https://cdn.example/h.mp4" }] }),
};

function request(body: unknown, options: { contentType?: string; origin?: string; ip?: string } = {}): Request {
  return new Request("http://localhost/api/story/lookup", {
    method: "POST",
    headers: {
      "Content-Type": options.contentType ?? "application/json",
      ...(options.origin === "missing" ? {} : { Origin: options.origin ?? "http://localhost" }),
      "X-Forwarded-For": options.ip ?? crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
}

describe("Story route handlers", () => {
  it("returns only a normalized handle and opaque same-origin media references", async () => {
    const response = await handleStoryLookup(request({ handle: "@Public.Name" }), { config, provider });
    const payload = await response.json() as { data: { handle: string; stories: Array<{ previewRef: string }> } };
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(payload.data.handle).toBe("public.name");
    expect(payload.data.stories[0]?.previewRef).not.toContain("cdn.example");
    expect(JSON.stringify(payload)).not.toContain("server-secret");
  });

  it("loads selected Highlight items without a handle in the URL", async () => {
    const lookup = await handleStoryLookup(request({ handle: "name" }), { config, provider });
    const lookupPayload = await lookup.json() as { data: { highlights: Array<{ id: string }> } };
    const highlightId = lookupPayload.data.highlights[0]?.id;
    expect(highlightId).not.toContain("highlight:1");
    const response = await handleHighlightItems(new Request("http://localhost/api/story/highlight-items", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost", "X-Forwarded-For": crypto.randomUUID() }, body: JSON.stringify({ highlightId }),
    }), { config, provider });
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain("cdn.example");
  });

  it.each([
    [request({ handle: "name" }, { origin: "https://evil.example" }), 400],
    [request({ handle: "name" }, { origin: "missing" }), 400],
    [request({ handle: "name" }, { contentType: "text/plain" }), 400],
    [request({ handle: "https://evil.example/name" }), 400],
  ])("rejects unsafe requests", async (input, status) => {
    const response = await handleStoryLookup(input, { config, provider });
    expect(response.status).toBe(status);
  });

  it("fails closed while production approval is absent", async () => {
    const response = await handleStoryLookup(request({ handle: "name" }), { provider });
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("STORY_PROVIDER_NOT_CONFIGURED");
  });
});
