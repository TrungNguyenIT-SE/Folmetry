import { describe, expect, it } from "vitest";

import { IMPORT_ERROR_CODES } from "@/features/analyzer/model/errors";
import { IMPORT_WARNING_CODES } from "@/features/analyzer/model/warnings";
import { PERSISTENCE_ERROR_CODES } from "@/features/analyzer/persistence";
import { IMPORT_PROGRESS_STAGES } from "@/features/analyzer/workers";
import {
  getImportErrorMessage,
  getImportProgressMessage,
  getImportWarningMessage,
  getPersistenceErrorMessage,
} from "@/i18n/domain-messages";
import { en } from "@/i18n/en";
import { vi } from "@/i18n/vi";

describe("typed domain message mapping", () => {
  it("covers every import error, persistence error, warning, and progress stage", () => {
    for (const dictionary of [en, vi]) {
      expect(IMPORT_ERROR_CODES.every((code) => getImportErrorMessage(dictionary, code).length > 0)).toBe(true);
      expect(PERSISTENCE_ERROR_CODES.every((code) => getPersistenceErrorMessage(dictionary, code).length > 0)).toBe(true);
      expect(IMPORT_WARNING_CODES.every((code) => getImportWarningMessage(dictionary, code).length > 0)).toBe(true);
      expect(IMPORT_PROGRESS_STAGES.every((stage) => getImportProgressMessage(dictionary, stage).length > 0)).toBe(true);
    }
  });

  it("uses neutral Vietnamese historical wording", () => {
    expect(vi.analyzer.results.lostFollowers).toBe("Người theo dõi đã mất");
    expect(vi.pages.faq.description).toContain("không chứng minh");
  });
});
