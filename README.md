# Private Social Insights

Privacy-first Instagram relationship analysis with a separately disclosed public Story/Highlights utility.

## Local development

Requirements: Node 24.13.0 and pnpm 12.4.2.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`.

## Quality gates

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm audit --prod --audit-level high
```

Relationship imports will remain browser-local. Story/Highlights is a separate server-assisted feature and is disabled until its provider release gate is approved. Never add Instagram credentials, session cookies, real exports, or provider secrets to this repository.

## Analyzer domain and worker pipeline

The M2 parser core is framework-independent and exported from `src/features/analyzer/index.ts`. It contains safe archive-path detection, tolerant Instagram JSON extraction, normalization, deduplication, set-based analysis, historical diff, resource-limit validation, and canonical SHA-256 fingerprinting.

M3 adds a dedicated typed module worker, selective ZIP extraction through the CSP-friendly native zip.js entry point, real progress stages, hard cancellation by worker termination, manual multi-file JSON recovery, sanitized diagnostics, and worker-side SHA-256 fingerprinting. Raw ZIP/JSON data is neither uploaded nor persisted by this pipeline.

M4 adds the versioned Dexie/IndexedDB repository for local accounts, normalized snapshots, deterministic duplicate/baseline lookup, typed settings, confirmed cascade/delete-all operations, and explicit storage-failure fallback. See [`docs/local-persistence.md`](./docs/local-persistence.md).

M5 adds typed English/Vietnamese localization, persisted system/light/dark themes, a responsive accessible shell, and source-owned UI primitives. See [`docs/ui-foundations.md`](./docs/ui-foundations.md).

All committed fixtures are synthetic. Regenerate the mechanical archive fixtures with:

```bash
pnpm fixtures:generate
```

See [website.md](./website.md), [plan.md](./plan.md), and the [decision log](./docs/decisions/README.md).
