# Analyzer workflow (M6)

The `/app` route parses Instagram exports and `/facebook/analyzer` parses Facebook exports locally. Both synchronize only confirmed normalized snapshots through an authenticated API. Neither submits a social credential nor uploads the raw export. The interactive boundary owns the Web Worker; domain comparison, normalization, and CSV generation remain client-side, while persistent profile/history operations are owner- and platform-scoped in PostgreSQL.

## State and data lifecycle

The reducer in `src/features/analyzer/components/state-machine.ts` models these mutually exclusive states: `NO_ACCOUNT`, `READY_TO_IMPORT`, `VALIDATING`, `PARSING`, `REVIEW_IMPORT`, `SAVING`, `RESULTS`, and `ERROR`. Every worker update carries a job ID, so a cancelled or stale job cannot replace a newer screen.

ZIP or manual JSON `File` objects are passed directly to the import worker. The review state retains only normalized results, a SHA-256 fingerprint, safe diagnostics, and display-only source metadata. Saving persists normalized relationship records and snapshot metadata; raw ZIP/JSON bytes and source filenames are not stored.

If server synchronization rejects a snapshot write or the network is unavailable, the normalized analysis remains available in memory and can still be exported to CSV. Reloading naturally clears that unsaved fallback.

## Results and history

Current relationship categories use the set-based domain engine. Historical categories appear only when a strictly earlier snapshot exists. Manual comparison normalizes the selected snapshots to older/newer order and never crosses local-account or platform boundaries.

Lists search normalized handles case-insensitively, use deterministic sorting, and render at most 50 rows per page. Instagram links are constructed from validated normalized handles on a fixed HTTPS origin. They never use export-provided URLs.

Facebook uses distinct Friends, Followers, and Following lists and never generates profile URLs from display names. Instagram-only mutual/not-following-back views are not shown in the Facebook workspace. Meta's reversible UTF-8-as-Latin-1 export text is repaired before validation; genuine Unicode input is preserved.

CSV export is generated entirely in the browser with UTF-8 BOM, RFC-style quoting, spreadsheet-formula neutralization, privacy-safe filenames, and immediate object-URL revocation.

## Deletion and accessibility

Snapshot, account cascade, and all-local-data operations require an alert dialog. Dialogs trap focus and restore it to the invoking control. The drop area always has equivalent file inputs, progress reflects worker events rather than timers, tabs support arrow/Home/End keys, and result status changes use live regions.

The public Story/Highlights subsystem is not part of this route and does not import analyzer repositories.
