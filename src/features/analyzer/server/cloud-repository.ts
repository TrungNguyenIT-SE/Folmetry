import "server-only";

import type { PoolClient, QueryResultRow } from "pg";

import { authDatabase } from "@/features/auth/server/database";
import {
  normalizeFacebookName,
  normalizeInstagramHandle,
} from "@/features/analyzer/model/normalize-handle";
import { IMPORT_POLICY } from "@/features/analyzer/model/policy";
import type {
  LocalAccount,
  LocalSnapshot,
  RelationshipRecord,
  SocialPlatform,
} from "@/features/analyzer/model/types";
import {
  IMPORT_WARNING_CODES,
  type ImportWarning,
} from "@/features/analyzer/model/warnings";
import { PersistenceDomainError } from "@/features/analyzer/persistence/errors";
import type {
  AddSnapshotResult,
  CreateAccountInput,
  SaveSnapshotInput,
  UpdateAccountInput,
} from "@/features/analyzer/persistence";
import {
  normalizeAccountLabel,
  normalizeOptionalAccountUsername,
} from "@/features/analyzer/persistence/validation";

export const MAX_SYNC_BODY_BYTES = 4 * 1024 * 1024;
const warningCodes = new Set<string>(IMPORT_WARNING_CODES);

export function assertSyncBodySize(request: Request): void {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_SYNC_BODY_BYTES) {
    throw new PersistenceDomainError("SYNC_PAYLOAD_TOO_LARGE", {
      limit: MAX_SYNC_BODY_BYTES,
      actual: length,
    });
  }
}

function asTimestamp(value: unknown): number {
  const result = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new PersistenceDomainError("INVALID_SNAPSHOT");
  }
  return result;
}

function mapAccount(row: QueryResultRow): LocalAccount {
  return {
    id: String(row["id"]),
    platform: row["platform"] === "facebook" ? "facebook" : "instagram",
    label: String(row["label"]),
    ...(row["username"] === null ? {} : { username: String(row["username"]) }),
    createdAt: asTimestamp(row["created_at"]),
    updatedAt: asTimestamp(row["updated_at"]),
  };
}

function mapSnapshot(row: QueryResultRow): LocalSnapshot {
  const platform: SocialPlatform = row["platform"] === "facebook" ? "facebook" : "instagram";
  const friends = validateRelationships(row["friends"] ?? [], platform);
  const followers = validateRelationships(row["followers"], platform);
  const following = validateRelationships(row["following"], platform);
  return {
    id: String(row["id"]),
    accountId: String(row["account_id"]),
    platform,
    snapshotAt: asTimestamp(row["snapshot_at"]),
    importedAt: asTimestamp(row["imported_at"]),
    ...(row["source_file_name"] === null
      ? {}
      : { sourceFileName: String(row["source_file_name"]) }),
    ...(row["source_file_size"] === null
      ? {}
      : { sourceFileSize: asTimestamp(row["source_file_size"]) }),
    fingerprint: String(row["fingerprint"]),
    parserVersion: String(row["parser_version"]),
    ...(platform === "facebook" ? { friends, friendCount: Number(row["friend_count"] ?? friends.length) } : {}),
    followers,
    following,
    warnings: validateWarnings(row["warnings"]),
    followerCount: Number(row["follower_count"]),
    followingCount: Number(row["following_count"]),
  };
}

function validateRelationships(
  value: unknown,
  platform: SocialPlatform,
): readonly RelationshipRecord[] {
  if (!Array.isArray(value) || value.length > IMPORT_POLICY.maxRelationshipsPerKind) {
    throw new PersistenceDomainError("INVALID_SNAPSHOT");
  }
  const seen = new Set<string>();
  return value.map((candidate) => {
    if (typeof candidate !== "object" || candidate === null) {
      throw new PersistenceDomainError("INVALID_SNAPSHOT");
    }
    const record = candidate as Record<string, unknown>;
    const normalized = platform === "facebook"
      ? normalizeFacebookName(record["handle"])
      : normalizeInstagramHandle(record["handle"]);
    if (
      !normalized.ok ||
      record["normalizedHandle"] !== normalized.normalizedHandle ||
      (platform === "instagram" && seen.has(normalized.normalizedHandle))
    ) {
      throw new PersistenceDomainError("INVALID_SNAPSHOT");
    }
    seen.add(normalized.normalizedHandle);
    const connectedAt = record["connectedAt"];
    if (
      connectedAt !== undefined &&
      (!Number.isSafeInteger(connectedAt) || Number(connectedAt) < 0)
    ) {
      throw new PersistenceDomainError("INVALID_SNAPSHOT");
    }
    return {
      handle: normalized.handle,
      normalizedHandle: normalized.normalizedHandle,
      ...(connectedAt === undefined ? {} : { connectedAt: Number(connectedAt) }),
    };
  });
}

function validateWarnings(value: unknown): readonly ImportWarning[] {
  if (!Array.isArray(value) || value.length > IMPORT_WARNING_CODES.length * 2) {
    throw new PersistenceDomainError("INVALID_SNAPSHOT");
  }
  return value.map((candidate) => {
    if (typeof candidate !== "object" || candidate === null) {
      throw new PersistenceDomainError("INVALID_SNAPSHOT");
    }
    const warning = candidate as Record<string, unknown>;
    const code = warning["code"];
    const count = warning["count"];
    const relationshipKind = warning["relationshipKind"];
    if (
      typeof code !== "string" ||
      !warningCodes.has(code) ||
      !Number.isSafeInteger(count) ||
      Number(count) < 1 ||
      (relationshipKind !== undefined &&
        relationshipKind !== "followers" &&
        relationshipKind !== "following")
    ) {
      throw new PersistenceDomainError("INVALID_SNAPSHOT");
    }
    return {
      code: code as ImportWarning["code"],
      messageKey: `import.warning.${code.toLowerCase()}` as ImportWarning["messageKey"],
      count: Number(count),
      ...(relationshipKind === undefined
        ? {}
        : { relationshipKind: relationshipKind as "followers" | "following" }),
    };
  });
}

function validateSnapshot(input: SaveSnapshotInput): SaveSnapshotInput {
  if (
    (input.platform !== "instagram" && input.platform !== "facebook") ||
    typeof input.accountId !== "string" ||
    input.accountId.length === 0 ||
    !Number.isSafeInteger(input.snapshotAt) ||
    input.snapshotAt < 0 ||
    typeof input.fingerprint !== "string" ||
    !/^[a-f0-9]{64}$/.test(input.fingerprint) ||
    typeof input.parserVersion !== "string" ||
    input.parserVersion.length === 0 ||
    input.parserVersion.length > 100 ||
    (input.sourceFileName !== undefined &&
      (typeof input.sourceFileName !== "string" || input.sourceFileName.length > 255)) ||
    (input.sourceFileSize !== undefined &&
      (!Number.isSafeInteger(input.sourceFileSize) || input.sourceFileSize < 0))
  ) {
    throw new PersistenceDomainError("INVALID_SNAPSHOT");
  }
  return {
    ...input,
    ...(input.platform === "facebook"
      ? { friends: validateRelationships(input.friends ?? [], input.platform) }
      : {}),
    followers: validateRelationships(input.followers, input.platform),
    following: validateRelationships(input.following, input.platform),
    warnings: validateWarnings(input.warnings),
  };
}

async function withTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await authDatabase.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export class CloudAnalyzerRepository {
  constructor(private readonly ownerId: string) {}

  async listAccounts(platform?: SocialPlatform): Promise<readonly LocalAccount[]> {
    const result = await authDatabase.query(
      `SELECT * FROM folmetry_analyzer_account
       WHERE owner_id = $1 AND ($2::text IS NULL OR platform = $2)
       ORDER BY created_at ASC, id ASC`,
      [this.ownerId, platform ?? null],
    );
    return result.rows.map(mapAccount);
  }

  async createAccount(input: CreateAccountInput): Promise<LocalAccount> {
    if (input.platform !== "instagram" && input.platform !== "facebook") {
      throw new PersistenceDomainError("INVALID_ACCOUNT_USERNAME");
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    const label = normalizeAccountLabel(input.label);
    const username = normalizeOptionalAccountUsername(input.platform, input.username);
    const result = await authDatabase.query(
      `INSERT INTO folmetry_analyzer_account
       (id, owner_id, platform, label, username, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *`,
      [id, this.ownerId, input.platform, label, username ?? null, now],
    );
    return mapAccount(result.rows[0]);
  }

  async updateAccount(id: string, input: UpdateAccountInput): Promise<LocalAccount> {
    const current = await authDatabase.query(
      `SELECT * FROM folmetry_analyzer_account WHERE id = $1 AND owner_id = $2`,
      [id, this.ownerId],
    );
    if (current.rowCount !== 1) throw new PersistenceDomainError("ACCOUNT_NOT_FOUND");
    const account = mapAccount(current.rows[0]);
    const label = input.label === undefined ? account.label : normalizeAccountLabel(input.label);
    const username = input.username === undefined
      ? account.username
      : normalizeOptionalAccountUsername(account.platform, input.username);
    const result = await authDatabase.query(
      `UPDATE folmetry_analyzer_account SET label = $3, username = $4, updated_at = $5
       WHERE id = $1 AND owner_id = $2 RETURNING *`,
      [id, this.ownerId, label, username ?? null, Date.now()],
    );
    return mapAccount(result.rows[0]);
  }

  async deleteAccount(id: string): Promise<void> {
    const result = await authDatabase.query(
      `DELETE FROM folmetry_analyzer_account WHERE id = $1 AND owner_id = $2`,
      [id, this.ownerId],
    );
    if (result.rowCount !== 1) throw new PersistenceDomainError("ACCOUNT_NOT_FOUND");
  }

  async deleteAll(platform?: SocialPlatform): Promise<void> {
    await authDatabase.query(
      `DELETE FROM folmetry_analyzer_account
       WHERE owner_id = $1 AND ($2::text IS NULL OR platform = $2)`,
      [this.ownerId, platform ?? null],
    );
  }

  async listSnapshots(accountId: string): Promise<readonly LocalSnapshot[]> {
    const result = await authDatabase.query(
      `SELECT * FROM folmetry_analyzer_snapshot
       WHERE owner_id = $1 AND account_id = $2
       ORDER BY snapshot_at DESC, id ASC`,
      [this.ownerId, accountId],
    );
    return result.rows.map(mapSnapshot);
  }

  async getSnapshot(id: string): Promise<LocalSnapshot | undefined> {
    const result = await authDatabase.query(
      `SELECT * FROM folmetry_analyzer_snapshot WHERE id = $1 AND owner_id = $2`,
      [id, this.ownerId],
    );
    return result.rows[0] === undefined ? undefined : mapSnapshot(result.rows[0]);
  }

  async saveSnapshot(rawInput: SaveSnapshotInput): Promise<AddSnapshotResult> {
    const input = validateSnapshot(rawInput);
    return withTransaction(async (client) => {
      const accountResult = await client.query(
        `SELECT platform FROM folmetry_analyzer_account
         WHERE id = $1 AND owner_id = $2 FOR UPDATE`,
        [input.accountId, this.ownerId],
      );
      if (accountResult.rowCount !== 1) throw new PersistenceDomainError("ACCOUNT_NOT_FOUND");
      if (accountResult.rows[0]["platform"] !== input.platform) {
        throw new PersistenceDomainError("INVALID_SNAPSHOT");
      }
      const duplicate = await client.query(
        `SELECT * FROM folmetry_analyzer_snapshot
         WHERE owner_id = $1 AND account_id = $2 AND fingerprint = $3`,
        [this.ownerId, input.accountId, input.fingerprint],
      );
      if (duplicate.rows[0] !== undefined) {
        return { status: "duplicate", existing: mapSnapshot(duplicate.rows[0]) };
      }
      const id = crypto.randomUUID();
      const importedAt = Date.now();
      try {
        const result = await client.query(
          `INSERT INTO folmetry_analyzer_snapshot
           (id, owner_id, account_id, platform, snapshot_at, imported_at,
            source_file_name, source_file_size, fingerprint, parser_version,
            friends, followers, following, warnings, friend_count, follower_count, following_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                   $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16, $17)
           RETURNING *`,
          [
            id, this.ownerId, input.accountId, input.platform, input.snapshotAt,
            importedAt, input.sourceFileName ?? null, input.sourceFileSize ?? null,
            input.fingerprint, input.parserVersion, JSON.stringify(input.friends ?? []),
            JSON.stringify(input.followers), JSON.stringify(input.following), JSON.stringify(input.warnings),
            input.friends?.length ?? 0, input.followers.length, input.following.length,
          ],
        );
        return { status: "saved", snapshot: mapSnapshot(result.rows[0]) };
      } catch (error) {
        if (
          typeof error === "object" && error !== null &&
          "code" in error && error.code === "23505"
        ) {
          throw new PersistenceDomainError("SNAPSHOT_TIMESTAMP_CONFLICT");
        }
        throw error;
      }
    });
  }

  async deleteSnapshot(accountId: string, snapshotId: string): Promise<void> {
    const result = await authDatabase.query(
      `DELETE FROM folmetry_analyzer_snapshot
       WHERE id = $1 AND account_id = $2 AND owner_id = $3`,
      [snapshotId, accountId, this.ownerId],
    );
    if (result.rowCount !== 1) throw new PersistenceDomainError("SNAPSHOT_NOT_FOUND");
  }
}
