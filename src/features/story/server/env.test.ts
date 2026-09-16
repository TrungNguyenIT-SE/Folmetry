import { describe, expect, it } from "vitest";

import { readStoryServerConfig } from "./env";

const secret = Buffer.alloc(32, 9).toString("base64url");

describe("Story server environment", () => {
  it("requires both feature and approval gates", () => {
    const base = { STORY_PROVIDER: "instagapi", STORY_PROVIDER_API_KEY: "key", STORY_MEDIA_TOKEN_SECRET: secret, STORY_MEDIA_HOSTS: "cdn.example" };
    expect(() => readStoryServerConfig(base)).toThrow("STORY_PROVIDER_NOT_CONFIGURED");
    expect(() => readStoryServerConfig({ ...base, STORY_FEATURE_ENABLED: "true" })).toThrow("STORY_PROVIDER_NOT_CONFIGURED");
  });

  it("validates a production configuration without public secret names", () => {
    const config = readStoryServerConfig({
      STORY_FEATURE_ENABLED: "true", STORY_PROVIDER_APPROVED: "true", STORY_PROVIDER: "instagapi",
      STORY_PROVIDER_API_KEY: "key", STORY_MEDIA_TOKEN_KEYS: `v2:${secret},v1:${Buffer.alloc(32, 8).toString("base64url")}`,
      STORY_MEDIA_TOKEN_ACTIVE_KEY: "v2", STORY_MEDIA_HOSTS: "cdn.example,media.example",
    });
    expect(config.activeMediaKeyVersion).toBe("v2");
    expect(config.mediaHosts).toEqual(new Set(["cdn.example", "media.example"]));
    expect(Object.keys(config).some((name) => name.startsWith("NEXT_PUBLIC_"))).toBe(false);
  });

  it.each(["short", Buffer.alloc(31).toString("base64url")])("rejects weak media key %s", (value) => {
    expect(() => readStoryServerConfig({
      STORY_FEATURE_ENABLED: "true", STORY_PROVIDER_APPROVED: "true", STORY_PROVIDER: "instagapi", STORY_PROVIDER_API_KEY: "key",
      STORY_MEDIA_TOKEN_SECRET: value, STORY_MEDIA_HOSTS: "cdn.example",
    })).toThrow("STORY_PROVIDER_NOT_CONFIGURED");
  });

  it("rejects wildcard media hosts", () => {
    expect(() => readStoryServerConfig({
      STORY_FEATURE_ENABLED: "true", STORY_PROVIDER_APPROVED: "true", STORY_PROVIDER: "instagapi", STORY_PROVIDER_API_KEY: "key",
      STORY_MEDIA_TOKEN_SECRET: secret, STORY_MEDIA_HOSTS: "*.example.com",
    })).toThrow("STORY_PROVIDER_NOT_CONFIGURED");
  });
});
