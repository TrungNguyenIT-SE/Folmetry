# M3 secure import pipeline

## Runtime boundary

Relationship imports enter through `ImportWorkerClient`. The client creates one dedicated module worker with `new Worker(new URL("./parser.worker.ts", import.meta.url), { type: "module" })`. Starting a new job cancels the previous job, removes its listeners, terminates its worker, and creates a clean worker. Responses whose `jobId` does not match the active job are ignored.

Cancellation is intentionally hard: terminating the worker releases its parsing heap and prevents a cancelled job from later posting success. The pure pipeline also accepts an `AbortSignal` so resource readers and tests can stop cooperatively.

## Typed protocol

Requests are `PARSE_ARCHIVE` or `PARSE_FILES`; both carry a caller-generated `jobId`. Responses are `PROGRESS`, `SUCCESS`, or `ERROR`. Every switch is exhaustive. Errors cross the boundary only as localization-ready `SerializedImportError` values; raw exceptions and stack traces never cross it.

Real progress stages are:

1. `validating`
2. `scanning_archive` (ZIP only)
3. `reading_relationship_files`
4. `parsing_json`
5. `normalizing`
6. `fingerprinting`
7. `complete`

Repeated read/parse events represent real multipart work. No timer generates progress.

## ZIP security sequence

The worker checks the `.zip` extension and compressed source size before opening the archive. MIME is not trusted. zip.js runs through `index-native.js` with `useWebWorkers: false`, because the application already owns the outer worker and does not need a nested worker/WASM pool.

After listing central-directory metadata, the pipeline applies this order:

1. entry-count limit;
2. path normalization and traversal/absolute/drive/UNC/control-character rejection for every entry;
3. exact Instagram JSON/HTML detection;
4. encrypted-entry rejection;
5. conservative metadata validation;
6. per-entry, total relevant-byte, and compression-ratio limits;
7. selective extraction of only matched `followers_N.json` and `following.json` entries;
8. sequential text parsing to avoid retaining all decompressed text buffers;
9. adapter normalization and fingerprinting;
10. reader close in `finally` on success, error, or cancellation.

Nested archives, media, messages, and unrelated JSON are ignored and never recursively inspected. Entry names are never converted into filesystem paths.

## Shared Instagram path

ZIP and manual recovery inputs create the same `ArchiveManifest` and `AdapterFile` contracts and then call the same Instagram adapter. Manual mode accepts multiple `.json` files, matches safe basenames, requires followers plus following, validates contiguous multipart numbering, and emits the manual-completeness warning.

All `followers_N.json` parts are ordered numerically, merged, and deduplicated. Relationship limits are enforced while records are extracted, not only after an entire export is built.

## Privacy and diagnostics

The worker imports no network, persistence, analytics, or logging client. Raw ZIP bytes, JSON text, relationship values, export URLs, and partial results are not persisted or logged.

Copyable diagnostics are allowlisted to app/parser version, browser family/version, archive file count, standardized matched basenames, recognized static wrapper keys, and error code. Folder names, handles, raw snippets, URLs, and stacks are excluded.

## Verification

The integration suite covers valid single and multipart imports, corrupted/encrypted/HTML archives, unsafe paths, suspicious compression, required-file and part-sequence failures, invalid/unsupported/mixed/duplicate JSON, manual recovery, cancellation at multiple stages, selective extraction, reader cleanup, stale worker responses, one-shot settlement, and sanitized serialized errors. Resource-boundary and order-independent fingerprint tests remain in the domain suite.
