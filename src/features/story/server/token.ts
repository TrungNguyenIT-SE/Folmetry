import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { STORY_POLICY, StoryError, type PublicStoryMediaType, type SafeMediaReference } from "../model";

const TOKEN_VERSION = "s1";
const AAD = Buffer.from("folmetry:story-media:s1", "utf8");
const HIGHLIGHT_TOKEN_VERSION = "h1";
const HIGHLIGHT_AAD = Buffer.from("folmetry:story-highlight:h1", "utf8");

export interface MediaTokenPayload {
  readonly providerId: string;
  readonly mediaUrl: string;
  readonly mediaType: PublicStoryMediaType;
  readonly filename: string;
  readonly expiresAt: number;
}

export interface MediaTokenKeyring {
  readonly activeVersion: string;
  readonly keys: ReadonlyMap<string, Uint8Array>;
}

interface HighlightTokenPayload {
  readonly providerId: string;
  readonly handle: string;
  readonly highlightId: string;
  readonly expiresAt: number;
}

function sealJsonToken(value: unknown, version: string, aad: Buffer, keyring: MediaTokenKeyring): string {
  const key = keyring.keys.get(keyring.activeVersion);
  if (key?.length !== 32 || !/^[a-zA-Z0-9_-]{1,16}$/.test(keyring.activeVersion)) throw new StoryError("STORY_PROVIDER_NOT_CONFIGURED");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(aad);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const token = [version, keyring.activeVersion, nonce.toString("base64url"), encrypted.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
  if (Buffer.byteLength(token) > STORY_POLICY.maxMediaTokenBytes) throw new StoryError("STORY_MEDIA_TOKEN_INVALID");
  return token;
}

function openJsonToken(token: string, version: string, aad: Buffer, keyring: MediaTokenKeyring): unknown {
  if (Buffer.byteLength(token) > STORY_POLICY.maxMediaTokenBytes) throw new StoryError("STORY_MEDIA_TOKEN_INVALID");
  const [tokenVersion, keyVersion, nonceValue, encryptedValue, tagValue, extra] = token.split(".");
  if (tokenVersion !== version || !keyVersion || !nonceValue || !encryptedValue || !tagValue || extra !== undefined) throw new StoryError("STORY_MEDIA_TOKEN_INVALID");
  const key = keyring.keys.get(keyVersion);
  if (!key) throw new StoryError("STORY_MEDIA_TOKEN_INVALID");
  try {
    const nonce = Buffer.from(nonceValue, "base64url");
    const encrypted = Buffer.from(encryptedValue, "base64url");
    const tag = Buffer.from(tagValue, "base64url");
    if (nonce.length !== 12 || tag.length !== 16 || encrypted.length > STORY_POLICY.maxMediaTokenBytes) throw new Error("invalid envelope");
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    const clear = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    if (clear.length > STORY_POLICY.maxMediaTokenBytes) throw new Error("payload too large");
    return JSON.parse(clear.toString("utf8")) as unknown;
  } catch (error) {
    throw new StoryError("STORY_MEDIA_TOKEN_INVALID", { cause: error });
  }
}

function safeFilename(value: string, mediaType: PublicStoryMediaType): string {
  const extension = mediaType === "video" ? ".mp4" : ".jpg";
  const leaf = value.split(/[\\/]/).at(-1) ?? "";
  const stem = leaf.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^[.-]+/, "").slice(0, 80) || "instagram-media";
  return stem.toLowerCase().endsWith(extension) ? stem : `${stem}${extension}`;
}

function parsePayload(value: unknown): MediaTokenPayload {
  if (typeof value !== "object" || value === null) throw new StoryError("STORY_MEDIA_TOKEN_INVALID");
  const item = value as Record<string, unknown>;
  if (
    typeof item["providerId"] !== "string" || item["providerId"].length > 40 ||
    typeof item["mediaUrl"] !== "string" || item["mediaUrl"].length > 4096 ||
    (item["mediaType"] !== "image" && item["mediaType"] !== "video") ||
    typeof item["filename"] !== "string" || item["filename"].length > 120 ||
    typeof item["expiresAt"] !== "number" || !Number.isSafeInteger(item["expiresAt"])
  ) throw new StoryError("STORY_MEDIA_TOKEN_INVALID");
  return item as unknown as MediaTokenPayload;
}

export function sealMediaToken(
  input: Omit<MediaTokenPayload, "filename" | "expiresAt"> & { readonly filename?: string },
  keyring: MediaTokenKeyring,
  now = Date.now(),
): SafeMediaReference {
  const payload: MediaTokenPayload = {
    ...input,
    filename: safeFilename(input.filename ?? "instagram-media", input.mediaType),
    expiresAt: now + STORY_POLICY.mediaTokenTtlSeconds * 1000,
  };
  return sealJsonToken(payload, TOKEN_VERSION, AAD, keyring) as SafeMediaReference;
}

export function openMediaToken(token: string, keyring: MediaTokenKeyring, now = Date.now()): MediaTokenPayload {
  const payload = parsePayload(openJsonToken(token, TOKEN_VERSION, AAD, keyring));
  if (payload.expiresAt <= now) throw new StoryError("STORY_MEDIA_TOKEN_EXPIRED");
  return payload;
}

export function sealHighlightReference(input: Omit<HighlightTokenPayload, "expiresAt">, keyring: MediaTokenKeyring, now = Date.now()): string {
  return sealJsonToken({ ...input, expiresAt: now + STORY_POLICY.mediaTokenTtlSeconds * 1000 }, HIGHLIGHT_TOKEN_VERSION, HIGHLIGHT_AAD, keyring);
}

export function openHighlightReference(token: string, keyring: MediaTokenKeyring, now = Date.now()): HighlightTokenPayload {
  const value = openJsonToken(token, HIGHLIGHT_TOKEN_VERSION, HIGHLIGHT_AAD, keyring);
  const item = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  if (typeof item["providerId"] !== "string" || typeof item["handle"] !== "string" || typeof item["highlightId"] !== "string" || typeof item["expiresAt"] !== "number") {
    throw new StoryError("STORY_MEDIA_TOKEN_INVALID");
  }
  const payload = item as unknown as HighlightTokenPayload;
  if (payload.expiresAt <= now) throw new StoryError("STORY_MEDIA_TOKEN_EXPIRED");
  return payload;
}
