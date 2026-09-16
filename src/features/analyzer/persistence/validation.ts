import { normalizeInstagramHandle } from "@/features/analyzer/model/normalize-handle";
import type { SocialPlatform } from "@/features/analyzer/model/types";
import { PersistenceDomainError } from "@/features/analyzer/persistence/errors";

export const ACCOUNT_LABEL_MAX_LENGTH = 80;

export function normalizeAccountLabel(label: unknown): string {
  if (typeof label !== "string") {
    throw new PersistenceDomainError("INVALID_ACCOUNT_LABEL", { reason: "not-a-string" });
  }
  const normalized = label.trim();
  if (normalized.length === 0 || normalized.length > ACCOUNT_LABEL_MAX_LENGTH) {
    throw new PersistenceDomainError("INVALID_ACCOUNT_LABEL", {
      reason: normalized.length === 0 ? "empty" : "too-long",
      limit: ACCOUNT_LABEL_MAX_LENGTH,
      actual: normalized.length,
    });
  }
  return normalized;
}

export function normalizeOptionalAccountUsername(
  platform: SocialPlatform,
  username: unknown,
): string | undefined {
  if (username === undefined || username === null || username === "") return undefined;
  if (platform !== "instagram") {
    throw new PersistenceDomainError("INVALID_ACCOUNT_USERNAME", {
      reason: "unsupported-platform-username",
    });
  }
  const normalized = normalizeInstagramHandle(username);
  if (!normalized.ok) {
    throw new PersistenceDomainError("INVALID_ACCOUNT_USERNAME", {
      reason: normalized.reason,
    });
  }
  return normalized.normalizedHandle;
}
