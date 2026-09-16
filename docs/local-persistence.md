# M4 local persistence

## Boundary

The analyzer repository is a browser-only persistence boundary built on Dexie/IndexedDB. It is plain TypeScript and does not import React, Next.js, worker code, network clients, or Story/Highlights modules. Construct it from a client-side event/effect; importing the module itself does not open a database.

Database name: `social-relationship-analyzer`. Schema version: `1`.

```text
accounts:  id, platform, username, createdAt, updatedAt
snapshots: id, accountId, &[accountId+snapshotAt],
           &[accountId+fingerprint], fingerprint, importedAt
settings:  key
```

Relationship arrays and warnings are stored as normalized values but are deliberately not indexed. ZIP blobs, raw JSON, Story queries/results/media, and arbitrary setting payloads have no repository write path. Snapshot writes construct a new allowlisted object field by field instead of spreading caller data.

## Accounts

- IDs use `crypto.randomUUID()` by default; time and ID factories are injectable for deterministic tests.
- Labels are trimmed, required, and limited to 80 characters.
- Optional Instagram usernames use the same normalization/validation contract as relationship handles.
- Lists use stable `createdAt`, then ID ordering.
- Updates advance `updatedAt`.
- Account deletion requires explicit cascade acknowledgement and removes its snapshots in the same transaction.
- The repository never derives an owner account from imported relationships.

## Snapshots and deterministic history

- The account must exist and its platform must match the snapshot platform.
- Counts are derived from normalized arrays at save time.
- List results are newest-first by `snapshotAt`.
- The automatic baseline query is strictly earlier (`snapshotAt < current`), never based on `importedAt`.
- Duplicate fingerprints are scoped to one account. A duplicate returns the existing snapshot and is not saved.
- The same fingerprint may be saved for another account.
- One account cannot have two snapshots at the same `snapshotAt`.
- Unique compound indexes protect both rules against concurrent/double saves.
- Deleting a snapshot requires its account ID and explicit confirmation, preventing cross-account deletion.

## Settings

The only setting keys are `locale`, `theme`, and `localRetentionNoticeSeen`. Values are validated on write and read. Missing or corrupt values return conservative defaults. Relationship data cannot be written through the typed settings repository.

## Failure behavior

Persistence failures map to stable codes for unavailable IndexedDB, quota exhaustion, transaction failure, migration/blocked-upgrade failure, and unknown errors. No raw exception message or data value is exposed by the domain error.

`saveSnapshotWithMemoryFallback` performs one save attempt and returns `not-saved` with the reviewed in-memory draft when persistence fails. It never reports success, never retries forever, and leaves the normalized analysis available for UI display or CSV export.

## Deletion

- Snapshot deletion requires confirmation.
- Account deletion requires confirmation plus cascade acknowledgement.
- Delete-all requires a stronger `all-local-data` scope token and clears accounts, snapshots, and settings in one transaction.
- Operations resolve only after the IndexedDB transaction commits, so the UI can clear its state after success without pretending deletion completed early.

## Tests

Repository tests use a unique fake IndexedDB database per test and mandatory cleanup. They cover schema/opening, existing v1 data, blocked upgrade, account validation/update/order, snapshot ordering/baselines, duplicate races, timestamp conflicts, account/platform isolation, allowlisted storage, settings corruption, cascade and delete-all, failure mapping, and in-memory fallback. Playwright separately verifies persistence through a real browser page reload on Chromium, mobile Chromium, Firefox, and WebKit.
