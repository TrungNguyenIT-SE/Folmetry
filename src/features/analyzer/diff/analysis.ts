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
  preserveDuplicates = false,
): ReadonlyMap<string, RelationshipRecord> {
  const normalizedHandleCounts = new Map<string, number>();
  if (preserveDuplicates) {
    for (const record of records) {
      normalizedHandleCounts.set(
        record.normalizedHandle,
        (normalizedHandleCounts.get(record.normalizedHandle) ?? 0) + 1,
      );
    }
  }

  const map = new Map<string, RelationshipRecord>();
  const duplicateOccurrences = new Map<string, number>();
  for (const record of records) {
    let key = record.normalizedHandle;
    if ((normalizedHandleCounts.get(record.normalizedHandle) ?? 0) > 1) {
      const baseKey = `${record.normalizedHandle}\u0000${record.connectedAt ?? "unknown"}`;
      const occurrence = duplicateOccurrences.get(baseKey) ?? 0;
      duplicateOccurrences.set(baseKey, occurrence + 1);
      key = `${baseKey}\u0000${occurrence}`;
    }

    const existing = map.get(key);
    if (existing === undefined) {
      map.set(key, record);
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
    map.set(key, {
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
  const addedRecords = new Set(added);
  const uniquePreviousDates = recordsByUniqueConnectedAt(previous);
  const uniqueCurrentDates = recordsByUniqueConnectedAt(current);
  const renamedPreviousRecords = new Set<RelationshipRecord>();
  const renamedCurrentRecords = new Set<RelationshipRecord>();
  const possibleRenames: PossibleHandleRename[] = [];

  for (const previousRecord of removed) {
    if (previousRecord.connectedAt === undefined) continue;
    if (uniquePreviousDates.get(previousRecord.connectedAt) !== previousRecord) continue;

    const currentRecord = uniqueCurrentDates.get(previousRecord.connectedAt);
    if (
      currentRecord === undefined ||
      !addedRecords.has(currentRecord)
    ) {
      continue;
    }

    renamedPreviousRecords.add(previousRecord);
    renamedCurrentRecords.add(currentRecord);
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
  const renameByCurrentRecord = new Map(
    possibleRenames.map((rename) => [rename.current, rename]),
  );

  return {
    removed: removed.filter((record) => !renamedPreviousRecords.has(record)),
    added: added.filter((record) => !renamedCurrentRecords.has(record)),
    possibleRenames: sortedCurrentRecords.flatMap((record) => {
      const rename = renameByCurrentRecord.get(record);
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
  preserveDuplicates = false,
): HistoricalDiffResult | undefined {
  if (previous === undefined) {
    return undefined;
  }

  const previousFollowers = canonicalRecordMap(previous.followers, preserveDuplicates);
  const currentFollowers = canonicalRecordMap(current.followers, preserveDuplicates);
  const previousFollowing = canonicalRecordMap(previous.following, preserveDuplicates);
  const currentFollowing = canonicalRecordMap(current.following, preserveDuplicates);

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
