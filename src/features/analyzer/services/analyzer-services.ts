import type { LocalAccount, LocalSnapshot } from "@/features/analyzer/model/types";
import {
  AccountRepository,
  analyzerDatabaseNameForOwner,
  createAnalyzerDatabase,
  LocalDataRepository,
  saveSnapshotWithMemoryFallback,
  SnapshotRepository,
  type CreateAccountInput,
  type SaveSnapshotInput,
  type SnapshotSaveWithFallbackResult,
  type UpdateAccountInput,
} from "@/features/analyzer/persistence";
import {
  ImportWorkerClient,
  type ImportWorkerResult,
  type ProgressListener,
} from "@/features/analyzer/workers";

export interface AnalyzerServices {
  listAccounts(): Promise<readonly LocalAccount[]>;
  createAccount(input: CreateAccountInput): Promise<LocalAccount>;
  updateAccount(id: string, input: UpdateAccountInput): Promise<LocalAccount>;
  deleteAccount(id: string): Promise<void>;
  listSnapshots(accountId: string): Promise<readonly LocalSnapshot[]>;
  getSnapshot(id: string): Promise<LocalSnapshot | undefined>;
  findPrior(accountId: string, snapshotAt: number): Promise<LocalSnapshot | undefined>;
  findDuplicate(accountId: string, fingerprint: string): Promise<LocalSnapshot | undefined>;
  saveSnapshot(input: SaveSnapshotInput): Promise<SnapshotSaveWithFallbackResult>;
  deleteSnapshot(accountId: string, snapshotId: string): Promise<void>;
  deleteAll(): Promise<void>;
  parseArchive(file: File, jobId: string, onProgress: ProgressListener): Promise<ImportWorkerResult>;
  parseFiles(files: readonly File[], jobId: string, onProgress: ProgressListener): Promise<ImportWorkerResult>;
  cancelImport(): void;
  close(): void;
}

export function createBrowserAnalyzerServices(ownerId: string): AnalyzerServices {
  const database = createAnalyzerDatabase({
    name: analyzerDatabaseNameForOwner(ownerId),
  });
  const accounts = new AccountRepository(database);
  const snapshots = new SnapshotRepository(database);
  const localData = new LocalDataRepository(database);
  const worker = new ImportWorkerClient();

  return {
    listAccounts: () => accounts.list(),
    createAccount: (input) => accounts.create(input),
    updateAccount: (id, input) => accounts.update(id, input),
    deleteAccount: (id) =>
      accounts.delete(id, { confirmed: true, cascadeAcknowledged: true }),
    listSnapshots: (accountId) => snapshots.listByAccount(accountId),
    getSnapshot: (id) => snapshots.getById(id),
    findPrior: (accountId, snapshotAt) => snapshots.findNearestPrior(accountId, snapshotAt),
    findDuplicate: (accountId, fingerprint) =>
      snapshots.findByFingerprint(accountId, fingerprint),
    saveSnapshot: (input) => saveSnapshotWithMemoryFallback(snapshots, input),
    deleteSnapshot: (accountId, snapshotId) =>
      snapshots.delete(accountId, snapshotId, { confirmed: true }),
    deleteAll: () => localData.deleteAll({ confirmed: true, scope: "all-local-data" }),
    parseArchive: (file, jobId, onProgress) => worker.parseArchive(jobId, file, onProgress),
    parseFiles: (files, jobId, onProgress) => worker.parseFiles(jobId, files, onProgress),
    cancelImport: () => worker.cancel(),
    close: () => {
      worker.dispose();
      database.close();
    },
  };
}
