import { describe, expect, it } from "vitest";

import { STORY_POLICY } from "../model";
import { readJsonBody } from "./http";
import { StoryConcurrencyGate, StoryRateLimiter } from "./rate-limit";

function jsonRequestWithBytes(bytes: number): Request {
  const overhead = Buffer.byteLength('{"value":""}');
  const body = JSON.stringify({ value: "a".repeat(Math.max(0, bytes - overhead)) });
  expect(Buffer.byteLength(body)).toBe(bytes);
  return new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body });
}

describe("Story resource policy boundaries", () => {
  it("keeps reviewed limits centralized", () => {
    expect(STORY_POLICY).toMatchObject({
      maxRequestBodyBytes: 4096, maxStoryItems: 100, maxHighlightCollections: 100, maxHighlightItems: 250,
      maxImageBytes: 25 * 1024 * 1024, maxVideoBytes: 250 * 1024 * 1024, providerTimeoutMs: 15_000, mediaTokenTtlSeconds: 300,
    });
  });

  it("accepts a JSON body at the limit and rejects one byte over", async () => {
    await expect(readJsonBody(jsonRequestWithBytes(STORY_POLICY.maxRequestBodyBytes))).resolves.toBeTruthy();
    await expect(readJsonBody(jsonRequestWithBytes(STORY_POLICY.maxRequestBodyBytes + 1))).rejects.toThrow("STORY_INVALID_HANDLE");
  });

  it("enforces the per-instance request window", () => {
    const limiter = new StoryRateLimiter(() => 1_000);
    for (let count = 0; count < STORY_POLICY.rateLimitRequests; count += 1) limiter.check("one-client");
    expect(() => limiter.check("one-client")).toThrow("STORY_RATE_LIMITED");
  });

  it("enforces the concurrency ceiling", async () => {
    const gate = new StoryConcurrencyGate();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const active = Array.from({ length: STORY_POLICY.maxConcurrentLookups }, () => gate.run(() => pending));
    await expect(gate.run(async () => undefined)).rejects.toThrow("STORY_RATE_LIMITED");
    release();
    await Promise.all(active);
  });
});
