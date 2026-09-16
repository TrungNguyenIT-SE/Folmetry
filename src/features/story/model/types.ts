import type { StoryErrorCode } from "./errors";

export type PublicStoryMediaType = "image" | "video";
export type SafeMediaReference = string & { readonly __safeMediaReference: unique symbol };

export interface PublicStoryItem {
  readonly id: string;
  readonly mediaType: PublicStoryMediaType;
  readonly previewRef: SafeMediaReference;
  readonly downloadRef: SafeMediaReference;
  readonly takenAt?: string;
  readonly durationSeconds?: number;
}

export type PublicHighlightItem = PublicStoryItem;

export interface PublicHighlightCollection {
  readonly id: string;
  readonly title: string;
  readonly itemCount?: number;
  readonly coverRef?: SafeMediaReference;
}

export interface PublicStoryLookupResult {
  readonly handle: string;
  readonly stories: readonly PublicStoryItem[];
  readonly highlights: readonly PublicHighlightCollection[];
  readonly fetchedAt: string;
  readonly requestId?: string;
}

export interface StoryLookupRequest {
  readonly handle: string;
}

export interface HighlightItemsRequest {
  readonly highlightId: string;
}

export type StoryApiSuccess<T> = { readonly ok: true; readonly data: T };
export type StoryApiFailure = {
  readonly ok: false;
  readonly error: { readonly code: StoryErrorCode; readonly requestId?: string; readonly retryAfterSeconds?: number };
};
export type StoryApiResponse<T> = StoryApiSuccess<T> | StoryApiFailure;

export interface ProviderMediaItem {
  readonly id: string;
  readonly mediaType: PublicStoryMediaType;
  readonly mediaUrl: string;
  readonly previewUrl?: string;
  readonly takenAt?: string;
  readonly durationSeconds?: number;
  readonly suggestedFilename?: string;
}

export interface ProviderHighlightCollection {
  readonly id: string;
  readonly title: string;
  readonly itemCount?: number;
  readonly coverUrl?: string;
}

export interface ProviderStoryResult {
  readonly items: readonly ProviderMediaItem[];
  readonly requestId?: string;
}

export interface ProviderHighlightResult {
  readonly collections: readonly ProviderHighlightCollection[];
  readonly requestId?: string;
}

export interface ProviderHighlightItemsResult {
  readonly items: readonly ProviderMediaItem[];
  readonly requestId?: string;
}

export interface PublicStoryProvider {
  readonly providerId: string;
  getActiveStories(handle: string, signal: AbortSignal): Promise<ProviderStoryResult>;
  getHighlights(handle: string, signal: AbortSignal): Promise<ProviderHighlightResult>;
  getHighlightItems(highlightId: string, signal: AbortSignal): Promise<ProviderHighlightItemsResult>;
}
