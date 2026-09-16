import "server-only";

import { STORY_POLICY, StoryError, type ProviderMediaItem, type PublicHighlightCollection, type PublicStoryItem, type PublicStoryLookupResult, type PublicStoryProvider, type SafeMediaReference } from "../model";
import type { StoryServerConfig } from "./env";
import { openHighlightReference, sealHighlightReference, sealMediaToken, type MediaTokenKeyring } from "./token";

function keyring(config: StoryServerConfig): MediaTokenKeyring {
  return { activeVersion: config.activeMediaKeyVersion, keys: config.mediaTokenKeys };
}

function mediaRef(item: ProviderMediaItem, config: StoryServerConfig, preview = false): SafeMediaReference {
  const usePreview = preview && item.previewUrl && item.previewUrl !== item.mediaUrl;
  return sealMediaToken({
    providerId: config.provider,
    mediaUrl: usePreview ? item.previewUrl! : item.mediaUrl,
    mediaType: usePreview ? "image" : item.mediaType,
    filename: item.suggestedFilename,
  }, keyring(config));
}

function publicItem(item: ProviderMediaItem, config: StoryServerConfig): PublicStoryItem {
  return {
    id: item.id,
    mediaType: item.mediaType,
    previewRef: mediaRef(item, config, true),
    downloadRef: mediaRef(item, config),
    ...(item.takenAt ? { takenAt: item.takenAt } : {}),
    ...(item.durationSeconds !== undefined ? { durationSeconds: item.durationSeconds } : {}),
  };
}

function safeRequestId(...values: readonly (string | undefined)[]): string | undefined {
  return values.find((value) => value && /^[a-zA-Z0-9_-]{1,80}$/.test(value));
}

export async function lookupPublicStories(
  handle: string,
  provider: PublicStoryProvider,
  config: StoryServerConfig,
  signal: AbortSignal,
): Promise<PublicStoryLookupResult> {
  const [storiesResult, highlightsResult] = await Promise.allSettled([
    provider.getActiveStories(handle, signal),
    provider.getHighlights(handle, signal),
  ]);
  if (storiesResult.status === "rejected" && highlightsResult.status === "rejected") throw storiesResult.reason;
  const stories = storiesResult.status === "fulfilled" ? storiesResult.value.items : [];
  const highlights = highlightsResult.status === "fulfilled" ? highlightsResult.value.collections : [];
  if (stories.length > STORY_POLICY.maxStoryItems || highlights.length > STORY_POLICY.maxHighlightCollections) throw new StoryError("STORY_RESPONSE_TOO_LARGE");
  const publicHighlights: PublicHighlightCollection[] = highlights.map((collection) => ({
    id: sealHighlightReference({ providerId: config.provider, handle, highlightId: collection.id }, keyring(config)),
    title: collection.title,
    ...(collection.itemCount !== undefined ? { itemCount: collection.itemCount } : {}),
    ...(collection.coverUrl ? { coverRef: sealMediaToken({ providerId: config.provider, mediaUrl: collection.coverUrl, mediaType: "image", filename: `highlight-${collection.id}` }, keyring(config)) } : {}),
  }));
  return {
    handle,
    stories: stories.map((item) => publicItem(item, config)),
    highlights: publicHighlights,
    fetchedAt: new Date().toISOString(),
    ...(safeRequestId(storiesResult.status === "fulfilled" ? storiesResult.value.requestId : undefined, highlightsResult.status === "fulfilled" ? highlightsResult.value.requestId : undefined) ?
      { requestId: safeRequestId(storiesResult.status === "fulfilled" ? storiesResult.value.requestId : undefined, highlightsResult.status === "fulfilled" ? highlightsResult.value.requestId : undefined) } : {}),
  };
}

export async function lookupHighlightItems(
  highlightId: string,
  provider: PublicStoryProvider,
  config: StoryServerConfig,
  signal: AbortSignal,
): Promise<readonly PublicStoryItem[]> {
  const reference = openHighlightReference(highlightId, keyring(config));
  if (reference.providerId !== config.provider) throw new StoryError("STORY_HIGHLIGHTS_UNAVAILABLE");
  await provider.getHighlights(reference.handle, signal);
  const result = await provider.getHighlightItems(reference.highlightId, signal);
  if (result.items.length > STORY_POLICY.maxHighlightItems) throw new StoryError("STORY_RESPONSE_TOO_LARGE");
  return result.items.map((item) => publicItem(item, config));
}
