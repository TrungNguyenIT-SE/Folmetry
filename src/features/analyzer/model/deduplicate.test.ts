import { describe, expect, it } from "vitest";

import { deduplicateRelationships } from "@/features/analyzer/model/deduplicate";
import type { RelationshipRecord } from "@/features/analyzer/model/types";

const records: readonly RelationshipRecord[] = [
  { handle: "ALPHA.TEST", normalizedHandle: "alpha.test", connectedAt: 1_700_000_200_000 },
  { handle: "alpha.test", normalizedHandle: "alpha.test", connectedAt: 1_700_000_000_000 },
  { handle: "bravo_test", normalizedHandle: "bravo_test" },
  { handle: "BRAVO_TEST", normalizedHandle: "bravo_test", connectedAt: 1_700_000_100_000 },
];

describe("deduplicateRelationships", () => {
  it("deduplicates normalized handles and chooses deterministic display/timestamps", () => {
    const result = deduplicateRelationships(records, "followers");

    expect(result.records).toEqual([
      { handle: "alpha.test", normalizedHandle: "alpha.test", connectedAt: 1_700_000_000_000 },
      { handle: "bravo_test", normalizedHandle: "bravo_test", connectedAt: 1_700_000_100_000 },
    ]);
    expect(result.duplicateCount).toBe(2);
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: "DUPLICATE_HANDLES_REMOVED", count: 2 }),
      expect.objectContaining({ code: "TIMESTAMP_CONFLICT_RESOLVED", count: 1 }),
    ]);
  });

  it("is independent of input order", () => {
    const forward = deduplicateRelationships(records, "followers");
    const reverse = deduplicateRelationships([...records].reverse(), "followers");
    expect(reverse).toEqual(forward);
  });

  it("does not emit warnings for unique records", () => {
    const result = deduplicateRelationships(records.slice(0, 1), "followers");
    expect(result.duplicateCount).toBe(0);
    expect(result.warnings).toEqual([]);
  });
});
