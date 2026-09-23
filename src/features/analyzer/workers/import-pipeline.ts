import type { AdapterFile, ArchiveManifest } from "@/features/analyzer/adapters";
import {
  detectFacebookManifest,
  facebookAdapter,
  FACEBOOK_PARSER_VERSION,
  isFacebookRelationshipPath,
} from "@/features/analyzer/adapters/facebook";
import {
  detectInstagramManifest,
  instagramAdapter,
  INSTAGRAM_PARSER_VERSION,
  isFollowerPath,
  isFollowingPath,
} from "@/features/analyzer/adapters/instagram";
import { normalizeArchivePath } from "@/features/analyzer/adapters/archive-path";
import type { SocialPlatform } from "@/features/analyzer/model/types";
import { ImportDomainError } from "@/features/analyzer/model/errors";
import { IMPORT_POLICY } from "@/features/analyzer/model/policy";
import {
  validateArchiveByteLength,
  validateManifestResourceLimits,
} from "@/features/analyzer/model/resource-limits";
import { mergeImportWarnings } from "@/features/analyzer/model/warnings";
import { computeSnapshotFingerprint } from "@/features/analyzer/services/fingerprint";
import type {
  ImportWorkerResult,
  ProgressResponse,
  WorkerRequest,
} from "@/features/analyzer/workers/protocol";
import {
  collectRecognizedTopLevelKeys,
  createDiagnosticState,
  createSafeDiagnostics,
  type MutableDiagnosticState,
} from "@/features/analyzer/workers/diagnostics";
import {
  openZipArchive,
  type ImportArchiveEntry,
  type ImportArchiveReader,
} from "@/features/analyzer/workers/archive-reader";

export const MANUAL_JSON_INPUT_PROPS = Object.freeze({
  accept: ".json,application/json",
  multiple: true,
} as const);

export interface ImportPipelineDependencies {
  readonly openArchive?: (blob: Blob) => ImportArchiveReader;
  readonly diagnosticState?: MutableDiagnosticState;
}

type EmitProgress = (response: ProgressResponse) => void;

function throwIfCancelled(signal: AbortSignal): void {
  if (signal.aborted) throw new ImportDomainError("IMPORT_CANCELLED");
}

function progress(
  emit: EmitProgress,
  jobId: string,
  stage: ProgressResponse["stage"],
  completed = 0,
  total = 1,
): void {
  emit({ type: "PROGRESS", jobId, stage, completed, total });
}

function parseJson(text: string, state: MutableDiagnosticState): unknown {
  let content: unknown;
  try {
    content = JSON.parse(text) as unknown;
  } catch {
    throw new ImportDomainError("INVALID_JSON");
  }
  collectRecognizedTopLevelKeys(content, state);
  return content;
}

function safeManualPath(name: string, platform: SocialPlatform): string {
  const normalized = normalizeArchivePath(name);
  if (!normalized.safe) {
    throw new ImportDomainError("ARCHIVE_UNSAFE_PATH", { reason: normalized.reason });
  }
  const basename = normalized.path.split("/").at(-1) ?? "";
  if (!basename.toLowerCase().endsWith(".json")) {
    throw new ImportDomainError("UNSUPPORTED_FILE_TYPE");
  }
  if (platform === "instagram" && (/^followers_\d+\.json$/i.test(basename) || /^following\.json$/i.test(basename))) {
    return `followers_and_following/${basename}`;
  }
  if (platform === "facebook" && /^(?:friends|following)\.json$/i.test(basename)) {
    return `friends_and_followers/${basename}`;
  }
  if (platform === "facebook" && /^your_friends\.json$/i.test(basename)) {
    return `connections/friends/${basename}`;
  }
  if (platform === "facebook" && /^(?:people_who_followed_you|who_you've_followed)\.json$/i.test(basename)) {
    return `connections/followers/${basename}`;
  }
  return normalized.path;
}

function relevantPaths(platform: SocialPlatform, manifest: ArchiveManifest): readonly string[] {
  if (platform === "facebook") {
    const detected = detectFacebookManifest(manifest);
    return [
      detected.friends.normalizedPath,
      ...(detected.followers === undefined ? [] : [detected.followers.normalizedPath]),
      ...(detected.following === undefined ? [] : [detected.following.normalizedPath]),
    ];
  }
  const detected = detectInstagramManifest(manifest);
  return [
    ...detected.followerParts.map((part) => part.normalizedPath),
    detected.following.normalizedPath,
  ];
}

function relevantEntries(
  entries: readonly ImportArchiveEntry[],
  manifest: ArchiveManifest,
  platform: SocialPlatform,
  state: MutableDiagnosticState,
): readonly ImportArchiveEntry[] {
  const paths = new Set(relevantPaths(platform, manifest).map((path) => path.toLowerCase()));
  const selected = entries.filter((entry) => {
    const normalized = normalizeArchivePath(entry.metadata.name);
    return normalized.safe && paths.has(normalized.path.toLowerCase());
  });
  state.matchedRelevantFilenames.push(
    ...selected.map((entry) => normalizeArchivePath(entry.metadata.name)).flatMap((item) =>
      item.safe ? [item.path.split("/").at(-1) ?? ""] : [],
    ),
  );
  return selected;
}

async function readArchiveFiles(
  request: Extract<WorkerRequest, { type: "PARSE_ARCHIVE" }>,
  signal: AbortSignal,
  emit: EmitProgress,
  state: MutableDiagnosticState,
  dependencies: ImportPipelineDependencies,
): Promise<{ files: readonly AdapterFile[]; manifest: ArchiveManifest; warnings: ReturnType<typeof validateArchiveByteLength> }> {
  if (!request.file.name.toLowerCase().endsWith(".zip")) {
    throw new ImportDomainError("UNSUPPORTED_FILE_TYPE");
  }
  const warnings = validateArchiveByteLength(request.file.size);
  throwIfCancelled(signal);
  progress(emit, request.jobId, "scanning_archive");

  let reader: ImportArchiveReader | undefined;
  try {
    try {
      reader = (dependencies.openArchive ?? openZipArchive)(request.file);
    } catch {
      throw new ImportDomainError("ARCHIVE_CORRUPTED");
    }
    let entries: readonly ImportArchiveEntry[];
    try {
      entries = await reader.getEntries(signal);
    } catch (error) {
      if (signal.aborted) throw new ImportDomainError("IMPORT_CANCELLED");
      if (error instanceof ImportDomainError) throw error;
      throw new ImportDomainError("ARCHIVE_CORRUPTED");
    }
    throwIfCancelled(signal);
    state.archiveFileCount = entries.filter((entry) => entry.metadata.directory !== true).length;
    const manifest: ArchiveManifest = { entries: entries.map((entry) => entry.metadata) };
    const detectedEntries = relevantEntries(entries, manifest, request.platform, state);
    const resourceWarnings = validateManifestResourceLimits(
      manifest,
      (path) => request.platform === "facebook"
        ? isFacebookRelationshipPath(path)
        : isFollowerPath(path) || isFollowingPath(path),
    );

    const files: AdapterFile[] = [];
    for (const [index, entry] of detectedEntries.entries()) {
      throwIfCancelled(signal);
      progress(emit, request.jobId, "reading_relationship_files", index, detectedEntries.length);
      let text: string;
      try {
        text = await entry.readText(signal);
      } catch {
        if (signal.aborted) throw new ImportDomainError("IMPORT_CANCELLED");
        throw new ImportDomainError("ARCHIVE_CORRUPTED");
      }
      throwIfCancelled(signal);
      progress(emit, request.jobId, "parsing_json", index, detectedEntries.length);
      const content = parseJson(text, state);
      if (new TextEncoder().encode(text).byteLength > IMPORT_POLICY.maxRelevantJsonBytes) {
        throw new ImportDomainError("RELEVANT_DATA_TOO_LARGE");
      }
      files.push({ path: entry.metadata.name, content });
    }
    return { files, manifest, warnings: mergeImportWarnings([...warnings, ...resourceWarnings]) };
  } finally {
    if (reader !== undefined) await reader.close().catch(() => undefined);
  }
}

async function readManualFiles(
  request: Extract<WorkerRequest, { type: "PARSE_FILES" }>,
  signal: AbortSignal,
  emit: EmitProgress,
  state: MutableDiagnosticState,
): Promise<{ files: readonly AdapterFile[]; manifest: ArchiveManifest; warnings: readonly [] }> {
  if (request.files.length === 0) {
    throw new ImportDomainError(
      request.platform === "facebook" ? "FRIENDS_FILE_NOT_FOUND" : "FOLLOWERS_FILE_NOT_FOUND",
    );
  }
  let totalSize = 0;
  const mapped = request.files.map((file) => {
    const path = safeManualPath(file.name, request.platform);
    if (!Number.isSafeInteger(file.size) || file.size < 0) {
      throw new ImportDomainError("RELEVANT_DATA_TOO_LARGE", { reason: "invalid-file-size" });
    }
    if (file.size > IMPORT_POLICY.maxRelevantJsonBytes) {
      throw new ImportDomainError("RELEVANT_DATA_TOO_LARGE", {
        limit: IMPORT_POLICY.maxRelevantJsonBytes,
        actual: file.size,
      });
    }
    totalSize += file.size;
    if (totalSize > IMPORT_POLICY.maxTotalRelevantBytes) {
      throw new ImportDomainError("RELEVANT_DATA_TOO_LARGE", {
        limit: IMPORT_POLICY.maxTotalRelevantBytes,
        actual: totalSize,
      });
    }
    return { file, path };
  });
  const manifest: ArchiveManifest = {
    entries: mapped.map(({ file, path }) => ({
      name: path,
      compressedSize: file.size,
      uncompressedSize: file.size,
    })),
  };
  state.archiveFileCount = mapped.length;
  const detectedPaths = relevantPaths(request.platform, manifest);
  state.matchedRelevantFilenames.push(
    ...detectedPaths.map((path) => path.split("/").at(-1) ?? ""),
  );
  const selectedPaths = new Set(detectedPaths.map((path) => path.toLowerCase()));
  const files: AdapterFile[] = [];
  for (const [index, item] of mapped.entries()) {
    if (!selectedPaths.has(item.path.toLowerCase())) continue;
    throwIfCancelled(signal);
    progress(emit, request.jobId, "reading_relationship_files", index, mapped.length);
    const text = await item.file.text();
    throwIfCancelled(signal);
    progress(emit, request.jobId, "parsing_json", index, mapped.length);
    files.push({ path: item.path, content: parseJson(text, state) });
  }
  return { files, manifest, warnings: [] };
}

export async function runImportPipeline(
  request: WorkerRequest,
  signal: AbortSignal,
  emit: EmitProgress,
  dependencies: ImportPipelineDependencies = {},
): Promise<ImportWorkerResult> {
  const state = dependencies.diagnosticState ?? createDiagnosticState(request.platform);
  state.parserVersion = request.platform === "facebook"
    ? FACEBOOK_PARSER_VERSION
    : INSTAGRAM_PARSER_VERSION;
  progress(emit, request.jobId, "validating");
  throwIfCancelled(signal);

  let source: Awaited<ReturnType<typeof readArchiveFiles>> | Awaited<ReturnType<typeof readManualFiles>>;
  switch (request.type) {
    case "PARSE_ARCHIVE":
      source = await readArchiveFiles(request, signal, emit, state, dependencies);
      break;
    case "PARSE_FILES":
      source = await readManualFiles(request, signal, emit, state);
      break;
    default: {
      const exhaustive: never = request;
      throw exhaustive;
    }
  }

  throwIfCancelled(signal);
  progress(emit, request.jobId, "normalizing");
  const adapter = request.platform === "facebook" ? facebookAdapter : instagramAdapter;
  const payload = await adapter.parse(
    {
      mode: request.type === "PARSE_ARCHIVE" ? "archive" : "manual",
      manifest: source.manifest,
      files: source.files,
    },
    { signal },
  );
  const payloadWithWarnings = {
    ...payload,
    warnings: mergeImportWarnings([...source.warnings, ...payload.warnings]),
  };
  throwIfCancelled(signal);
  progress(emit, request.jobId, "fingerprinting");
  const fingerprint = await computeSnapshotFingerprint(payloadWithWarnings);
  throwIfCancelled(signal);
  progress(emit, request.jobId, "complete", 1, 1);
  return {
    payload: payloadWithWarnings,
    fingerprint,
    diagnostics: createSafeDiagnostics(state),
  };
}

export { createDiagnosticState, createSafeDiagnostics };
