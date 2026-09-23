import { describe, expect, it } from "vitest";

import { ImportDomainError } from "@/features/analyzer/model/errors";
import { ImportWorkerClient } from "@/features/analyzer/workers/worker-client";
import type { WorkerResponse } from "@/features/analyzer/workers/protocol";

class FakeWorker {
  readonly posted: unknown[] = [];
  terminated = false;
  private readonly messageListeners = new Set<(event: MessageEvent<WorkerResponse>) => void>();
  private readonly errorListeners = new Set<() => void>();

  postMessage(message: unknown): void { this.posted.push(message); }
  terminate(): void { this.terminated = true; }
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type === "message") this.messageListeners.add(listener as (event: MessageEvent<WorkerResponse>) => void);
    if (type === "error") this.errorListeners.add(listener as () => void);
  }
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type === "message") this.messageListeners.delete(listener as (event: MessageEvent<WorkerResponse>) => void);
    if (type === "error") this.errorListeners.delete(listener as () => void);
  }
  emit(message: WorkerResponse): void {
    for (const listener of this.messageListeners) listener({ data: message } as MessageEvent<WorkerResponse>);
  }
  listenerCount(): number { return this.messageListeners.size + this.errorListeners.size; }
}

describe("ImportWorkerClient", () => {
  it("terminates and cleans the active worker on cancel, then creates a fresh worker", async () => {
    const workers: FakeWorker[] = [];
    const client = new ImportWorkerClient("instagram", () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    });
    const first = client.parseFiles("one", []);
    client.cancel();
    await expect(first).rejects.toMatchObject({ code: "IMPORT_CANCELLED" });
    expect(workers[0]?.terminated).toBe(true);
    expect(workers[0]?.listenerCount()).toBe(0);

    const second = client.parseFiles("two", []);
    expect(workers).toHaveLength(2);
    expect(workers[1]?.posted[0]).toMatchObject({ platform: "instagram", type: "PARSE_FILES" });
    client.dispose();
    await expect(second).rejects.toBeInstanceOf(ImportDomainError);
  });

  it("includes the selected platform in every worker request", async () => {
    const worker = new FakeWorker();
    const client = new ImportWorkerClient("facebook", () => worker as unknown as Worker);
    const pending = client.parseArchive("facebook-job", new File([], "facebook.zip"));
    expect(worker.posted[0]).toMatchObject({ platform: "facebook", type: "PARSE_ARCHIVE" });
    client.cancel();
    await expect(pending).rejects.toMatchObject({ code: "IMPORT_CANCELLED" });
  });

  it("ignores stale job responses and settles a promise only once", async () => {
    const worker = new FakeWorker();
    const progress: string[] = [];
    const client = new ImportWorkerClient("instagram", () => worker as unknown as Worker);
    const pending = client.parseFiles("current", [], (event) => progress.push(event.jobId));
    worker.emit({ type: "PROGRESS", jobId: "old", stage: "validating", completed: 0, total: 1 });
    worker.emit({ type: "PROGRESS", jobId: "current", stage: "validating", completed: 0, total: 1 });
    worker.emit({
      type: "ERROR",
      jobId: "current",
      error: {
        code: "INVALID_JSON",
        titleKey: "import.error.invalid_json.title",
        messageKey: "import.error.invalid_json.message",
        actionKey: "import.error.invalid_json.action",
      },
      diagnostics: {
        appVersion: "0.1.0",
        parserVersion: "instagram-json@1",
        browser: "Unknown",
        archiveFileCount: 0,
        matchedRelevantFilenames: [],
        recognizedTopLevelKeys: [],
        errorCode: "INVALID_JSON",
      },
    });
    await expect(pending).rejects.toMatchObject({ code: "INVALID_JSON" });
    expect(progress).toEqual(["current"]);
    expect(worker.terminated).toBe(true);
    expect(worker.listenerCount()).toBe(0);
  });
});
