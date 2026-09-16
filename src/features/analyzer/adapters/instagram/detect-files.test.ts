import { describe, expect, it } from "vitest";

import type { ArchiveManifest } from "@/features/analyzer/adapters/adapter";
import { detectInstagramManifest } from "@/features/analyzer/adapters/instagram/detect-files";
import { ImportDomainError } from "@/features/analyzer/model/errors";

function importErrorCode(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    return error instanceof ImportDomainError ? error.code : undefined;
  }
}

describe("detectInstagramManifest", () => {
  it("matches allowed paths case-insensitively and sorts follower parts numerically", () => {
    const detection = detectInstagramManifest({
      entries: [
        { name: "export/Connections/Followers_And_Following/followers_2.json" },
        { name: "export/connections/followers_and_following/following.json" },
        { name: "export/connections/followers_and_following/followers_1.json" },
      ],
    });
    expect(detection.followerParts.map((part) => part.partNumber)).toEqual([1, 2]);
    expect(detection.following.normalizedPath.toLowerCase()).toContain("following.json");
  });

  it("orders part 10 after part 2 rather than lexicographically", () => {
    const entries: ArchiveManifest["entries"] = [
      { name: "followers_and_following/following.json" },
      ...Array.from({ length: 10 }, (_, index) => ({
        name: `followers_and_following/followers_${10 - index}.json`,
      })),
    ];
    expect(
      detectInstagramManifest({ entries }).followerParts.map((part) => part.partNumber),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("ignores nested archives, media, messages, and near-match names", () => {
    const detection = detectInstagramManifest({
      entries: [
        { name: "followers_and_following/followers_1.json" },
        { name: "followers_and_following/following.json" },
        { name: "followers_and_following/followers_backup.json" },
        { name: "messages/followers_2.json" },
        { name: "media/following.json" },
        { name: "nested/archive.zip" },
      ],
    });
    expect(detection.followerParts).toHaveLength(1);
    expect(detection.ignoredEntryCount).toBe(4);
  });

  it.each([
    [
      [{ name: "followers_and_following/following.json" }],
      "FOLLOWERS_FILE_NOT_FOUND",
    ],
    [
      [{ name: "followers_and_following/followers_1.json" }],
      "FOLLOWING_FILE_NOT_FOUND",
    ],
    [
      [
        { name: "followers_and_following/followers.html" },
        { name: "followers_and_following/following.html" },
      ],
      "UNSUPPORTED_HTML_EXPORT",
    ],
    [
      [
        { name: "followers_and_following/followers_1.json" },
        { name: "followers_and_following/followers_3.json" },
        { name: "followers_and_following/following.json" },
      ],
      "INCOMPLETE_MULTIPART_FOLLOWERS",
    ],
    [
      [
        { name: "../followers_and_following/followers_1.json" },
        { name: "followers_and_following/following.json" },
      ],
      "ARCHIVE_UNSAFE_PATH",
    ],
  ] satisfies readonly (readonly [ArchiveManifest["entries"], string])[])(
    "maps invalid manifest to %s",
    (entries, code) => {
      expect(importErrorCode(() => detectInstagramManifest({ entries }))).toBe(code);
    },
  );
});
