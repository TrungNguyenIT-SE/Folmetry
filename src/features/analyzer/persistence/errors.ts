export const PERSISTENCE_ERROR_CODES = [
  "INDEXEDDB_UNAVAILABLE",
  "INDEXEDDB_QUOTA_EXCEEDED",
  "PERSISTENCE_TRANSACTION_FAILED",
  "PERSISTENCE_MIGRATION_FAILED",
  "SYNC_UNAVAILABLE",
  "SYNC_PAYLOAD_TOO_LARGE",
  "UNKNOWN_PERSISTENCE_ERROR",
  "ACCOUNT_NOT_FOUND",
  "SNAPSHOT_NOT_FOUND",
  "SNAPSHOT_DUPLICATE",
  "SNAPSHOT_TIMESTAMP_CONFLICT",
  "INVALID_ACCOUNT_LABEL",
  "INVALID_ACCOUNT_USERNAME",
  "INVALID_SNAPSHOT",
  "INVALID_SETTING",
  "DELETION_CONFIRMATION_REQUIRED",
] as const;

export type PersistenceErrorCode = (typeof PERSISTENCE_ERROR_CODES)[number];

export interface SafePersistenceErrorContext {
  readonly reason?: string;
  readonly existingId?: string;
  readonly limit?: number;
  readonly actual?: number;
}

export class PersistenceDomainError extends Error {
  readonly code: PersistenceErrorCode;
  readonly context: SafePersistenceErrorContext | undefined;

  constructor(code: PersistenceErrorCode, context?: SafePersistenceErrorContext) {
    super(code);
    this.name = "PersistenceDomainError";
    this.code = code;
    this.context = context;
  }
}

export type PersistencePhase = "open" | "migration" | "transaction" | "operation";

function errorNames(error: unknown): readonly string[] {
  const names: string[] = [];
  let current = error;
  const visited = new Set<unknown>();
  while (typeof current === "object" && current !== null && !visited.has(current)) {
    visited.add(current);
    const record = current as { name?: unknown; inner?: unknown; cause?: unknown };
    if (typeof record.name === "string") names.push(record.name);
    current = record.inner ?? record.cause;
  }
  return names;
}

export function mapPersistenceError(
  error: unknown,
  phase: PersistencePhase,
): PersistenceDomainError {
  if (error instanceof PersistenceDomainError) return error;
  const names = errorNames(error);
  if (names.some((name) => name === "QuotaExceededError")) {
    return new PersistenceDomainError("INDEXEDDB_QUOTA_EXCEEDED");
  }
  if (
    names.some((name) =>
      [
        "MissingAPIError",
        "OpenFailedError",
        "DatabaseClosedError",
        "InvalidStateError",
        "SecurityError",
        "UnknownError",
      ].includes(name),
    )
  ) {
    return new PersistenceDomainError("INDEXEDDB_UNAVAILABLE");
  }
  if (
    phase === "migration" ||
    names.some((name) => ["UpgradeError", "VersionError", "SchemaError"].includes(name))
  ) {
    return new PersistenceDomainError("PERSISTENCE_MIGRATION_FAILED");
  }
  if (
    phase === "transaction" ||
    names.some((name) =>
      [
        "AbortError",
        "TransactionInactiveError",
        "PrematureCommitError",
        "ReadOnlyError",
      ].includes(name),
    )
  ) {
    return new PersistenceDomainError("PERSISTENCE_TRANSACTION_FAILED");
  }
  return new PersistenceDomainError("UNKNOWN_PERSISTENCE_ERROR");
}
