import { describe, expect, it } from "vitest";

import { createRelationshipCsv, escapeCsvCell, safeCsvFilename } from "./csv";

describe("CSV export", () => {
  it("quotes commas, quotes, newlines and neutralizes spreadsheet formulas", () => {
    expect(escapeCsvCell('hello,"world"\n')).toBe('"hello,""world""\n"');
    expect(escapeCsvCell("=1+1")).toBe("'=1+1");
    expect(escapeCsvCell("+SUM(A1)")).toBe("'+SUM(A1)");
    expect(escapeCsvCell("-2")).toBe("'-2");
    expect(escapeCsvCell("@danger")).toBe("'@danger");
  });

  it("creates UTF-8 BOM CSV with Unicode values", () => {
    const csv = createRelationshipCsv(
      [
        {
          record: { handle: "nguy?n", normalizedHandle: "nguy?n", connectedAt: 10 },
          category: "Ngu?i theo doi m?i",
          currentSnapshot: 20,
          previousSnapshot: 5,
        },
      ],
      {
        handle: "Handle",
        category: "Category",
        connectedAt: "Connected",
        currentSnapshot: "Current",
        previousSnapshot: "Previous",
      },
    );
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("nguy?n");
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("uses a safe date-only filename without account identity", () => {
    expect(safeCsvFilename("Ph\u00e2n t\u00edch quan h\u1ec7", Date.UTC(2026, 8, 16))).toBe(
      "phan-tich-quan-he-2026-09-16.csv",
    );
  });
});
