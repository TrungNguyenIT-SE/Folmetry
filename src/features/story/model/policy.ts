export const STORY_POLICY = Object.freeze({
  maxRequestBodyBytes: 4 * 1024,
  maxStoryItems: 100,
  maxHighlightCollections: 100,
  maxHighlightItems: 250,
  maxProviderResponseBytes: 2 * 1024 * 1024,
  maxImageBytes: 25 * 1024 * 1024,
  maxVideoBytes: 250 * 1024 * 1024,
  providerTimeoutMs: 15_000,
  mediaTimeoutMs: 30_000,
  mediaTokenTtlSeconds: 5 * 60,
  maxMediaTokenBytes: 8 * 1024,
  maxRedirects: 3,
  maxConcurrentLookups: 8,
  rateLimitWindowMs: 60_000,
  rateLimitRequests: 10,
});

export type StoryPolicy = typeof STORY_POLICY;
