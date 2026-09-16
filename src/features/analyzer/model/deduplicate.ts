import type { RelationshipKind, RelationshipRecord } from "@/features/analyzer/model/types";
import { createImportWarning, type ImportWarning } from "@/features/analyzer/model/warnings";

export interface DeduplicationResult {
  readonly records: readonly RelationshipRecord[];
  readonly warnings: readonly ImportWarning[];
  readonly duplicateCount: number;
}

function compareCodePoint(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function selectDisplayHandle(left: RelationshipRecord, right: RelationshipRecord): string {
  const normalized = left.normalizedHandle;
  if (left.handle === normalized && right.handle !== normalized) {
    return left.handle;
  }
  if (right.handle === normalized && left.handle !== normalized) {
    return right.handle;
  }
  return compareCodePoint(left.handle, right.handle) <= 0 ? left.handle : right.handle;
}

function mergeRecord(left: RelationshipRecord, right: RelationshipRecord): RelationshipRecord {
  const timestamps = [left.connectedAt, right.connectedAt].filter(
    (value): value is number => value !== undefined,
  );
  const connectedAt = timestamps.length === 0 ? undefined : Math.min(...timestamps);

  return {
    handle: selectDisplayHandle(left, right),
    normalizedHandle: left.normalizedHandle,
    ...(connectedAt === undefined ? {} : { connectedAt }),
  };
}

export function deduplicateRelationships(
  records: readonly RelationshipRecord[],
  relationshipKind: RelationshipKind,
): DeduplicationResult {
  const byHandle = new Map<string, RelationshipRecord>();
  let duplicateCount = 0;
  let timestampConflictCount = 0;

  for (const record of records) {
    const existing = byHandle.get(record.normalizedHandle);
    if (existing === undefined) {
      byHandle.set(record.normalizedHandle, record);
      continue;
    }

    duplicateCount += 1;
    if (
      existing.connectedAt !== undefined &&
      record.connectedAt !== undefined &&
      existing.connectedAt !== record.connectedAt
    ) {
      timestampConflictCount += 1;
    }
    byHandle.set(record.normalizedHandle, mergeRecord(existing, record));
  }

  const warnings: ImportWarning[] = [];
  if (duplicateCount > 0) {
    warnings.push(
      createImportWarning("DUPLICATE_HANDLES_REMOVED", duplicateCount, relationshipKind),
    );
  }
  if (timestampConflictCount > 0) {
    warnings.push(
      createImportWarning("TIMESTAMP_CONFLICT_RESOLVED", timestampConflictCount, relationshipKind),
    );
  }

  return {
    records: [...byHandle.values()].sort((left, right) =>
      compareCodePoint(left.normalizedHandle, right.normalizedHandle),
    ),
    warnings,
    duplicateCount,
  };
}
