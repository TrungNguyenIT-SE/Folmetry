import { describe, expect, it } from "vitest";

import { analyzerWorkflowReducer, INITIAL_ANALYZER_STATE } from "./state-machine";

describe("analyzerWorkflowReducer", () => {
  it("moves through account, import, review, saving, and results", () => {
    const ready = analyzerWorkflowReducer(INITIAL_ANALYZER_STATE, {
      type: "ACCOUNT_SELECTED",
      accountId: "account-1",
    });
    const validating = analyzerWorkflowReducer(ready, {
      type: "IMPORT_STARTED",
      accountId: "account-1",
      jobId: "job-1",
    });
    const parsing = analyzerWorkflowReducer(validating, {
      type: "IMPORT_PROGRESS",
      jobId: "job-1",
      stage: "parsing_json",
      completed: 1,
      total: 2,
    });
    expect(parsing).toMatchObject({ status: "PARSING", completed: 1, total: 2 });

    const draft = {
      snapshotAt: 1,
      source: { name: "export.zip", size: 20, lastModified: 1, mode: "archive" as const },
      result: {
        fingerprint: "a".repeat(64),
        payload: {
          platform: "instagram" as const,
          followers: [],
          following: [],
          parserVersion: "1",
          warnings: [],
        },
        diagnostics: {
          appVersion: "1",
          parserVersion: "1",
          browser: "test",
          archiveFileCount: 1,
          matchedRelevantFilenames: [],
          recognizedTopLevelKeys: [],
        },
      },
    };
    const review = analyzerWorkflowReducer(parsing, {
      type: "IMPORT_SUCCEEDED",
      jobId: "job-1",
      draft,
    });
    const saving = analyzerWorkflowReducer(review, { type: "SAVE_STARTED" });
    const results = analyzerWorkflowReducer(saving, {
      type: "SAVE_SUCCEEDED",
      snapshotId: "snapshot-1",
      saved: true,
    });
    expect(results).toEqual({
      status: "RESULTS",
      accountId: "account-1",
      snapshotId: "snapshot-1",
      saved: true,
    });
  });

  it("ignores stale worker events and illegal transitions", () => {
    const ready = { status: "READY_TO_IMPORT", accountId: "account-1" } as const;
    expect(
      analyzerWorkflowReducer(ready, {
        type: "IMPORT_PROGRESS",
        jobId: "old",
        stage: "complete",
        completed: 1,
        total: 1,
      }),
    ).toBe(ready);
    expect(analyzerWorkflowReducer(ready, { type: "SAVE_STARTED" })).toBe(ready);
  });

  it("returns to a clear account-ready state on cancel", () => {
    const parsing = {
      status: "PARSING",
      accountId: "account-1",
      jobId: "job-1",
      stage: "parsing_json",
      completed: 0,
      total: 1,
    } as const;
    expect(analyzerWorkflowReducer(parsing, { type: "CANCEL" })).toEqual({
      status: "READY_TO_IMPORT",
      accountId: "account-1",
    });
  });
});
