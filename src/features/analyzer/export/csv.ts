import type { RelationshipRecord } from "@/features/analyzer/model/types";

export interface RelationshipCsvRow {
  readonly record: RelationshipRecord;
  readonly category: string;
  readonly currentSnapshot: number;
  readonly previousSnapshot?: number;
}

export interface CsvLabels {
  readonly handle: string;
  readonly category: string;
  readonly connectedAt: string;
  readonly currentSnapshot: string;
  readonly previousSnapshot: string;
}

function neutralizeFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export function escapeCsvCell(value: string | number | undefined): string {
  const text = neutralizeFormula(value === undefined ? "" : String(value));
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createRelationshipCsv(
  rows: readonly RelationshipCsvRow[],
  labels: CsvLabels,
): string {
  const header = [
    labels.handle,
    labels.category,
    labels.connectedAt,
    labels.currentSnapshot,
    labels.previousSnapshot,
  ];
  const lines = rows.map(({ record, category, currentSnapshot, previousSnapshot }) =>
    [
      record.handle,
      category,
      record.connectedAt,
      currentSnapshot,
      previousSnapshot,
    ]
      .map(escapeCsvCell)
      .join(","),
  );
  return `\uFEFF${[header.map(escapeCsvCell).join(","), ...lines].join("\r\n")}\r\n`;
}

export function safeCsvFilename(prefix: string, timestamp = Date.now()): string {
  const safePrefix = prefix
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const date = new Date(timestamp).toISOString().slice(0, 10);
  return `${safePrefix || "relationship-analysis"}-${date}.csv`;
}

export function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
