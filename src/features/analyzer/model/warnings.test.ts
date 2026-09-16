import { describe, expect, it } from "vitest";

import {
  createImportWarning,
  IMPORT_WARNING_CODES,
  mergeImportWarnings,
} from "@/features/analyzer/model/warnings";

describe("import warnings", () => {
  it("provides stable localization keys for every warning code", () => {
    for (const code of IMPORT_WARNING_CODES) {
      expect(createImportWarning(code).messageKey).toBe(
        `import.warning.${code.toLowerCase()}`,
      );
    }
  });

  it("merges counts only within the same relationship kind", () => {
    expect(
      mergeImportWarnings([
        createImportWarning("MISSING_OPTIONAL_TIMESTAMP", 2, "followers"),
        createImportWarning("MISSING_OPTIONAL_TIMESTAMP", 3, "followers"),
        createImportWarning("MISSING_OPTIONAL_TIMESTAMP", 1, "following"),
      ]),
    ).toEqual([
      expect.objectContaining({ count: 5, relationshipKind: "followers" }),
      expect.objectContaining({ count: 1, relationshipKind: "following" }),
    ]);
  });
});
