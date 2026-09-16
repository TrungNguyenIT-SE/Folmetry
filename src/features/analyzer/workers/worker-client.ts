import { ImportDomainError } from "@/features/analyzer/model/errors";
import type {
  ImportWorkerResult,
  ProgressListener,
  WorkerRequest,
  WorkerResponse,
} from "@/features/analyzer/workers/protocol";

type WorkerFactory = () => Worker;

function defaultWorkerFactory(): Worker {
  return new Worker(new URL("./parser.worker.ts", import.meta.url), { type: "module" });
}

interface ActiveJob {
  readonly jobId: string;
  readonly worker: Worker;
  readonly reject: (reason: ImportDomainError) => void;
  cleanup: () => void;
  settled: boolean;
}

export class ImportWorkerClient {
  private active: ActiveJob | undefined;

  constructor(private readonly createWorker: WorkerFactory = defaultWorkerFactory) {}

  parseArchive(
    jobId: string,
    file: File,
    onProgress?: ProgressListener,
  ): Promise<ImportWorkerResult> {
    return this.start({ type: "PARSE_ARCHIVE", jobId, file }, onProgress);
  }

  parseFiles(
    jobId: string,
    files: readonly File[],
    onProgress?: ProgressListener,
  ): Promise<ImportWorkerResult> {
    return this.start({ type: "PARSE_FILES", jobId, files }, onProgress);
  }

  cancel(): void {
    const active = this.active;
    if (active === undefined || active.settled) return;
    active.settled = true;
    active.cleanup();
    active.worker.terminate();
    this.active = undefined;
    active.reject(new ImportDomainError("IMPORT_CANCELLED"));
  }

  dispose(): void {
    this.cancel();
  }

  private start(request: WorkerRequest, onProgress?: ProgressListener): Promise<ImportWorkerResult> {
    this.cancel();
    const worker = this.createWorker();
    return new Promise((resolve, reject: (reason: ImportDomainError) => void) => {
      const active: ActiveJob = {
        jobId: request.jobId,
        worker,
        reject,
        cleanup: () => undefined,
        settled: false,
      };
      this.active = active;

      const settle = (callback: () => void): void => {
        if (active.settled) return;
        active.settled = true;
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onWorkerError);
        worker.terminate();
        if (this.active === active) this.active = undefined;
        callback();
      };
      const onMessage = (event: MessageEvent<WorkerResponse>): void => {
        const response = event.data;
        if (response.jobId !== active.jobId || this.active !== active || active.settled) return;
        switch (response.type) {
          case "PROGRESS":
            onProgress?.(response);
            break;
          case "SUCCESS":
            settle(() => resolve(response.result));
            break;
          case "ERROR":
            settle(() => reject(new ImportDomainError(response.error.code, response.error.context)));
            break;
          default: {
            const exhaustive: never = response;
            throw exhaustive;
          }
        }
      };
      const onWorkerError = (): void => {
        settle(() => reject(new ImportDomainError("UNKNOWN_IMPORT_ERROR")));
      };
      active.cleanup = () => {
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onWorkerError);
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onWorkerError);
      worker.postMessage(request);
    });
  }
}
