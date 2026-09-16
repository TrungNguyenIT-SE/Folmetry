import { describe, expect, it } from "vitest";

import type { ArchiveManifest } from "@/features/analyzer/adapters/adapter";
import { ImportDomainError } from "@/features/analyzer/model/errors";
import { IMPORT_POLICY } from "@/features/analyzer/model/policy";
import {
  validateArchiveByteLength,
  validateManifestResourceLimits,
} from "@/features/analyzer/model/resource-limits";

function codeFrom(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    return error instanceof ImportDomainError ? error.code : undefined;
  }
}

const relevant = () => true;

describe("resource limit policy", () => {
  it("accepts archive sizes below and exactly at the boundary", () => {
    expect(() => validateArchiveByteLength(IMPORT_POLICY.maxArchiveBytes - 1)).not.toThrow();
    expect(() => validateArchiveByteLength(IMPORT_POLICY.maxArchiveBytes)).not.toThrow();
  });

  it("rejects archive size one byte above the boundary", () => {
    expect(codeFrom(() => validateArchiveByteLength(IMPORT_POLICY.maxArchiveBytes + 1))).toBe(
      "ARCHIVE_TOO_LARGE",
    );
  });

  it("warns for a legitimate archive near the configured limit", () => {
    expect(validateArchiveByteLength(IMPORT_POLICY.maxArchiveBytes * 0.8)).toContainEqual(
      expect.objectContaining({ code: "LARGE_EXPORT_PERFORMANCE_WARNING" }),
    );
  });

  it("accepts per-entry and total relevant sizes exactly at their boundaries", () => {
    const manifest: ArchiveManifest = {
      entries: [
        {
          name: "followers_1.json",
          compressedSize: IMPORT_POLICY.maxRelevantJsonBytes,
          uncompressedSize: IMPORT_POLICY.maxRelevantJsonBytes,
        },
        {
          name: "following.json",
          compressedSize:
            IMPORT_POLICY.maxTotalRelevantBytes - IMPORT_POLICY.maxRelevantJsonBytes,
          uncompressedSize:
            IMPORT_POLICY.maxTotalRelevantBytes - IMPORT_POLICY.maxRelevantJsonBytes,
        },
      ],
    };
    expect(() => validateManifestResourceLimits(manifest, relevant)).not.toThrow();
  });

  it("rejects per-entry and total sizes above their boundaries", () => {
    expect(
      codeFrom(() =>
        validateManifestResourceLimits(
          {
            entries: [
              {
                name: "followers_1.json",
                uncompressedSize: IMPORT_POLICY.maxRelevantJsonBytes + 1,
              },
            ],
          },
          relevant,
        ),
      ),
    ).toBe("RELEVANT_DATA_TOO_LARGE");

    const half = IMPORT_POLICY.maxTotalRelevantBytes / 2;
    expect(
      codeFrom(() =>
        validateManifestResourceLimits(
          {
            entries: [
              { name: "followers_1.json", compressedSize: half, uncompressedSize: half },
              {
                name: "following.json",
                compressedSize: half + 1,
                uncompressedSize: half + 1,
              },
            ],
          },
          relevant,
        ),
      ),
    ).toBe("RELEVANT_DATA_TOO_LARGE");
  });

  it("allows ratio 200 and rejects ratio 201", () => {
    expect(() =>
      validateManifestResourceLimits(
        { entries: [{ name: "a", compressedSize: 1, uncompressedSize: 200 }] },
        relevant,
      ),
    ).not.toThrow();
    expect(
      codeFrom(() =>
        validateManifestResourceLimits(
          { entries: [{ name: "a", compressedSize: 1, uncompressedSize: 201 }] },
          relevant,
        ),
      ),
    ).toBe("ARCHIVE_SUSPICIOUS_COMPRESSION");
  });

  it("accepts exactly max entries and rejects one above", () => {
    const entry = { name: "ignored" };
    expect(() =>
      validateManifestResourceLimits(
        { entries: Array.from({ length: IMPORT_POLICY.maxEntries }, () => entry) },
        () => false,
      ),
    ).not.toThrow();
    expect(
      codeFrom(() =>
        validateManifestResourceLimits(
          { entries: Array.from({ length: IMPORT_POLICY.maxEntries + 1 }, () => entry) },
          () => false,
        ),
      ),
    ).toBe("ARCHIVE_TOO_MANY_ENTRIES");
  });

  it("rejects encrypted entries and invalid numeric metadata", () => {
    expect(
      codeFrom(() =>
        validateManifestResourceLimits({ entries: [{ name: "a", encrypted: true }] }, relevant),
      ),
    ).toBe("ARCHIVE_ENCRYPTED");
    expect(
      codeFrom(() =>
        validateManifestResourceLimits(
          { entries: [{ name: "a", compressedSize: -1 }] },
          relevant,
        ),
      ),
    ).toBe("ARCHIVE_CORRUPTED");
  });
});
