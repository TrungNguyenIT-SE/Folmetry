import { describe, expect, it, vi } from "vitest";

import type { StoryServerConfig } from "./env";
import { contentDisposition, deliverStoryMedia } from "./media";
import { sealMediaToken } from "./token";

const key = new Uint8Array(32).fill(2);
const config: StoryServerConfig = {
  enabled: true, provider: "instagapi", apiKey: "secret", mediaTokenKeys: new Map([["v1", key]]), activeMediaKeyVersion: "v1",
  mediaHosts: new Set(["cdn.example", "media.example"]), providerBaseUrl: "https://provider.example",
};

function token(url = "https://cdn.example/a.jpg", mediaType: "image" | "video" = "image"): string {
  return sealMediaToken({ providerId: "test", mediaUrl: url, mediaType, filename: "safe" }, { activeVersion: "v1", keys: config.mediaTokenKeys });
}

describe("Story media delivery", () => {
  it("streams supported media with safe headers", async () => {
    const response = await deliverStoryMedia(token(), true, config, new AbortController().signal, {
      resolver: async () => ["93.184.216.34"],
      transport: vi.fn<typeof fetch>().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/jpeg", "Content-Length": "3", "Set-Cookie": "no" } })),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe("attachment; filename=\"safe.jpg\"");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("revalidates redirect destinations", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: "https://169.254.169.254/metadata" } }));
    await expect(deliverStoryMedia(token(), false, config, new AbortController().signal, { resolver: async () => ["93.184.216.34"], transport }))
      .rejects.toThrow("STORY_MEDIA_HOST_NOT_ALLOWED");
  });

  it("rejects unsupported types and oversized declared bodies", async () => {
    await expect(deliverStoryMedia(token(), false, config, new AbortController().signal, {
      resolver: async () => ["93.184.216.34"], transport: async () => new Response("x", { headers: { "Content-Type": "text/html" } }),
    })).rejects.toThrow("STORY_MEDIA_TYPE_UNSUPPORTED");
    await expect(deliverStoryMedia(token(), false, config, new AbortController().signal, {
      resolver: async () => ["93.184.216.34"], transport: async () => new Response("x", { headers: { "Content-Type": "image/jpeg", "Content-Length": String(25 * 1024 * 1024 + 1) } }),
    })).rejects.toThrow("STORY_MEDIA_TOO_LARGE");
  });

  it("sanitizes Content-Disposition filenames", () => {
    expect(contentDisposition("../../bad\r\nname.jpg", true)).toBe("attachment; filename=\"bad--name.jpg\"");
  });
});
