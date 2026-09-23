import type { ImportWarning } from "@/features/analyzer/model/warnings";

export type SocialPlatform = "instagram" | "facebook";

export type RelationshipKind = "followers" | "following";

export interface RelationshipRecord {
  readonly handle: string;
  readonly normalizedHandle: string;
  readonly connectedAt?: number;
}

export interface NormalizedSnapshotPayload {
  readonly platform: "instagram";
  readonly followers: readonly RelationshipRecord[];
  readonly following: readonly RelationshipRecord[];
  readonly parserVersion: string;
  readonly warnings: readonly ImportWarning[];
}

export interface Snapshot {
  readonly id: string;
  readonly accountId: string;
  readonly platform: SocialPlatform;
  readonly snapshotAt: number;
  readonly importedAt: number;
  readonly sourceFileName?: string;
  readonly sourceFileSize?: number;
  readonly fingerprint: string;
  readonly parserVersion: string;
  readonly followers: readonly RelationshipRecord[];
  readonly following: readonly RelationshipRecord[];
  readonly warnings: readonly ImportWarning[];
}

export interface LocalSnapshot extends Snapshot {
  readonly followerCount: number;
  readonly followingCount: number;
}

export interface LocalAccount {
  readonly id: string;
  readonly platform: SocialPlatform;
  readonly label: string;
  readonly username?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface LocalSetting {
  readonly key: string;
  readonly value: unknown;
}

export type RelationshipSort =
  | "handle-asc"
  | "handle-desc"
  | "connected-newest"
  | "connected-oldest";

export interface CurrentRelationshipAnalysis {
  readonly followerCount: number;
  readonly followingCount: number;
  readonly mutuals: readonly RelationshipRecord[];
  readonly notFollowingBack: readonly RelationshipRecord[];
  readonly notFollowedByMe: readonly RelationshipRecord[];
}

export interface PossibleHandleRename {
  readonly previous: RelationshipRecord;
  readonly current: RelationshipRecord;
  readonly connectedAt: number;
}

export interface HistoricalDiffResult {
  readonly lostFollowers: readonly RelationshipRecord[];
  readonly newFollowers: readonly RelationshipRecord[];
  readonly possibleFollowerRenames: readonly PossibleHandleRename[];
  readonly stoppedFollowing: readonly RelationshipRecord[];
  readonly startedFollowing: readonly RelationshipRecord[];
  readonly possibleFollowingRenames: readonly PossibleHandleRename[];
  readonly netFollowerChange: number;
  readonly followerCountDelta: number;
  readonly warnings: readonly ImportWarning[];
}
