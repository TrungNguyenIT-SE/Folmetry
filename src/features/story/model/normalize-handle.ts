import { StoryError } from "./errors";

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9._]{0,28}[a-z0-9])?$/i;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;

function assertHandle(value: string): string {
  const normalized = value.toLowerCase();
  if (!HANDLE_PATTERN.test(normalized) || normalized.includes("..") || /\.(?:zip|json|html?|csv|txt)$/i.test(normalized)) {
    throw new StoryError("STORY_INVALID_HANDLE");
  }
  return normalized;
}

export function normalizePublicInstagramHandle(input: unknown): string {
  if (typeof input !== "string") throw new StoryError("STORY_INVALID_HANDLE");
  const value = input.trim();
  if (value.length === 0 || value.length > 200 || CONTROL_PATTERN.test(value)) {
    throw new StoryError("STORY_INVALID_HANDLE");
  }

  if (!value.includes("://")) {
    if (/\s|[,;]/.test(value) || /[/\\]/.test(value)) throw new StoryError("STORY_INVALID_HANDLE");
    return assertHandle(value.startsWith("@") ? value.slice(1) : value);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new StoryError("STORY_INVALID_HANDLE");
  }
  if (
    url.protocol !== "https:" ||
    (url.hostname !== "instagram.com" && url.hostname !== "www.instagram.com") ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new StoryError("STORY_INVALID_HANDLE");
  }
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 1) throw new StoryError("STORY_INVALID_HANDLE");
  return assertHandle(segments[0] ?? "");
}
