import "server-only";

import { STORY_POLICY, StoryError, type ProviderHighlightCollection, type ProviderHighlightItemsResult, type ProviderHighlightResult, type ProviderMediaItem, type ProviderStoryResult, type PublicStoryProvider } from "../../model";

export type StoryTransport = (input: string, init: RequestInit) => Promise<Response>;

interface CachedHighlight {
  readonly expiresAt: number;
  readonly items: readonly ProviderMediaItem[];
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function text(value: unknown, max = 256): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function normalizeMedia(value: unknown): ProviderMediaItem {
  const item = record(value);
  const id = text(item?.["id"]) ?? text(item?.["pk"]);
  const kind = item?.["media_type"];
  const mediaType = kind === 2 || kind === "video" ? "video" : kind === 1 || kind === "image" ? "image" : undefined;
  const thumbnailUrl = text(item?.["thumbnail_url"], 4096);
  const videoUrl = text(item?.["video_url"], 4096);
  const mediaUrl = mediaType === "video" ? videoUrl : thumbnailUrl;
  if (!id || !mediaType || !mediaUrl) throw new StoryError("STORY_PROVIDER_SCHEMA_CHANGED");
  return {
    id,
    mediaType,
    mediaUrl,
    ...(thumbnailUrl ? { previewUrl: thumbnailUrl } : {}),
    ...(text(item?.["taken_at"], 64) ? { takenAt: text(item?.["taken_at"], 64) } : {}),
    ...(finiteNumber(item?.["video_duration"]) !== undefined ? { durationSeconds: finiteNumber(item?.["video_duration"]) } : {}),
    suggestedFilename: `instagram-${id}`,
  };
}

function coverUrl(value: unknown): string | undefined {
  const cover = record(value);
  return text(record(cover?.["cropped_image_version"])?.["url"], 4096) ?? text(cover?.["url"], 4096);
}

function providerError(status: number): StoryError {
  if (status === 400) return new StoryError("STORY_INVALID_HANDLE");
  if (status === 401 || status === 403) return new StoryError("STORY_PROVIDER_AUTH_FAILED");
  if (status === 402) return new StoryError("STORY_PROVIDER_QUOTA_EXCEEDED");
  if (status === 404) return new StoryError("STORY_ACCOUNT_NOT_FOUND");
  if (status === 429) return new StoryError("STORY_PROVIDER_RATE_LIMITED");
  return new StoryError("STORY_PROVIDER_UNAVAILABLE");
}

async function limitedJson(response: Response): Promise<unknown> {
  if (response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    throw new StoryError("STORY_PROVIDER_SCHEMA_CHANGED");
  }
  const length = Number(response.headers.get("content-length") ?? "0");
  if (length > STORY_POLICY.maxProviderResponseBytes) throw new StoryError("STORY_RESPONSE_TOO_LARGE");
  if (!response.body) return undefined;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      received += chunk.value.byteLength;
      if (received > STORY_POLICY.maxProviderResponseBytes) throw new StoryError("STORY_RESPONSE_TOO_LARGE");
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
    return JSON.parse(body) as unknown;
  } catch (error) {
    if (error instanceof StoryError) throw error;
    throw new StoryError("STORY_PROVIDER_SCHEMA_CHANGED", { cause: error });
  }
}

function sanitizedRequestId(response: Response): string | undefined {
  const id = response.headers.get("x-request-id")?.trim();
  return id && /^[a-zA-Z0-9_-]{1,80}$/.test(id) ? id : undefined;
}

export class InstagapiProvider implements PublicStoryProvider {
  readonly providerId = "instagapi";
  readonly #highlightCache = new Map<string, CachedHighlight>();

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.instagapi.com",
    private readonly transport: StoryTransport = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async #request(path: string, signal: AbortSignal): Promise<{ data: unknown; requestId?: string }> {
    let response: Response;
    try {
      response = await this.transport(`${this.baseUrl}${path}`, {
        method: "GET",
        headers: { "Accept": "application/json", "X-Api-Key": this.apiKey },
        cache: "no-store",
        redirect: "error",
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw new StoryError("STORY_PROVIDER_TIMEOUT", { cause: error });
      throw new StoryError("STORY_PROVIDER_UNAVAILABLE", { cause: error });
    }
    if (!response.ok) throw providerError(response.status);
    return { data: await limitedJson(response), ...(sanitizedRequestId(response) ? { requestId: sanitizedRequestId(response) } : {}) };
  }

  async getActiveStories(handle: string, signal: AbortSignal): Promise<ProviderStoryResult> {
    const response = await this.#request(`/api/v1/user/stories/by/username?username=${encodeURIComponent(handle)}`, signal);
    const root = record(response.data);
    const items = root?.["items"];
    if (!Array.isArray(items)) throw new StoryError("STORY_PROVIDER_SCHEMA_CHANGED");
    if (items.length > STORY_POLICY.maxStoryItems) throw new StoryError("STORY_RESPONSE_TOO_LARGE");
    return { items: items.map(normalizeMedia), ...(response.requestId ? { requestId: response.requestId } : {}) };
  }

  async getHighlights(handle: string, signal: AbortSignal): Promise<ProviderHighlightResult> {
    const response = await this.#request(`/api/v1/user/highlights/by/username?username=${encodeURIComponent(handle)}`, signal);
    const root = record(response.data);
    const rawCollections = Array.isArray(response.data) ? response.data : Array.isArray(root?.["data"]) ? root["data"] : Array.isArray(root?.["items"]) ? root["items"] : undefined;
    if (!rawCollections) throw new StoryError("STORY_PROVIDER_SCHEMA_CHANGED");
    if (rawCollections.length > STORY_POLICY.maxHighlightCollections) throw new StoryError("STORY_RESPONSE_TOO_LARGE");
    const collections: ProviderHighlightCollection[] = rawCollections.map((value) => {
      const item = record(value);
      const id = text(item?.["id"]);
      const title = text(item?.["title"], 120);
      const rawItems = item?.["items"];
      if (!id || !title || !Array.isArray(rawItems)) throw new StoryError("STORY_PROVIDER_SCHEMA_CHANGED");
      if (rawItems.length > STORY_POLICY.maxHighlightItems) throw new StoryError("STORY_RESPONSE_TOO_LARGE");
      this.#highlightCache.set(id, { expiresAt: this.now() + STORY_POLICY.mediaTokenTtlSeconds * 1000, items: rawItems.map(normalizeMedia) });
      const count = finiteNumber(item?.["media_count"]);
      const cover = coverUrl(item?.["cover_media"]);
      return { id, title, ...(count !== undefined ? { itemCount: count } : {}), ...(cover ? { coverUrl: cover } : {}) };
    });
    return { collections, ...(response.requestId ? { requestId: response.requestId } : {}) };
  }

  async getHighlightItems(highlightId: string, signal: AbortSignal): Promise<ProviderHighlightItemsResult> {
    if (signal.aborted) throw new StoryError("STORY_PROVIDER_TIMEOUT");
    const cached = this.#highlightCache.get(highlightId);
    if (!cached || cached.expiresAt <= this.now()) {
      this.#highlightCache.delete(highlightId);
      throw new StoryError("STORY_HIGHLIGHTS_UNAVAILABLE");
    }
    return { items: cached.items };
  }
}
