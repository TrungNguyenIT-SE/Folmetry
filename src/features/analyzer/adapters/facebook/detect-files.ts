import { normalizeArchivePath } from "@/features/analyzer/adapters/archive-path";
import type {
  ArchiveEntryMetadata,
  ArchiveManifest,
} from "@/features/analyzer/adapters/adapter";
import { ImportDomainError } from "@/features/analyzer/model/errors";

const FRIENDS_PATTERN = /(?:^|\/)(?:friends_and_followers\/friends|connections\/friends\/your_friends)\.json$/i;
const FOLLOWERS_PATTERN = /(?:^|\/)connections\/followers\/people_who_followed_you\.json$/i;
const FOLLOWING_PATTERN = /(?:^|\/)(?:friends_and_followers\/following|connections\/followers\/who_you've_followed)\.json$/i;
const FACEBOOK_HTML_PATTERN =
  /(?:^|\/)(?:friends_and_followers\/(?:friends|following)|connections\/(?:friends\/your_friends|followers\/(?:people_who_followed_you|who_you've_followed)))\.html$/i;

export interface DetectedFacebookEntry {
  readonly metadata: ArchiveEntryMetadata;
  readonly normalizedPath: string;
}

export interface FacebookManifestDetection {
  readonly friends: DetectedFacebookEntry;
  readonly followers?: DetectedFacebookEntry;
  readonly following?: DetectedFacebookEntry;
  readonly ignoredEntryCount: number;
  readonly htmlEntryCount: number;
}

export function isFacebookFriendsPath(path: string): boolean {
  const normalized = normalizeArchivePath(path);
  return normalized.safe && FRIENDS_PATTERN.test(normalized.path);
}

export function isFacebookFollowingPath(path: string): boolean {
  const normalized = normalizeArchivePath(path);
  return normalized.safe && FOLLOWING_PATTERN.test(normalized.path);
}

export function isFacebookFollowersPath(path: string): boolean {
  const normalized = normalizeArchivePath(path);
  return normalized.safe && FOLLOWERS_PATTERN.test(normalized.path);
}

export function isFacebookRelationshipPath(path: string): boolean {
  return isFacebookFriendsPath(path) || isFacebookFollowersPath(path) || isFacebookFollowingPath(path);
}

export function detectFacebookManifest(
  manifest: ArchiveManifest,
): FacebookManifestDetection {
  const friends: DetectedFacebookEntry[] = [];
  const followers: DetectedFacebookEntry[] = [];
  const following: DetectedFacebookEntry[] = [];
  let ignoredEntryCount = 0;
  let htmlEntryCount = 0;

  for (const metadata of manifest.entries) {
    const normalized = normalizeArchivePath(metadata.name);
    if (!normalized.safe) {
      throw new ImportDomainError("ARCHIVE_UNSAFE_PATH", { reason: normalized.reason });
    }
    if (metadata.directory === true) continue;
    if (FRIENDS_PATTERN.test(normalized.path)) {
      friends.push({ metadata, normalizedPath: normalized.path });
    } else if (FOLLOWERS_PATTERN.test(normalized.path)) {
      followers.push({ metadata, normalizedPath: normalized.path });
    } else if (FOLLOWING_PATTERN.test(normalized.path)) {
      following.push({ metadata, normalizedPath: normalized.path });
    } else if (FACEBOOK_HTML_PATTERN.test(normalized.path)) {
      htmlEntryCount += 1;
    } else {
      ignoredEntryCount += 1;
    }
  }

  if (friends.length === 0 && followers.length === 0 && following.length === 0 && htmlEntryCount > 0) {
    throw new ImportDomainError("UNSUPPORTED_HTML_EXPORT");
  }
  if (friends.length === 0) throw new ImportDomainError("FRIENDS_FILE_NOT_FOUND");
  if (friends.length > 1 || followers.length > 1 || following.length > 1) {
    throw new ImportDomainError("UNSUPPORTED_FACEBOOK_SCHEMA", {
      reason: friends.length > 1 ? "multiple-friends-files" : followers.length > 1 ? "multiple-followers-files" : "multiple-following-files",
    });
  }

  const friendsEntry = friends[0];
  if (friendsEntry === undefined) throw new ImportDomainError("FRIENDS_FILE_NOT_FOUND");
  return {
    friends: friendsEntry,
    ...(followers[0] === undefined ? {} : { followers: followers[0] }),
    ...(following[0] === undefined ? {} : { following: following[0] }),
    ignoredEntryCount,
    htmlEntryCount,
  };
}
