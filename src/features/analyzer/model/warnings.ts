export const IMPORT_WARNING_CODES = [
  "MULTIPART_FOLLOWERS_MERGED",
  "DUPLICATE_HANDLES_REMOVED",
  "INVALID_ENTRY_SKIPPED",
  "MISSING_OPTIONAL_TIMESTAMP",
  "UNKNOWN_NON_CRITICAL_FILE_IGNORED",
  "LARGE_EXPORT_PERFORMANCE_WARNING",
  "MANUAL_IMPORT_COMPLETENESS_UNVERIFIED",
  "TIMESTAMP_CONFLICT_RESOLVED",
  "HISTORICAL_COUNT_INCONSISTENCY",
] as const;

export type ImportWarningCode = (typeof IMPORT_WARNING_CODES)[number];

export interface ImportWarning {
  readonly code: ImportWarningCode;
  readonly messageKey: `import.warning.${Lowercase<ImportWarningCode>}`;
  readonly count: number;
  readonly relationshipKind?: "followers" | "following";
}

export function createImportWarning(
  code: ImportWarningCode,
  count = 1,
  relationshipKind?: ImportWarning["relationshipKind"],
): ImportWarning {
  return {
    code,
    messageKey: `import.warning.${code.toLowerCase()}` as ImportWarning["messageKey"],
    count,
    ...(relationshipKind === undefined ? {} : { relationshipKind }),
  };
}

export function mergeImportWarnings(
  warnings: readonly ImportWarning[],
): readonly ImportWarning[] {
  const merged = new Map<string, ImportWarning>();

  for (const warning of warnings) {
    const key = `${warning.code}:${warning.relationshipKind ?? "all"}`;
    const current = merged.get(key);
    merged.set(
      key,
      createImportWarning(
        warning.code,
        (current?.count ?? 0) + warning.count,
        warning.relationshipKind,
      ),
    );
  }

  return [...merged.values()].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code, "en");
    return codeOrder === 0
      ? (left.relationshipKind ?? "").localeCompare(right.relationshipKind ?? "", "en")
      : codeOrder;
  });
}
