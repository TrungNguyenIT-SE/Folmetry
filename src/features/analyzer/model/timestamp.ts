import { IMPORT_POLICY } from "@/features/analyzer/model/policy";

export function parseRelationshipTimestamp(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    return undefined;
  }

  if (
    value < IMPORT_POLICY.minRelationshipTimestampSeconds ||
    value > IMPORT_POLICY.maxRelationshipTimestampSeconds
  ) {
    return undefined;
  }

  const milliseconds = value * 1_000;
  return Number.isSafeInteger(milliseconds) && Number.isFinite(new Date(milliseconds).getTime())
    ? milliseconds
    : undefined;
}
