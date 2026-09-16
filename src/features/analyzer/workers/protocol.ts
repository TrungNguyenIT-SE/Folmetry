import type { SerializedImportError } from "@/features/analyzer/model/errors";
import type { NormalizedSnapshotPayload } from "@/features/analyzer/model/types";

export const IMPORT_PROGRESS_STAGES = [
  "validating",
  "scanning_archive",
  "reading_relationship_files",
  "parsing_json",
  "normalizing",
  "fingerprinting",
  "complete",
] as const;

export type ImportProgressStage = (typeof IMPORT_PROGRESS_STAGES)[number];

export interface ParseArchiveRequest {
  readonly type: "PARSE_ARCHIVE";
  readonly jobId: string;
  readonly file: File;
}

export interface ParseFilesRequest {
  readonly type: "PARSE_FILES";
  readonly jobId: string;
  readonly files: readonly File[];
}

export type WorkerRequest = ParseArchiveRequest | ParseFilesRequest;

export interface SafeImportDiagnostics {
  readonly appVersion: string;
  readonly parserVersion: string;
  readonly browser: string;
  readonly archiveFileCount: number;
  readonly matchedRelevantFilenames: readonly string[];
  readonly recognizedTopLevelKeys: readonly string[];
  readonly errorCode?: SerializedImportError["code"];
}

export interface ImportWorkerResult {
  readonly payload: NormalizedSnapshotPayload;
  readonly fingerprint: string;
  readonly diagnostics: SafeImportDiagnostics;
}

export interface ProgressResponse {
  readonly type: "PROGRESS";
  readonly jobId: string;
  readonly stage: ImportProgressStage;
  readonly completed: number;
  readonly total: number;
}

export interface SuccessResponse {
  readonly type: "SUCCESS";
  readonly jobId: string;
  readonly result: ImportWorkerResult;
}

export interface ErrorResponse {
  readonly type: "ERROR";
  readonly jobId: string;
  readonly error: SerializedImportError;
  readonly diagnostics: SafeImportDiagnostics;
}

export type WorkerResponse = ProgressResponse | SuccessResponse | ErrorResponse;

export type ProgressListener = (progress: ProgressResponse) => void;

export function assertNever(value: never): never {
  throw new Error(`Unhandled protocol variant: ${String(value)}`);
}
