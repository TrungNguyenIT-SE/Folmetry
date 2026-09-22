// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LocalAccount, LocalSnapshot } from "@/features/analyzer/model/types";
import { PersistenceDomainError, type SaveSnapshotInput } from "@/features/analyzer/persistence";
import type { AnalyzerServices } from "@/features/analyzer/services/analyzer-services";
import type { ImportWorkerResult, ProgressListener } from "@/features/analyzer/workers";
import { AppPreferencesProvider } from "@/i18n";

import { AnalyzerApp } from "./analyzer-app";

function workerResult(): ImportWorkerResult {
  return {
    fingerprint: "a".repeat(64),
    payload: {
      platform: "instagram",
      followers: [
        { handle: "Alice", normalizedHandle: "alice" },
        { handle: "Bob", normalizedHandle: "bob" },
      ],
      following: [
        { handle: "Alice", normalizedHandle: "alice" },
        { handle: "Carol", normalizedHandle: "carol" },
      ],
      parserVersion: "test-parser",
      warnings: [],
    },
    diagnostics: {
      appVersion: "test",
      parserVersion: "test-parser",
      browser: "test",
      archiveFileCount: 2,
      matchedRelevantFilenames: ["followers_1.json", "following.json"],
      recognizedTopLevelKeys: [],
    },
  };
}

function storedSnapshot(input: SaveSnapshotInput, id = "snapshot-1"): LocalSnapshot {
  return {
    ...input,
    id,
    importedAt: 20,
    followers: [...input.followers],
    following: [...input.following],
    warnings: [...input.warnings],
    followerCount: input.followers.length,
    followingCount: input.following.length,
  };
}

function createFakeServices(options: { readonly pendingImport?: boolean; readonly saveFailure?: boolean } = {}): AnalyzerServices {
  let accounts: LocalAccount[] = [];
  let snapshots: LocalSnapshot[] = [];
  let rejectPending: ((reason: Error) => void) | undefined;
  const parse = (_files: unknown, _jobId: string, onProgress: ProgressListener): Promise<ImportWorkerResult> => {
    onProgress({ type: "PROGRESS", jobId: _jobId, stage: "parsing_json", completed: 1, total: 2 });
    if (options.pendingImport === true) {
      return new Promise((_resolve, reject) => { rejectPending = reject; });
    }
    return Promise.resolve(workerResult());
  };
  return {
    listAccounts: () => Promise.resolve([...accounts]),
    createAccount: (input) => {
      const account: LocalAccount = {
        id: "account-1",
        platform: input.platform,
        label: input.label,
        ...(input.username === undefined ? {} : { username: input.username }),
        createdAt: 1,
        updatedAt: 1,
      };
      accounts = [account];
      return Promise.resolve(account);
    },
    updateAccount: (id, input) => {
      const current = accounts.find((account) => account.id === id);
      if (current === undefined) return Promise.reject(new Error("missing"));
      const updated = { ...current, ...(input.label === undefined ? {} : { label: input.label }) };
      accounts = [updated];
      return Promise.resolve(updated);
    },
    deleteAccount: () => { accounts = []; snapshots = []; return Promise.resolve(); },
    listSnapshots: () => Promise.resolve([...snapshots].sort((a, b) => b.snapshotAt - a.snapshotAt)),
    getSnapshot: (id) => Promise.resolve(snapshots.find((snapshot) => snapshot.id === id)),
    findPrior: (_accountId, timestamp) => Promise.resolve(
      [...snapshots].filter((snapshot) => snapshot.snapshotAt < timestamp).sort((a, b) => b.snapshotAt - a.snapshotAt)[0],
    ),
    findDuplicate: (_accountId, fingerprint) => Promise.resolve(snapshots.find((snapshot) => snapshot.fingerprint === fingerprint)),
    saveSnapshot: (input) => {
      if (options.saveFailure === true) {
        return Promise.resolve({
          status: "not-saved",
          draft: input,
          error: new PersistenceDomainError("INDEXEDDB_QUOTA_EXCEEDED"),
        });
      }
      const snapshot = storedSnapshot(input);
      snapshots = [snapshot, ...snapshots];
      return Promise.resolve({ status: "saved", snapshot });
    },
    deleteSnapshot: (_accountId, snapshotId) => { snapshots = snapshots.filter((snapshot) => snapshot.id !== snapshotId); return Promise.resolve(); },
    deleteAll: () => { accounts = []; snapshots = []; return Promise.resolve(); },
    parseArchive: (file, jobId, onProgress) => parse(file, jobId, onProgress),
    parseFiles: (files, jobId, onProgress) => parse(files, jobId, onProgress),
    cancelImport: () => { rejectPending?.(new Error("cancelled")); rejectPending = undefined; },
    close: vi.fn(),
  };
}

function renderAnalyzer(services: AnalyzerServices) {
  return render(<AppPreferencesProvider><AnalyzerApp services={services} /></AppPreferencesProvider>);
}

async function createAccount(): Promise<void> {
  await screen.findByText("No Instagram profiles yet.");
  fireEvent.change(screen.getByLabelText("Profile label"), { target: { value: "Personal" } });
  fireEvent.click(screen.getByRole("button", { name: "Create profile" }));
  await screen.findByRole("heading", { name: "Import an Instagram relationship export" });
}

describe("AnalyzerApp", () => {
  it("creates an account, imports locally, reviews, saves, and shows results", async () => {
    const { container } = renderAnalyzer(createFakeServices());
    await createAccount();
    expect(screen.getByText("Open Accounts Center, then Your information and permissions.")).toBeTruthy();
    expect(screen.getByText(/10–15 minutes/)).toBeTruthy();
    expect(screen.getByText(/keep only Followers and following selected/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByLabelText("Profile label"), { target: { value: "Personal archive" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("option", { name: "Personal archive" });
    const input = container.querySelector<HTMLInputElement>('input[accept^=".zip"]');
    expect(input).not.toBeNull();
    fireEvent.change(input as HTMLInputElement, {
      target: { files: [new File(["zip"], "instagram.zip", { type: "application/zip", lastModified: 10 })] },
    });
    await screen.findByRole("heading", { name: "Review import" });
    expect(screen.getAllByText("2", { selector: "dd" })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Save snapshot" }));
    await screen.findByRole("heading", { name: "Relationship results" });
    expect(screen.getByRole("tab", { name: "Mutuals" })).toBeTruthy();
    expect(screen.getByText("This is the first snapshot. Import a later export to calculate changes over time.")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete snapshot" }));
    expect(await screen.findByRole("alertdialog", { name: "Delete snapshot?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep data" }));
    fireEvent.click(screen.getByRole("tab", { name: "Mutuals" }));
    const profile = screen.getByRole("link", { name: "Open Instagram profile" });
    expect(profile.getAttribute("href")).toBe("https://www.instagram.com/alice/");
    expect(profile.getAttribute("target")).toBe("_blank");
    expect(profile.getAttribute("rel")).toBe("noopener noreferrer");

    const repeatedInput = container.querySelector<HTMLInputElement>('input[accept^=".zip"]');
    fireEvent.change(repeatedInput as HTMLInputElement, {
      target: { files: [new File(["zip"], "instagram.zip", { type: "application/zip", lastModified: 30 })] },
    });
    await screen.findByRole("heading", { name: "Review import" });
    fireEvent.click(screen.getByRole("button", { name: "Save snapshot" }));
    const duplicateDialog = await screen.findByRole("alertdialog", { name: "This export is already saved" });
    expect(duplicateDialog).toBeTruthy();
    fireEvent.click(within(duplicateDialog).getByRole("button", { name: "Cancel" }));
  });

  it("presents real progress and can cancel back to import", async () => {
    const { container } = renderAnalyzer(createFakeServices({ pendingImport: true }));
    await createAccount();
    const input = container.querySelector<HTMLInputElement>('input[accept^=".zip"]');
    fireEvent.change(input as HTMLInputElement, {
      target: { files: [new File(["zip"], "instagram.zip", { type: "application/zip" })] },
    });
    expect(await screen.findByText("Parsing JSON")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel import" }));
    await screen.findByRole("heading", { name: "Import an Instagram relationship export" });
  });

  it("links invalid file feedback to the import control", async () => {
    const { container } = renderAnalyzer(createFakeServices());
    await createAccount();
    const input = container.querySelector<HTMLInputElement>('input[accept^=".zip"]');
    fireEvent.change(input as HTMLInputElement, {
      target: { files: [new File(["x"], "wrong.txt", { type: "text/plain" })] },
    });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Choose one ZIP"));
    expect(screen.getByText("Drop one Instagram export ZIP here").closest("div")?.getAttribute("aria-describedby")).toBe("import-file-error");
  });

  it("keeps results in memory when server synchronization cannot save", async () => {
    const { container } = renderAnalyzer(createFakeServices({ saveFailure: true }));
    await createAccount();
    const input = container.querySelector<HTMLInputElement>('input[accept^=".zip"]');
    fireEvent.change(input as HTMLInputElement, {
      target: { files: [new File(["zip"], "instagram.zip", { type: "application/zip", lastModified: 10 })] },
    });
    await screen.findByRole("heading", { name: "Review import" });
    fireEvent.click(screen.getByRole("button", { name: "Save snapshot" }));
    await screen.findByRole("heading", { name: "Relationship results" });
    expect(screen.getByText("These results are available in memory", { exact: false })).toBeTruthy();
  });

  it("requires confirmation before deleting a synchronized profile", async () => {
    renderAnalyzer(createFakeServices());
    await createAccount();
    fireEvent.click(screen.getByRole("button", { name: "Delete profile and history" }));
    expect(await screen.findByRole("alertdialog", { name: "Delete Instagram profile?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep data" }));
    expect(screen.getByLabelText("Select profile")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete profile and history" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByText("No Instagram profiles yet.");
  });
});
