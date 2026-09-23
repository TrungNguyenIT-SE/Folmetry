import { IMPORT_POLICY } from "@/features/analyzer/model/policy";

const INSTAGRAM_HANDLE_PATTERN = /^[a-z0-9._]+$/;
const UNSAFE_FACEBOOK_NAME_PATTERN = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;

export type HandleNormalizationFailure = "EMPTY" | "TOO_LONG" | "INVALID_CHARACTERS";

export type HandleNormalizationResult =
  | {
      readonly ok: true;
      readonly handle: string;
      readonly normalizedHandle: string;
    }
  | {
      readonly ok: false;
      readonly reason: HandleNormalizationFailure;
    };

export function normalizeInstagramHandle(value: unknown): HandleNormalizationResult {
  if (typeof value !== "string") {
    return { ok: false, reason: "EMPTY" };
  }

  const trimmed = value.trim();
  const displayHandle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

  if (displayHandle.length === 0) {
    return { ok: false, reason: "EMPTY" };
  }

  if (displayHandle.length > IMPORT_POLICY.maxHandleLength) {
    return { ok: false, reason: "TOO_LONG" };
  }

  const normalizedHandle = displayHandle.toLowerCase();
  if (!INSTAGRAM_HANDLE_PATTERN.test(normalizedHandle)) {
    return { ok: false, reason: "INVALID_CHARACTERS" };
  }

  return {
    ok: true,
    handle: displayHandle,
    normalizedHandle,
  };
}

export function normalizeFacebookName(value: unknown): HandleNormalizationResult {
  if (typeof value !== "string") return { ok: false, reason: "EMPTY" };
  const displayHandle = repairFacebookExportText(value).normalize("NFC").replace(/\s+/gu, " ").trim();
  if (displayHandle.length === 0) return { ok: false, reason: "EMPTY" };
  if (displayHandle.length > IMPORT_POLICY.maxFacebookNameLength) {
    return { ok: false, reason: "TOO_LONG" };
  }
  if (UNSAFE_FACEBOOK_NAME_PATTERN.test(displayHandle)) {
    return { ok: false, reason: "INVALID_CHARACTERS" };
  }
  return {
    ok: true,
    handle: displayHandle,
    normalizedHandle: displayHandle.toLowerCase(),
  };
}

export function repairFacebookExportText(value: string): string {
  const codePoints = [...value].map((character) => character.codePointAt(0) ?? 0);
  if (!codePoints.some((codePoint) => codePoint > 0x7f) || codePoints.some((codePoint) => codePoint > 0xff)) {
    return value;
  }
  try {
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(codePoints));
    return repaired.includes("\uFFFD") ? value : repaired;
  } catch {
    return value;
  }
}
