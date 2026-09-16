import { describe, expect, it } from "vitest";

import { StoryError } from "../model";
import { openHighlightReference, openMediaToken, sealHighlightReference, sealMediaToken } from "./token";

const key = new Uint8Array(32).fill(7);
const oldKey = new Uint8Array(32).fill(4);
const keyring = { activeVersion: "v2", keys: new Map([["v2", key], ["v1", oldKey]]) };

describe("media tokens", () => {
  it("encrypts opaque, non-deterministic, expiring payloads", () => {
    const input = { providerId: "test", mediaUrl: "https://cdn.example/media.jpg", mediaType: "image" as const, filename: "../unsafe name" };
    const first = sealMediaToken(input, keyring, 1_000);
    const second = sealMediaToken(input, keyring, 1_000);
    expect(first).not.toBe(second);
    expect(first).not.toContain("cdn.example");
    expect(openMediaToken(first, keyring, 1_001)).toMatchObject({ mediaUrl: input.mediaUrl, filename: "unsafe-name.jpg" });
  });

  it("rejects tampering, expiry, and unknown key versions", () => {
    const token = sealMediaToken({ providerId: "test", mediaUrl: "https://cdn.example/a.mp4", mediaType: "video" }, keyring, 1_000);
    const parts = token.split(".");
    const ciphertext = parts[3] ?? "";
    const tampered = [...parts.slice(0, 3), `${ciphertext[0] === "A" ? "B" : "A"}${ciphertext.slice(1)}`, parts[4]].join(".");
    expect(() => openMediaToken(tampered, keyring, 1_001)).toThrowError(StoryError);
    expect(() => openMediaToken(token, keyring, 1_000 + 300_000)).toThrowError("STORY_MEDIA_TOKEN_EXPIRED");
    expect(() => openMediaToken(token.replace(".v2.", ".v9."), keyring, 1_001)).toThrowError("STORY_MEDIA_TOKEN_INVALID");
  });

  it("keeps Highlight provider IDs and handles opaque", () => {
    const reference = sealHighlightReference({ providerId: "test", handle: "public.name", highlightId: "highlight:123" }, keyring, 1_000);
    expect(reference).not.toContain("public.name");
    expect(reference).not.toContain("highlight:123");
    expect(openHighlightReference(reference, keyring, 1_001)).toMatchObject({ handle: "public.name", highlightId: "highlight:123" });
  });
});
