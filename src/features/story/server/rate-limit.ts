import "server-only";

import { createHash } from "node:crypto";

import { STORY_POLICY, StoryError } from "../model";

interface Bucket { count: number; resetAt: number }

export class StoryRateLimiter {
  readonly #buckets = new Map<string, Bucket>();

  constructor(private readonly now: () => number = Date.now) {}

  check(identifier: string): void {
    const time = this.now();
    const key = createHash("sha256").update(identifier).digest("base64url").slice(0, 24);
    const current = this.#buckets.get(key);
    if (!current || current.resetAt <= time) {
      this.#buckets.set(key, { count: 1, resetAt: time + STORY_POLICY.rateLimitWindowMs });
    } else if (current.count >= STORY_POLICY.rateLimitRequests) {
      throw new StoryError("STORY_RATE_LIMITED", { retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - time) / 1000)) });
    } else {
      current.count += 1;
    }
    if (this.#buckets.size > 2_000) {
      for (const [bucketKey, bucket] of this.#buckets) if (bucket.resetAt <= time) this.#buckets.delete(bucketKey);
    }
  }
}

export class StoryConcurrencyGate {
  #active = 0;

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.#active >= STORY_POLICY.maxConcurrentLookups) throw new StoryError("STORY_RATE_LIMITED", { retryAfterSeconds: 2 });
    this.#active += 1;
    try { return await operation(); } finally { this.#active -= 1; }
  }
}

export const storyRateLimiter = new StoryRateLimiter();
export const storyConcurrencyGate = new StoryConcurrencyGate();
