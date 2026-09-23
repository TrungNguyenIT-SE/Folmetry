import { describe, expect, it } from "vitest";

import {
  normalizeFacebookName,
  normalizeInstagramHandle,
  repairFacebookExportText,
} from "@/features/analyzer/model/normalize-handle";
import { IMPORT_POLICY } from "@/features/analyzer/model/policy";

describe("normalizeInstagramHandle", () => {
  it.each([
    [" alpha.test ", "alpha.test", "alpha.test"],
    ["\talpha.test\r\n", "alpha.test", "alpha.test"],
    ["\u2003Alpha.Test\u00a0", "Alpha.Test", "alpha.test"],
    ["@Example_User", "Example_User", "example_user"],
  ])("normalizes %j", (input, handle, normalizedHandle) => {
    expect(normalizeInstagramHandle(input)).toEqual({ ok: true, handle, normalizedHandle });
  });

  it("removes exactly one leading @", () => {
    expect(normalizeInstagramHandle("@@alpha.test")).toEqual({
      ok: false,
      reason: "INVALID_CHARACTERS",
    });
  });

  it.each(["", "  ", "@", "\u2003@\u00a0", undefined, null])(
    "rejects empty input %j",
    (input) => {
      expect(normalizeInstagramHandle(input)).toEqual({ ok: false, reason: "EMPTY" });
    },
  );

  it("accepts the exact length boundary and rejects one character above it", () => {
    expect(normalizeInstagramHandle("a".repeat(IMPORT_POLICY.maxHandleLength)).ok).toBe(true);
    expect(normalizeInstagramHandle("a".repeat(IMPORT_POLICY.maxHandleLength + 1))).toEqual({
      ok: false,
      reason: "TOO_LONG",
    });
  });

  it.each(["<script>", "alpha/test", "alpha test", "alpha@example"])(
    "treats script-like or non-handle input as invalid text: %s",
    (input) => {
      expect(normalizeInstagramHandle(input)).toEqual({
        ok: false,
        reason: "INVALID_CHARACTERS",
      });
    },
  );
});

describe("normalizeFacebookName", () => {
  it("repairs reversible UTF-8-as-Latin-1 export text without corrupting valid Unicode", () => {
    const mojibake = String.fromCodePoint(...new TextEncoder().encode("Nguyễn Ánh"));
    expect(repairFacebookExportText(mojibake)).toBe("Nguyễn Ánh");
    expect(repairFacebookExportText("José")).toBe("José");
    expect(repairFacebookExportText("Bình Trần")).toBe("Bình Trần");
  });
  it("normalizes Unicode names and repeated whitespace deterministically", () => {
    expect(normalizeFacebookName("  Alice   Nguyễn ")).toEqual({
      ok: true,
      handle: "Alice Nguyễn",
      normalizedHandle: "alice nguyễn",
    });
  });

  it("rejects control, bidi override and overlong values", () => {
    expect(normalizeFacebookName("Alice\u0000Bob")).toMatchObject({ ok: false });
    expect(normalizeFacebookName("Alice\u202eBob")).toMatchObject({ ok: false });
    expect(normalizeFacebookName("x".repeat(151))).toMatchObject({ ok: false, reason: "TOO_LONG" });
  });
});
