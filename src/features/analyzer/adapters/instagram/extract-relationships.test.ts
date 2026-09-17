import { describe, expect, it } from "vitest";

import { extractInstagramRelationships } from "@/features/analyzer/adapters/instagram/extract-relationships";
import { ImportDomainError } from "@/features/analyzer/model/errors";
import { readJsonFixture } from "../../../../../tests/helpers/read-json-fixture";

function importErrorCode(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    return error instanceof ImportDomainError ? error.code : undefined;
  }
}

describe("extractInstagramRelationships", () => {
  it("extracts the common follower array and ignores source href", async () => {
    const content = await readJsonFixture("instagram", "fixture-a", "followers_1.json");
    const result = extractInstagramRelationships(content, "followers");
    expect(result.records).toHaveLength(3);
    expect(result.records[0]).toEqual({
      handle: "alpha.test",
      normalizedHandle: "alpha.test",
      connectedAt: 1_700_000_000_000,
    });
    expect(JSON.stringify(result.records)).not.toContain("example.invalid");
  });

  it("extracts the following wrapper", async () => {
    const content = await readJsonFixture("instagram", "fixture-a", "following.json");
    const result = extractInstagramRelationships(content, "following");
    expect(result.records.map((record) => record.normalizedHandle)).toEqual([
      "alpha.test",
      "delta_test",
    ]);
  });

  it("extracts the current following schema when the username is stored in title", () => {
    const result = extractInstagramRelationships(
      {
        relationships_following: [
          {
            title: "current.schema",
            string_list_data: [
              { href: "https://www.instagram.com/_u/current.schema", timestamp: 1_700_000_400 },
            ],
          },
        ],
      },
      "following",
    );

    expect(result.records).toEqual([
      {
        handle: "current.schema",
        normalizedHandle: "current.schema",
        connectedAt: 1_700_000_400_000,
      },
    ]);
  });

  it("uses only a valid Instagram profile URL as the final username fallback", () => {
    const valid = extractInstagramRelationships(
      [{ string_list_data: [{ href: "https://www.instagram.com/_u/url_fallback/" }] }],
      "followers",
    );
    expect(valid.records[0]).toMatchObject({
      handle: "url_fallback",
      normalizedHandle: "url_fallback",
    });

    expect(
      importErrorCode(() =>
        extractInstagramRelationships(
          [{ string_list_data: [{ href: "https://example.com/not_instagram" }] }],
          "followers",
        ),
      ),
    ).toBe("NO_VALID_RELATIONSHIPS");
  });

  it("keeps valid entries while aggregating safe malformed/missing timestamp warnings", async () => {
    const content = await readJsonFixture("instagram", "mixed", "followers_1.json");
    const result = extractInstagramRelationships(content, "followers");
    expect(result.records.map((record) => record.normalizedHandle)).toEqual([
      "valid.one",
      "valid_two",
    ]);
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: "INVALID_ENTRY_SKIPPED", count: 4 }),
      expect.objectContaining({ code: "MISSING_OPTIONAL_TIMESTAMP", count: 1 }),
    ]);
    expect(JSON.stringify(result.warnings)).not.toContain("valid.one");
  });

  it("rejects unrecognized top-level shapes", async () => {
    const content = await readJsonFixture("instagram", "unsupported-schema.json");
    expect(importErrorCode(() => extractInstagramRelationships(content, "followers"))).toBe(
      "UNSUPPORTED_INSTAGRAM_SCHEMA",
    );
  });

  it("rejects recognized files with no valid relationships", () => {
    expect(
      importErrorCode(() =>
        extractInstagramRelationships([{ string_list_data: [{ value: "<script>" }] }], "followers"),
      ),
    ).toBe("NO_VALID_RELATIONSHIPS");
  });
});
