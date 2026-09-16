import { describe, expect, it } from "vitest";

import { assertNever } from "@/lib/assert-never";

describe("assertNever", () => {
  it("throws a useful error for an unexpected runtime value", () => {
    expect(() => assertNever("unexpected" as never)).toThrow(
      "Unexpected value: unexpected",
    );
  });
});
