export const IMPORT_POLICY = Object.freeze({
  maxArchiveBytes: 100 * 1024 * 1024,
  maxEntries: 10_000,
  maxRelevantJsonBytes: 150 * 1024 * 1024,
  maxTotalRelevantBytes: 250 * 1024 * 1024,
  maxCompressionRatio: 200,
  maxRelationshipsPerKind: 2_000_000,
  maxHandleLength: 30,
  minRelationshipTimestampSeconds: 946_684_800,
  maxRelationshipTimestampSeconds: 4_102_444_800,
} as const);

export type ImportPolicy = typeof IMPORT_POLICY;
