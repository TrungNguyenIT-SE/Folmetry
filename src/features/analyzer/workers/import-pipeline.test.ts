import {
  BlobWriter,
  TextReader,
  ZipWriter,
} from "@zip.js/zip.js/index-native.js";
import { describe, expect, it } from "vitest";

import { ImportDomainError } from "@/features/analyzer/model/errors";
import { IMPORT_POLICY } from "@/features/analyzer/model/policy";
import type { ImportArchiveReader } from "@/features/analyzer/workers/archive-reader";
import {
  createDiagnosticState,
  createSafeDiagnostics,
  MANUAL_JSON_INPUT_PROPS,
  runImportPipeline,
} from "@/features/analyzer/workers/import-pipeline";
import type {
  ImportProgressStage,
  WorkerRequest,
} from "@/features/analyzer/workers/protocol";
import { handleWorkerRequest } from "@/features/analyzer/workers/worker-handler";

const followers = JSON.stringify([
  { string_list_data: [{ value: "Alice", timestamp: 1_700_000_000 }] },
]);
const following = JSON.stringify({
  relationships_following: [
    { string_list_data: [{ value: "Bob", timestamp: 1_700_000_001 }] },
  ],
});

async function zipFile(
  entries: readonly (readonly [string, string])[],
  options: { readonly password?: string } = {},
): Promise<File> {
  const writer = new ZipWriter(new BlobWriter("application/zip"), { useWebWorkers: false });
  for (const [name, content] of entries) {
    await writer.add(name, new TextReader(content), {
      useWebWorkers: false,
      ...(options.password === undefined ? {} : { password: options.password }),
    });
  }
  const blob = await writer.close();
  return new File([blob], "instagram.zip", { type: "application/zip" });
}

async function run(
  request: WorkerRequest,
  options: Parameters<typeof runImportPipeline>[3] = {},
  controller = new AbortController(),
) {
  const stages: ImportProgressStage[] = [];
  const result = await runImportPipeline(
    request,
    controller.signal,
    (event) => stages.push(event.stage),
    options,
  );
  return { result, stages };
}

async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error instanceof ImportDomainError ? error.code : undefined;
  }
}

describe("secure import pipeline", () => {
  it("parses a valid ZIP, fingerprints in the pipeline, and reports real stages", async () => {
    const file = await zipFile([
      ["connections/followers_and_following/followers_1.json", followers],
      ["connections/followers_and_following/following.json", following],
      ["media/photo.jpg", "not inspected"],
    ]);
    const { result, stages } = await run({ type: "PARSE_ARCHIVE", jobId: "zip", file });

    expect(result.payload.followers.map((record) => record.normalizedHandle)).toEqual(["alice"]);
    expect(result.payload.following.map((record) => record.normalizedHandle)).toEqual(["bob"]);
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.diagnostics.archiveFileCount).toBe(3);
    expect(result.diagnostics.matchedRelevantFilenames).toHaveLength(2);
    expect(stages[0]).toBe("validating");
    expect(stages).toContain("scanning_archive");
    expect(stages.at(-1)).toBe("complete");
  });

  it("merges all multipart follower files numerically and deduplicates across parts", async () => {
    const file = await zipFile([
      ["followers_and_following/followers_2.json", followers],
      ["followers_and_following/followers_1.json", followers],
      ["followers_and_following/following.json", following],
    ]);
    const { result } = await run({ type: "PARSE_ARCHIVE", jobId: "multipart", file });
    expect(result.payload.followers).toHaveLength(1);
    expect(result.payload.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MULTIPART_FOLLOWERS_MERGED" }),
        expect.objectContaining({ code: "DUPLICATE_HANDLES_REMOVED" }),
      ]),
    );
  });

  it("rejects corrupt, encrypted, HTML-only, unsafe, and invalid JSON archives", async () => {
    const corrupt = new File(["not-a-zip"], "bad.zip");
    const encrypted = await zipFile(
      [
        ["followers_and_following/followers_1.json", followers],
        ["followers_and_following/following.json", following],
      ],
      { password: "secret" },
    );
    const html = await zipFile([
      ["followers_and_following/followers.html", "<html></html>"],
      ["followers_and_following/following.html", "<html></html>"],
    ]);
    const invalid = await zipFile([
      ["followers_and_following/followers_1.json", "{"],
      ["followers_and_following/following.json", following],
    ]);

    expect(await errorCode(run({ type: "PARSE_ARCHIVE", jobId: "a", file: corrupt }))).toBe("ARCHIVE_CORRUPTED");
    expect(await errorCode(run({ type: "PARSE_ARCHIVE", jobId: "b", file: encrypted }))).toBe("ARCHIVE_ENCRYPTED");
    expect(await errorCode(run({ type: "PARSE_ARCHIVE", jobId: "c", file: html }))).toBe("UNSUPPORTED_HTML_EXPORT");
    expect(await errorCode(run({ type: "PARSE_ARCHIVE", jobId: "e", file: invalid }))).toBe("INVALID_JSON");
  });

  it("rejects an unsafe entry path before reading any entry", async () => {
    let extracted = false;
    const reader: ImportArchiveReader = {
      async getEntries() {
        return [
          {
            metadata: { name: "../followers_and_following/followers_1.json", compressedSize: 1, uncompressedSize: 1 },
            async readText() { extracted = true; return followers; },
          },
          {
            metadata: { name: "followers_and_following/following.json", compressedSize: 1, uncompressedSize: 1 },
            async readText() { extracted = true; return following; },
          },
        ];
      },
      async close() {},
    };
    const file = new File(["zip"], "unsafe.zip");
    expect(await errorCode(run(
      { type: "PARSE_ARCHIVE", jobId: "unsafe", file },
      { openArchive: () => reader },
    ))).toBe("ARCHIVE_UNSAFE_PATH");
    expect(extracted).toBe(false);
  });

  it("rejects missing files, unsupported schemas, and incomplete multipart manual input", async () => {
    const onlyFollowers = [new File([followers], "followers_1.json", { type: "application/json" })];
    const unsupported = [
      new File(["{}"], "followers_1.json"),
      new File([following], "following.json"),
    ];
    const incomplete = [
      new File([followers], "followers_1.json"),
      new File([followers], "followers_3.json"),
      new File([following], "following.json"),
    ];
    expect(await errorCode(run({ type: "PARSE_FILES", jobId: "a", files: onlyFollowers }))).toBe("FOLLOWING_FILE_NOT_FOUND");
    expect(await errorCode(run({ type: "PARSE_FILES", jobId: "b", files: unsupported }))).toBe("UNSUPPORTED_INSTAGRAM_SCHEMA");
    expect(await errorCode(run({ type: "PARSE_FILES", jobId: "c", files: incomplete }))).toBe("INCOMPLETE_MULTIPART_FOLLOWERS");
  });

  it("uses the same adapter for valid multi-select manual JSON input", async () => {
    const files = [
      new File([followers], "followers_1.json", { type: "text/plain" }),
      new File([following], "following.json", { type: "application/octet-stream" }),
    ];
    const { result } = await run({ type: "PARSE_FILES", jobId: "manual", files });
    expect(MANUAL_JSON_INPUT_PROPS).toEqual({ accept: ".json,application/json", multiple: true });
    expect(result.payload.warnings).toContainEqual(
      expect.objectContaining({ code: "MANUAL_IMPORT_COMPLETENESS_UNVERIFIED" }),
    );
  });

  it("rejects non-JSON recovery files and tolerates mixed invalid/duplicate records", async () => {
    const nonJson = [new File([followers], "followers_1.txt"), new File([following], "following.json")];
    expect(await errorCode(run({ type: "PARSE_FILES", jobId: "type", files: nonJson }))).toBe("UNSUPPORTED_FILE_TYPE");

    const mixedFollowers = JSON.stringify([
      { string_list_data: [{ value: "Alice", timestamp: 1_700_000_000 }] },
      { string_list_data: [{ value: "alice", timestamp: 1_700_000_000 }] },
      { malformed: true },
    ]);
    const { result } = await run({
      type: "PARSE_FILES",
      jobId: "mixed",
      files: [new File([mixedFollowers], "followers_1.json"), new File([following], "following.json")],
    });
    expect(result.payload.followers).toHaveLength(1);
    expect(result.payload.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "INVALID_ENTRY_SKIPPED" }),
      expect.objectContaining({ code: "DUPLICATE_HANDLES_REMOVED" }),
    ]));
  });

  it("extracts only relevant entries and closes the reader on success", async () => {
    const reads: string[] = [];
    let closed = false;
    const reader: ImportArchiveReader = {
      async getEntries() {
        return [
          {
            metadata: { name: "followers_and_following/followers_1.json", compressedSize: 50, uncompressedSize: 100 },
            async readText() { reads.push("followers"); return followers; },
          },
          {
            metadata: { name: "followers_and_following/following.json", compressedSize: 50, uncompressedSize: 100 },
            async readText() { reads.push("following"); return following; },
          },
          {
            metadata: { name: "media/private.jpg", compressedSize: 1, uncompressedSize: 1 },
            async readText() { reads.push("media"); return "secret"; },
          },
        ];
      },
      async close() { closed = true; },
    };
    const file = new File(["zip"], "ok.zip");
    await run({ type: "PARSE_ARCHIVE", jobId: "selective", file }, { openArchive: () => reader });
    expect(reads).toEqual(["followers", "following"]);
    expect(closed).toBe(true);
  });

  it("rejects suspicious compression before extraction", async () => {
    let extracted = false;
    const reader: ImportArchiveReader = {
      async getEntries() {
        return [
          {
            metadata: {
              name: "followers_and_following/followers_1.json",
              compressedSize: 1,
              uncompressedSize: IMPORT_POLICY.maxCompressionRatio + 1,
            },
            async readText() { extracted = true; return followers; },
          },
          {
            metadata: { name: "followers_and_following/following.json", compressedSize: 1, uncompressedSize: 1 },
            async readText() { extracted = true; return following; },
          },
        ];
      },
      async close() {},
    };
    const file = new File(["zip"], "ratio.zip");
    expect(await errorCode(run({ type: "PARSE_ARCHIVE", jobId: "ratio", file }, { openArchive: () => reader }))).toBe("ARCHIVE_SUSPICIOUS_COMPRESSION");
    expect(extracted).toBe(false);
  });

  it("cancels before scan, during extraction, and before normalization while closing readers", async () => {
    const before = new AbortController();
    before.abort();
    const file = new File(["zip"], "cancel.zip");
    expect(await errorCode(run({ type: "PARSE_ARCHIVE", jobId: "before", file }, {}, before))).toBe("IMPORT_CANCELLED");

    const during = new AbortController();
    let closed = false;
    const reader: ImportArchiveReader = {
      async getEntries() {
        return [
          {
            metadata: { name: "followers_and_following/followers_1.json", compressedSize: 1, uncompressedSize: 1 },
            async readText() { during.abort(); return followers; },
          },
          {
            metadata: { name: "followers_and_following/following.json", compressedSize: 1, uncompressedSize: 1 },
            async readText() { return following; },
          },
        ];
      },
      async close() { closed = true; },
    };
    expect(await errorCode(run({ type: "PARSE_ARCHIVE", jobId: "during", file }, { openArchive: () => reader }, during))).toBe("IMPORT_CANCELLED");
    expect(closed).toBe(true);

    const normalize = new AbortController();
    const files = [new File([followers], "followers_1.json"), new File([following], "following.json")];
    await expect(runImportPipeline(
      { type: "PARSE_FILES", jobId: "normalize", files },
      normalize.signal,
      (event) => { if (event.stage === "normalizing") normalize.abort(); },
    )).rejects.toMatchObject({ code: "IMPORT_CANCELLED" });
  });

  it("builds diagnostics from allowlisted metadata without relationship values", () => {
    const state = createDiagnosticState();
    state.archiveFileCount = 2;
    state.matchedRelevantFilenames.push("followers_and_following/followers_1.json");
    state.recognizedTopLevelKeys.add("relationships_following");
    const report = createSafeDiagnostics(state, "UNSUPPORTED_INSTAGRAM_SCHEMA", "Mozilla/5.0 Chrome/123.0");
    const serialized = JSON.stringify(report);
    expect(report.browser).toBe("Chrome 123.0");
    expect(report.errorCode).toBe("UNSUPPORTED_INSTAGRAM_SCHEMA");
    expect(serialized).not.toContain("Alice");
    expect(serialized).not.toContain("http");
    expect(serialized).not.toContain("stack");
  });

  it("posts only a serialized error and sanitized diagnostics across the worker boundary", async () => {
    const responses: import("@/features/analyzer/workers/protocol").WorkerResponse[] = [];
    await handleWorkerRequest(
      {
        type: "PARSE_FILES",
        jobId: "safe-error",
        files: [new File(["{private-value"], "followers_1.json"), new File([following], "following.json")],
      },
      new AbortController().signal,
      (response) => responses.push(response),
    );
    const terminal = responses.at(-1);
    expect(terminal?.type).toBe("ERROR");
    const serialized = JSON.stringify(terminal);
    expect(serialized).toContain("INVALID_JSON");
    expect(serialized).not.toContain("private-value");
    expect(serialized).not.toContain("stack");
  });
});
