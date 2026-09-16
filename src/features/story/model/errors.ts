export const STORY_ERROR_CODES = [
  "STORY_INVALID_HANDLE",
  "STORY_PRIVATE_ACCOUNT",
  "STORY_ACCOUNT_NOT_FOUND",
  "STORY_NO_ACTIVE_ITEMS",
  "STORY_HIGHLIGHTS_UNAVAILABLE",
  "STORY_PROVIDER_NOT_CONFIGURED",
  "STORY_PROVIDER_AUTH_FAILED",
  "STORY_PROVIDER_RATE_LIMITED",
  "STORY_PROVIDER_QUOTA_EXCEEDED",
  "STORY_PROVIDER_TIMEOUT",
  "STORY_PROVIDER_UNAVAILABLE",
  "STORY_PROVIDER_SCHEMA_CHANGED",
  "STORY_RESPONSE_TOO_LARGE",
  "STORY_MEDIA_TOKEN_INVALID",
  "STORY_MEDIA_TOKEN_EXPIRED",
  "STORY_MEDIA_HOST_NOT_ALLOWED",
  "STORY_MEDIA_TYPE_UNSUPPORTED",
  "STORY_MEDIA_TOO_LARGE",
  "STORY_DOWNLOAD_FAILED",
  "STORY_RATE_LIMITED",
] as const;

export type StoryErrorCode = (typeof STORY_ERROR_CODES)[number];

const STATUS_BY_CODE: Readonly<Record<StoryErrorCode, number>> = {
  STORY_INVALID_HANDLE: 400,
  STORY_PRIVATE_ACCOUNT: 404,
  STORY_ACCOUNT_NOT_FOUND: 404,
  STORY_NO_ACTIVE_ITEMS: 404,
  STORY_HIGHLIGHTS_UNAVAILABLE: 404,
  STORY_PROVIDER_NOT_CONFIGURED: 503,
  STORY_PROVIDER_AUTH_FAILED: 503,
  STORY_PROVIDER_RATE_LIMITED: 429,
  STORY_PROVIDER_QUOTA_EXCEEDED: 503,
  STORY_PROVIDER_TIMEOUT: 504,
  STORY_PROVIDER_UNAVAILABLE: 503,
  STORY_PROVIDER_SCHEMA_CHANGED: 502,
  STORY_RESPONSE_TOO_LARGE: 502,
  STORY_MEDIA_TOKEN_INVALID: 400,
  STORY_MEDIA_TOKEN_EXPIRED: 410,
  STORY_MEDIA_HOST_NOT_ALLOWED: 403,
  STORY_MEDIA_TYPE_UNSUPPORTED: 415,
  STORY_MEDIA_TOO_LARGE: 413,
  STORY_DOWNLOAD_FAILED: 502,
  STORY_RATE_LIMITED: 429,
};

export class StoryError extends Error {
  readonly code: StoryErrorCode;
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(code: StoryErrorCode, options: { cause?: unknown; retryAfterSeconds?: number } = {}) {
    super(code, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "StoryError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function toStoryError(error: unknown): StoryError {
  return error instanceof StoryError ? error : new StoryError("STORY_PROVIDER_UNAVAILABLE", { cause: error });
}
