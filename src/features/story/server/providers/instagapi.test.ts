import { describe, expect, it, vi } from "vitest";

import { InstagapiProvider } from "./instagapi";

describe("InstagapiProvider", () => {
  it("normalizes documented Story and Highlight shapes without exposing credit data", async () => {
    const transport = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ items: [{ id: "s1", media_type: 2, thumbnail_url: "https://cdn.example/t.jpg", video_url: "https://cdn.example/v.mp4", video_duration: 4 }] }, { headers: { "x-request-id": "safe_1" } }))
      .mockResolvedValueOnce(Response.json([{ id: "highlight:1", title: "Summer", media_count: 1, cover_media: { cropped_image_version: { url: "https://cdn.example/c.jpg" } }, items: [{ id: "h1", media_type: 1, thumbnail_url: "https://cdn.example/h.jpg" }] }]));
    const provider = new InstagapiProvider("secret", "https://provider.example", transport);
    const stories = await provider.getActiveStories("name", new AbortController().signal);
    const highlights = await provider.getHighlights("name", new AbortController().signal);
    expect(stories).toEqual({ items: [expect.objectContaining({ id: "s1", mediaType: "video" })], requestId: "safe_1" });
    expect(highlights.collections[0]).toMatchObject({ id: "highlight:1", title: "Summer", itemCount: 1 });
    await expect(provider.getHighlightItems("highlight:1", new AbortController().signal)).resolves.toMatchObject({ items: [expect.objectContaining({ id: "h1" })] });
    expect(transport.mock.calls[0]?.[1]?.headers).toEqual({ Accept: "application/json", "X-Api-Key": "secret" });
  });

  it.each([[401, "STORY_PROVIDER_AUTH_FAILED"], [402, "STORY_PROVIDER_QUOTA_EXCEEDED"], [404, "STORY_ACCOUNT_NOT_FOUND"], [429, "STORY_PROVIDER_RATE_LIMITED"], [500, "STORY_PROVIDER_UNAVAILABLE"]])("maps HTTP %s", async (status, code) => {
    const provider = new InstagapiProvider("secret", "https://provider.example", async () => new Response(null, { status }));
    await expect(provider.getActiveStories("name", new AbortController().signal)).rejects.toThrow(code as string);
  });

  it("fails closed on schema drift", async () => {
    const provider = new InstagapiProvider("secret", "https://provider.example", async () => Response.json({ unexpected: [] }));
    await expect(provider.getActiveStories("name", new AbortController().signal)).rejects.toThrow("STORY_PROVIDER_SCHEMA_CHANGED");
  });
});
