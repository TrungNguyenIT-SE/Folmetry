import "server-only";

import { STORY_POLICY, StoryError, toStoryError, type StoryApiFailure, type StoryApiSuccess } from "../model";

export const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive" } as const;

export function jsonSuccess<T>(data: T, status = 200): Response {
  return Response.json({ ok: true, data } satisfies StoryApiSuccess<T>, { status, headers: NO_STORE_HEADERS });
}

export function jsonFailure(error: unknown, requestId?: string): Response {
  const safe = toStoryError(error);
  const body: StoryApiFailure = { ok: false, error: { code: safe.code, ...(requestId ? { requestId } : {}), ...(safe.retryAfterSeconds ? { retryAfterSeconds: safe.retryAfterSeconds } : {}) } };
  const headers = new Headers(NO_STORE_HEADERS);
  if (safe.retryAfterSeconds) headers.set("Retry-After", String(safe.retryAfterSeconds));
  return Response.json(body, { status: safe.status, headers });
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) throw new StoryError("STORY_INVALID_HANDLE");
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const expectedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? requestUrl.host;
    const expectedProtocol = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
    if (originUrl.host !== expectedHost || originUrl.protocol !== `${expectedProtocol}:` || (originUrl.protocol !== "http:" && originUrl.protocol !== "https:")) {
      throw new StoryError("STORY_INVALID_HANDLE");
    }
  } catch (error) {
    if (error instanceof StoryError) throw error;
    throw new StoryError("STORY_INVALID_HANDLE", { cause: error });
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (type !== "application/json") throw new StoryError("STORY_INVALID_HANDLE");
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > STORY_POLICY.maxRequestBodyBytes) throw new StoryError("STORY_INVALID_HANDLE");
  if (!request.body) throw new StoryError("STORY_INVALID_HANDLE");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > STORY_POLICY.maxRequestBodyBytes) throw new StoryError("STORY_INVALID_HANDLE");
    chunks.push(chunk.value);
  }
  try { return JSON.parse(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8")) as unknown; }
  catch (error) { throw new StoryError("STORY_INVALID_HANDLE", { cause: error }); }
}

export function requestRateLimitKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function requestId(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 20);
}
