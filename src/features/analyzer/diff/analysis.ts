import { sortRelationships } from "@/features/analyzer/diff/sort";
import type {
  CurrentRelationshipAnalysis,
  HistoricalDiffResult,
  RelationshipRecord,
  RelationshipSort,
} from "@/features/analyzer/model/types";
import { createImportWarning } from "@/features/analyzer/model/warnings";

function canonicalRecordMap(
  records: readonly RelationshipRecord[],
): ReadonlyMap<string, RelationshipRecord> {
  const map = new Map<string, RelationshipRecord>();
  for (const record of records) {
    const existing = map.get(record.normalizedHandle);
    if (existing === undefined) {
      map.set(record.normalizedHandle, record);
      continue;
    }

    const connectedAt =
      existing.connectedAt === undefined
        ? record.connectedAt
        : record.connectedAt === undefined
          ? existing.connectedAt
          : Math.min(existing.connectedAt, record.connectedAt);
    const handle =
      existing.handle === existing.normalizedHandle
        ? existing.handle
        : record.handle === record.normalizedHandle
          ? record.handle
          : existing.handle < record.handle
            ? existing.handle
            : record.handle;
    map.set(record.normalizedHandle, {
      handle,
      normalizedHandle: record.normalizedHandle,
      ...(connectedAt === undefined ? {} : { connectedAt }),
    });
  }
  return map;
}

function difference(
  source: ReadonlyMap<string, RelationshipRecord>,
  comparison: ReadonlyMap<string, RelationshipRecord>,
): readonly RelationshipRecord[] {
  const result: RelationshipRecord[] = [];
  for (const [handle, record] of source) {
    if (!comparison.has(handle)) {
      result.push(record);
    }
  }
  return result;
}

function intersection(
  left: ReadonlyMap<string, RelationshipRecord>,
  right: ReadonlyMap<string, RelationshipRecord>,
): readonly RelationshipRecord[] {
  const result: RelationshipRecord[] = [];
  for (const [handle, record] of left) {
    if (right.has(handle)) {
      result.push(record);
    }
  }
  return result;
}

export function analyzeCurrentRelationships(
  followers: readonly RelationshipRecord[],
  following: readonly RelationshipRecord[],
  sort: RelationshipSort = "handle-asc",
): CurrentRelationshipAnalysis {
  const followerMap = canonicalRecordMap(followers);
  const followingMap = canonicalRecordMap(following);

  return {
    followerCount: followerMap.size,
    followingCount: followingMap.size,
    mutuals: sortRelationships(intersection(followerMap, followingMap), sort),
    notFollowingBack: sortRelationships(difference(followingMap, followerMap), sort),
    notFollowedByMe: sortRelationships(difference(followerMap, followingMap), sort),
  };
}

export function computeHistoricalDiff(
  previous:
    | {
        readonly followers: readonly RelationshipRecord[];
        readonly following: readonly RelationshipRecord[];
      }
    | undefined,
  current: {
    readonly followers: readonly RelationshipRecord[];
    readonly following: readonly RelationshipRecord[];
  },
  sort: RelationshipSort = "handle-asc",
): HistoricalDiffResult | undefined {
  if (previous === undefined) {
    return undefined;
  }

  const previousFollowers = canonicalRecordMap(previous.followers);
  const currentFollowers = canonicalRecordMap(current.followers);
  const previousFollowing = canonicalRecordMap(previous.following);
  const currentFollowing = canonicalRecordMap(current.following);

  const lostFollowers = difference(previousFollowers, currentFollowers);
  const newFollowers = difference(currentFollowers, previousFollowers);
  const netFollowerChange = newFollowers.length - lostFollowers.length;
  const followerCountDelta = currentFollowers.size - previousFollowers.size;

  return {
    lostFollowers: sortRelationships(lostFollowers, sort),
    newFollowers: sortRelationships(newFollowers, sort),
    stoppedFollowing: sortRelationships(
      difference(previousFollowing, currentFollowing),
      sort,
    ),
    startedFollowing: sortRelationships(
      difference(currentFollowing, previousFollowing),
      sort,
    ),
    netFollowerChange,
    followerCountDelta,
    warnings:
      netFollowerChange === followerCountDelta
        ? []
        : [createImportWarning("HISTORICAL_COUNT_INCONSISTENCY")],
  };
}
