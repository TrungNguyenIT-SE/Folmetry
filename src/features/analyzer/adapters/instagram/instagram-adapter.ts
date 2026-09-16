import { normalizeArchivePath } from "@/features/analyzer/adapters/archive-path";
import type {
  AdapterFile,
  AdapterInput,
  AdapterMatch,
  ArchiveManifest,
  ParseContext,
  SocialExportAdapter,
} from "@/features/analyzer/adapters/adapter";
import {
  detectInstagramManifest,
  isFollowerPath,
  isFollowingPath,
} from "@/features/analyzer/adapters/instagram/detect-files";
import { extractInstagramRelationships } from "@/features/analyzer/adapters/instagram/extract-relationships";
import { deduplicateRelationships } from "@/features/analyzer/model/deduplicate";
import { ImportDomainError } from "@/features/analyzer/model/errors";
import { IMPORT_POLICY } from "@/features/analyzer/model/policy";
import type {
  NormalizedSnapshotPayload,
  RelationshipKind,
  RelationshipRecord,
} from "@/features/analyzer/model/types";
import {
  createImportWarning,
  mergeImportWarnings,
  type ImportWarning,
} from "@/features/analyzer/model/warnings";

export const INSTAGRAM_PARSER_VERSION = "instagram-json@1";

function throwIfCancelled(context: ParseContext): void {
  if (context.signal?.aborted === true) {
    throw new ImportDomainError("IMPORT_CANCELLED");
  }
}

function normalizedFileMap(files: readonly AdapterFile[]): ReadonlyMap<string, unknown> {
  const result = new Map<string, unknown>();
  for (const file of files) {
    const normalized = normalizeArchivePath(file.path);
    if (!normalized.safe) {
      throw new ImportDomainError("ARCHIVE_UNSAFE_PATH", { reason: normalized.reason });
    }
    const lookupPath = normalized.path.toLowerCase();
    if (result.has(lookupPath)) {
      throw new ImportDomainError("UNSUPPORTED_INSTAGRAM_SCHEMA", {
        reason: "duplicate-file-content-path",
      });
    }
    result.set(lookupPath, file.content);
  }
  return result;
}

function getRequiredContent(
  files: ReadonlyMap<string, unknown>,
  path: string,
  kind: RelationshipKind,
): unknown {
  const content = files.get(path.toLowerCase());
  if (content === undefined) {
    throw new ImportDomainError(
      kind === "followers" ? "FOLLOWERS_FILE_NOT_FOUND" : "FOLLOWING_FILE_NOT_FOUND",
      { relationshipKind: kind, reason: "matched-file-content-not-provided" },
    );
  }
  return content;
}

function assertRelationshipLimit(records: readonly RelationshipRecord[], kind: RelationshipKind): void {
  if (records.length > IMPORT_POLICY.maxRelationshipsPerKind) {
    throw new ImportDomainError("RELATIONSHIP_LIMIT_EXCEEDED", {
      relationshipKind: kind,
      limit: IMPORT_POLICY.maxRelationshipsPerKind,
      actual: records.length,
    });
  }
}

async function adapterMatch(manifest: ArchiveManifest): Promise<AdapterMatch> {
  let followersPresent = false;
  let followingPresent = false;
  let htmlPresent = false;
  let unsafePathPresent = false;

  for (const entry of manifest.entries) {
    const normalized = normalizeArchivePath(entry.name);
    if (!normalized.safe) {
      unsafePathPresent = true;
      continue;
    }
    followersPresent ||= isFollowerPath(normalized.path);
    followingPresent ||= isFollowingPath(normalized.path);
    htmlPresent ||= /followers_and_following\/.+\.html$/i.test(normalized.path);
  }

  const reasons: AdapterMatch["reasons"][number][] = [];
  if (followersPresent) reasons.push("FOLLOWERS_JSON_PRESENT");
  if (followingPresent) reasons.push("FOLLOWING_JSON_PRESENT");
  if (htmlPresent) reasons.push("HTML_EXPORT_PRESENT");
  if (unsafePathPresent) reasons.push("UNSAFE_PATH_PRESENT");

  const matched = followersPresent || followingPresent || htmlPresent;
  return {
    matched,
    confidence:
      followersPresent && followingPresent ? "strong" : matched ? "possible" : "none",
    reasons,
  };
}

async function parseInstagramExport(
  input: AdapterInput,
  context: ParseContext,
): Promise<NormalizedSnapshotPayload> {
  throwIfCancelled(context);
  const detected = detectInstagramManifest(input.manifest);
  const files = normalizedFileMap(input.files);
  const followerRecords: RelationshipRecord[] = [];
  const warnings: ImportWarning[] = [];

  for (const part of detected.followerParts) {
    throwIfCancelled(context);
    const extracted = extractInstagramRelationships(
      getRequiredContent(files, part.normalizedPath, "followers"),
      "followers",
      {
        existingRecordCount: followerRecords.length,
        maxRecords: IMPORT_POLICY.maxRelationshipsPerKind,
        signal: context.signal,
      },
    );
    followerRecords.push(...extracted.records);
    warnings.push(...extracted.warnings);
    assertRelationshipLimit(followerRecords, "followers");
  }

  const followingExtracted = extractInstagramRelationships(
    getRequiredContent(files, detected.following.normalizedPath, "following"),
    "following",
    { maxRecords: IMPORT_POLICY.maxRelationshipsPerKind, signal: context.signal },
  );
  assertRelationshipLimit(followingExtracted.records, "following");
  warnings.push(...followingExtracted.warnings);

  const followers = deduplicateRelationships(followerRecords, "followers");
  const following = deduplicateRelationships(followingExtracted.records, "following");
  warnings.push(...followers.warnings, ...following.warnings);

  if (detected.followerParts.length > 1) {
    warnings.push(
      createImportWarning(
        "MULTIPART_FOLLOWERS_MERGED",
        detected.followerParts.length,
        "followers",
      ),
    );
  }
  if (detected.ignoredEntryCount > 0) {
    warnings.push(
      createImportWarning("UNKNOWN_NON_CRITICAL_FILE_IGNORED", detected.ignoredEntryCount),
    );
  }
  if (input.mode === "manual") {
    warnings.push(createImportWarning("MANUAL_IMPORT_COMPLETENESS_UNVERIFIED"));
  }

  throwIfCancelled(context);
  return {
    platform: "instagram",
    followers: followers.records,
    following: following.records,
    parserVersion: INSTAGRAM_PARSER_VERSION,
    warnings: mergeImportWarnings(warnings),
  };
}

export const instagramAdapter: SocialExportAdapter = {
  platform: "instagram",
  canHandle: adapterMatch,
  parse: parseInstagramExport,
};
