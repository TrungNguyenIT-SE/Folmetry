import { describe, expect, it } from "vitest";

import type { AdapterFile, AdapterInput } from "@/features/analyzer/adapters/adapter";
import {
  INSTAGRAM_PARSER_VERSION,
  instagramAdapter,
} from "@/features/analyzer/adapters/instagram/instagram-adapter";
import { computeHistoricalDiff } from "@/features/analyzer/diff/analysis";
import { ImportDomainError } from "@/features/analyzer/model/errors";
import { readJsonFixture } from "../../../../../tests/helpers/read-json-fixture";

const basePath = "connections/followers_and_following";

async function fixtureInput(
  fixture: "fixture-a" | "fixture-b" | "multipart",
  mode: AdapterInput["mode"] = "archive",
): Promise<AdapterInput> {
  const followerNames = fixture === "multipart" ? ["followers_1.json", "followers_2.json"] : ["followers_1.json"];
  const files: AdapterFile[] = [];
  for (const name of followerNames) {
    files.push({
      path: `${basePath}/${name}`,
      content: await readJsonFixture("instagram", fixture, name),
    });
  }
  files.push({
    path: `${basePath}/following.json`,
    content: await readJsonFixture("instagram", fixture, "following.json"),
  });

  return {
    mode,
    manifest: {
      entries: [
        ...followerNames.map((name) => ({ name: `${basePath}/${name}` })),
        { name: `${basePath}/following.json` },
        { name: "media/photos/synthetic.jpg" },
      ],
    },
    files,
  };
}

describe("instagramAdapter", () => {
  it("strongly matches a complete JSON relationship manifest", async () => {
    const input = await fixtureInput("fixture-a");
    await expect(instagramAdapter.canHandle(input.manifest)).resolves.toEqual({
      matched: true,
      confidence: "strong",
      reasons: ["FOLLOWERS_JSON_PRESENT", "FOLLOWING_JSON_PRESENT"],
    });
  });

  it("returns a platform-neutral normalized payload", async () => {
    const result = await instagramAdapter.parse(await fixtureInput("fixture-a"), {});
    expect(result.platform).toBe("instagram");
    expect(result.parserVersion).toBe(INSTAGRAM_PARSER_VERSION);
    expect(result.followers.map((record) => record.normalizedHandle)).toEqual([
      "alpha.test",
      "bravo_test",
      "charlie.test",
    ]);
    expect(result.following.map((record) => record.normalizedHandle)).toEqual([
      "alpha.test",
      "delta_test",
    ]);
    expect(JSON.stringify(result)).not.toContain("string_list_data");
    expect(JSON.stringify(result)).not.toContain("href");
  });

  it("merges every multipart follower file numerically and deduplicates across parts", async () => {
    const result = await instagramAdapter.parse(await fixtureInput("multipart"), {});
    expect(result.followers.map((record) => record.normalizedHandle)).toEqual([
      "alpha.test",
      "bravo_test",
      "charlie.test",
    ]);
    expect(result.followers[0]?.connectedAt).toBe(1_700_000_000_000);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MULTIPART_FOLLOWERS_MERGED", count: 2 }),
        expect.objectContaining({ code: "DUPLICATE_HANDLES_REMOVED", count: 1 }),
        expect.objectContaining({ code: "TIMESTAMP_CONFLICT_RESOLVED", count: 1 }),
        expect.objectContaining({
          code: "MISSING_OPTIONAL_TIMESTAMP",
          count: 1,
          relationshipKind: "followers",
        }),
        expect.objectContaining({
          code: "MISSING_OPTIONAL_TIMESTAMP",
          count: 1,
          relationshipKind: "following",
        }),
        expect.objectContaining({ code: "UNKNOWN_NON_CRITICAL_FILE_IGNORED", count: 1 }),
      ]),
    );
  });

  it("adds a stable completeness warning in manual mode", async () => {
    const result = await instagramAdapter.parse(await fixtureInput("fixture-a", "manual"), {});
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "MANUAL_IMPORT_COMPLETENESS_UNVERIFIED" }),
    );
  });

  it("feeds platform-neutral fixture A and B into historical diff", async () => {
    const previous = await instagramAdapter.parse(await fixtureInput("fixture-a"), {});
    const current = await instagramAdapter.parse(await fixtureInput("fixture-b"), {});
    const diff = computeHistoricalDiff(previous, current);

    expect(diff?.lostFollowers.map((record) => record.normalizedHandle)).toEqual(["bravo_test"]);
    expect(diff?.newFollowers.map((record) => record.normalizedHandle)).toEqual(["echo.test"]);
    expect(diff?.stoppedFollowing.map((record) => record.normalizedHandle)).toEqual(["delta_test"]);
    expect(diff?.startedFollowing.map((record) => record.normalizedHandle)).toEqual([
      "foxtrot_test",
    ]);
  });

  it("honors cancellation before parsing", async () => {
    const controller = new AbortController();
    controller.abort();
    try {
      await instagramAdapter.parse(await fixtureInput("fixture-a"), {
        signal: controller.signal,
      });
      throw new Error("Expected cancellation");
    } catch (error) {
      expect(error).toBeInstanceOf(ImportDomainError);
      expect((error as ImportDomainError).code).toBe("IMPORT_CANCELLED");
    }
  });
});
