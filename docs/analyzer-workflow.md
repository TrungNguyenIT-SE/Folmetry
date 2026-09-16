# Analyzer workflow (M6)

The `/app` route is a browser-only relationship analyzer. It never submits an Instagram credential or uploads an export. The interactive boundary owns the Web Worker and IndexedDB services; domain comparison, normalization, CSV generation, and persistence remain framework-independent.

## State and data lifecycle

The reducer in `src/features/analyzer/components/state-machine.ts` models these mutually exclusive states: `NO_ACCOUNT`, `READY_TO_IMPORT`, `VALIDATING`, `PARSING`, `REVIEW_IMPORT`, `SAVING`, `RESULTS`, and `ERROR`. Every worker update carries a job ID, so a cancelled or stale job cannot replace a newer screen.

ZIP or manual JSON `File` objects are passed directly to the import worker. The review state retains only normalized results, a SHA-256 fingerprint, safe diagnostics, and display-only source metadata. Saving persists normalized relationship records and snapshot metadata; raw ZIP/JSON bytes and source filenames are not stored.

If IndexedDB rejects a snapshot write, the normalized analysis remains available in memory and can still be exported to CSV. Reloading naturally clears that unsaved fallback.

## Results and history

Current relationship categories use the set-based domain engine. Historical categories appear only when a strictly earlier snapshot exists. Manual comparison normalizes the selected snapshots to older/newer order and never crosses local-account or platform boundaries.

Lists search normalized handles case-insensitively, use deterministic sorting, and render at most 50 rows per page. Instagram links are constructed from validated normalized handles on a fixed HTTPS origin. They never use export-provided URLs.

CSV export is generated entirely in the browser with UTF-8 BOM, RFC-style quoting, spreadsheet-formula neutralization, privacy-safe filenames, and immediate object-URL revocation.

## Deletion and accessibility

Snapshot, account cascade, and all-local-data operations require an alert dialog. Dialogs trap focus and restore it to the invoking control. The drop area always has equivalent file inputs, progress reflects worker events rather than timers, tabs support arrow/Home/End keys, and result status changes use live regions.

The public Story/Highlights subsystem is not part of this route and does not import analyzer repositories.
