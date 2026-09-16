import {
  BlobReader,
  TextWriter,
  ZipReader,
  configure,
  type Entry,
  type FileEntry,
} from "@zip.js/zip.js/index-native.js";

import type { ArchiveEntryMetadata } from "@/features/analyzer/adapters";

configure({ useWebWorkers: false });

export interface ImportArchiveEntry {
  readonly metadata: ArchiveEntryMetadata;
  readText(signal: AbortSignal): Promise<string>;
}

export interface ImportArchiveReader {
  getEntries(signal: AbortSignal): Promise<readonly ImportArchiveEntry[]>;
  close(): Promise<void>;
}

function toImportEntry(entry: Entry): ImportArchiveEntry {
  const metadata: ArchiveEntryMetadata = {
    name: entry.filename,
    compressedSize: entry.compressedSize,
    uncompressedSize: entry.uncompressedSize,
    encrypted: entry.encrypted,
    directory: entry.directory,
  };
  return {
    metadata,
    async readText(signal) {
      if (entry.directory) return "";
      return (entry as FileEntry).getData(new TextWriter(), { signal, useWebWorkers: false });
    },
  };
}

export function openZipArchive(blob: Blob): ImportArchiveReader {
  const reader = new ZipReader(new BlobReader(blob), {
    useWebWorkers: false,
    checkSignature: true,
    checkLocalDirectory: true,
  });
  return {
    async getEntries(signal) {
      if (signal.aborted) throw signal.reason;
      const entries = await reader.getEntries();
      if (signal.aborted) throw signal.reason;
      return entries.map(toImportEntry);
    },
    async close() {
      await reader.close();
    },
  };
}
