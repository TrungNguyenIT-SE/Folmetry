# Authenticated analyzer synchronization

Folmetry parses the raw Instagram ZIP/JSON export in a dedicated browser worker. The archive and raw JSON are never sent to the application server. When the user confirms **Save snapshot**, the client sends only the normalized relationship records, parser warnings, fingerprint, profile label, and snapshot metadata to `/api/analyzer`.

## Ownership boundary

- Every request requires a valid Better Auth session.
- `owner_id` is derived exclusively from the server session; it is never accepted from request JSON or query parameters.
- Every account and snapshot query includes the authenticated `owner_id`.
- Snapshot writes lock and verify the destination account belongs to the same owner and platform.
- Account deletion cascades its snapshots. User deletion cascades all analyzer rows through the database foreign key.
- The admin user-management API has no read route for analyzer records.

## Storage model

`folmetry_analyzer_account` stores owner-scoped Instagram profile labels and optional usernames. `folmetry_analyzer_snapshot` stores normalized relationship arrays as JSONB plus counts, dates, parser version, warnings, and a SHA-256 fingerprint. Unique constraints prevent duplicate fingerprints and ambiguous timestamps within one profile.

The schema is installed idempotently on the first authenticated analyzer request. Production database credentials therefore need permission to create these two tables and indexes. Raw archives are never stored in PostgreSQL.

## Transition from IndexedDB

Historical analyzer data from older browser-only releases is not automatically uploaded. Automatic ownership cannot be proven for the legacy unscoped database, and silently uploading previously local-only data would violate user expectations. Users should re-import their original export after signing in. Small UI preferences such as locale and theme may continue to use IndexedDB.

## Platform boundary

`/instagram` is the production Instagram workspace and links to the analyzer and Story/Highlights utility. `/facebook` is a distinct product area with an honest unavailable state. Facebook import must remain disabled until current export fixtures and a dedicated adapter are validated.
