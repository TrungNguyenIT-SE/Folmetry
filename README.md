# Folmetry

Privacy-first, cross-device Instagram relationship analysis with separate Instagram and Facebook product areas.

## Local development

Requirements: Node 24.13.0 and pnpm 12.4.2.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`.

## Website accounts (M8A)

Folmetry uses Better Auth with PostgreSQL for website accounts, verified email, password recovery, database-backed sessions, and `user`/`admin` roles. Raw Instagram ZIP/JSON files are parsed in a browser worker and never uploaded. Confirmed normalized relationship snapshots are stored in PostgreSQL under the authenticated Folmetry user so history synchronizes across devices.

1. Copy the account variables from `.env.example` into `.env.local` and use a real PostgreSQL `DATABASE_URL`.
2. Generate a secret with `pnpm exec auth secret` and set `BETTER_AUTH_SECRET`.
3. Configure a newly generated SMTP app password. Never reuse a password exposed in chat or commit it.
4. Set `ADMIN_EMAIL` to the address that should become the bootstrap admin and `ADMIN_USERNAME` to its reserved username.
5. Optional Google sign-in: create a Google OAuth 2.0 Web client, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and register `/api/auth/callback/google` for both local and production origins. Never expose the client secret through `NEXT_PUBLIC_*`.
6. Apply the schema and start the app. Re-run the migration after enabling username login:

```bash
pnpm auth:migrate
pnpm dev
```

Register with the `ADMIN_EMAIL` address and a new, unshared password, then complete email verification to activate the first administrator. The configured admin username is applied automatically. Do not put an admin password in source code or `.env.example`; if a password was shared in chat, consider it compromised and choose a different one. Later role changes are performed from `/admin/users`. Production deployment must provide the same variables through the hosting platform's encrypted secret store.

Passwords must contain 10-128 characters, at least one uppercase letter, one number, and one ASCII special character. The same server-side policy applies to registration, reset, profile password changes, and admin-set passwords. Users can sign in with either email or username.

Google sign-in is enabled only when both Google variables are present. Local callback: `http://localhost:3000/api/auth/callback/google`. Production callback: `https://<your-domain>/api/auth/callback/google`. Configure the matching origin in `BETTER_AUTH_URL` and Google Cloud; a partial Google configuration is treated as disabled. Folmetry requests only `openid`, `email`, and `profile`; Better Auth encrypts OAuth token fields before database storage.

## Quality gates

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm audit --prod --audit-level high
```

## Folmetry Assistant (M9AI)

The authenticated assistant answers both Folmetry questions and general questions. `Auto` detects the request type, `Folmetry` stays focused on product guidance, and `General` uses model knowledge. `Live Web` remains disabled until a separately reviewed search provider is configured. Conversations are owner-scoped in PostgreSQL and synchronize across devices; relationship ZIP files, raw exports, and synchronized follower lists are never attached automatically.

The feature fails closed. Set both `AI_ASSISTANT_ENABLED=true` and `AI_PROVIDER_APPROVED=true`, then configure Groq and/or Cloudflare Workers AI. Cloudflare requires `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_API_TOKEN`, and an `@cf/...` model; the gateway ID defaults to `default`. With both providers configured, new conversations are distributed deterministically and fall back to the other provider if the preferred provider fails before output starts. Never use `NEXT_PUBLIC_` for an AI token.

The assistant tables are created idempotently on first use. Requests require a Folmetry session, enforce owner-scoped queries and database-backed quotas, and expose only normalized error codes. Review [the assistant architecture and production checklist](docs/ai-assistant.md) before enabling it.

## Public Stories and Highlights (M6S)

The network Story utility is isolated from the local relationship analyzer and is disabled by default. It accepts one public handle, calls only same-origin application routes, returns opaque short-lived media references, and does not store searches or results in browser persistence.

Production activation requires a reviewed provider contract and privacy approval. See [the provider due-diligence record](docs/story-provider-due-diligence.md) and copy `.env.example` into a local ignored environment file only after approval. Never prefix provider or media-token secrets with `NEXT_PUBLIC_`.

Relationship file parsing remains browser-local; confirmed normalized snapshots use the owner-scoped analyzer API. Story/Highlights is a separate server-assisted feature and is disabled until its provider release gate is approved. Never add Instagram credentials, session cookies, real exports, or provider secrets to this repository.

## Analyzer domain and worker pipeline

The M2 parser core is framework-independent and exported from `src/features/analyzer/index.ts`. It contains safe archive-path detection, tolerant Instagram JSON extraction, normalization, deduplication, set-based analysis, historical diff, resource-limit validation, and canonical SHA-256 fingerprinting.

M3 adds a dedicated typed module worker, selective ZIP extraction through the CSP-friendly native zip.js entry point, real progress stages, hard cancellation by worker termination, manual multi-file JSON recovery, sanitized diagnostics, and worker-side SHA-256 fingerprinting. Raw ZIP/JSON data is neither uploaded nor persisted by this pipeline.

M4 supplied the original IndexedDB persistence layer. M8SYNC replaces analyzer domain persistence with authenticated PostgreSQL synchronization while IndexedDB remains only for small UI preferences. Existing browser-only analyzer records are not silently assigned or uploaded; re-import the original export to create a synchronized snapshot. See [`docs/cloud-sync.md`](./docs/cloud-sync.md).

M5 adds typed English/Vietnamese localization, persisted system/light/dark themes, a responsive accessible shell, and source-owned UI primitives. See [`docs/ui-foundations.md`](./docs/ui-foundations.md).

M6 connects the analyzer workflow. M8SYNC now saves confirmed normalized snapshots through the authenticated server API, while ZIP/JSON parsing, CSV generation, and unsaved fallback results remain local. See [`docs/analyzer-workflow.md`](./docs/analyzer-workflow.md).

All committed fixtures are synthetic. Regenerate the mechanical archive fixtures with:

```bash
pnpm fixtures:generate
```

See [website.md](./website.md), [plan.md](./plan.md), and the [decision log](./docs/decisions/README.md).
