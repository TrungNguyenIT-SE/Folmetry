import { describe, expect, it } from "vitest";

import {
  IMPORT_ERROR_CODES,
  ImportDomainError,
  serializeImportError,
} from "@/features/analyzer/model/errors";

describe("serialized import errors", () => {
  it("emits stable localization keys and safe numeric context", () => {
    expect(
      serializeImportError(
        new ImportDomainError("ARCHIVE_TOO_LARGE", { limit: 100, actual: 101 }),
      ),
    ).toEqual({
      code: "ARCHIVE_TOO_LARGE",
      titleKey: "import.error.archive_too_large.title",
      messageKey: "import.error.archive_too_large.message",
      actionKey: "import.error.archive_too_large.action",
      context: { limit: 100, actual: 101 },
    });
  });

  it("does not serialize raw exception messages or stack traces", () => {
    const serialized = serializeImportError(new Error("raw secret-like relationship data"));
    expect(serialized.code).toBe("UNKNOWN_IMPORT_ERROR");
    expect(JSON.stringify(serialized)).not.toContain("secret-like");
    expect(JSON.stringify(serialized)).not.toContain("stack");
  });

  it("provides stable presentation keys for every supported error code", () => {
    for (const code of IMPORT_ERROR_CODES) {
      const serialized = serializeImportError(new ImportDomainError(code));
      expect(serialized.titleKey).toBe(`import.error.${code.toLowerCase()}.title`);
      expect(serialized.messageKey).toBe(`import.error.${code.toLowerCase()}.message`);
      expect(serialized.actionKey).toBe(`import.error.${code.toLowerCase()}.action`);
    }
  });
});
