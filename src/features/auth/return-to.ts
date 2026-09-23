import type { Route } from "next";

const allowedReturnPaths = new Set(["/app", "/facebook/analyzer", "/story-downloader", "/account"]);

export function safeReturnTo(value: string | string[] | undefined): Route {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate !== undefined && allowedReturnPaths.has(candidate)
    ? (candidate as Route)
    : "/app";
}
