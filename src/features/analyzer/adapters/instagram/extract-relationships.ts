import { ImportDomainError } from "@/features/analyzer/model/errors";
import { normalizeInstagramHandle } from "@/features/analyzer/model/normalize-handle";
import { parseRelationshipTimestamp } from "@/features/analyzer/model/timestamp";
import type { RelationshipKind, RelationshipRecord } from "@/features/analyzer/model/types";
import { createImportWarning, type ImportWarning } from "@/features/analyzer/model/warnings";

interface ExtractedRelationships {
  readonly records: readonly RelationshipRecord[];
  readonly warnings: readonly ImportWarning[];
}

interface ExtractionOptions {
  readonly existingRecordCount?: number;
  readonly maxRecords?: number;
  readonly signal?: AbortSignal;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recognizedEntries(content: unknown, kind: RelationshipKind): readonly unknown[] | undefined {
  if (Array.isArray(content)) {
    return content;
  }
  if (!isObject(content)) {
    return undefined;
  }

  const wrapperKeys =
    kind === "following"
      ? ["relationships_following"]
      : ["relationships_followers", "relationships_followers_following"];
  for (const key of wrapperKeys) {
    const wrapped = content[key];
    if (Array.isArray(wrapped)) {
      return wrapped;
    }
  }
  return undefined;
}

export function extractInstagramRelationships(
  content: unknown,
  kind: RelationshipKind,
  options: ExtractionOptions = {},
): ExtractedRelationships {
  const entries = recognizedEntries(content, kind);
  if (entries === undefined) {
    throw new ImportDomainError("UNSUPPORTED_INSTAGRAM_SCHEMA", {
      relationshipKind: kind,
      reason: "unrecognized-top-level-shape",
    });
  }

  const records: RelationshipRecord[] = [];
  let invalidEntryCount = 0;
  let missingTimestampCount = 0;

  for (const entry of entries) {
    if (options.signal?.aborted === true) {
      throw new ImportDomainError("IMPORT_CANCELLED");
    }
    if (!isObject(entry) || !Array.isArray(entry["string_list_data"])) {
      invalidEntryCount += 1;
      continue;
    }

    const stringListData = entry["string_list_data"];
    if (stringListData.length === 0) {
      invalidEntryCount += 1;
      continue;
    }

    for (const item of stringListData) {
      if (!isObject(item)) {
        invalidEntryCount += 1;
        continue;
      }

      const normalized = normalizeInstagramHandle(item["value"]);
      if (!normalized.ok) {
        invalidEntryCount += 1;
        continue;
      }

      const connectedAt = parseRelationshipTimestamp(item["timestamp"]);
      if (connectedAt === undefined) {
        missingTimestampCount += 1;
      }
      records.push({
        handle: normalized.handle,
        normalizedHandle: normalized.normalizedHandle,
        ...(connectedAt === undefined ? {} : { connectedAt }),
      });
      const totalRecords = (options.existingRecordCount ?? 0) + records.length;
      if (options.maxRecords !== undefined && totalRecords > options.maxRecords) {
        throw new ImportDomainError("RELATIONSHIP_LIMIT_EXCEEDED", {
          relationshipKind: kind,
          limit: options.maxRecords,
          actual: totalRecords,
        });
      }
    }
  }

  if (records.length === 0) {
    throw new ImportDomainError("NO_VALID_RELATIONSHIPS", { relationshipKind: kind });
  }

  const warnings: ImportWarning[] = [];
  if (invalidEntryCount > 0) {
    warnings.push(createImportWarning("INVALID_ENTRY_SKIPPED", invalidEntryCount, kind));
  }
  if (missingTimestampCount > 0) {
    warnings.push(
      createImportWarning("MISSING_OPTIONAL_TIMESTAMP", missingTimestampCount, kind),
    );
  }

  return { records, warnings };
}
