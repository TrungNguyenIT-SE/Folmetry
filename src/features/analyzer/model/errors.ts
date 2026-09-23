import type { RelationshipKind } from "@/features/analyzer/model/types";

export const IMPORT_ERROR_CODES = [
  "UNSUPPORTED_FILE_TYPE",
  "ARCHIVE_TOO_LARGE",
  "ARCHIVE_CORRUPTED",
  "ARCHIVE_ENCRYPTED",
  "ARCHIVE_TOO_MANY_ENTRIES",
  "ARCHIVE_UNSAFE_PATH",
  "ARCHIVE_SUSPICIOUS_COMPRESSION",
  "RELEVANT_DATA_TOO_LARGE",
  "FOLLOWERS_FILE_NOT_FOUND",
  "FOLLOWING_FILE_NOT_FOUND",
  "FRIENDS_FILE_NOT_FOUND",
  "INCOMPLETE_MULTIPART_FOLLOWERS",
  "UNSUPPORTED_HTML_EXPORT",
  "INVALID_JSON",
  "UNSUPPORTED_INSTAGRAM_SCHEMA",
  "UNSUPPORTED_FACEBOOK_SCHEMA",
  "NO_VALID_RELATIONSHIPS",
  "RELATIONSHIP_LIMIT_EXCEEDED",
  "IMPORT_CANCELLED",
  "INDEXEDDB_UNAVAILABLE",
  "INDEXEDDB_QUOTA_EXCEEDED",
  "SNAPSHOT_DUPLICATE",
  "UNKNOWN_IMPORT_ERROR",
] as const;

export type ImportErrorCode = (typeof IMPORT_ERROR_CODES)[number];

export interface SafeImportErrorContext {
  readonly reason?: string;
  readonly limit?: number;
  readonly actual?: number;
  readonly partNumber?: number;
  readonly relationshipKind?: RelationshipKind;
}

export interface SerializedImportError {
  readonly code: ImportErrorCode;
  readonly titleKey: `import.error.${Lowercase<ImportErrorCode>}.title`;
  readonly messageKey: `import.error.${Lowercase<ImportErrorCode>}.message`;
  readonly actionKey: `import.error.${Lowercase<ImportErrorCode>}.action`;
  readonly context?: SafeImportErrorContext;
}

export class ImportDomainError extends Error {
  readonly code: ImportErrorCode;
  readonly context: SafeImportErrorContext | undefined;

  constructor(code: ImportErrorCode, context?: SafeImportErrorContext) {
    super(code);
    this.name = "ImportDomainError";
    this.code = code;
    this.context = context;
  }
}

export function serializeImportError(error: unknown): SerializedImportError {
  const domainError =
    error instanceof ImportDomainError
      ? error
      : new ImportDomainError("UNKNOWN_IMPORT_ERROR");
  const lowerCode = domainError.code.toLowerCase() as Lowercase<ImportErrorCode>;
  const titleKey: SerializedImportError["titleKey"] = `import.error.${lowerCode}.title`;
  const messageKey: SerializedImportError["messageKey"] = `import.error.${lowerCode}.message`;
  const actionKey: SerializedImportError["actionKey"] = `import.error.${lowerCode}.action`;

  return {
    code: domainError.code,
    titleKey,
    messageKey,
    actionKey,
    ...(domainError.context === undefined ? {} : { context: domainError.context }),
  };
}
