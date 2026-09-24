import type { LocalAccount, LocalSnapshot, SocialPlatform } from "@/features/analyzer/model/types";
import {
  PersistenceDomainError,
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
  saveSnapshot(input: SaveSnapshotInput): Promise<SnapshotSaveWithFallbackResult>;
  deleteSnapshot(accountId: string, snapshotId: string): Promise<void>;
  deleteAll(): Promise<void>;
  parseArchive(file: File, jobId: string, onProgress: ProgressListener): Promise<ImportWorkerResult>;
  parseFiles(files: readonly File[], jobId: string, onProgress: ProgressListener): Promise<ImportWorkerResult>;
  cancelImport(): void;
  close(): void;
}

interface ApiErrorBody {
  readonly code?: unknown;
}

async function requestJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
        ...init.headers,
      },
    });
  } catch {
    throw new PersistenceDomainError("SYNC_UNAVAILABLE");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiErrorBody;
    const code = typeof body.code === "string" ? body.code : "SYNC_UNAVAILABLE";
    const allowed = new Set([
      "SYNC_UNAVAILABLE", "SYNC_PAYLOAD_TOO_LARGE", "ACCOUNT_NOT_FOUND",
      "SNAPSHOT_NOT_FOUND", "SNAPSHOT_TIMESTAMP_CONFLICT", "INVALID_ACCOUNT_LABEL",
      "INVALID_ACCOUNT_USERNAME", "INVALID_SNAPSHOT",
    ]);
    throw new PersistenceDomainError(
      (allowed.has(code) ? code : "SYNC_UNAVAILABLE") as ConstructorParameters<typeof PersistenceDomainError>[0],
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function actionRequest<T>(method: "POST" | "PATCH" | "DELETE", body: unknown): Promise<T> {
  return requestJson<T>("/api/analyzer", { method, body: JSON.stringify(body) });
}

/**
 * Files are still parsed locally by the worker. Only the normalized, confirmed
 * account/snapshot model crosses this client boundary and is stored by user ID.
 */
export function createCloudAnalyzerServices(platform: SocialPlatform = "instagram"): AnalyzerServices {
  const worker = new ImportWorkerClient(platform);

  return {
    listAccounts: async () => (await requestJson<{ accounts: readonly LocalAccount[] }>(
      `/api/analyzer?resource=accounts&platform=${platform}`,
    )).accounts,
    createAccount: async (input) => (await actionRequest<{ account: LocalAccount }>(
      "POST", { action: "createAccount", input },
    )).account,
    updateAccount: async (id, input) => (await actionRequest<{ account: LocalAccount }>(
      "PATCH", { action: "updateAccount", id, input },
    )).account,
    deleteAccount: (id) => actionRequest<void>("DELETE", { action: "deleteAccount", id }),
    listSnapshots: async (accountId) => (await requestJson<{ snapshots: readonly LocalSnapshot[] }>(
      `/api/analyzer?resource=snapshots&accountId=${encodeURIComponent(accountId)}`,
    )).snapshots,
    getSnapshot: async (id) => {
      const result = await requestJson<{ snapshot: LocalSnapshot | null }>(
        `/api/analyzer?resource=snapshot&id=${encodeURIComponent(id)}`,
      );
      return result.snapshot ?? undefined;
    },
    saveSnapshot: async (input) => (await actionRequest<{ result: SnapshotSaveWithFallbackResult }>(
      "POST", { action: "saveSnapshot", input },
    )).result,
    deleteSnapshot: (accountId, snapshotId) => actionRequest<void>(
      "DELETE", { action: "deleteSnapshot", accountId, snapshotId },
    ),
    deleteAll: () => actionRequest<void>("DELETE", { action: "deleteAll", platform }),
    parseArchive: (file, jobId, onProgress) => worker.parseArchive(jobId, file, onProgress),
    parseFiles: (files, jobId, onProgress) => worker.parseFiles(jobId, files, onProgress),
    cancelImport: () => worker.cancel(),
    close: () => {
      worker.dispose();
    },
  };
}
