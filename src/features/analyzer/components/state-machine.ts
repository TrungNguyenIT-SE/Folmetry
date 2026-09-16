import type { ImportErrorCode } from "@/features/analyzer/model/errors";
import type { NormalizedSnapshotPayload } from "@/features/analyzer/model/types";
import type { PersistenceErrorCode } from "@/features/analyzer/persistence";
import type {
  ImportProgressStage,
  ImportWorkerResult,
  SafeImportDiagnostics,
} from "@/features/analyzer/workers";

export interface ImportSourceSummary {
  readonly name: string;
  readonly size: number;
  readonly lastModified: number;
  readonly mode: "archive" | "manual";
}

export interface ReviewDraft {
  readonly result: ImportWorkerResult;
  readonly source: ImportSourceSummary;
  readonly snapshotAt: number;
}

export interface WorkflowError {
  readonly kind: "import" | "persistence";
  readonly code: ImportErrorCode | PersistenceErrorCode;
  readonly diagnostics?: SafeImportDiagnostics;
  readonly retainedDraft?: ReviewDraft;
}

export type AnalyzerWorkflowState =
  | { readonly status: "NO_ACCOUNT" }
  | { readonly status: "READY_TO_IMPORT"; readonly accountId: string }
  | {
      readonly status: "VALIDATING" | "PARSING";
      readonly accountId: string;
      readonly jobId: string;
      readonly stage: ImportProgressStage;
      readonly completed: number;
      readonly total: number;
    }
  | { readonly status: "REVIEW_IMPORT"; readonly accountId: string; readonly draft: ReviewDraft }
  | { readonly status: "SAVING"; readonly accountId: string; readonly draft: ReviewDraft }
  | {
      readonly status: "RESULTS";
      readonly accountId: string;
      readonly snapshotId: string;
      readonly saved: boolean;
    }
  | { readonly status: "ERROR"; readonly accountId?: string; readonly error: WorkflowError };

export type AnalyzerWorkflowEvent =
  | { readonly type: "ACCOUNTS_EMPTY" }
  | { readonly type: "ACCOUNT_SELECTED"; readonly accountId: string; readonly snapshotId?: string }
  | { readonly type: "IMPORT_STARTED"; readonly accountId: string; readonly jobId: string }
  | {
      readonly type: "IMPORT_PROGRESS";
      readonly jobId: string;
      readonly stage: ImportProgressStage;
      readonly completed: number;
      readonly total: number;
    }
  | { readonly type: "IMPORT_SUCCEEDED"; readonly jobId: string; readonly draft: ReviewDraft }
  | { readonly type: "REVIEW_DATE_CHANGED"; readonly snapshotAt: number }
  | { readonly type: "SAVE_STARTED" }
  | { readonly type: "SAVE_SUCCEEDED"; readonly snapshotId: string; readonly saved: boolean }
  | { readonly type: "FAILED"; readonly accountId?: string; readonly error: WorkflowError }
  | { readonly type: "CANCEL" }
  | { readonly type: "RESET" };

export const INITIAL_ANALYZER_STATE: AnalyzerWorkflowState = { status: "NO_ACCOUNT" };

function accountReady(state: AnalyzerWorkflowState): AnalyzerWorkflowState {
  return "accountId" in state && state.accountId !== undefined
    ? { status: "READY_TO_IMPORT", accountId: state.accountId }
    : INITIAL_ANALYZER_STATE;
}

export function analyzerWorkflowReducer(
  state: AnalyzerWorkflowState,
  event: AnalyzerWorkflowEvent,
): AnalyzerWorkflowState {
  switch (event.type) {
    case "ACCOUNTS_EMPTY":
      return INITIAL_ANALYZER_STATE;
    case "ACCOUNT_SELECTED":
      return event.snapshotId === undefined
        ? { status: "READY_TO_IMPORT", accountId: event.accountId }
        : {
            status: "RESULTS",
            accountId: event.accountId,
            snapshotId: event.snapshotId,
            saved: true,
          };
    case "IMPORT_STARTED":
      return {
        status: "VALIDATING",
        accountId: event.accountId,
        jobId: event.jobId,
        stage: "validating",
        completed: 0,
        total: 1,
      };
    case "IMPORT_PROGRESS":
      if (
        (state.status !== "VALIDATING" && state.status !== "PARSING") ||
        state.jobId !== event.jobId
      ) {
        return state;
      }
      return {
        ...state,
        status: event.stage === "validating" ? "VALIDATING" : "PARSING",
        stage: event.stage,
        completed: event.completed,
        total: event.total,
      };
    case "IMPORT_SUCCEEDED":
      if (
        (state.status !== "VALIDATING" && state.status !== "PARSING") ||
        state.jobId !== event.jobId
      ) {
        return state;
      }
      return {
        status: "REVIEW_IMPORT",
        accountId: state.accountId,
        draft: event.draft,
      };
    case "REVIEW_DATE_CHANGED":
      return state.status === "REVIEW_IMPORT"
        ? { ...state, draft: { ...state.draft, snapshotAt: event.snapshotAt } }
        : state;
    case "SAVE_STARTED":
      return state.status === "REVIEW_IMPORT"
        ? { status: "SAVING", accountId: state.accountId, draft: state.draft }
        : state;
    case "SAVE_SUCCEEDED":
      return state.status === "SAVING"
        ? {
            status: "RESULTS",
            accountId: state.accountId,
            snapshotId: event.snapshotId,
            saved: event.saved,
          }
        : state;
    case "FAILED":
      return {
        status: "ERROR",
        ...(event.accountId === undefined ? {} : { accountId: event.accountId }),
        error: event.error,
      };
    case "CANCEL":
    case "RESET":
      return accountReady(state);
  }
}

export function reviewPayload(draft: ReviewDraft): NormalizedSnapshotPayload {
  return draft.result.payload;
}
