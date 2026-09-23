import { sortRelationships } from "@/features/analyzer/diff/sort";
import type {
  CurrentRelationshipAnalysis,
  HistoricalDiffResult,
  PossibleHandleRename,
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

interface ReconciledChanges {
  readonly removed: readonly RelationshipRecord[];
  readonly added: readonly RelationshipRecord[];
  readonly possibleRenames: readonly PossibleHandleRename[];
}

function recordsByUniqueConnectedAt(
  records: ReadonlyMap<string, RelationshipRecord>,
): ReadonlyMap<number, RelationshipRecord> {
  const unique = new Map<number, RelationshipRecord>();
  const ambiguous = new Set<number>();

  for (const record of records.values()) {
    if (record.connectedAt === undefined || ambiguous.has(record.connectedAt)) continue;
    if (unique.has(record.connectedAt)) {
      unique.delete(record.connectedAt);
      ambiguous.add(record.connectedAt);
    } else {
      unique.set(record.connectedAt, record);
    }
  }

  return unique;
}

function reconcilePossibleRenames(
  previous: ReadonlyMap<string, RelationshipRecord>,
  current: ReadonlyMap<string, RelationshipRecord>,
  sort: RelationshipSort,
): ReconciledChanges {
  const removed = difference(previous, current);
  const added = difference(current, previous);
  const addedHandles = new Set(added.map((record) => record.normalizedHandle));
  const uniquePreviousDates = recordsByUniqueConnectedAt(previous);
  const uniqueCurrentDates = recordsByUniqueConnectedAt(current);
  const renamedPreviousHandles = new Set<string>();
  const renamedCurrentHandles = new Set<string>();
  const possibleRenames: PossibleHandleRename[] = [];

  for (const previousRecord of removed) {
    if (previousRecord.connectedAt === undefined) continue;
    if (uniquePreviousDates.get(previousRecord.connectedAt) !== previousRecord) continue;

    const currentRecord = uniqueCurrentDates.get(previousRecord.connectedAt);
    if (
      currentRecord === undefined ||
      !addedHandles.has(currentRecord.normalizedHandle)
    ) {
      continue;
    }

    renamedPreviousHandles.add(previousRecord.normalizedHandle);
    renamedCurrentHandles.add(currentRecord.normalizedHandle);
    possibleRenames.push({
      previous: previousRecord,
      current: currentRecord,
      connectedAt: previousRecord.connectedAt,
    });
  }

  const sortedCurrentRecords = sortRelationships(
    possibleRenames.map((rename) => rename.current),
    sort,
  );
  const renameByCurrentHandle = new Map(
    possibleRenames.map((rename) => [rename.current.normalizedHandle, rename]),
  );

  return {
    removed: removed.filter((record) => !renamedPreviousHandles.has(record.normalizedHandle)),
    added: added.filter((record) => !renamedCurrentHandles.has(record.normalizedHandle)),
    possibleRenames: sortedCurrentRecords.flatMap((record) => {
      const rename = renameByCurrentHandle.get(record.normalizedHandle);
      return rename === undefined ? [] : [rename];
    }),
  };
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

  const followerChanges = reconcilePossibleRenames(
    previousFollowers,
    currentFollowers,
    sort,
  );
  const followingChanges = reconcilePossibleRenames(
    previousFollowing,
    currentFollowing,
    sort,
  );
  const lostFollowers = followerChanges.removed;
  const newFollowers = followerChanges.added;
  const netFollowerChange = newFollowers.length - lostFollowers.length;
  const followerCountDelta = currentFollowers.size - previousFollowers.size;

  return {
    lostFollowers: sortRelationships(lostFollowers, sort),
    newFollowers: sortRelationships(newFollowers, sort),
    possibleFollowerRenames: followerChanges.possibleRenames,
    stoppedFollowing: sortRelationships(followingChanges.removed, sort),
    startedFollowing: sortRelationships(followingChanges.added, sort),
    possibleFollowingRenames: followingChanges.possibleRenames,
    netFollowerChange,
    followerCountDelta,
    warnings:
      netFollowerChange === followerCountDelta
        ? []
        : [createImportWarning("HISTORICAL_COUNT_INCONSISTENCY")],
  };
}
