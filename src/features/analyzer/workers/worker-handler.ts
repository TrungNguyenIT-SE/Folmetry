import { ImportDomainError, serializeImportError } from "@/features/analyzer/model/errors";
import {
  createDiagnosticState,
  createSafeDiagnostics,
  runImportPipeline,
  type ImportPipelineDependencies,
} from "@/features/analyzer/workers/import-pipeline";
import type { WorkerRequest, WorkerResponse } from "@/features/analyzer/workers/protocol";

export async function handleWorkerRequest(
  request: WorkerRequest,
  signal: AbortSignal,
  post: (response: WorkerResponse) => void,
  dependencies: ImportPipelineDependencies = {},
): Promise<void> {
  const diagnosticState = dependencies.diagnosticState ?? createDiagnosticState(request.platform);
  try {
    const result = await runImportPipeline(request, signal, post, {
      ...dependencies,
      diagnosticState,
    });
    post({ type: "SUCCESS", jobId: request.jobId, result });
  } catch (cause: unknown) {
    const error = serializeImportError(cause);
    post({
      type: "ERROR",
      jobId: request.jobId,
      error,
      diagnostics: createSafeDiagnostics(
        diagnosticState,
        cause instanceof ImportDomainError ? cause.code : "UNKNOWN_IMPORT_ERROR",
      ),
    });
  }
}
