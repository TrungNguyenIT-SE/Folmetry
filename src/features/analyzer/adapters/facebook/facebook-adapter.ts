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
  detectFacebookManifest,
  isFacebookFriendsPath,
  isFacebookFollowersPath,
  isFacebookFollowingPath,
} from "@/features/analyzer/adapters/facebook/detect-files";
import { extractFacebookRelationships } from "@/features/analyzer/adapters/facebook/extract-relationships";
import { deduplicateRelationships } from "@/features/analyzer/model/deduplicate";
import { ImportDomainError } from "@/features/analyzer/model/errors";
import { IMPORT_POLICY } from "@/features/analyzer/model/policy";
import type { NormalizedSnapshotPayload } from "@/features/analyzer/model/types";
import { createImportWarning, mergeImportWarnings } from "@/features/analyzer/model/warnings";

export const FACEBOOK_PARSER_VERSION = "facebook-json@2";

function fileMap(files: readonly AdapterFile[]): ReadonlyMap<string, unknown> {
  const result = new Map<string, unknown>();
  for (const file of files) {
    const normalized = normalizeArchivePath(file.path);
    if (!normalized.safe) throw new ImportDomainError("ARCHIVE_UNSAFE_PATH", { reason: normalized.reason });
    const key = normalized.path.toLowerCase();
    if (result.has(key)) {
      throw new ImportDomainError("UNSUPPORTED_FACEBOOK_SCHEMA", { reason: "duplicate-file-content-path" });
    }
    result.set(key, file.content);
  }
  return result;
}

async function matchFacebook(manifest: ArchiveManifest): Promise<AdapterMatch> {
  let friends = false;
  let following = false;
  let followers = false;
  let html = false;
  let unsafe = false;
  for (const entry of manifest.entries) {
    const normalized = normalizeArchivePath(entry.name);
    if (!normalized.safe) {
      unsafe = true;
      continue;
    }
    friends ||= isFacebookFriendsPath(normalized.path);
    followers ||= isFacebookFollowersPath(normalized.path);
    following ||= isFacebookFollowingPath(normalized.path);
    html ||= /(?:^|\/)friends_and_followers\/(?:friends|following)\.html$/i.test(normalized.path);
  }
  const reasons: AdapterMatch["reasons"][number][] = [];
  if (friends) reasons.push("FRIENDS_JSON_PRESENT");
  if (following) reasons.push("FOLLOWING_JSON_PRESENT");
  if (html) reasons.push("HTML_EXPORT_PRESENT");
  if (unsafe) reasons.push("UNSAFE_PATH_PRESENT");
  return {
    matched: friends || followers || following || html,
    confidence: friends && (followers || following) ? "strong" : friends || followers || following || html ? "possible" : "none",
    reasons,
  };
}

async function parseFacebook(
  input: AdapterInput,
  context: ParseContext,
): Promise<NormalizedSnapshotPayload> {
  if (context.signal?.aborted === true) throw new ImportDomainError("IMPORT_CANCELLED");
  const detected = detectFacebookManifest(input.manifest);
  const files = fileMap(input.files);
  const friendsContent = files.get(detected.friends.normalizedPath.toLowerCase());
  if (friendsContent === undefined) {
    throw new ImportDomainError("FRIENDS_FILE_NOT_FOUND", { reason: "matched-file-content-not-provided" });
  }
  const friendsExtracted = extractFacebookRelationships(friendsContent, "followers", {
    maxRecords: IMPORT_POLICY.maxRelationshipsPerKind,
    signal: context.signal,
  }, "friends");
  const followersContent = detected.followers === undefined
    ? { followers_v3: [] }
    : files.get(detected.followers.normalizedPath.toLowerCase());
  if (followersContent === undefined) {
    throw new ImportDomainError("FOLLOWERS_FILE_NOT_FOUND", { reason: "matched-file-content-not-provided" });
  }
  const followersExtracted = extractFacebookRelationships(followersContent, "followers", {
    maxRecords: IMPORT_POLICY.maxRelationshipsPerKind,
    signal: context.signal,
  }, "followers");
  const followingContent = detected.following === undefined
    ? { following_v2: [] }
    : files.get(detected.following.normalizedPath.toLowerCase());
  if (followingContent === undefined) {
    throw new ImportDomainError("FOLLOWING_FILE_NOT_FOUND", { reason: "matched-file-content-not-provided" });
  }
  const followingExtracted = extractFacebookRelationships(followingContent, "following", {
    maxRecords: IMPORT_POLICY.maxRelationshipsPerKind,
    signal: context.signal,
  }, "following");
  const friends = deduplicateRelationships(friendsExtracted.records, "followers");
  const followers = deduplicateRelationships(followersExtracted.records, "followers");
  const following = deduplicateRelationships(followingExtracted.records, "following");
  const warnings = [
    ...friendsExtracted.warnings,
    ...followersExtracted.warnings,
    ...followingExtracted.warnings,
    ...friends.warnings,
    ...followers.warnings,
    ...following.warnings,
    ...(detected.ignoredEntryCount > 0
      ? [createImportWarning("UNKNOWN_NON_CRITICAL_FILE_IGNORED", detected.ignoredEntryCount)]
      : []),
    ...(input.mode === "manual"
      ? [createImportWarning("MANUAL_IMPORT_COMPLETENESS_UNVERIFIED")]
      : []),
  ];
  return {
    platform: "facebook",
    friends: friends.records,
    followers: followers.records,
    following: following.records,
    parserVersion: FACEBOOK_PARSER_VERSION,
    warnings: mergeImportWarnings(warnings),
  };
}

export const facebookAdapter: SocialExportAdapter = {
  platform: "facebook",
  canHandle: matchFacebook,
  parse: parseFacebook,
};
