import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Snapshot } from "@/features/analyzer/model/types";
import {
  ACCOUNT_LABEL_MAX_LENGTH,
  AccountRepository,
  ANALYZER_DATABASE_NAME,
  ANALYZER_DATABASE_SCHEMA,
  ANALYZER_DATABASE_VERSION,
  analyzerDatabaseNameForOwner,
  AnalyzerDatabase,
  createAnalyzerDatabase,
  deleteAnalyzerDatabase,
  LocalDataRepository,
  mapPersistenceError,
  openAnalyzerDatabase,
  PersistenceDomainError,
  saveSnapshotWithMemoryFallback,
  SettingsRepository,
  SnapshotRepository,
  type SaveSnapshotInput,
} from "@/features/analyzer/persistence";

const databases: AnalyzerDatabase[] = [];
let sequence = 0;

function databaseName(): string {
  sequence += 1;
  return `analyzer-test-${sequence}`;
}

function createTestDatabase(name = databaseName()): AnalyzerDatabase {
  const database = createAnalyzerDatabase({ name, indexedDB, IDBKeyRange });
  databases.push(database);
  return database;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

function draft(
  accountId: string,
  snapshotAt: number,
  fingerprintCharacter: string,
  platform: Snapshot["platform"] = "instagram",
): SaveSnapshotInput {
  return {
    accountId,
    platform,
    snapshotAt,
    fingerprint: fingerprintCharacter.repeat(64),
    parserVersion: "instagram-json@1",
    followers: [
      { handle: "Alice", normalizedHandle: "alice", connectedAt: 1_700_000_000_000 },
    ],
    following: [{ handle: "Bob", normalizedHandle: "bob" }],
    warnings: [],
  };
}

async function accountAndSnapshots(database: AnalyzerDatabase) {
  const accounts = new AccountRepository(database, {
    now: () => 1_700_000_000_000,
    createId: () => "account-1",
  });
  const snapshots = new SnapshotRepository(database, {
    now: () => 1_700_000_100_000,
    createId: (() => {
      let id = 0;
      return () => `snapshot-${++id}`;
    })(),
  });
  await accounts.create({ platform: "instagram", label: "Primary" });
  return { accounts, snapshots };
}

describe("database schema", () => {
  it("isolates authenticated owners and leaves unscoped legacy data quarantined", async () => {
    const legacyDatabase = createTestDatabase(ANALYZER_DATABASE_NAME);
    const adminDatabase = createTestDatabase(analyzerDatabaseNameForOwner("admin-user-id"));
    const regularDatabase = createTestDatabase(analyzerDatabaseNameForOwner("regular-user-id"));
    const legacyAccounts = new AccountRepository(legacyDatabase, {
      createId: () => "legacy-account",
    });
    const adminAccounts = new AccountRepository(adminDatabase, {
      createId: () => "admin-account",
    });
    const regularAccounts = new AccountRepository(regularDatabase);

    await legacyAccounts.create({ platform: "instagram", label: "Unknown legacy owner" });
    await adminAccounts.create({ platform: "instagram", label: "Admin private archive" });

    expect(analyzerDatabaseNameForOwner("admin-user-id")).not.toBe(
      analyzerDatabaseNameForOwner("regular-user-id"),
    );
    expect(analyzerDatabaseNameForOwner("admin-user-id")).not.toBe(ANALYZER_DATABASE_NAME);
    expect((await adminAccounts.list()).map(({ label }) => label)).toEqual([
      "Admin private archive",
    ]);
    expect(await regularAccounts.list()).toEqual([]);
    expect((await legacyAccounts.list()).map(({ label }) => label)).toEqual([
      "Unknown legacy owner",
    ]);
  });

  it("rejects a missing authenticated owner scope", () => {
    expect(() => analyzerDatabaseNameForOwner("   ")).toThrowError(
      expect.objectContaining({
        code: "UNKNOWN_PERSISTENCE_ERROR",
        context: { reason: "invalid-owner-scope" },
      }),
    );
  });

  it("opens an explicit v1 schema without indexing nested relationship arrays", async () => {
    const database = createTestDatabase();
    await openAnalyzerDatabase(database);
    expect(database.verno).toBe(ANALYZER_DATABASE_VERSION);
    expect(ANALYZER_DATABASE_SCHEMA.snapshots).not.toMatch(/followers|following|warnings/);
    expect(database.tables.map((table) => table.name).sort()).toEqual([
      "accounts",
      "settings",
      "snapshots",
    ]);
  });

  it("opens an empty database and preserves an existing v1 database", async () => {
    const name = databaseName();
    const first = createTestDatabase(name);
    const accounts = new AccountRepository(first, {
      now: () => 10,
      createId: () => "preserved-account",
    });
    await accounts.create({ platform: "instagram", label: "Preserved" });
    first.close();

    const reopened = createTestDatabase(name);
    await openAnalyzerDatabase(reopened);
    expect(await reopened.accounts.get("preserved-account")).toMatchObject({ label: "Preserved" });
  });

  it("fails a blocked upgrade explicitly instead of retrying forever", async () => {
    const database = createTestDatabase();
    const pending = openAnalyzerDatabase(database, {
      openOperation: () => new Promise(() => undefined),
    });
    database.on("blocked").fire(new Event("blocked"));
    await expect(pending).rejects.toMatchObject({
      code: "PERSISTENCE_MIGRATION_FAILED",
      context: { reason: "blocked-upgrade" },
    });
  });
});

describe("account repository", () => {
  it("creates, lists, and updates validated accounts with deterministic ordering", async () => {
    const database = createTestDatabase();
    let now = 100;
    let id = 0;
    const repository = new AccountRepository(database, {
      now: () => now,
      createId: () => `account-${++id}`,
    });
    const first = await repository.create({
      platform: "instagram",
      label: "  Personal  ",
      username: " @Example.User ",
    });
    now = 200;
    await repository.create({ platform: "instagram", label: "Work" });
    expect(first).toMatchObject({ label: "Personal", username: "example.user" });
    expect((await repository.list()).map((account) => account.id)).toEqual([
      "account-1",
      "account-2",
    ]);

    now = 300;
    const updated = await repository.update("account-1", { label: "  Main  ", username: null });
    expect(updated.label).toBe("Main");
    expect(updated.username).toBeUndefined();
    expect(updated.updatedAt).toBe(300);
  });

  it("rejects empty/oversized labels and invalid usernames", async () => {
    const repository = new AccountRepository(createTestDatabase());
    await expect(repository.create({ platform: "instagram", label: "   " })).rejects.toMatchObject({
      code: "INVALID_ACCOUNT_LABEL",
    });
    await expect(
      repository.create({ platform: "instagram", label: "x".repeat(ACCOUNT_LABEL_MAX_LENGTH + 1) }),
    ).rejects.toMatchObject({ code: "INVALID_ACCOUNT_LABEL" });
    await expect(
      repository.create({ platform: "instagram", label: "Valid", username: "not valid!" }),
    ).rejects.toMatchObject({ code: "INVALID_ACCOUNT_USERNAME" });
  });

  it("requires cascade confirmation and deletes account plus snapshots atomically", async () => {
    const database = createTestDatabase();
    const { accounts, snapshots } = await accountAndSnapshots(database);
    await snapshots.add(draft("account-1", 100, "a"));
    await expect(accounts.delete("account-1")).rejects.toMatchObject({
      code: "DELETION_CONFIRMATION_REQUIRED",
    });
    await accounts.delete("account-1", { confirmed: true, cascadeAcknowledged: true });
    expect(await accounts.get("account-1")).toBeUndefined();
    expect(await snapshots.listByAccount("account-1")).toEqual([]);
  });
});

describe("snapshot repository", () => {
  it("adds allowlisted normalized data, gets by ID, and lists newest first", async () => {
    const database = createTestDatabase();
    const { snapshots } = await accountAndSnapshots(database);
    const malicious = {
      ...draft("account-1", 100, "a"),
      rawJson: "must-not-persist",
      zipBlob: new Blob(["must-not-persist"]),
    } as SaveSnapshotInput;
    const first = await snapshots.add(malicious);
    await snapshots.add(draft("account-1", 300, "b"));
    await snapshots.add(draft("account-1", 200, "c"));
    expect(first.status).toBe("saved");
    if (first.status !== "saved") throw new Error("Expected saved snapshot");
    const stored = await snapshots.getById(first.snapshot.id);
    expect(stored).toMatchObject({ followerCount: 1, followingCount: 1 });
    expect(stored).not.toHaveProperty("rawJson");
    expect(stored).not.toHaveProperty("zipBlob");
    expect((await snapshots.listByAccount("account-1")).map((item) => item.snapshotAt)).toEqual([
      300,
      200,
      100,
    ]);
  });

  it("detects duplicates only within an account and guards concurrent double-save", async () => {
    const database = createTestDatabase();
    const accounts = new AccountRepository(database, {
      now: () => 1,
      createId: (() => {
        let id = 0;
        return () => `account-${++id}`;
      })(),
    });
    const snapshots = new SnapshotRepository(database);
    await accounts.create({ platform: "instagram", label: "One" });
    await accounts.create({ platform: "instagram", label: "Two" });

    const first = await snapshots.add(draft("account-1", 100, "a"));
    const duplicate = await snapshots.add(draft("account-1", 200, "a"));
    const otherAccount = await snapshots.add(draft("account-2", 100, "a"));
    expect(first.status).toBe("saved");
    expect(duplicate.status).toBe("duplicate");
    expect(otherAccount.status).toBe("saved");

    const concurrentDraft = draft("account-1", 300, "b");
    const results = await Promise.all([
      snapshots.add(concurrentDraft),
      snapshots.add({ ...concurrentDraft, snapshotAt: 301 }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual(["duplicate", "saved"]);
    expect(await snapshots.listByAccount("account-1")).toHaveLength(2);
  });

  it("finds the nearest strictly prior snapshot and rejects same timestamps", async () => {
    const database = createTestDatabase();
    const { snapshots } = await accountAndSnapshots(database);
    await snapshots.add(draft("account-1", 100, "a"));
    await snapshots.add(draft("account-1", 200, "b"));
    await snapshots.add(draft("account-1", 300, "c"));
    expect((await snapshots.findNearestPrior("account-1", 300))?.snapshotAt).toBe(200);
    expect(await snapshots.findNearestPrior("account-1", 100)).toBeUndefined();
    await expect(snapshots.add(draft("account-1", 300, "d"))).rejects.toMatchObject({
      code: "SNAPSHOT_TIMESTAMP_CONFLICT",
    });
  });

  it("isolates account/platform queries and deletion", async () => {
    const database = createTestDatabase();
    const accounts = new AccountRepository(database, {
      createId: (() => {
        let id = 0;
        return () => `account-${++id}`;
      })(),
    });
    const snapshots = new SnapshotRepository(database);
    await accounts.create({ platform: "instagram", label: "One" });
    await accounts.create({ platform: "instagram", label: "Two" });
    const one = await snapshots.add(draft("account-1", 100, "a"));
    await snapshots.add(draft("account-2", 100, "b"));
    await expect(snapshots.add(draft("account-1", 200, "c", "facebook"))).rejects.toMatchObject({
      code: "INVALID_SNAPSHOT",
    });
    if (one.status !== "saved") throw new Error("Expected saved snapshot");
    await expect(
      snapshots.delete("account-2", one.snapshot.id, { confirmed: true }),
    ).rejects.toMatchObject({ code: "SNAPSHOT_NOT_FOUND" });
    await snapshots.delete("account-1", one.snapshot.id, { confirmed: true });
    expect(await snapshots.listByAccount("account-1")).toEqual([]);
    expect(await snapshots.listByAccount("account-2")).toHaveLength(1);
  });
});

describe("settings, deletion, and failure behavior", () => {
  it("stores only typed settings and falls back safely when stored data is corrupt", async () => {
    const database = createTestDatabase();
    const settings = new SettingsRepository(database);
    await settings.set("locale", "vi");
    await settings.set("theme", "dark");
    await settings.set("localRetentionNoticeSeen", true);
    expect(await settings.getAll()).toEqual({
      locale: "vi",
      theme: "dark",
      localRetentionNoticeSeen: true,
    });
    await database.settings.put({ key: "theme", value: { relationships: ["private"] } });
    expect(await settings.get("theme")).toBe("system");
  });

  it("requires strong confirmation and removes accounts, snapshots, and settings", async () => {
    const database = createTestDatabase();
    const { snapshots } = await accountAndSnapshots(database);
    const settings = new SettingsRepository(database);
    const localData = new LocalDataRepository(database);
    await snapshots.add(draft("account-1", 100, "a"));
    await settings.set("locale", "vi");
    await expect(localData.deleteAll()).rejects.toMatchObject({
      code: "DELETION_CONFIRMATION_REQUIRED",
    });
    await localData.deleteAll({ confirmed: true, scope: "all-local-data" });
    expect(await database.accounts.count()).toBe(0);
    expect(await database.snapshots.count()).toBe(0);
    expect(await database.settings.count()).toBe(0);
    database.close();
    await openAnalyzerDatabase(database);
    expect(await database.accounts.count()).toBe(0);
  });

  it("maps unavailable, quota, migration, transaction, and unknown failures", () => {
    expect(() => createAnalyzerDatabase()).toThrowError(
      expect.objectContaining({ code: "INDEXEDDB_UNAVAILABLE" }),
    );
    expect(mapPersistenceError({ name: "QuotaExceededError" }, "operation").code).toBe(
      "INDEXEDDB_QUOTA_EXCEEDED",
    );
    expect(mapPersistenceError({ name: "UpgradeError" }, "open").code).toBe(
      "PERSISTENCE_MIGRATION_FAILED",
    );
    expect(mapPersistenceError({ name: "AbortError" }, "operation").code).toBe(
      "PERSISTENCE_TRANSACTION_FAILED",
    );
    expect(mapPersistenceError(new Error("private detail"), "operation").code).toBe(
      "UNKNOWN_PERSISTENCE_ERROR",
    );
  });

  it("maps injected repository quota and transaction failures without leaking details", async () => {
    const database = createTestDatabase();
    const accounts = new AccountRepository(database, { createId: () => "account-1" });
    vi.spyOn(database.accounts, "add").mockRejectedValueOnce({
      name: "QuotaExceededError",
      message: "private browser detail",
    });
    await expect(
      accounts.create({ platform: "instagram", label: "Account" }),
    ).rejects.toMatchObject({ code: "INDEXEDDB_QUOTA_EXCEEDED" });

    vi.restoreAllMocks();
    await accounts.create({ platform: "instagram", label: "Account" });
    vi.spyOn(database.accounts, "put").mockRejectedValueOnce({ name: "AbortError" });
    await expect(accounts.update("account-1", { label: "Updated" })).rejects.toMatchObject({
      code: "PERSISTENCE_TRANSACTION_FAILED",
    });
  });

  it("keeps the reviewed draft in memory and never reports a failed save as success", async () => {
    const database = createTestDatabase();
    const { snapshots } = await accountAndSnapshots(database);
    const input = draft("account-1", 100, "a");
    const add = vi
      .spyOn(snapshots, "add")
      .mockRejectedValue(new PersistenceDomainError("INDEXEDDB_QUOTA_EXCEEDED"));
    const outcome = await saveSnapshotWithMemoryFallback(snapshots, input);
    expect(outcome).toMatchObject({ status: "not-saved", draft: input });
    expect(add).toHaveBeenCalledTimes(1);
  });

  it("can explicitly delete the physical database", async () => {
    const database = createTestDatabase();
    await openAnalyzerDatabase(database);
    await deleteAnalyzerDatabase(database);
    expect(database.isOpen()).toBe(false);
  });
});
