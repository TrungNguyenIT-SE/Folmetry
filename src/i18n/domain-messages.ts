import type { ImportErrorCode } from "@/features/analyzer/model/errors";
import type { ImportWarningCode } from "@/features/analyzer/model/warnings";
import type { PersistenceErrorCode } from "@/features/analyzer/persistence";
import type { ImportProgressStage } from "@/features/analyzer/workers";
import type { Dictionary } from "@/i18n/types";

export function getImportErrorMessage(
  dictionary: Dictionary,
  code: ImportErrorCode,
): string {
  return dictionary.errors.import[code];
}

export function getPersistenceErrorMessage(
  dictionary: Dictionary,
  code: PersistenceErrorCode,
): string {
  return dictionary.errors.persistence[code];
}

export function getImportWarningMessage(
  dictionary: Dictionary,
  code: ImportWarningCode,
): string {
  return dictionary.warnings[code];
}

export function getImportProgressMessage(
  dictionary: Dictionary,
  stage: ImportProgressStage,
): string {
  return dictionary.analyzer.import.stages[stage];
}
