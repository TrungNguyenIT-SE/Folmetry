import Dexie from "dexie";

import type { LocalSnapshot, Snapshot } from "@/features/analyzer/model/types";
import type { AnalyzerDatabase } from "@/features/analyzer/persistence/database";
import { PersistenceDomainError, mapPersistenceError } from "@/features/analyzer/persistence/errors";

export type SaveSnapshotInput = Omit<Snapshot, "id" | "importedAt"> & {
  readonly id?: string;
  readonly importedAt?: number;
};

export type AddSnapshotResult =
  | { readonly status: "saved"; readonly snapshot: LocalSnapshot }
  | { readonly status: "duplicate"; readonly existing: LocalSnapshot };

export interface SnapshotDeleteConfirmation {
  readonly confirmed: true;
}

export interface SnapshotRepositoryDependencies {
  readonly now?: () => number;
  readonly createId?: () => string;
}

function assertValidSnapshot(input: SaveSnapshotInput): void {
  if (
    !Number.isSafeInteger(input.snapshotAt) ||
    input.snapshotAt < 0 ||
    (input.importedAt !== undefined &&
      (!Number.isSafeInteger(input.importedAt) || input.importedAt < 0)) ||
    (input.sourceFileSize !== undefined &&
      (!Number.isSafeInteger(input.sourceFileSize) || input.sourceFileSize < 0)) ||
    input.parserVersion.length === 0 ||
    !/^[a-f0-9]{64}$/.test(input.fingerprint) ||
    input.accountId.length === 0
  ) {
    throw new PersistenceDomainError("INVALID_SNAPSHOT");
  }
}

function buildStoredSnapshot(
  input: SaveSnapshotInput,
  id: string,
  importedAt: number,
): LocalSnapshot {
  return {
    id,
    accountId: input.accountId,
    platform: input.platform,
    snapshotAt: input.snapshotAt,
    importedAt,
    ...(input.sourceFileName === undefined ? {} : { sourceFileName: input.sourceFileName }),
    ...(input.sourceFileSize === undefined ? {} : { sourceFileSize: input.sourceFileSize }),
    fingerprint: input.fingerprint,
    parserVersion: input.parserVersion,
    ...(input.platform === "facebook"
      ? { friends: [...(input.friends ?? [])], friendCount: input.friends?.length ?? 0 }
      : {}),
    followers: [...input.followers],
    following: [...input.following],
    warnings: [...input.warnings],
    followerCount: input.followers.length,
    followingCount: input.following.length,
  };
}

export class SnapshotRepository {
  private readonly now: () => number;
  private readonly createId: () => string;

  constructor(
    private readonly database: AnalyzerDatabase,
    dependencies: SnapshotRepositoryDependencies = {},
  ) {
    this.now = dependencies.now ?? Date.now;
    this.createId = dependencies.createId ?? (() => globalThis.crypto.randomUUID());
  }

  async add(input: SaveSnapshotInput): Promise<AddSnapshotResult> {
    assertValidSnapshot(input);
    const snapshot = buildStoredSnapshot(
      input,
      input.id ?? this.createId(),
      input.importedAt ?? this.now(),
    );
    try {
      return await this.database.transaction(
        "rw",
        this.database.accounts,
        this.database.snapshots,
        async () => {
          const account = await this.database.accounts.get(input.accountId);
          if (account === undefined) throw new PersistenceDomainError("ACCOUNT_NOT_FOUND");
          if (account.platform !== input.platform) {
            throw new PersistenceDomainError("INVALID_SNAPSHOT", {
              reason: "account-platform-mismatch",
            });
          }
          const duplicate = await this.findByFingerprint(input.accountId, input.fingerprint);
          if (duplicate !== undefined) return { status: "duplicate", existing: duplicate };
          const sameTimestamp = await this.database.snapshots
            .where("[accountId+snapshotAt]")
            .equals([input.accountId, input.snapshotAt])
            .first();
          if (sameTimestamp !== undefined) {
            throw new PersistenceDomainError("SNAPSHOT_TIMESTAMP_CONFLICT", {
              existingId: sameTimestamp.id,
            });
          }
          await this.database.snapshots.add(snapshot);
          return { status: "saved", snapshot };
        },
      );
    } catch (error) {
      if (error instanceof PersistenceDomainError) throw error;
      if (typeof error === "object" && error !== null && "name" in error && error.name === "ConstraintError") {
        const duplicate = await this.findByFingerprint(input.accountId, input.fingerprint);
        if (duplicate !== undefined) return { status: "duplicate", existing: duplicate };
        const sameTimestamp = await this.findAtTimestamp(input.accountId, input.snapshotAt);
        throw new PersistenceDomainError("SNAPSHOT_TIMESTAMP_CONFLICT", {
          ...(sameTimestamp === undefined ? {} : { existingId: sameTimestamp.id }),
        });
      }
      throw mapPersistenceError(error, "transaction");
    }
  }

  async getById(id: string): Promise<LocalSnapshot | undefined> {
    try {
      return await this.database.snapshots.get(id);
    } catch (error) {
      throw mapPersistenceError(error, "operation");
    }
  }

  async listByAccount(accountId: string): Promise<readonly LocalSnapshot[]> {
    try {
      return await this.database.snapshots
        .where("[accountId+snapshotAt]")
        .between([accountId, Dexie.minKey], [accountId, Dexie.maxKey])
        .reverse()
        .toArray();
    } catch (error) {
      throw mapPersistenceError(error, "operation");
    }
  }

  async findByFingerprint(
    accountId: string,
    fingerprint: string,
  ): Promise<LocalSnapshot | undefined> {
    try {
      return await this.database.snapshots
        .where("[accountId+fingerprint]")
        .equals([accountId, fingerprint])
        .first();
    } catch (error) {
      throw mapPersistenceError(error, "operation");
    }
  }

  async findNearestPrior(
    accountId: string,
    snapshotAt: number,
  ): Promise<LocalSnapshot | undefined> {
    try {
      return await this.database.snapshots
        .where("[accountId+snapshotAt]")
        .between([accountId, Dexie.minKey], [accountId, snapshotAt], true, false)
        .last();
    } catch (error) {
      throw mapPersistenceError(error, "operation");
    }
  }

  async delete(
    accountId: string,
    snapshotId: string,
    confirmation?: SnapshotDeleteConfirmation,
  ): Promise<void> {
    if (confirmation?.confirmed !== true) {
      throw new PersistenceDomainError("DELETION_CONFIRMATION_REQUIRED", {
        reason: "snapshot",
      });
    }
    try {
      await this.database.transaction("rw", this.database.snapshots, async () => {
        const snapshot = await this.database.snapshots.get(snapshotId);
        if (snapshot === undefined || snapshot.accountId !== accountId) {
          throw new PersistenceDomainError("SNAPSHOT_NOT_FOUND");
        }
        await this.database.snapshots.delete(snapshotId);
      });
    } catch (error) {
      throw mapPersistenceError(error, "transaction");
    }
  }

  async deleteAllForAccount(
    accountId: string,
    confirmation?: SnapshotDeleteConfirmation,
  ): Promise<void> {
    if (confirmation?.confirmed !== true) {
      throw new PersistenceDomainError("DELETION_CONFIRMATION_REQUIRED", {
        reason: "account-history",
      });
    }
    try {
      await this.database.snapshots.where("accountId").equals(accountId).delete();
    } catch (error) {
      throw mapPersistenceError(error, "transaction");
    }
  }

  private async findAtTimestamp(
    accountId: string,
    snapshotAt: number,
  ): Promise<LocalSnapshot | undefined> {
    return this.database.snapshots
      .where("[accountId+snapshotAt]")
      .equals([accountId, snapshotAt])
      .first();
  }
}

export type SnapshotSaveWithFallbackResult =
  | AddSnapshotResult
  | {
      readonly status: "not-saved";
      readonly draft: SaveSnapshotInput;
      readonly error: PersistenceDomainError;
    };

export async function saveSnapshotWithMemoryFallback(
  repository: SnapshotRepository,
  draft: SaveSnapshotInput,
): Promise<SnapshotSaveWithFallbackResult> {
  try {
    return await repository.add(draft);
  } catch (error) {
    return {
      status: "not-saved",
      draft,
      error: mapPersistenceError(error, "operation"),
    };
  }
}
