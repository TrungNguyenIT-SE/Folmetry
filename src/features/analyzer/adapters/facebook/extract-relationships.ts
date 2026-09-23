import { ImportDomainError } from "@/features/analyzer/model/errors";
import { normalizeFacebookName } from "@/features/analyzer/model/normalize-handle";
import { parseRelationshipTimestamp } from "@/features/analyzer/model/timestamp";
import type { RelationshipKind, RelationshipRecord } from "@/features/analyzer/model/types";
import { createImportWarning, type ImportWarning } from "@/features/analyzer/model/warnings";

interface ExtractionOptions {
  readonly maxRecords?: number;
  readonly signal?: AbortSignal;
}

interface ExtractedFacebookRelationships {
  readonly records: readonly RelationshipRecord[];
  readonly warnings: readonly ImportWarning[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type FacebookCollection = "friends" | "followers" | "following";

function entriesFor(content: unknown, kind: RelationshipKind, collection: FacebookCollection): readonly unknown[] {
  if (!isObject(content)) {
    throw new ImportDomainError("UNSUPPORTED_FACEBOOK_SCHEMA", {
      relationshipKind: kind,
      reason: "unrecognized-top-level-shape",
    });
  }
  const keys = collection === "friends"
    ? ["friends_v2", "friends"]
    : collection === "followers"
      ? ["followers_v3", "followers_v2", "followers"]
      : ["following_v3", "following_v2", "following"];
  for (const key of keys) {
    if (Array.isArray(content[key])) return content[key];
  }
  throw new ImportDomainError("UNSUPPORTED_FACEBOOK_SCHEMA", {
    relationshipKind: kind,
    reason: "unrecognized-top-level-key",
  });
}

function candidateName(entry: Record<string, unknown>): unknown {
  if (typeof entry["name"] === "string") return entry["name"];
  if (typeof entry["title"] === "string") return entry["title"];
  if (typeof entry["value"] === "string") return entry["value"];
  const list = entry["string_list_data"];
  if (Array.isArray(list) && isObject(list[0])) return list[0]["value"];
  return undefined;
}

function candidateTimestamp(entry: Record<string, unknown>): unknown {
  if (entry["timestamp"] !== undefined) return entry["timestamp"];
  const list = entry["string_list_data"];
  return Array.isArray(list) && isObject(list[0]) ? list[0]["timestamp"] : undefined;
}

export function extractFacebookRelationships(
  content: unknown,
  kind: RelationshipKind,
  options: ExtractionOptions = {},
  collection: FacebookCollection = kind,
): ExtractedFacebookRelationships {
  const entries = entriesFor(content, kind, collection);
  const records: RelationshipRecord[] = [];
  let invalidEntryCount = 0;
  let missingTimestampCount = 0;

  for (const entry of entries) {
    if (options.signal?.aborted === true) throw new ImportDomainError("IMPORT_CANCELLED");
    if (!isObject(entry)) {
      invalidEntryCount += 1;
      continue;
    }
    const normalized = normalizeFacebookName(candidateName(entry));
    if (!normalized.ok) {
      invalidEntryCount += 1;
      continue;
    }
    const connectedAt = parseRelationshipTimestamp(candidateTimestamp(entry));
    if (connectedAt === undefined) missingTimestampCount += 1;
    records.push({
      handle: normalized.handle,
      normalizedHandle: normalized.normalizedHandle,
      ...(connectedAt === undefined ? {} : { connectedAt }),
    });
    if (options.maxRecords !== undefined && records.length > options.maxRecords) {
      throw new ImportDomainError("RELATIONSHIP_LIMIT_EXCEEDED", {
        relationshipKind: kind,
        limit: options.maxRecords,
        actual: records.length,
      });
    }
  }

  const warnings: ImportWarning[] = [];
  if (invalidEntryCount > 0) {
    warnings.push(createImportWarning("INVALID_ENTRY_SKIPPED", invalidEntryCount, kind));
  }
  if (missingTimestampCount > 0) {
    warnings.push(createImportWarning("MISSING_OPTIONAL_TIMESTAMP", missingTimestampCount, kind));
  }
  return { records, warnings };
}
