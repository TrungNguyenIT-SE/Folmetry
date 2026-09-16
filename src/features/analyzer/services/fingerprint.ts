import type { NormalizedSnapshotPayload } from "@/features/analyzer/model/types";

const DOMAIN_TAG = "relationship-snapshot-fingerprint:v1";
const textEncoder = new TextEncoder();

function encodeField(value: string): Uint8Array {
  const encoded = textEncoder.encode(value);
  const prefix = textEncoder.encode(`${encoded.byteLength}:`);
  const result = new Uint8Array(prefix.byteLength + encoded.byteLength);
  result.set(prefix, 0);
  result.set(encoded, prefix.byteLength);
  return result;
}

function concatenate(parts: readonly Uint8Array[]): Uint8Array {
  const byteLength = parts.reduce((total, part) => total + part.byteLength, 0);
  const result = new Uint8Array(byteLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function canonicalHandles(handles: readonly string[]): readonly string[] {
  return [...new Set(handles)].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

function encodeList(name: "followers" | "following", handles: readonly string[]): Uint8Array[] {
  const canonical = canonicalHandles(handles);
  return [
    encodeField(name),
    encodeField(String(canonical.length)),
    ...canonical.map(encodeField),
  ];
}

export function encodeCanonicalFingerprintPayload(
  payload: Pick<NormalizedSnapshotPayload, "platform" | "followers" | "following">,
): Uint8Array {
  return concatenate([
    encodeField(DOMAIN_TAG),
    encodeField(payload.platform),
    ...encodeList(
      "followers",
      payload.followers.map((record) => record.normalizedHandle),
    ),
    ...encodeList(
      "following",
      payload.following.map((record) => record.normalizedHandle),
    ),
  ]);
}

export async function computeSnapshotFingerprint(
  payload: Pick<NormalizedSnapshotPayload, "platform" | "followers" | "following">,
): Promise<string> {
  const canonical = encodeCanonicalFingerprintPayload(payload);
  const canonicalBuffer = new ArrayBuffer(canonical.byteLength);
  new Uint8Array(canonicalBuffer).set(canonical);
  try {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", canonicalBuffer);
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } finally {
    canonical.fill(0);
    new Uint8Array(canonicalBuffer).fill(0);
  }
}
