import { normalizeArchivePath } from "@/features/analyzer/adapters/archive-path";
import type {
  ArchiveEntryMetadata,
  ArchiveManifest,
} from "@/features/analyzer/adapters/adapter";
import { ImportDomainError } from "@/features/analyzer/model/errors";

const FOLLOWER_PATTERN = /(?:^|\/)followers_and_following\/followers_(\d+)\.json$/i;
const FOLLOWING_PATTERN = /(?:^|\/)followers_and_following\/following\.json$/i;
const RELATIONSHIP_HTML_PATTERN =
  /(?:^|\/)followers_and_following\/(?:followers(?:_\d+)?|following)\.html$/i;

export interface DetectedArchiveEntry {
  readonly metadata: ArchiveEntryMetadata;
  readonly normalizedPath: string;
}

export interface DetectedFollowerPart extends DetectedArchiveEntry {
  readonly partNumber: number;
}

export interface InstagramManifestDetection {
  readonly followerParts: readonly DetectedFollowerPart[];
  readonly following: DetectedArchiveEntry;
  readonly ignoredEntryCount: number;
  readonly htmlEntryCount: number;
}

function assertCompletePartSequence(parts: readonly DetectedFollowerPart[]): void {
  const seen = new Set<number>();
  for (const part of parts) {
    if (seen.has(part.partNumber)) {
      throw new ImportDomainError("INCOMPLETE_MULTIPART_FOLLOWERS", {
        reason: "duplicate-part-number",
        partNumber: part.partNumber,
      });
    }
    seen.add(part.partNumber);
  }

  const highestPart = Math.max(...seen);
  for (let partNumber = 1; partNumber <= highestPart; partNumber += 1) {
    if (!seen.has(partNumber)) {
      throw new ImportDomainError("INCOMPLETE_MULTIPART_FOLLOWERS", {
        reason: "missing-part-number",
        partNumber,
      });
    }
  }
}

export function detectInstagramManifest(
  manifest: ArchiveManifest,
): InstagramManifestDetection {
  const followerParts: DetectedFollowerPart[] = [];
  const followingEntries: DetectedArchiveEntry[] = [];
  let ignoredEntryCount = 0;
  let htmlEntryCount = 0;

  for (const metadata of manifest.entries) {
    const normalized = normalizeArchivePath(metadata.name);
    if (!normalized.safe) {
      throw new ImportDomainError("ARCHIVE_UNSAFE_PATH", { reason: normalized.reason });
    }
    if (metadata.directory === true) {
      continue;
    }

    const followerMatch = FOLLOWER_PATTERN.exec(normalized.path);
    if (followerMatch !== null) {
      const partNumber = Number(followerMatch[1]);
      if (!Number.isSafeInteger(partNumber) || partNumber < 1) {
        throw new ImportDomainError("UNSUPPORTED_INSTAGRAM_SCHEMA", {
          reason: "invalid-follower-part-number",
        });
      }
      followerParts.push({ metadata, normalizedPath: normalized.path, partNumber });
      continue;
    }

    if (FOLLOWING_PATTERN.test(normalized.path)) {
      followingEntries.push({ metadata, normalizedPath: normalized.path });
      continue;
    }

    if (RELATIONSHIP_HTML_PATTERN.test(normalized.path)) {
      htmlEntryCount += 1;
    } else {
      ignoredEntryCount += 1;
    }
  }

  if (followerParts.length === 0 && followingEntries.length === 0 && htmlEntryCount > 0) {
    throw new ImportDomainError("UNSUPPORTED_HTML_EXPORT");
  }
  if (followerParts.length === 0) {
    throw new ImportDomainError("FOLLOWERS_FILE_NOT_FOUND");
  }
  if (followingEntries.length === 0) {
    throw new ImportDomainError("FOLLOWING_FILE_NOT_FOUND");
  }
  if (followingEntries.length > 1) {
    throw new ImportDomainError("UNSUPPORTED_INSTAGRAM_SCHEMA", {
      reason: "multiple-following-files",
      actual: followingEntries.length,
    });
  }

  followerParts.sort((left, right) => left.partNumber - right.partNumber);
  assertCompletePartSequence(followerParts);

  const following = followingEntries[0];
  if (following === undefined) {
    throw new ImportDomainError("FOLLOWING_FILE_NOT_FOUND");
  }

  return {
    followerParts,
    following,
    ignoredEntryCount,
    htmlEntryCount,
  };
}

export function isFollowerPath(path: string): boolean {
  const normalized = normalizeArchivePath(path);
  return normalized.safe && FOLLOWER_PATTERN.test(normalized.path);
}

export function isFollowingPath(path: string): boolean {
  const normalized = normalizeArchivePath(path);
  return normalized.safe && FOLLOWING_PATTERN.test(normalized.path);
}
