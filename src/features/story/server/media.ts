import "server-only";

import { STORY_POLICY, StoryError, type PublicStoryMediaType } from "../model";
import type { StoryServerConfig } from "./env";
import { NO_STORE_HEADERS } from "./http";
import { validateMediaUrl, type HostResolver } from "./ssrf";
import { openMediaToken } from "./token";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

function validateContentType(value: string | null, expected: PublicStoryMediaType): string {
  const type = value?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (!(expected === "image" ? IMAGE_TYPES : VIDEO_TYPES).has(type)) throw new StoryError("STORY_MEDIA_TYPE_UNSUPPORTED");
  return type;
}

export function contentDisposition(filename: string, download: boolean): string {
  const leaf = filename.split(/[\\/]/).at(-1) ?? "";
  const safe = leaf.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^[.-]+/, "").slice(0, 100) || "instagram-media";
  return `${download ? "attachment" : "inline"}; filename="${safe}"`;
}

export async function deliverStoryMedia(
  token: string,
  download: boolean,
  config: StoryServerConfig,
  requestSignal: AbortSignal,
  dependencies: { readonly transport?: typeof fetch; readonly resolver?: HostResolver } = {},
): Promise<Response> {
  const payload = openMediaToken(token, { activeVersion: config.activeMediaKeyVersion, keys: config.mediaTokenKeys });
  const transport = dependencies.transport ?? fetch;
  const timeout = AbortSignal.timeout(STORY_POLICY.mediaTimeoutMs);
  const signal = AbortSignal.any([requestSignal, timeout]);
  let target = payload.mediaUrl;
  let response: Response | undefined;
  for (let redirect = 0; redirect <= STORY_POLICY.maxRedirects; redirect += 1) {
    const url = await validateMediaUrl(target, config.mediaHosts, dependencies.resolver);
    try {
      response = await transport(url, { method: "GET", headers: { Accept: payload.mediaType === "image" ? "image/*" : "video/*" }, redirect: "manual", cache: "no-store", signal });
    } catch (error) {
      if (signal.aborted) throw new StoryError("STORY_PROVIDER_TIMEOUT", { cause: error });
      throw new StoryError("STORY_DOWNLOAD_FAILED", { cause: error });
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirect === STORY_POLICY.maxRedirects) throw new StoryError("STORY_MEDIA_HOST_NOT_ALLOWED");
      target = new URL(location, url).toString();
      continue;
    }
    break;
  }
  if (!response?.ok || !response.body) throw new StoryError("STORY_DOWNLOAD_FAILED");
  const contentType = validateContentType(response.headers.get("content-type"), payload.mediaType);
  const limit = payload.mediaType === "image" ? STORY_POLICY.maxImageBytes : STORY_POLICY.maxVideoBytes;
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > limit) {
    await response.body.cancel();
    throw new StoryError("STORY_MEDIA_TOO_LARGE");
  }
  let received = 0;
  const limiter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (received > limit) {
        controller.error(new StoryError("STORY_MEDIA_TOO_LARGE"));
        return;
      }
      controller.enqueue(chunk);
    },
  });
  const headers = new Headers(NO_STORE_HEADERS);
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", contentDisposition(payload.filename, download));
  if (declared > 0) headers.set("Content-Length", String(declared));
  return new Response(response.body.pipeThrough(limiter), { status: 200, headers });
}
