# Folmetry

Privacy-first Instagram relationship analysis with a separately disclosed public Story/Highlights utility.

## Local development

Requirements: Node 24.13.0 and pnpm 12.4.2.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`.

## Website accounts (M8A)

Folmetry uses Better Auth with PostgreSQL for website accounts, verified email, password recovery, database-backed sessions, and `user`/`admin` roles. The account database does not receive Instagram ZIP files or normalized relationship snapshots; those remain in browser IndexedDB.

1. Copy the account variables from `.env.example` into `.env.local` and use a real PostgreSQL `DATABASE_URL`.
2. Generate a secret with `pnpm exec auth secret` and set `BETTER_AUTH_SECRET`.
3. Configure a newly generated SMTP app password. Never reuse a password exposed in chat or commit it.
4. Set `ADMIN_EMAIL` to the address that should become the bootstrap admin and `ADMIN_USERNAME` to its reserved username.
5. Apply the schema and start the app. Re-run the migration after enabling username login:

```bash
pnpm auth:migrate
pnpm dev
```

Register with the `ADMIN_EMAIL` address and a new, unshared password, then complete email verification to activate the first administrator. The configured admin username is applied automatically. Do not put an admin password in source code or `.env.example`; if a password was shared in chat, consider it compromised and choose a different one. Later role changes are performed from `/admin/users`. Production deployment must provide the same variables through the hosting platform's encrypted secret store.

Passwords must contain 10–128 characters, at least one uppercase letter, one number, and one ASCII special character. The same server-side policy applies to registration, reset, profile password changes, and admin-set passwords. Users can sign in with either email or username.

## Quality gates

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm audit --prod --audit-level high
```

## Public Stories and Highlights (M6S)

The network Story utility is isolated from the local relationship analyzer and is disabled by default. It accepts one public handle, calls only same-origin application routes, returns opaque short-lived media references, and does not store searches or results in browser persistence.

Production activation requires a reviewed provider contract and privacy approval. See [the provider due-diligence record](docs/story-provider-due-diligence.md) and copy `.env.example` into a local ignored environment file only after approval. Never prefix provider or media-token secrets with `NEXT_PUBLIC_`.

Relationship imports will remain browser-local. Story/Highlights is a separate server-assisted feature and is disabled until its provider release gate is approved. Never add Instagram credentials, session cookies, real exports, or provider secrets to this repository.

## Analyzer domain and worker pipeline

The M2 parser core is framework-independent and exported from `src/features/analyzer/index.ts`. It contains safe archive-path detection, tolerant Instagram JSON extraction, normalization, deduplication, set-based analysis, historical diff, resource-limit validation, and canonical SHA-256 fingerprinting.

M3 adds a dedicated typed module worker, selective ZIP extraction through the CSP-friendly native zip.js entry point, real progress stages, hard cancellation by worker termination, manual multi-file JSON recovery, sanitized diagnostics, and worker-side SHA-256 fingerprinting. Raw ZIP/JSON data is neither uploaded nor persisted by this pipeline.

M4 adds the versioned Dexie/IndexedDB repository for local accounts, normalized snapshots, deterministic duplicate/baseline lookup, typed settings, confirmed cascade/delete-all operations, and explicit storage-failure fallback. See [`docs/local-persistence.md`](./docs/local-persistence.md).

M5 adds typed English/Vietnamese localization, persisted system/light/dark themes, a responsive accessible shell, and source-owned UI primitives. See [`docs/ui-foundations.md`](./docs/ui-foundations.md).

M6 connects the complete local analyzer workflow: separate account profiles, worker-backed ZIP/JSON import, review and duplicate handling, IndexedDB save with in-memory fallback, localized results/history/manual comparison, safe paginated lists, local CSV export, and confirmed deletion flows. See [`docs/analyzer-workflow.md`](./docs/analyzer-workflow.md).

All committed fixtures are synthetic. Regenerate the mechanical archive fixtures with:

```bash
pnpm fixtures:generate
```

See [website.md](./website.md), [plan.md](./plan.md), and the [decision log](./docs/decisions/README.md).
