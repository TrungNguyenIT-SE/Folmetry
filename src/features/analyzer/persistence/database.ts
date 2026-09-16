import Dexie, { type DexieOptions, type EntityTable } from "dexie";

import type {
  LocalAccount,
  LocalSetting,
  LocalSnapshot,
} from "@/features/analyzer/model/types";
import { PersistenceDomainError, mapPersistenceError } from "@/features/analyzer/persistence/errors";

export const ANALYZER_DATABASE_NAME = "social-relationship-analyzer";
export const ANALYZER_DATABASE_VERSION = 1;

export const ANALYZER_DATABASE_SCHEMA = Object.freeze({
  accounts: "id, platform, username, createdAt, updatedAt",
  snapshots:
    "id, accountId, &[accountId+snapshotAt], &[accountId+fingerprint], fingerprint, importedAt",
  settings: "key",
} as const);

export class AnalyzerDatabase extends Dexie {
  declare accounts: EntityTable<LocalAccount, "id">;
  declare snapshots: EntityTable<LocalSnapshot, "id">;
  declare settings: EntityTable<LocalSetting, "key">;

  constructor(name = ANALYZER_DATABASE_NAME, options?: DexieOptions) {
    super(name, options);
    this.version(ANALYZER_DATABASE_VERSION).stores(ANALYZER_DATABASE_SCHEMA);
  }
}

export interface AnalyzerDatabaseOptions {
  readonly name?: string;
  readonly indexedDB?: DexieOptions["indexedDB"];
  readonly IDBKeyRange?: DexieOptions["IDBKeyRange"];
}

export function createAnalyzerDatabase(
  options: AnalyzerDatabaseOptions = {},
): AnalyzerDatabase {
  const indexedDB = options.indexedDB ?? globalThis.indexedDB;
  const IDBKeyRange = options.IDBKeyRange ?? globalThis.IDBKeyRange;
  if (indexedDB === undefined || IDBKeyRange === undefined) {
    throw new PersistenceDomainError("INDEXEDDB_UNAVAILABLE");
  }
  return new AnalyzerDatabase(options.name, { indexedDB, IDBKeyRange });
}

export interface OpenAnalyzerDatabaseOptions {
  readonly openOperation?: () => Promise<unknown>;
}

export async function openAnalyzerDatabase(
  database: AnalyzerDatabase,
  options: OpenAnalyzerDatabaseOptions = {},
): Promise<void> {
  let rejectBlocked: ((reason: PersistenceDomainError) => void) | undefined;
  const blocked = new Promise<never>((_resolve, reject) => {
    rejectBlocked = reject;
  });
  const onBlocked = (): void => {
    rejectBlocked?.(
      new PersistenceDomainError("PERSISTENCE_MIGRATION_FAILED", {
        reason: "blocked-upgrade",
      }),
    );
  };
  database.on("blocked", onBlocked);
  try {
    await Promise.race([options.openOperation?.() ?? database.open(), blocked]);
  } catch (error) {
    database.close({ disableAutoOpen: true });
    throw mapPersistenceError(error, "migration");
  } finally {
    database.on("blocked").unsubscribe(onBlocked);
  }
}

export async function deleteAnalyzerDatabase(database: AnalyzerDatabase): Promise<void> {
  try {
    await database.delete();
  } catch (error) {
    throw mapPersistenceError(error, "operation");
  }
}
