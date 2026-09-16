import { describe, expect, it } from "vitest";

import { isBlockedNetworkAddress, validateMediaUrl } from "./ssrf";

describe("media SSRF policy", () => {
  it.each(["127.0.0.1", "10.1.2.3", "169.254.169.254", "192.168.1.2", "::1", "fd00::1", "2001:db8::1", "::ffff:7f00:1", "ff02::1"])("blocks %s", (address) => {
    expect(isBlockedNetworkAddress(address)).toBe(true);
  });

  it("accepts an allowed HTTPS host resolving publicly", async () => {
    await expect(validateMediaUrl("https://cdn.example/a.jpg", new Set(["cdn.example"]), async () => ["93.184.216.34"]))
      .resolves.toMatchObject({ hostname: "cdn.example" });
  });

  it.each(["http://cdn.example/a", "https://user@cdn.example/a", "https://cdn.example:444/a", "https://other.example/a", "https://127.0.0.1/a"])("rejects URL %s", async (url) => {
    await expect(validateMediaUrl(url, new Set(["cdn.example"]), async () => ["93.184.216.34"])).rejects.toThrow("STORY_MEDIA_HOST_NOT_ALLOWED");
  });

  it("blocks a permitted hostname if DNS resolves privately", async () => {
    await expect(validateMediaUrl("https://cdn.example/a", new Set(["cdn.example"]), async () => ["169.254.169.254"]))
      .rejects.toThrow("STORY_MEDIA_HOST_NOT_ALLOWED");
  });
});
