import { describe, expect, it } from "vitest";

import { IMPORT_POLICY } from "@/features/analyzer/model/policy";
import { parseRelationshipTimestamp } from "@/features/analyzer/model/timestamp";

describe("parseRelationshipTimestamp", () => {
  it("converts valid export seconds to domain milliseconds", () => {
    expect(parseRelationshipTimestamp(1_700_000_000)).toBe(1_700_000_000_000);
  });

  it("accepts the inclusive policy boundaries", () => {
    expect(parseRelationshipTimestamp(IMPORT_POLICY.minRelationshipTimestampSeconds)).toBe(
      IMPORT_POLICY.minRelationshipTimestampSeconds * 1_000,
    );
    expect(parseRelationshipTimestamp(IMPORT_POLICY.maxRelationshipTimestampSeconds)).toBe(
      IMPORT_POLICY.maxRelationshipTimestampSeconds * 1_000,
    );
  });

  it.each([
    IMPORT_POLICY.minRelationshipTimestampSeconds - 1,
    IMPORT_POLICY.maxRelationshipTimestampSeconds + 1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    1_700_000_000.5,
    "1700000000",
    undefined,
  ])("rejects an invalid timestamp %j", (value) => {
    expect(parseRelationshipTimestamp(value)).toBeUndefined();
  });
});
