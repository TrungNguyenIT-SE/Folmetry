import type { NormalizedSnapshotPayload, SocialPlatform } from "@/features/analyzer/model/types";

export interface ArchiveEntryMetadata {
  readonly name: string;
  readonly compressedSize?: number;
  readonly uncompressedSize?: number;
  readonly encrypted?: boolean;
  readonly directory?: boolean;
}

export interface ArchiveManifest {
  readonly entries: readonly ArchiveEntryMetadata[];
}

export type AdapterConfidence = "none" | "possible" | "strong";

export interface AdapterMatch {
  readonly matched: boolean;
  readonly confidence: AdapterConfidence;
  readonly reasons: readonly (
    | "FOLLOWERS_JSON_PRESENT"
    | "FOLLOWING_JSON_PRESENT"
    | "HTML_EXPORT_PRESENT"
    | "UNSAFE_PATH_PRESENT"
  )[];
}

export interface AdapterFile {
  readonly path: string;
  readonly content: unknown;
}

export interface AdapterInput {
  readonly mode: "archive" | "manual";
  readonly manifest: ArchiveManifest;
  readonly files: readonly AdapterFile[];
}

export interface ParseContext {
  readonly signal?: AbortSignal;
}

export interface SocialExportAdapter {
  readonly platform: SocialPlatform;
  canHandle(input: ArchiveManifest): Promise<AdapterMatch>;
  parse(input: AdapterInput, context: ParseContext): Promise<NormalizedSnapshotPayload>;
}
