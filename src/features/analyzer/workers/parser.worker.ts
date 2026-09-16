import { handleWorkerRequest } from "@/features/analyzer/workers/worker-handler";
import type { WorkerRequest, WorkerResponse } from "@/features/analyzer/workers/protocol";

interface DedicatedImportWorkerScope {
  addEventListener(type: "message", listener: (event: MessageEvent<WorkerRequest>) => void): void;
  postMessage(message: WorkerResponse): void;
}

const scope = globalThis as DedicatedImportWorkerScope;

scope.addEventListener("message", (event) => {
  const request = event.data;
  const controller = new AbortController();
  void handleWorkerRequest(
    request,
    controller.signal,
    (response) => scope.postMessage(response),
  );
});
