import type { ArchiveManifest } from "@/features/analyzer/adapters/adapter";
import { ImportDomainError } from "@/features/analyzer/model/errors";
import { IMPORT_POLICY } from "@/features/analyzer/model/policy";
import { createImportWarning, type ImportWarning } from "@/features/analyzer/model/warnings";

export function validateArchiveByteLength(byteLength: number): readonly ImportWarning[] {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
    throw new ImportDomainError("ARCHIVE_CORRUPTED", {
      reason: "invalid-archive-byte-length",
    });
  }
  if (byteLength > IMPORT_POLICY.maxArchiveBytes) {
    throw new ImportDomainError("ARCHIVE_TOO_LARGE", {
      limit: IMPORT_POLICY.maxArchiveBytes,
      actual: byteLength,
    });
  }

  return byteLength >= IMPORT_POLICY.maxArchiveBytes * 0.8
    ? [createImportWarning("LARGE_EXPORT_PERFORMANCE_WARNING")]
    : [];
}

function validOptionalSize(value: number | undefined): value is number {
  return value !== undefined && Number.isSafeInteger(value) && value >= 0;
}

export function validateManifestResourceLimits(
  manifest: ArchiveManifest,
  isRelevant: (path: string) => boolean,
): readonly ImportWarning[] {
  if (manifest.entries.length > IMPORT_POLICY.maxEntries) {
    throw new ImportDomainError("ARCHIVE_TOO_MANY_ENTRIES", {
      limit: IMPORT_POLICY.maxEntries,
      actual: manifest.entries.length,
    });
  }

  let totalRelevantBytes = 0;
  for (const entry of manifest.entries) {
    if (!isRelevant(entry.name)) {
      continue;
    }
    if (entry.encrypted === true) {
      throw new ImportDomainError("ARCHIVE_ENCRYPTED");
    }
    if (
      entry.uncompressedSize !== undefined &&
      !validOptionalSize(entry.uncompressedSize)
    ) {
      throw new ImportDomainError("ARCHIVE_CORRUPTED", {
        reason: "invalid-uncompressed-size",
      });
    }
    if (entry.compressedSize !== undefined && !validOptionalSize(entry.compressedSize)) {
      throw new ImportDomainError("ARCHIVE_CORRUPTED", {
        reason: "invalid-compressed-size",
      });
    }

    const uncompressedSize = entry.uncompressedSize ?? 0;
    if (uncompressedSize > IMPORT_POLICY.maxRelevantJsonBytes) {
      throw new ImportDomainError("RELEVANT_DATA_TOO_LARGE", {
        limit: IMPORT_POLICY.maxRelevantJsonBytes,
        actual: uncompressedSize,
      });
    }
    totalRelevantBytes += uncompressedSize;
    if (totalRelevantBytes > IMPORT_POLICY.maxTotalRelevantBytes) {
      throw new ImportDomainError("RELEVANT_DATA_TOO_LARGE", {
        limit: IMPORT_POLICY.maxTotalRelevantBytes,
        actual: totalRelevantBytes,
      });
    }

    if (entry.uncompressedSize === undefined || entry.compressedSize === undefined) {
      throw new ImportDomainError("ARCHIVE_CORRUPTED", {
        reason: "missing-relevant-entry-size",
      });
    }

    if (uncompressedSize > 0) {
      const compressionRatio =
        entry.compressedSize === 0 ? Number.POSITIVE_INFINITY : uncompressedSize / entry.compressedSize;
      if (compressionRatio > IMPORT_POLICY.maxCompressionRatio) {
        throw new ImportDomainError("ARCHIVE_SUSPICIOUS_COMPRESSION", {
          limit: IMPORT_POLICY.maxCompressionRatio,
          actual: compressionRatio,
        });
      }
    }
  }

  return totalRelevantBytes >= IMPORT_POLICY.maxTotalRelevantBytes * 0.8
    ? [createImportWarning("LARGE_EXPORT_PERFORMANCE_WARNING")]
    : [];
}
