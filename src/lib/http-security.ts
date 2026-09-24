export const PRIVATE_NO_STORE_HEADERS = Object.freeze({
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const);

export function hasValidSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return false;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const expectedHost = request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      requestUrl.host;
    const expectedProtocol = request.headers.get("x-forwarded-proto") ??
      requestUrl.protocol.replace(":", "");
    return (originUrl.protocol === "http:" || originUrl.protocol === "https:") &&
      originUrl.host === expectedHost &&
      originUrl.protocol === `${expectedProtocol}:`;
  } catch {
    return false;
  }
}
