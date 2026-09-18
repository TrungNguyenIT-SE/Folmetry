# Website Technical Product Specification

> **Project:** Privacy-first social relationship analyzer + public Instagram Story/Highlights viewer  
> **Primary V1 platform:** Instagram  
> **Future adapter:** Facebook  
> **Document purpose:** Source-of-truth implementation specification for Codex / coding agents  
> **Spec version:** 1.3
> **Verified baseline date:** 2026-09-17
> **Status:** Ready for implementation

---

## Revision 1.3 summary

Version 1.3 introduces the Folmetry Signature Experience, a whole-product visual and interaction system named **Private Signal Observatory**. It makes local processing, privacy boundaries, data states, and relationship changes visible through a precise observatory-inspired interface without changing any product capability or privacy guarantee.

The system uses code-native CSS/SVG, semantic design tokens, progressive enhancement, and restrained state-linked motion. It must remain fully usable without animation, with reduced motion, on small screens, and when modern visual effects are unavailable. Decorative effects must never delay content, obscure controls, reduce contrast, or compete with result data.

---

## Revision 1.2 summary

Version 1.2 adds first-party Folmetry website accounts for public deployment. It introduces verified email/password authentication, database-backed sessions, password recovery, `user`/`admin` roles, and server-side user administration.

This does **not** convert the relationship analyzer into cloud storage. Instagram ZIP files, raw JSON, normalized relationships, local profile labels, snapshots, diffs, and CSV output remain browser-local. Administrators can manage Folmetry identities, roles, suspension state, and sessions, but cannot inspect local Instagram relationship data.

Where version 1.1 or older sections exclude authentication, email, or every server database, this revision supersedes those exclusions only for the narrowly scoped account subsystem. Server-side relationship-file processing and cloud snapshot synchronization remain prohibited.

---

## Revision 1.1 summary

Version 1.1 adds a public Instagram Story/Highlights viewer and individual downloader. This revision intentionally changes V1 from a fully static application into a hybrid deployment with one isolated server-assisted subsystem.

The original relationship-analysis privacy guarantee remains unchanged: ZIP files, raw JSON, normalized follower/following data, snapshots, and results never go to the server. Only Story/Highlights lookup handles are networked, and that fact must be disclosed before submission.

Where older sections use broad wording such as “no backend,” “static only,” or “no network,” version 1.1 limits those guarantees to the relationship analyzer. The explicit Story/Highlights requirements in sections 2.5 and 16A govern the new subsystem.

---

## 0. Instructions to Codex

Treat this file as the product and engineering source of truth.

### Non-negotiable rules

1. Build the relationship-analysis portion of V1 as **local-first and privacy-first**. The Story/Highlights feature is a separate, explicitly networked subsystem with a minimal server-side gateway.
2. The user's Instagram export file and parsed relationship data **must never be uploaded to our server** in V1. Story/Highlights lookups must be architecturally isolated from the relationship analyzer.
3. Do **not** ask for an Instagram/Facebook password, session cookie, 2FA code, access token, or browser cookie.
4. Do **not** implement scraping of Instagram/Facebook pages in our application infrastructure.
5. Do **not** call unofficial/private Instagram or Facebook APIs directly. Public Story/Highlights data may be obtained only through a separately reviewed third-party provider adapter whose credentials remain server-side. There must be no direct-scraping fallback.
6. Do **not** implement automated follow/unfollow/friend/unfriend actions.
7. V1 supports **Instagram JSON data exports only**.
8. Architect platform parsing through adapters so Facebook can be added later, but **do not fake Facebook support** until its current export structure has been validated against fixtures.
9. Parsing/decompression/diff work that can block the UI must run outside the main UI thread.
10. Raw ZIP contents must not be persisted.
11. No production code may contain real user export samples or real usernames.
12. All fixtures must be synthetic/anonymized.
13. The UI must never state with absolute certainty that a person intentionally “unfollowed” the user when the data only proves the account disappeared from a later follower snapshot.
14. Prefer wording such as **“Lost follower”** / **“No longer in your followers since the previous snapshot”** and explain the limitation.
15. V1 may include backend routes for account authentication/administration and public Story/Highlights delivery. Do not use that backend for relationship imports, cloud snapshot sync, payments, analytics, or tracking.
16. Do not add dependencies merely for convenience. Prefer browser/platform APIs and small, well-maintained libraries.
17. TypeScript strict mode is mandatory. Avoid `any`.
18. Every core parser and diff rule must have automated tests before considering the feature complete.
19. Run all quality gates before declaring the task complete.
20. Do not leave TODO placeholders in any V1 acceptance-critical path.
21. Story/Highlights lookup supports **public Instagram accounts only**. Never claim to access private, Close Friends, deleted, or expired stories.
22. Do not ask for or use Instagram credentials, session cookies, browser cookies, device identifiers, or residential proxy credentials for Story/Highlights access.
23. Before a Story/Highlights lookup, disclose that the submitted username/profile URL is sent to our server and the configured data provider.
24. Do not persist Story/Highlights queries or media in our application database by default. Provider-side request logging and retention must be reviewed and disclosed accurately.
25. Validate all provider responses as untrusted input. Never expose the provider API key to the browser.
26. Media download routes must not become an open proxy or SSRF primitive.
27. Only public media may be displayed. The user must be reminded to download content only when they own it or have permission to save it.
28. If a compliant provider is unavailable or misconfigured, fail closed with an actionable error. Do not silently switch to scraping or a private API.

---

# 1. Product definition

## 1.1 Product goal

Build a website that helps a user inspect changes in their Instagram social graph using the official data export they obtained from Meta.

The website also includes a clearly separated utility that lets a user look up, view, and individually download currently available Stories and saved Highlights from a **public** Instagram account through a reviewed server-side data provider.

The product must answer these questions without requiring Instagram credentials:

- Who do I follow who does not currently follow me back?
- Who follows me whom I do not follow back?
- Which accounts are mutual follows?
- Which follower handles disappeared between two imported snapshots?
- Which follower handles appeared between two imported snapshots?
- How did my follower/following counts change between snapshots?
- What active public Stories are currently available for a submitted Instagram username?
- What public Highlight collections and items are available for that username?
- Can I preview and download an individual public Story/Highlight image or video when I have the right to do so?

## 1.2 The core value proposition

> Analyze your Instagram followers privately. No Instagram password. Your export stays on your device.

For the separate Story/Highlights tool:

> View currently available public Instagram Stories and Highlights without providing Instagram credentials. The submitted public username is processed through our server and configured data provider.

The privacy model is not marketing decoration; it is an architectural requirement.

The two privacy boundaries must never be blurred: relationship export data remains local-only, while Story/Highlights queries are networked and must be disclosed as such before submission.

## 1.3 What the product is NOT

The product is not:

- an Instagram login client;
- an Instagram private API client;
- a scraping service;
- an engagement bot;
- an automated follow/unfollow tool;
- a spyware product;
- a profile-viewer detector;
- a service that claims to know who viewed a profile;
- a service that can reconstruct events before the first available snapshot;
- an official Meta/Instagram product.
- a private-story or Close Friends bypass;
- an expired/deleted-story recovery service;
- an anonymous-viewing guarantee;
- a bulk surveillance, scheduled monitoring, or story archiving service;
- a license to republish somebody else's copyrighted media.

---

# 2. Verified platform constraints

## 2.1 Instagram

As of the verification date, the official Instagram API is primarily designed around professional/business/creator account use cases. It exposes aggregate fields such as follower/following counts in supported contexts, but it is not a general API for obtaining a consumer user's complete follower list for this product's use case.

Therefore, V1 must use **user-provided official data exports**, not the Instagram API, to obtain follower/following lists.

## 2.2 Meta data export

Meta provides **Download Your Information** through Accounts Center for Facebook and Instagram. This is the supported user-controlled data portability path that V1 relies on.

## 2.3 Expected Instagram export shape

Current exports commonly contain relationship data under a structure similar to:

```text
connections/
  followers_and_following/
    followers_1.json
    followers_2.json      # optional for larger exports
    followers_3.json      # optional
    ...
    following.json
```

The implementation must **not assume there is only `followers_1.json`**.

The implementation must be tolerant of path/case variations and future export layout changes by searching archive entries using adapter rules rather than relying on one exact absolute path.

V1 supports JSON exports. HTML export support is explicitly out of scope.

## 2.4 Accuracy limitation: usernames are not guaranteed stable IDs

Instagram export relationship entries commonly expose a username/handle and profile URL rather than a durable numeric identity guaranteed for our use case.

A username may change. An account may be deactivated, deleted, suspended, or otherwise disappear.

Therefore:

```text
previousFollowers - currentFollowers
```

proves only that a normalized handle present in the previous snapshot is absent from the current snapshot.

It does NOT prove user intent.

The product may use the short UI label **Lost followers**, but details/tooltips must explain:

> These accounts were present in your previous imported follower list but are not present in the current one. This can happen because of unfollowing, username changes, deactivation, deletion, suspension, or export differences.

## 2.5 Public Story/Highlights access

The official Instagram APIs are designed for supported professional/business/creator account use cases and require access tokens. They are not a general mechanism for retrieving active Stories and Highlights from any arbitrary public consumer username.

Therefore, the Story/Highlights utility may use a reviewed third-party public-data provider behind a server-side adapter. This is an explicit exception to the otherwise local-only runtime architecture and must remain isolated from relationship analysis.

Provider requirements:

- accepts a normalized public Instagram username or profile URL;
- returns active public Story media and public Highlight collections/items;
- does not require an Instagram password, session cookie, user access token, or browser cookie from us or the end user;
- exposes a documented HTTPS API and typed failure modes;
- keeps provider credentials server-side;
- has terms, privacy, retention, pricing, uptime, rate-limit, and acceptable-use policies reviewed before production enablement;
- permits our intended lookup, preview, and user-initiated download use case;
- supports deletion/contact processes appropriate to the data it logs;
- can be disabled without breaking the relationship analyzer.

The initial technical candidate may be evaluated through the provider-adapter contract, but no provider name should be hard-coded into domain/UI components. Provider selection is a release decision, not a permanent domain assumption.

Important limitations:

- public accounts only;
- active Stories only, normally limited by Instagram's availability window;
- Highlights only when the provider can currently resolve the collection and its items;
- no guarantee that every public item will be available;
- no private, Close Friends, removed, deleted, or expired Story access;
- no background polling, monitoring, or archival in V1;
- Story viewing/downloading is not local-only: the submitted handle is transmitted to our server/provider;
- provider-hosted media URLs are untrusted and may expire quickly.

---

# 3. V1 scope

## 3.1 Must ship

V1 must include:

- Marketing landing page.
- “How it works” page.
- Privacy page.
- Terms/disclaimer page.
- FAQ page.
- Local analyzer app.
- Drag-and-drop or file picker for `.zip` Instagram JSON export.
- Optional import of individual supported JSON files for debugging/recovery UX.
- Instagram export validation.
- Multi-part follower file support (`followers_*.json`).
- Following file support.
- Local normalization.
- Local snapshot persistence using IndexedDB.
- Multiple local Instagram account profiles/labels.
- Snapshot history.
- Duplicate snapshot detection.
- Current relationship analysis.
- Snapshot-to-snapshot relationship diff.
- Search/filter/sort in result tables.
- Export result as CSV without sending data anywhere.
- “Delete this account's local data”.
- “Delete all local data”.
- Responsive design.
- Accessible keyboard navigation.
- Dark and light themes.
- English and Vietnamese UI copy architecture; English may be initial default, but strings must not be hard-coded across components.
- Automated unit/integration/end-to-end tests.
- Public Story/Highlights route, e.g. `/story-downloader`.
- Username or Instagram profile URL input with strict normalization.
- Server-assisted lookup of active Stories for public accounts.
- Server-assisted lookup of public Highlight collections and their items.
- Image/video preview with explicit loading, empty, unavailable, rate-limit, and provider-error states.
- Individual image/video download through a same-origin, validated media delivery route.
- Clear pre-submit disclosure that the public handle is sent to our server and configured provider.
- Abuse controls, request timeouts, response-size limits, provider schema validation, and safe error mapping.
- A provider adapter so vendors can be replaced without changing UI/domain contracts.
- Folmetry email/password registration and sign-in with mandatory email verification.
- Unique username registration and sign-in by either email or username.
- Password policy enforced server-side: 10–128 characters with at least one uppercase letter, one number, and one ASCII special character.
- Accessible password-strength feedback during registration and authenticated password changes from the account profile.
- Password reset with short-lived single-use tokens and session revocation.
- PostgreSQL-backed sessions and exactly two application roles: `user` and `admin`.
- Admin user management for listing/searching users, role changes, suspension, session revocation, and deletion.
- Server-side authorization checks on every protected page and API route.

## 3.2 Explicitly out of scope for V1

Do not implement:

- Facebook analyzer implementation.
- Instagram OAuth.
- Facebook Login.
- Server-side processing of Instagram export files or relationship data.
- Cloud synchronization of Instagram relationship data.
- Transactional email other than account verification and password recovery.
- Billing/Stripe.
- Push notifications.
- Scheduled background scanning.
- Browser extension.
- Mobile native app.
- PWA/service worker unless later required.
- HTML Instagram exports.
- RAR/7z/TAR archives.
- AI interpretation of user social relationships.
- Profile pictures fetched from Instagram.
- Background calls to Instagram.
- Direct Instagram scraping by our application.
- Direct use of Instagram private/mobile endpoints.
- Private-account, Close Friends, deleted, removed, or expired Story access.
- Scheduled Story polling, monitoring, alerts, or permanent Story archive.
- Bulk username lookup or bulk media download.
- “Download all” ZIP generation in V1.
- Persisting Story/Highlights media or search history on our server.
- Circumventing access controls, authentication, CAPTCHA, rate limits, or technical protections.

---

# 4. Product roadmap

## Phase 1A — Instagram local relationship analyzer

This specification.

## Phase 1B — Public Story/Highlights utility

Also required for revised V1:

- public username/profile URL lookup;
- active Story and saved Highlight discovery through a reviewed provider;
- preview and individual download;
- minimal server-side gateway with strict validation, rate limiting, secret isolation, SSRF protection, and no persistent application storage;
- transparent network/privacy disclosure distinct from the local analyzer.

## Phase 1.1 — Product hardening

Potential additions after real export compatibility is validated:

- additional Instagram export layout adapters;
- stronger import diagnostics;
- optional local encrypted backup/export of app history;
- accessibility and localization expansion;
- installable PWA only if it provides material user value.

## Phase 2 — Facebook adapter

Facebook must use the same privacy-first model: user-provided official export + local parsing + snapshot comparison.

Before shipping Facebook:

1. Collect multiple **synthetic/recreated** fixtures matching the current Facebook export schema.
2. Validate current export paths and field structure.
3. Add `FacebookExportAdapter` behind the common parser interface.
4. Add Facebook-specific copy explaining that “unfriended” cannot always be inferred as intentional removal.
5. Add full tests.

Never ship a UI option that claims Facebook is supported before these steps are complete.

---

# 5. Technology stack

## 5.1 Core baseline

Use this baseline unless a newer patched stable version is explicitly chosen during implementation after compatibility testing.

| Area | Technology | Baseline / policy |
|---|---|---|
| Runtime | Node.js | **24 LTS** for dev/CI/build; do not use Node Current in production CI |
| Framework | Next.js | **16.3.3 Active LTS or later patched 16.3.x** |
| UI runtime | React | **19.3 stable**, provided it satisfies Next peer compatibility |
| Language | TypeScript | **6.0**, strict mode |
| Styling | Tailwind CSS | **4.3** |
| UI primitives | shadcn/ui + Radix primitives where needed | source-owned components; keep dependency surface small |
| Icons | lucide-react | current compatible stable |
| ZIP reader | `@zip.js/zip.js` | browser ZIP entry inspection/extraction |
| Local database | IndexedDB via Dexie | current stable compatible version |
| Schema validation | Zod | current stable major |
| Unit tests | Vitest | **5.x** |
| Component tests | Testing Library | current compatible stable |
| E2E | Playwright | **1.63+** |
| Accessibility tests | axe-core / `@axe-core/playwright` | current compatible stable |
| Package manager | pnpm | current stable; commit `pnpm-lock.yaml` |
| Story data provider | Server-side provider adapter | reviewed external provider; API key never exposed to browser |
| Server validation | Zod + platform APIs | validate request/provider response; no generic proxy behavior |
| Deployment | Vercel hybrid deployment | static marketing/analyzer assets + minimal Story/Highlights route handlers |

### Important dependency policy

- Pin exact versions in the lockfile.
- Do not use `latest` in committed package manifests.
- Run dependency audit in CI.
- Upgrade promptly for security advisories.
- Never downgrade Next.js below a patched supported release merely to satisfy a convenience package.

## 5.2 Why Next.js instead of a pure SPA

The analyzer itself is client-side, while the Story/Highlights utility needs a narrow server-side gateway to protect provider credentials and deliver media safely. The product also needs indexable marketing/privacy/help pages, metadata, canonical URLs, structured data, clean routing, and strong project conventions.

Use the Next.js App Router and static generation where practical. A full `output: "export"` build is no longer compatible with the required Story/Highlights route handlers.

## 5.3 Rendering policy

- Marketing pages: Server Components/static output by default.
- Analyzer route: Client boundary only where browser APIs are needed.
- Story/Highlights page: static/server shell plus client interaction where needed; server-only provider code must never enter the browser bundle.
- Story/Highlights API/media routes: server runtime with explicit timeouts, size limits, rate limits, and response validation.
- Do not mark the entire app tree with `"use client"`.
- Keep the parser implementation isolated from rendering code.

## 5.4 Minimal backend requirement

The relationship analyzer remains fully client-side and must not depend on a backend.

The Story/Highlights utility requires narrowly scoped server routes for provider lookup and safe media delivery. These routes must not accept ZIP/JSON exports or relationship data.

Do not enable full Next static export while server routes are part of V1. Marketing/help pages should still be statically generated where possible.

Allowed server responsibilities:

- normalize and validate a public username/profile URL;
- enforce origin/body/rate/timeout limits;
- call the configured Story provider with a server-only API key;
- validate and normalize provider responses;
- issue short-lived authenticated-encrypted opaque media references;
- proxy/stream a selected media item only after token and host validation;
- return typed, sanitized errors.

Forbidden server responsibilities:

- receiving or processing Instagram relationship ZIP/JSON;
- storing follower/following data;
- asking for Instagram credentials/cookies/tokens;
- scraping Instagram directly;
- persisting Story media/query history by default;
- acting as a generic URL fetcher/open proxy.

---

# 6. Repository layout

Use a feature-oriented structure similar to:

```text
/
├─ public/
│  ├─ favicon.ico
│  ├─ icons/
│  └─ og/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  ├─ globals.css
│  │  ├─ app/
│  │  │  └─ page.tsx
│  │  ├─ how-it-works/
│  │  │  └─ page.tsx
│  │  ├─ privacy/
│  │  │  └─ page.tsx
│  │  ├─ terms/
│  │  │  └─ page.tsx
│  │  ├─ faq/
│  │  │  └─ page.tsx
│  │  ├─ not-found.tsx
│  │  └─ error.tsx
│  ├─ components/
│  │  ├─ ui/
│  │  ├─ layout/
│  │  ├─ marketing/
│  │  └─ analyzer/
│  ├─ features/
│  │  └─ analyzer/
│  │     ├─ components/
│  │     ├─ hooks/
│  │     ├─ model/
│  │     ├─ services/
│  │     ├─ workers/
│  │     │  ├─ parser.worker.ts
│  │     │  └─ protocol.ts
│  │     ├─ adapters/
│  │     │  ├─ adapter.ts
│  │     │  └─ instagram/
│  │     │     ├─ instagram-adapter.ts
│  │     │     ├─ schemas.ts
│  │     │     ├─ normalize.ts
│  │     │     └─ detect-files.ts
│  │     ├─ diff/
│  │     │  ├─ diff.ts
│  │     │  └─ diff.test.ts
│  │     ├─ persistence/
│  │     │  ├─ db.ts
│  │     │  ├─ schema.ts
│  │     │  └─ repository.ts
│  │     └─ export/
│  │        └─ csv.ts
│  ├─ lib/
│  │  ├─ cn.ts
│  │  ├─ errors.ts
│  │  ├─ crypto.ts
│  │  └─ format.ts
│  ├─ i18n/
│  │  ├─ en.ts
│  │  ├─ vi.ts
│  │  └─ index.ts
│  └─ types/
├─ tests/
│  ├─ fixtures/
│  │  └─ instagram/
│  ├─ e2e/
│  └─ helpers/
├─ scripts/
├─ .github/
│  └─ workflows/
│     └─ ci.yml
├─ next.config.ts
├─ eslint.config.mjs
├─ playwright.config.ts
├─ vitest.config.ts
├─ tsconfig.json
├─ package.json
├─ pnpm-lock.yaml
├─ README.md
└─ website.md
```

Revised V1 must also include Story/Highlights-specific modules similar to:

```text
src/
  app/
    story-downloader/
      page.tsx
    api/
      stories/
        lookup/route.ts
        highlights/route.ts
        highlight-items/route.ts
      story-media/
        route.ts
  features/
    stories/
      adapters/
        provider.ts
        configured-provider.ts
      components/
      model/
        schemas.ts
        types.ts
        errors.ts
      services/
        media-token.ts
        rate-limit.ts
        story-service.ts
      server/
        env.ts
        provider-client.ts
      export/
        download.ts
```

Exact route grouping may be simplified during implementation, but provider code and secrets must remain server-only, and the media route must never accept an arbitrary raw URL.

Do not create generic directories such as `utils/` containing unrelated logic. Prefer domain-specific modules.

---

# 7. Architecture

## 7.1 High-level flow

```text
Official Instagram data export (.zip)
          │
          ▼
Browser File API
          │
          ▼
Dedicated parser Web Worker
          │
          ├─ validate archive
          ├─ inspect ZIP central directory
          ├─ select only relationship JSON entries
          ├─ extract selected entries
          ├─ JSON parse
          ├─ schema-tolerant validation
          └─ normalize
          │
          ▼
Normalized Snapshot
          │
          ├─ current set analytics
          ├─ previous snapshot diff
          └─ SHA-256 fingerprint
          │
          ▼
IndexedDB (local device only)
          │
          ▼
Dashboard / CSV export
```

Story/Highlights is a separate flow:

```text
Public username/profile URL
          │
          ▼
Same-origin Story API route
          │
          ├─ normalize/validate input
          ├─ rate limit + timeout
          ├─ call configured provider with server-only key
          ├─ validate/normalize untrusted response
          └─ issue short-lived authenticated-encrypted media references
          │
          ▼
Story/Highlight gallery in browser memory
          │
          ▼
User-initiated same-origin media preview/download
```

## 7.2 Network boundary

During archive import and analysis:

```text
File -> Browser memory/worker -> IndexedDB -> UI
```

There must be no path:

```text
File -> fetch/XHR/beacon/form upload -> server
```

This property should be testable.

The Story/Highlights route is intentionally networked. Its allowed boundary is:

```text
validated public handle
  -> our same-origin server route
  -> configured provider
  -> validated public media metadata/content
  -> browser preview or user-initiated download
```

The UI must explain this distinction before submission. No relationship export, relationship handle list, local account label, snapshot, or IndexedDB content may enter the Story/Highlights request path.

## 7.3 Adapter boundary

Define a platform adapter interface.

Example conceptual contract:

```ts
export interface SocialExportAdapter {
  readonly platform: SocialPlatform;
  canHandle(input: ArchiveManifest): Promise<AdapterMatch>;
  parse(input: AdapterInput, ctx: ParseContext): Promise<NormalizedImport>;
}
```

Do not leak Instagram-specific JSON shapes into UI components or persistence repositories.

---

# 8. Domain model

Use explicit domain types.

```ts
type SocialPlatform = "instagram" | "facebook";

type RelationshipKind = "followers" | "following";

interface RelationshipRecord {
  handle: string;
  normalizedHandle: string;
  connectedAt?: number; // unix ms if available and valid
}

interface NormalizedSnapshotPayload {
  platform: "instagram";
  followers: RelationshipRecord[];
  following: RelationshipRecord[];
  parserVersion: string;
  warnings: ImportWarning[];
}

interface Snapshot {
  id: string;
  accountId: string;
  platform: SocialPlatform;
  snapshotAt: number;
  importedAt: number;
  sourceFileName?: string;
  sourceFileSize?: number;
  fingerprint: string;
  parserVersion: string;
  followers: RelationshipRecord[];
  following: RelationshipRecord[];
  warnings: ImportWarning[];
}
```

Do not persist the ZIP Blob or raw source JSON after parsing.

Story/Highlights uses a separate public-media domain model. Example conceptual types:

```ts
type PublicStoryMediaType = "image" | "video";

interface PublicStoryItem {
  id: string;
  type: PublicStoryMediaType;
  takenAt?: number;
  durationSeconds?: number;
  previewToken: string;
  downloadToken: string;
}

interface PublicHighlightCollection {
  id: string;
  title: string;
  mediaCount?: number;
  coverToken?: string;
}

interface PublicStoryLookupResult {
  normalizedHandle: string;
  fetchedAt: number;
  stories: PublicStoryItem[];
  highlights: PublicHighlightCollection[];
  providerRequestId?: string; // sanitized operational identifier only
}
```

Provider-specific response shapes and raw media URLs must not cross the provider adapter boundary. Browser-facing objects should contain same-origin short-lived media references rather than arbitrary provider URLs.

---

# 9. Local persistence

## 9.1 Storage technology

Use Dexie over IndexedDB.

Do not use `localStorage` for snapshots or relationship lists.

`localStorage` may be used only for tiny non-sensitive UI preferences if necessary, although IndexedDB/settings is preferred for consistency.

Story/Highlights lookup results, submitted handles, media URLs, media bytes, and download history must not be written to IndexedDB/localStorage by default. Keep the current lookup in browser memory and clear it on reload/navigation unless a future spec explicitly introduces opt-in history.

## 9.2 Database

Suggested database name:

```text
social-relationship-analyzer
```

Suggested schema version 1:

```ts
interface LocalAccount {
  id: string;
  platform: SocialPlatform;
  label: string;
  username?: string;
  createdAt: number;
  updatedAt: number;
}

interface LocalSnapshot {
  id: string;
  accountId: string;
  platform: SocialPlatform;
  snapshotAt: number;
  importedAt: number;
  fingerprint: string;
  parserVersion: string;
  sourceFileName?: string;
  sourceFileSize?: number;
  followerCount: number;
  followingCount: number;
  followers: RelationshipRecord[];
  following: RelationshipRecord[];
  warnings: ImportWarning[];
}

interface LocalSetting {
  key: string;
  value: unknown;
}
```

Dexie indexes should support:

- account lookup;
- snapshots by account;
- snapshots ordered by `snapshotAt`;
- fingerprint duplicate detection.

Potential schema declaration concept:

```text
accounts:  id, platform, username, createdAt, updatedAt
snapshots: id, accountId, [accountId+snapshotAt], fingerprint, importedAt
settings:  key
```

Do not index giant nested relationship arrays.

## 9.3 Retention

Default:

- retain snapshots locally until the user deletes them;
- clearly explain this before the first save;
- provide deletion controls.

The user must be able to:

- delete one snapshot;
- delete one local account and all associated snapshots;
- delete all local app data.

## 9.4 Storage errors

Handle:

- quota exceeded;
- IndexedDB unavailable;
- private browsing limitations;
- failed transaction;
- database migration errors.

If persistence fails, current analysis may remain available in memory and must show a clear warning that history was not saved.

---

# 10. Import workflow

## 10.1 First-use workflow

1. User opens `/app`.
2. App explains that no Instagram login is required.
3. User creates or selects a local Instagram profile label.
4. User drops/selects the official export ZIP.
5. App validates without uploading.
6. App shows parsing progress.
7. App shows detected counts.
8. User confirms the snapshot date.
9. App detects duplicate fingerprint.
10. App saves snapshot locally.
11. App computes current analysis.
12. If an older snapshot exists for that account, app computes diff against the nearest previous snapshot by `snapshotAt`.

## 10.2 Export instructions shown to user

The guide should instruct the user to use Meta Accounts Center and request only the relevant Instagram relationship information when possible.

Recommended choices:

- Instagram account;
- followers/following or connections data category;
- JSON format;
- all-time range when offered;
- download the resulting ZIP;
- do not unzip unless using manual JSON import recovery mode.

Do not claim the exact Meta menu wording will never change.

## 10.3 Supported inputs

V1 accepted primary input:

```text
*.zip
```

Recovery/debug input mode may accept:

```text
followers_*.json
following.json
```

If manual JSON import is offered, it must require the complete relevant set and warn when follower parts may be missing.

## 10.4 Unsupported inputs

Show specific errors for:

- `.html` export;
- unknown JSON;
- incomplete follower files;
- missing following file;
- corrupted ZIP;
- password-protected/encrypted ZIP;
- unsupported archive type;
- oversized archive;
- archive with unsafe paths;
- invalid JSON;
- recognized export but unsupported schema.

---

# 11. Secure ZIP processing

## 11.1 Worker requirement

Use a dedicated module Web Worker, e.g.:

```ts
const worker = new Worker(
  new URL("./parser.worker.ts", import.meta.url),
  { type: "module" },
);
```

The worker owns parsing state for an import job.

Do not call `JSON.parse()` on very large relationship files on the main UI thread.

## 11.2 ZIP library policy

Use `@zip.js/zip.js`.

Since parsing already occurs inside our dedicated worker, prefer running ZIP decompression inside that worker without spawning unnecessary nested worker pools unless benchmarks justify otherwise.

## 11.3 Never extract the whole archive

Workflow:

1. Open ZIP reader.
2. Enumerate metadata/entries.
3. Normalize each entry path.
4. Reject unsafe paths.
5. Identify only supported Instagram relationship JSON entries.
6. Apply compressed/uncompressed size guards.
7. Extract only those entries.
8. Ignore media/messages/photos/etc.
9. Close reader and release references.

## 11.4 ZIP path safety

Reject entries with suspicious path components such as:

```text
../
..\\
absolute paths
NUL-like invalid names
```

Even though files are not extracted to an OS filesystem, unsafe paths are evidence of malformed/untrusted input and should not be processed.

## 11.5 Resource limits

Use constants in one security policy module, not magic numbers throughout code.

Initial recommended limits:

```ts
MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;        // 100 MiB compressed input
MAX_ENTRIES = 10_000;
MAX_RELEVANT_JSON_BYTES = 150 * 1024 * 1024;  // per relevant uncompressed entry
MAX_TOTAL_RELEVANT_BYTES = 250 * 1024 * 1024;
MAX_COMPRESSION_RATIO = 200;
MAX_RELATIONSHIPS = 2_000_000;                // sanity ceiling per relation type
```

These are guardrails, not business promises. Keep them centralized and test them.

If real legitimate exports routinely exceed a guardrail, adjust deliberately after profiling rather than silently removing protection.

## 11.6 Nested archives

Do not recursively extract nested ZIP/RAR/etc. entries.

## 11.7 Cancellation

User must be able to cancel an import.

The simplest reliable cancellation mechanism is to terminate the active worker and create a fresh worker for the next job.

Always clean up object URLs/readers/references after cancel/error/success.

---

# 12. Instagram adapter

## 12.1 File detection

Implement flexible matching.

Follower candidates:

```regex
(^|/)followers_and_following/followers_\d+\.json$
```

Also permit reasonable path prefix variations around `connections/`.

Following candidate:

```regex
(^|/)followers_and_following/following\.json$
```

Normalize archive path separators to `/` before matching.

Sort follower parts numerically by suffix and merge all parts.

## 12.2 Schema tolerance

Do not validate the entire file with one brittle exact object schema.

Instagram export structures may wrap relationship entries differently.

Build small extractors that recognize supported shapes and fail with actionable diagnostics on unknown shapes.

Common conceptual record shape:

```json
{
  "string_list_data": [
    {
      "href": "https://www.instagram.com/example",
      "value": "example",
      "timestamp": 1700000000
    }
  ]
}
```

Following may be wrapped under a key similar to:

```json
{
  "relationships_following": [ ... ]
}
```

Do not assume every entry has `href` or `timestamp`.

The required identity for V1 is a valid non-empty username/handle value.

## 12.3 Username normalization

Implement one normalization function used everywhere.

Rules:

1. trim Unicode/ASCII surrounding whitespace;
2. remove one leading `@` if present;
3. normalize to lower case for comparison;
4. retain original display form separately;
5. reject empty values;
6. apply a conservative length sanity limit;
7. do not attempt fuzzy username matching.

Instagram username comparison should be case-insensitive.

Example:

```ts
normalizeHandle(" @Example_User ") === "example_user"
```

## 12.4 Duplicate records

Merge/deduplicate by `normalizedHandle` within each relationship set.

If duplicates disagree on timestamp:

- prefer a valid timestamp;
- if multiple valid timestamps exist, preserve the most defensible value according to explicit documented logic;
- emit an import warning only if the discrepancy matters.

Do not count duplicate handles multiple times.

## 12.5 Timestamp handling

Treat export timestamps as optional metadata.

Validate range before converting.

Never use a relationship entry timestamp as the snapshot creation date.

Snapshot date is a separate user-confirmable value.

## 12.6 Parser output warnings

Possible warnings:

- `MULTIPART_FOLLOWERS_MERGED`
- `DUPLICATE_HANDLES_REMOVED`
- `INVALID_ENTRY_SKIPPED`
- `MISSING_OPTIONAL_TIMESTAMP`
- `UNKNOWN_NON_CRITICAL_FILE_IGNORED`
- `LARGE_EXPORT_PERFORMANCE_WARNING`

Warnings must be typed codes plus localized presentation text.

---

# 13. Snapshot date and duplicate detection

## 13.1 Snapshot date

Because an export may be downloaded/imported later than it was created, do not pretend the browser always knows the authoritative export generation timestamp.

Default snapshot date suggestion order:

1. trustworthy archive metadata if adapter can prove it;
2. file `lastModified` as a suggestion only;
3. current local date/time.

The user can edit/confirm the snapshot date before saving.

## 13.2 Fingerprint

Compute a SHA-256 fingerprint from canonical normalized content.

Concept:

```text
platform
+ sorted unique follower normalized handles
+ delimiter
+ sorted unique following normalized handles
```

Use Web Crypto `crypto.subtle.digest("SHA-256", ...)` where practical.

The fingerprint is for duplicate detection, not authentication/security.

If the same fingerprint already exists for the same local account, show:

> This relationship snapshot appears identical to one you already saved.

Let the user cancel. Avoid saving an unnecessary duplicate by default.

---

# 14. Diff engine

## 14.1 Required outputs

Given current snapshot `C`:

```text
followers(C) = F
following(C) = G
```

Compute:

```text
mutuals            = F ∩ G
notFollowingBack   = G - F
notFollowedByMe    = F - G
```

Given prior snapshot `P` with followers `Fp` and current `F`:

```text
lostFollowers = Fp - F
newFollowers  = F - Fp
```

Following changes may also be computed:

```text
stoppedFollowing = Gp - G
startedFollowing = G - Gp
```

## 14.2 Complexity

Use hash sets/maps.

Expected time complexity:

```text
O(n + m)
```

Do not implement nested `.find()` / `.includes()` loops over large relationship arrays that result in O(n²) behavior.

## 14.3 Determinism

Given the same normalized input, diff output must be deterministic.

Sort display output explicitly rather than depending on object/set insertion order.

Supported sorts:

- handle A–Z;
- handle Z–A;
- connected date newest-first when metadata is available;
- connected date oldest-first when metadata is available.

## 14.4 Lost follower wording

Internal code may use `lostFollowers`.

UI detail explanation must not say “definitely unfollowed you”.

Allowed compact labels:

- Lost followers
- New followers
- Not following you back
- You don't follow back
- Mutuals

---

# 15. Worker protocol

Use a typed discriminated-union protocol.

Example:

```ts
type WorkerRequest =
  | { type: "PARSE_ARCHIVE"; jobId: string; file: File }
  | { type: "PARSE_FILES"; jobId: string; files: File[] };

type WorkerResponse =
  | { type: "PROGRESS"; jobId: string; stage: ParseStage; progress?: number }
  | { type: "SUCCESS"; jobId: string; payload: NormalizedSnapshotPayload }
  | { type: "ERROR"; jobId: string; error: SerializedImportError };
```

Do not pass arbitrary exceptions directly across the worker boundary.

Serialize safe error codes/messages.

Progress stages:

```text
validating
scanning_archive
reading_relationship_files
parsing_json
normalizing
fingerprinting
complete
```

---

# 16. Error taxonomy

Define typed error codes.

At minimum:

```text
UNSUPPORTED_FILE_TYPE
ARCHIVE_TOO_LARGE
ARCHIVE_CORRUPTED
ARCHIVE_ENCRYPTED
ARCHIVE_TOO_MANY_ENTRIES
ARCHIVE_UNSAFE_PATH
ARCHIVE_SUSPICIOUS_COMPRESSION
RELEVANT_DATA_TOO_LARGE
FOLLOWERS_FILE_NOT_FOUND
FOLLOWING_FILE_NOT_FOUND
UNSUPPORTED_HTML_EXPORT
INVALID_JSON
UNSUPPORTED_INSTAGRAM_SCHEMA
NO_VALID_RELATIONSHIPS
RELATIONSHIP_LIMIT_EXCEEDED
IMPORT_CANCELLED
INDEXEDDB_UNAVAILABLE
INDEXEDDB_QUOTA_EXCEEDED
SNAPSHOT_DUPLICATE
UNKNOWN_IMPORT_ERROR
```

User-facing messages must be actionable and must not expose stack traces.

Developer/test logs may include sanitized technical context but never raw relationship lists.

---

# 16A. Public Story/Highlights subsystem

## 16A.1 Supported user flow

1. User opens `/story-downloader`.
2. Page explains that only public accounts are supported and that the submitted handle is sent to our server/provider.
3. User enters an Instagram username or canonical Instagram profile URL.
4. Client normalizes obvious presentation differences and submits only the normalized handle.
5. Same-origin route validates the request, applies abuse controls, and calls the configured provider.
6. Server validates and normalizes the provider response.
7. UI shows active Stories and public Highlight collections.
8. User may open a Highlight to load its items.
9. User may preview or download one media item at a time.
10. Results remain ephemeral and are not added to relationship history.

## 16A.2 Provider adapter

Use a server-only interface such as:

```ts
interface PublicStoryProvider {
  readonly providerId: string;
  getActiveStories(handle: string, signal: AbortSignal): Promise<ProviderStoryResult>;
  getHighlights(handle: string, signal: AbortSignal): Promise<ProviderHighlightResult>;
  getHighlightItems(highlightId: string, signal: AbortSignal): Promise<ProviderHighlightItemsResult>;
}
```

Requirements:

- provider client is imported only by server modules;
- provider API key comes from a server-only environment variable;
- every response starts as `unknown` and is schema-validated;
- translate provider errors to stable application error codes;
- do not leak provider response bodies, credentials, upstream URLs, or stack traces;
- apply request timeout and cancellation;
- provider ID/version is available for sanitized diagnostics;
- swapping providers must not change the browser-facing response contract.

## 16A.3 Input validation

Accept:

- a plain Instagram username;
- `@username`;
- an HTTPS `instagram.com/username` profile URL with no unrelated path.

Reject:

- arbitrary URLs/hosts;
- credentials, query payloads, fragments, ports, IP literals, or non-HTTPS external URLs;
- Story/media URLs submitted as lookup input;
- empty/overlong handles;
- path traversal/control characters;
- batch input/multiple usernames;
- private-IP/localhost targets.

Normalize to one conservative username string before calling a provider. Do not pass the original arbitrary URL through.

## 16A.4 Browser-facing API

Use same-origin JSON endpoints with a small request body. Exact route grouping may vary, but responsibilities must stay distinct:

- lookup active Stories and Highlight summaries;
- fetch items for one validated Highlight reference;
- preview/download one authorized media reference.

All endpoints must:

- allow only intended HTTP methods;
- enforce JSON content type/body-size limits where applicable;
- validate `Origin`/same-site expectations;
- return `Cache-Control: no-store` for lookup responses unless a later privacy review approves bounded caching;
- include request IDs that contain no user data;
- enforce timeouts;
- map 400/404/429/502/503 errors consistently;
- avoid reflecting raw input in error messages.

## 16A.5 Media-token and delivery design

Do not return an arbitrary provider media URL as a parameter that the browser can feed back to a generic proxy.

Preferred design:

1. Provider adapter validates a media URL and checks HTTPS plus an explicit provider/CDN hostname allowlist.
2. Server creates a short-lived URL-safe authenticated-encrypted token containing only the minimum required media reference, expected media type, and expiry. Encryption preserves opacity while authentication detects tampering without a server-side token database.
3. Browser requests a same-origin preview/download route with that opaque token.
4. Server verifies signature and expiry before any upstream request.
5. Server revalidates final hostname after redirects, limits redirect count, blocks private/reserved IP destinations, and enforces response size/content type/timeouts.
6. Download response sets safe `Content-Disposition`, `X-Content-Type-Options: nosniff`, and restrictive caching.

Use a standard AEAD construction such as AES-256-GCM with a fresh cryptographically random nonce per token, an explicit token/key version, bounded plaintext size, and base64url encoding. Never reuse a nonce with the same key and never invent custom cryptography.

The route must never accept a raw media URL and must never follow redirects to an unapproved host.

## 16A.6 Initial server security limits

Centralize and test conservative limits, for example:

```ts
MAX_STORY_REQUEST_BODY_BYTES = 4 * 1024;
MAX_STORY_ITEMS = 100;
MAX_HIGHLIGHT_COLLECTIONS = 100;
MAX_HIGHLIGHT_ITEMS = 250;
MAX_IMAGE_BYTES = 25 * 1024 * 1024;
MAX_VIDEO_BYTES = 250 * 1024 * 1024;
PROVIDER_TIMEOUT_MS = 15_000;
MEDIA_TOKEN_TTL_SECONDS = 5 * 60;
```

These are initial guardrails. Adjust only after provider-contract and real-world profiling review.

## 16A.7 Abuse and cost controls

- production edge/platform rate limiting per client/network signal;
- small per-instance concurrency cap as a secondary defense;
- provider budget/quota alerts;
- no batch lookup;
- no background polling;
- no anonymous “download all” fan-out;
- bounded retries with jitter only for safe transient upstream failures;
- do not retry billable 404/private/no-story results automatically;
- return `Retry-After` for local rate limits where practical;
- never expose remaining provider credits publicly;
- ensure provider outage cannot affect relationship analyzer availability.

If IP-derived rate-limit data is retained by hosting infrastructure, disclose retention accurately and minimize application-level storage.

## 16A.8 Story/Highlights error taxonomy

Add stable codes such as:

```text
STORY_INVALID_HANDLE
STORY_PRIVATE_ACCOUNT
STORY_ACCOUNT_NOT_FOUND
STORY_NO_ACTIVE_ITEMS
STORY_HIGHLIGHTS_UNAVAILABLE
STORY_PROVIDER_NOT_CONFIGURED
STORY_PROVIDER_AUTH_FAILED
STORY_PROVIDER_RATE_LIMITED
STORY_PROVIDER_QUOTA_EXCEEDED
STORY_PROVIDER_TIMEOUT
STORY_PROVIDER_UNAVAILABLE
STORY_PROVIDER_SCHEMA_CHANGED
STORY_RESPONSE_TOO_LARGE
STORY_MEDIA_TOKEN_INVALID
STORY_MEDIA_TOKEN_EXPIRED
STORY_MEDIA_HOST_NOT_ALLOWED
STORY_MEDIA_TYPE_UNSUPPORTED
STORY_MEDIA_TOO_LARGE
STORY_DOWNLOAD_FAILED
STORY_RATE_LIMITED
```

Do not disclose provider credentials, upstream raw response, internal hostname, or stack trace.

## 16A.9 Copyright and user responsibility

The UI must state before download:

> Download only content you own or have permission to save. Respect the creator's rights and applicable law.

Do not add tools designed to remove attribution, bypass watermarks, defeat access controls, or mass-archive accounts.

## 16A.10 Provider review gate

Before production enablement, document:

- provider identity and contact;
- terms allowing the intended use;
- data sources and public-only guarantee to the extent the provider discloses them;
- whether query parameters/usernames are logged;
- retention and deletion policy;
- subprocessors/hosting regions if available;
- authentication/key rotation;
- pricing, rate limits, quota behavior, and billing failure behavior;
- SLA/status/support path;
- media URL hostnames and redirect behavior;
- schema/versioning/deprecation policy;
- incident and provider-disable procedure.

If this review cannot be completed, ship the relationship analyzer with the Story route disabled and do not represent the Story feature as available.

---

# 17. UI / UX information architecture

## 17.1 Routes

```text
/
/app
/story-downloader
/how-it-works
/privacy
/terms
/faq
```

Optional future locale route architecture may be introduced, but do not sacrifice V1 simplicity for routing abstraction.

The main navigation must visually and semantically distinguish the private local relationship analyzer from the networked public Story/Highlights downloader.

## 17.2 Landing page

Sections:

1. Header
2. Hero
3. Trust/privacy proof row
4. What you can learn
5. How it works (3 steps)
6. Privacy architecture section
7. Accuracy/limitations section
8. FAQ preview
9. CTA
10. Footer

Hero example direction:

```text
See what changed in your Instagram followers.
No Instagram password. Your relationship data stays on your device.

[Analyze my export]
[How it works]
```

Do not use fear-based copy such as “See who betrayed you”.

## 17.3 Analyzer layout states

The `/app` route should have explicit states:

```text
NO_ACCOUNT
READY_TO_IMPORT
VALIDATING
PARSING
REVIEW_IMPORT
SAVING
RESULTS
ERROR
```

Avoid a single massive component with scattered booleans.

## 17.4 Empty state

Show:

- local account selector/create action;
- concise export instructions;
- drop zone;
- privacy statement;
- supported format (`ZIP / JSON export`).

## 17.5 Import progress

Show current stage, not fake timer progress.

Example:

```text
Reading your export…
Merging follower files…
72,418 relationships processed
```

Progress must remain responsive.

## 17.6 Results dashboard

Top summary cards:

- Followers
- Following
- Mutuals
- Not following you back
- You don't follow back

If previous snapshot exists, secondary cards:

- Lost followers
- New followers
- Net follower change

Example:

```text
Followers           12,482   +24
Following            1,205    -3
Lost followers          23
New followers           47
Net change              +24
```

## 17.7 Result tabs

Suggested tabs:

```text
Overview
Lost followers
New followers
Not following back
You don't follow back
Mutuals
History
```

Each list supports:

- search;
- sorting;
- row count;
- CSV export;
- copy handle;
- optional profile link generated from normalized Instagram username.

External Instagram profile links must:

- open in a new tab;
- include `rel="noopener noreferrer"`;
- be generated only from validated username values.

## 17.8 History

History view:

- snapshots ordered newest first;
- date/time;
- follower/following counts;
- delta from prior snapshot;
- parser warning badge if relevant;
- compare action;
- delete action.

User should be able to compare two snapshots of the same local account.

## 17.9 First snapshot behavior

On the first import:

- show current non-mutual/mutual analysis;
- do not show “0 unfollowers” as if historical knowledge exists;
- instead show:

> Import another snapshot later to see follower changes over time.

## 17.10 Story/Highlights downloader

The `/story-downloader` route must include:

- a clear “Public accounts only” statement;
- username/profile URL input;
- pre-submit network/provider disclosure;
- search/lookup action;
- loading state tied to the real request;
- account-not-found/private/no-active-story empty states that do not overclaim the cause when the provider cannot distinguish them;
- tabs or sections for Active Stories and Highlights;
- Highlight collection cards with title, cover, and count when available;
- lazy loading of items for the selected Highlight;
- image/video preview controls;
- individual Download action;
- copyright/permission reminder;
- provider-unavailable/rate-limited retry guidance;
- no claim that viewing is anonymous to Instagram/provider;
- no persistence of recent searches by default.

Media UI requirements:

- do not autoplay video with sound;
- provide native controls and accessible labels;
- do not preload every Highlight video;
- use bounded responsive media dimensions to prevent layout shift;
- avoid exposing provider URLs in rendered markup when same-origin media tokens are available;
- handle expired media references by offering a fresh lookup, not an infinite retry loop;
- revoke any client-created object URLs after download/preview use.

---

# 18. Visual design system

## 18.1 Design direction

Use Folmetry's **Private Signal Observatory** direction: a calm, high-precision workspace where relationship signals can be inspected without surrendering private source data. The interface should feel authored, technical, and trustworthy rather than resembling an "Instagram clone" or a generic AI-generated SaaS landing page.

Avoid copying Instagram trade dress, gradients, logo styling, or UI patterns too closely.

Required attributes:

- a disciplined 12-column desktop grid and constrained reading widths;
- strong editorial typography with tabular numerals for metrics;
- layered surfaces, precise hairlines, and a subtle signal-grid atmosphere;
- electric-indigo primary accents plus cyan signal accents used sparingly;
- clear, state-aware data visualization and explicit privacy boundaries;
- code-native relationship-orbit motifs that are unique to Folmetry;
- motion tied to navigation, parsing, selection, or state changes only;
- confidence, legibility, and privacy over visual hype.

Do not use random glowing blobs, decorative particle fields, excessive glassmorphism, stock dashboard illustrations, fake charts, gratuitous 3D, or endless ambient animation. Do not imitate Instagram's trade dress. A visual effect without semantic or spatial purpose must be removed.

## 18.2 Theme

Support:

```text
system
light
dark
```

Use semantic CSS variables/tokens.

Do not hard-code theme colors in feature components.

Token families must cover canvas, elevated/sunken surfaces, primary and subtle text, hairline and strong borders, primary/signal/success/warning/destructive states, focus, radii, shadow/elevation, layout width, and motion timing/easing. Light and dark themes must preserve the same hierarchy rather than simply invert colors.

## 18.3 Responsive breakpoints

Design mobile-first.

Primary targets:

- 360px mobile;
- 390/430px modern phones;
- 768px tablet;
- 1024px laptop;
- 1440px desktop;
- wider screens with constrained content width.

Relationship tables must remain usable on mobile, possibly switching to compact cards/rows rather than requiring a wide desktop table.

## 18.4 Motion

Respect `prefers-reduced-motion`.

Do not animate count changes in a way that delays access to actual values.

Motion must be progressive enhancement. Core interaction and comprehension cannot depend on View Transitions, scroll-driven animation, backdrop filters, masks, or blend modes. Repeated ambient effects are prohibited; bounded emphasis is allowed for active drag/drop, parsing, loading, successful completion, and explicit selection. Target interaction transitions of roughly 120–240ms and larger spatial transitions no longer than 400ms.

## 18.5 Signature components

- Header: stable spatial anchor, compact active-route treatment, and accessible preference/account controls.
- Hero: editorial promise paired with an abstract relationship signal field; the graphic is decorative and hidden from assistive technology.
- Cards: one structural language with hierarchy expressed by spacing, border strength, and surface depth rather than unrelated gradients.
- Analyzer: local-processing boundary, drop zone, progress, review, metrics, tabs, and relationship rows must read as one inspection workflow.
- Story/Highlights: clearly separate its network boundary from the local analyzer while retaining the same component grammar.
- Authentication/admin: focused, calm work surfaces with unambiguous validation and dangerous-action styling.
- Footer: a deliberate closing region with product boundary copy and legible legal navigation, never a floating or overlapping afterthought.

## 18.6 Performance and visual resilience

- Prefer CSS and inline SVG to runtime animation libraries and WebGL.
- Avoid remote decorative assets and third-party font requests at runtime.
- Reserve media dimensions to prevent layout shift.
- Keep filters and backdrop effects bounded to small stable regions.
- Ensure usable fallbacks when `color-mix()`, backdrop filtering, scroll-driven animation, or View Transitions are unavailable.
- Validate at 360, 390, 768, 1024, 1440, and 1920 CSS pixels in both themes where practical.

---

# 19. Accessibility

Target WCAG 2.2 AA.

Requirements:

- semantic headings;
- keyboard-only usability;
- visible focus indicators;
- correctly associated labels;
- accessible drag/drop with equivalent file input button;
- status changes announced with appropriate live regions;
- errors connected to controls;
- dialogs with proper focus trap and return focus;
- minimum touch target sizing;
- no information conveyed by color alone;
- sufficient contrast;
- table/list semantics appropriate to presentation;
- screen-reader-friendly count changes;
- reduced motion support.

Automate common checks with axe in E2E, but do not treat automated checks as complete accessibility validation.

---

# 20. Localization

## 20.1 Languages

Prepare V1 strings for:

- English (`en`)
- Vietnamese (`vi`)

Do not scatter literal UI text throughout feature code.

Create typed translation dictionaries.

## 20.2 Formatting

Use `Intl.NumberFormat` and `Intl.DateTimeFormat`.

Do not manually insert comma/period thousand separators.

## 20.3 Copy precision

Use localized copy that preserves semantic limitations.

For Vietnamese, prefer:

- `Người theo dõi đã mất` / `Không còn trong danh sách người theo dõi`
- not a definitive accusation such as `Đã hủy theo dõi bạn` unless context explicitly explains the inference.

---

# 21. Privacy requirements

## 21.1 Privacy invariant

Core relationship data must remain on-device in V1.

The Story/Highlights subsystem is explicitly networked. Only a validated public Instagram handle and the minimum provider request metadata may cross its boundary. It must never receive analyzer export data, local account labels, snapshots, or relationship results.

## 21.2 Never collect

Never collect/store/transmit:

- Instagram password;
- Facebook password;
- Meta session cookie;
- 2FA code;
- access token;
- raw ZIP;
- raw relationship JSON;
- followers/following usernames on a server;
- result lists on a server.

For Story/Highlights, the application necessarily transmits the submitted public handle to our server and configured provider. Do not persist it in our application database or include it in analytics. Hosting/provider operational logs may retain it according to their policies; this must be disclosed accurately and reviewed before production.

## 21.3 Third-party scripts

V1 should contain no third-party analytics/session replay/advertising script. The server-side Story data provider is a functional subprocess/service dependency, not an analytics exception.

If analytics is added later:

- it must never include relationship handles;
- it must never include archive filenames;
- it must never include account usernames;
- it must never include file contents;
- session replay should be disabled on analyzer screens unless an explicit privacy review approves it.

## 21.4 Privacy page must state

Explain in plain language:

- analysis occurs in the browser;
- what is stored locally;
- how the user deletes it;
- no password is required;
- no affiliation with Meta/Instagram;
- limitations of inferred follower changes;
- site hosting may still receive ordinary web request metadata for loading the website (e.g. IP at infrastructure layer), distinct from archive content.
- the Story/Highlights tool is not local-only;
- the submitted public handle is sent to our server and configured provider;
- whether the configured provider logs lookup parameters and for how long;
- Story lookup history/media is not persisted by our application by default;
- relationship ZIP/JSON/history never enters the Story subsystem;
- public-only and copyright limitations.

Never claim “we collect absolutely nothing” if infrastructure logs may exist.

---

# 22. Security requirements

## 22.1 Threat model

Primary threats:

- malicious/corrupted ZIP;
- decompression bomb;
- parser memory exhaustion;
- unexpectedly huge JSON;
- unsafe archive paths;
- XSS from malicious relationship values;
- dependency supply-chain compromise;
- accidental network exfiltration;
- leaked source relationship data in error logging;
- persistent local data on shared computers.
- Story provider key leakage;
- abuse/cost exhaustion of public lookup endpoints;
- SSRF/open-proxy behavior in media delivery;
- provider schema drift or malicious provider response;
- oversized/unexpected media;
- redirect to unapproved/private network hosts;
- accidental persistence/logging of Story search handles;
- copyright misuse or misleading anonymous-viewing claims.

## 22.2 Render data as text

Relationship handles are untrusted input.

Story provider fields, Highlight titles, media metadata, URLs, content types, redirects, and filenames are also untrusted input.

Render through React text nodes.

Never inject archive-derived HTML with `dangerouslySetInnerHTML`.

Never inject provider-derived HTML. Render titles/metadata as text and validate media through the server-side delivery boundary.

## 22.3 Links

Construct profile links from validated normalized handles.

Do not trust `href` values from exports for direct rendering/navigation.

This prevents malicious archive content from injecting arbitrary protocols/links.

## 22.4 CSP and headers

Deployment should set, at minimum where supported:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
```

Use a Content Security Policy compatible with the final hybrid Next.js production output.

Goals:

```text
default-src 'self'
object-src 'none'
base-uri 'self'
frame-ancestors 'none'
connect-src 'self'
img-src 'self' data: blob:
media-src 'self' blob:
font-src 'self'
worker-src 'self' blob:
```

Do not blindly copy the above as a final CSP if it breaks Next bootstrap scripts. Generate/test a production-safe CSP, ideally with hashes/nonces where the deployment model permits. Never add `unsafe-eval` merely to make development tooling work in production.

## 22.5 Dependency policy

CI must run a production dependency audit.

Security updates to framework/runtime are release blockers when relevant.

## 22.6 Shared-device warning

Because snapshot history is stored in browser IndexedDB, privacy page/settings should state that anyone with access to the same browser profile may potentially access the local history.

Provide one-click local deletion.

---

# 23. CSV export

CSV generation must happen locally.

Possible columns:

```text
handle,category,connected_at,current_snapshot,previous_snapshot
```

Prevent spreadsheet formula injection.

If a cell begins with characters such as:

```text
=
+
-
@
```

apply a safe CSV escaping/neutralization strategy before download.

Use UTF-8.

Do not upload generated CSV.

---

# 24. State management

Do not add Redux/Zustand by default.

Recommended approach:

- persistent domain state: IndexedDB repository;
- server/static content: Next Server Components;
- analyzer UI state: colocated React state/reducer;
- import lifecycle: explicit reducer/state machine pattern;
- filters/search/sort: local component state or URL state if shareability is needed.

Only add a global state library if actual complexity proves it necessary.

---

# 25. Performance requirements

## 25.1 Marketing pages

Targets on a representative mobile profile:

```text
LCP < 2.5 s
INP < 200 ms
CLS < 0.1
Lighthouse Performance >= 95 where realistically controllable
Accessibility >= 95, with manual WCAG review
Best Practices >= 95
SEO >= 95
```

## 25.2 Analyzer

Requirements:

- no long parsing task on the main thread;
- UI remains interactive during import;
- progress/cancel remains usable;
- use O(n) set-based diff;
- virtualize result lists only when benchmark data shows it is needed;
- avoid rendering tens of thousands of rows at once.

For large lists, implement windowing/virtualization or pagination.

Prefer client pagination initially if it avoids adding a virtualization dependency, but do not create giant DOM trees.

## 25.4 Story/Highlights

Requirements:

- do not preload every Story/Highlight video;
- lazy-load Highlight items and media previews;
- bound concurrent media requests;
- enforce provider and media timeouts;
- stream downloads instead of buffering large videos in server memory where runtime support permits;
- abort upstream work when the client disconnects where practical;
- avoid caching submitted handles or media unless a later provider/privacy review explicitly approves it;
- keep provider outage isolated from marketing pages and relationship analyzer.

## 25.3 Memory

After successful parse:

- release raw file parser buffers/references;
- close ZIP reader;
- terminate/idle worker appropriately;
- do not retain both raw JSON text and parsed objects longer than necessary.

---

# 26. SEO

Marketing routes should provide:

- unique `<title>`;
- meta description;
- canonical URL;
- Open Graph metadata;
- Twitter card metadata if desired;
- favicon/app icons;
- `robots.txt`;
- `sitemap.xml`;
- Organization/WebSite structured data where accurate;
- FAQ structured data only if content and search engine policy support it.

The `/story-downloader` route may be indexable as a product utility page, but individual usernames, results, media tokens, and lookup state must never be encoded into crawlable URLs or metadata. Server media routes must be non-indexable and use short-lived opaque tokens.

Do not index user-specific analyzer state.

`/app` may be indexable as a product route, but no local data can be serialized into metadata or URLs.

---

# 27. Legal/trademark positioning

Footer/disclaimer:

> This product is not affiliated with, endorsed by, or sponsored by Instagram, Facebook, or Meta Platforms, Inc. Instagram and Facebook are trademarks of their respective owners.

Avoid official logos unless usage is reviewed against current trademark guidelines.

Do not use a domain/app name that misleadingly implies official affiliation.

Story/Highlights UI and Terms must state that users should download only media they own or have permission to save. Do not imply that public availability transfers copyright or grants republication rights.

---

# 28. Testing strategy

## 28.1 Unit tests

Mandatory coverage for:

### Normalization

- trim whitespace;
- remove leading `@`;
- lower-case comparison key;
- reject empty values;
- deduplicate equivalent handles.

### Instagram parser

Fixtures:

- normal single follower file;
- multipart followers;
- following wrapper;
- missing timestamps;
- duplicate handles;
- malformed entries mixed with valid entries;
- missing follower file;
- missing following file;
- unsupported schema;
- HTML-only archive;
- corrupted ZIP;
- suspicious archive paths;
- large metadata limit behavior.

### Diff

Test:

- mutuals;
- not following back;
- not followed by me;
- lost followers;
- new followers;
- empty sets;
- complete replacement;
- duplicate input normalization;
- deterministic sorting.

### Fingerprint

- same semantic sets, different source order => same fingerprint;
- changed follower => different fingerprint;
- changed following => different fingerprint.

### Persistence

- add account;
- add snapshot;
- duplicate detection;
- query previous snapshot;
- delete snapshot;
- delete account cascade behavior;
- delete all.

### Story/Highlights

Test:

- username/profile URL normalization;
- reject arbitrary hosts, ports, credentials, query strings, fragments, control characters, batch input, localhost, and private-network targets;
- provider success response normalization;
- malformed/provider-schema-changed response;
- public account with active Stories;
- public account with no active Stories;
- private/not-found ambiguity mapping;
- Highlight summaries and lazy item loading;
- provider auth/quota/rate-limit/timeout/outage mapping;
- media token authenticated encryption, tamper detection, key versioning, and expiry;
- media hostname/redirect allowlist;
- image/video content-type and size limits;
- safe `Content-Disposition` filename;
- no persistence of handle/results/media;
- rate-limit and bounded retry behavior.

## 28.2 Property tests

If practical, use property-based tests for set diff invariants.

Examples:

```text
lost ∩ currentFollowers = ∅
new ∩ previousFollowers = ∅
mutuals ⊆ followers
mutuals ⊆ following
notFollowingBack ∩ followers = ∅
```

## 28.3 Component tests

Cover:

- drop zone keyboard interaction;
- progress presentation;
- import error rendering;
- first-snapshot UX;
- results filtering;
- delete confirmation;
- history compare selector.

## 28.4 E2E tests

Playwright flows:

1. Landing -> analyzer.
2. Create local account.
3. Import synthetic valid ZIP.
4. Verify summary counts.
5. Import second synthetic ZIP.
6. Verify lost/new follower counts.
7. Search result list.
8. Export CSV.
9. Reload page and confirm local history persists.
10. Delete account and confirm history disappears.
11. Invalid archive error path.
12. Keyboard navigation.
13. Mobile viewport.
14. Dark theme.
15. Vietnamese copy smoke test.
16. Open Story/Highlights route and verify network disclosure.
17. Look up a synthetic mocked public account.
18. Verify active Story and Highlight results.
19. Preview/download mocked image and video through same-origin media route.
20. Verify private/no-story/provider-timeout/rate-limit states.
21. Verify no Story lookup is written to IndexedDB/localStorage.

## 28.5 Network privacy E2E assertion

Add an E2E test that monitors network requests while importing a relationship fixture.

Fail if an import process transmits archive-derived payloads or calls unknown external endpoints.

The relationship analyzer should normally need no network requests after the app assets have loaded.

This no-network assertion applies to the relationship analyzer flow. Story/Highlights E2E tests must instead assert that requests are limited to the same-origin Story routes from the browser, that provider credentials never appear client-side, and that no relationship-derived marker enters Story requests.

## 28.6 Accessibility

Run axe on:

- landing;
- empty analyzer;
- import review;
- results;
- history;
- confirmation dialog;
- Story/Highlights empty, loading, results, media preview, and error states.

---

# 29. Synthetic fixtures

Create fixtures programmatically where possible.

Example semantic fixture A:

```text
followers: alice, bob, carol
following: alice, bob, dave
```

Expected:

```text
mutuals: alice, bob
notFollowingBack: dave
notFollowedByMe: carol
```

Fixture B:

```text
followers: alice, carol, erin
following: alice, dave
```

Compared with A:

```text
lostFollowers: bob
newFollowers: erin
```

Never commit a real downloaded Instagram archive.

---

# 30. CI / quality gates

GitHub Actions or equivalent must run on pull request and main branch.

Required pipeline:

```text
install frozen lockfile
  ↓
typecheck
  ↓
lint
  ↓
unit/component tests
  ↓
production build
  ↓
Playwright E2E
  ↓
dependency audit
```

Suggested scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings=0",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "pnpm typecheck && pnpm lint && pnpm test && pnpm build"
  }
}
```

Use a production start/preview command compatible with the hybrid Next.js deployment and Story route handlers.

Do not use deprecated `next lint` assumptions.

---

# 31. TypeScript/code quality rules

`tsconfig` must enable strict behavior.

Preferred principles:

- `strict: true`;
- no implicit `any`;
- no unchecked archive values without validation/narrowing;
- no `as unknown as X` shortcuts in parser logic;
- avoid non-null assertions;
- use exhaustive `switch` with `never` guards on discriminated unions;
- immutable transformations for domain logic where practical;
- pure diff/normalization functions;
- dependency injection or explicit arguments for testable side effects;
- no business logic in presentation components;
- no giant 500+ line component when responsibilities can be separated naturally.

Do not overabstract tiny one-off UI fragments.

---

# 32. Logging

Production logging must never dump:

- archive content;
- follower/following arrays;
- usernames;
- file bytes;
- raw JSON.

Allowed sanitized diagnostic example:

```json
{
  "event": "import_failed",
  "code": "UNSUPPORTED_INSTAGRAM_SCHEMA",
  "adapter": "instagram",
  "parserVersion": "1.0.0"
}
```

In V1 there is no remote logger by default.

---

# 33. Network-boundary engineering guardrails

To make the relationship-analyzer privacy promise durable:

1. Put parser/domain modules in code that has no imported HTTP client.
2. Do not import `fetch` wrappers into analyzer services.
3. Do not load remote profile images.
4. Do not automatically resolve handles against Instagram.
5. Prefer local fonts or safe system fonts if remote font requests would undermine the “minimal network” privacy story.
6. Add a test that import succeeds with network blocked after initial page load.

For the Story/Highlights subsystem:

1. Browser code may call only same-origin Story/media routes.
2. Provider hosts and API keys exist only in server modules/environment.
3. Provider code must not import or query relationship persistence modules.
4. Story routes must reject archive/file/relationship-shaped payloads.
5. Media routes must require authenticated-encrypted short-lived references and enforce hostname/IP/redirect/content limits.
6. No lookup history is persisted by our application by default.
7. Tests must prove that relationship import still succeeds when all Story/provider routes are blocked.

---

# 34. Account handling

Because a relationships-only export may not reliably include enough metadata to identify the owner account, V1 uses a local account profile.

First import:

```text
Account label: My Instagram
Instagram username (optional): example
```

`label` is required and local-only.

`username` is optional and local-only.

Multiple accounts are supported.

A snapshot can only be compared against snapshots belonging to the same local account.

Moving snapshots between accounts is not required in V1.

---

# 35. Snapshot comparison rules

## Automatic comparison

After saving current snapshot `S`, choose the nearest snapshot for the same account with:

```text
previous.snapshotAt < S.snapshotAt
```

as the default comparison baseline.

If none exists, this is the first historical snapshot.

## Manual comparison

History UI allows selection of two distinct snapshots from the same account.

If user selects newer/older in reverse order, normalize orientation in UI or clearly label left/right dates.

Do not compare across different platforms/accounts.

---

# 36. Result semantics

## Not following you back

Current following minus current followers.

This result does not need historical snapshots.

## You don't follow back

Current followers minus current following.

## Mutuals

Intersection of current followers and following.

## Lost followers

Prior followers minus current followers.

Requires two snapshots.

## New followers

Current followers minus prior followers.

Requires two snapshots.

## Net follower change

```text
newFollowers.length - lostFollowers.length
```

It should also equal follower count difference if normalization and dataset completeness are consistent.

If not, generate a diagnostic warning rather than hiding the inconsistency.

---

# 37. Handling incomplete exports

A misleading result is worse than no result.

If parser suspects incomplete follower data, do not silently compute results.

Examples:

- `followers_1.json` exists plus archive evidence indicates other follower parts but they are missing;
- manual import contains only one numbered part without confidence it is complete;
- relevant JSON stopped parsing mid-file;
- relationship count exceeds safety ceiling.

Show a blocking error or strong warning based on confidence.

For manual import of `followers_1.json`, communicate:

> Large Instagram accounts may have multiple follower files. Import the original ZIP for the most reliable result.

---

# 38. Compatibility diagnostics

When schema is unsupported, offer a safe diagnostic report the user can copy.

Diagnostic report may include:

```text
app version
parser version
browser family/version
archive file count
matched relevant filenames
recognized top-level JSON key names
error code
```

It must NOT include:

- usernames;
- relationship values;
- raw JSON snippets;
- archive bytes.

---

# 39. Browser support

Target current stable/modern versions of:

- Chrome/Chromium;
- Edge;
- Firefox;
- Safari;
- iOS Safari;
- Android Chrome.

Minimum policy should be based on browser capabilities required by:

- module workers;
- File/Blob APIs;
- IndexedDB;
- Web Crypto;
- modern ES modules.

Do not add legacy transpilation/polyfills for obsolete browsers unless analytics/user needs later justify them.

Large imports on memory-constrained mobile devices may fail gracefully with a recommendation to use a desktop browser.

---

# 40. Deployment

## 40.1 Production

Preferred V1 deployment:

- Vercel;
- hybrid Next.js deployment: statically generated public pages plus serverless/Node route handlers for Story/Highlights;
- custom domain;
- HTTPS only.

## 40.2 Environment variables

Relationship analysis requires **zero secrets**.

Story/Highlights requires server-only configuration such as:

```text
STORY_PROVIDER
STORY_PROVIDER_API_KEY
STORY_MEDIA_TOKEN_SECRET
```

Exact names may change, but they must be validated at server startup/request time, excluded from browser bundles, redacted from logs, scoped to the minimum provider permissions, and rotatable without a code change.

If a deployment environment requires site URL configuration, use only public non-secret variables.

A project that needs Instagram/Meta credentials for relationship analysis is architecturally wrong relative to this specification. A reviewed third-party Story provider API key is allowed only inside the isolated Story server subsystem.

## 40.3 Source maps

Decide deliberately whether browser source maps are public.

Do not allow source maps/logging tools to contain user relationship data.

---

# 41. README requirements

README should explain:

- product purpose;
- privacy architecture;
- supported input;
- unsupported input;
- local development;
- test commands;
- build/deploy commands;
- no Meta credentials required;
- project structure;
- security/reporting contact placeholder;
- how to add/update synthetic parser fixtures;
- adapter architecture for future platforms.
- Story/Highlights public-only scope and network/privacy distinction;
- Story provider configuration, server-only secrets, mocked development mode, and provider-disable behavior;
- provider review checklist and operational limits;
- media-token/download security model.

---

# 42. Implementation sequence

Codex should implement in this order.

## Milestone 1 — Foundation

- Initialize Next.js project.
- Configure TypeScript strict mode.
- Configure Tailwind.
- Establish design tokens and base layout.
- Configure lint/test/build.
- Add CI.

Acceptance:

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

all pass.

## Milestone 2 — Domain + parser tests

- Domain types.
- Normalization.
- Diff engine.
- Instagram schemas/extractors.
- ZIP manifest/detection.
- Synthetic fixtures.
- Unit tests.

Do this before fancy UI.

## Milestone 3 — Worker import pipeline

- worker protocol;
- ZIP limits;
- selective extraction;
- JSON parsing;
- progress;
- cancellation;
- fingerprinting;
- errors.

Acceptance:

- UI main thread remains responsive during synthetic large import;
- privacy network test passes.

## Milestone 4 — IndexedDB

- Dexie schema;
- repositories;
- account management;
- snapshot persistence;
- history queries;
- deletion;
- duplicate fingerprint.

## Milestone 5 — Analyzer UX

- local account selection;
- drop zone;
- export guide;
- progress;
- review;
- results;
- history;
- compare;
- CSV.

## Milestone 5B — Public Story/Highlights utility

- provider due-diligence and selection;
- server-only provider adapter;
- username/profile URL normalization;
- lookup/highlight-item route handlers;
- short-lived authenticated-encrypted media tokens;
- SSRF/open-proxy/content-size protections;
- rate/cost/timeout controls;
- public-only Story/Highlight gallery;
- individual preview/download;
- explicit network, provider, public-only, and copyright disclosures;
- mocked unit/integration/E2E tests;
- production provider smoke test with an approved non-sensitive public account supplied at test time and never committed to production code/fixtures.

Acceptance:

- provider secret is absent from client bundles/responses;
- arbitrary URLs and private-network destinations are rejected;
- no query/media history is persisted by our application;
- browser calls only same-origin Story routes;
- relationship analyzer remains fully functional with Story/provider network blocked;
- provider failure does not affect other product routes.

## Milestone 6 — Marketing/legal pages

- landing;
- how it works;
- privacy;
- terms;
- FAQ;
- SEO.

## Milestone 7 — Hardening

- E2E;
- accessibility;
- mobile;
- large data profiling;
- CSP/security headers;
- dependency audit;
- production build validation.

---

# 43. Acceptance criteria

V1 is not complete until every critical item below passes.

## Product

- [ ] User can analyze current follower/following relationships from a valid Instagram JSON export.
- [ ] Multi-part follower files are merged.
- [ ] First snapshot does not falsely claim historical unfollow data.
- [ ] Two snapshots produce correct lost/new follower results.
- [ ] Multiple local accounts remain isolated.
- [ ] History survives page reload.
- [ ] User can delete local history.
- [ ] CSV works locally.
- [ ] User can submit one valid public username/profile URL and see currently available active Stories.
- [ ] User can browse public Highlight collections/items when the provider supplies them.
- [ ] User can preview and individually download supported public image/video media.
- [ ] Private, unavailable, empty, expired-token, rate-limit, and provider-outage states are handled accurately.

## Privacy

- [ ] No Instagram/Facebook credentials requested.
- [ ] No archive upload endpoint exists.
- [ ] Import works with external network blocked after page assets load.
- [ ] No third-party tracking SDK in analyzer V1.
- [ ] No raw ZIP persisted.
- [ ] No relationship handles in production logs.
- [ ] Story network disclosure is shown before lookup.
- [ ] Story lookup handles/media are not persisted by our application by default.
- [ ] Provider logging/retention is disclosed accurately.
- [ ] Story provider API key and media-token secret never reach the browser.

## Security

- [ ] ZIP entry count/size guards.
- [ ] ZIP path validation.
- [ ] suspicious compression guard.
- [ ] nested archives ignored.
- [ ] untrusted export values rendered only as text.
- [ ] external links safely generated.
- [ ] CSV formula injection mitigated.
- [ ] dependency audit passes or findings are explicitly triaged.
- [ ] Story routes have request/body/rate/timeout/response-size guards.
- [ ] Media delivery uses authenticated-encrypted expiring references and cannot fetch arbitrary URLs.
- [ ] Provider/CDN redirects, hosts, IP destinations, content types, and sizes are validated.
- [ ] Story provider response is schema-validated as untrusted input.

## Quality

- [ ] TypeScript typecheck passes.
- [ ] ESLint passes with zero warnings.
- [ ] unit tests pass.
- [ ] E2E tests pass.
- [ ] production build passes.
- [ ] no core TODO placeholders.
- [ ] responsive at required widths.
- [ ] keyboard navigation works.
- [ ] automated accessibility checks pass.
- [ ] Story provider adapter and route tests pass with mocked upstream responses.
- [ ] Story public/private/empty/error/download E2E flows pass.
- [ ] Relationship privacy E2E still passes with Story routes blocked.

## Performance

- [ ] parser/diff does not block main thread materially.
- [ ] large result list does not create an enormous DOM.
- [ ] marketing Core Web Vitals are within target in realistic tests.

---

# 44. Definition of done for a Codex implementation task

For any requested implementation chunk, Codex must:

1. Read this spec.
2. Inspect existing project architecture before editing.
3. Reuse existing conventions when compatible with this spec.
4. Implement the smallest complete solution.
5. Add/update automated tests.
6. Run typecheck/lint/relevant tests.
7. Run production build for architecture/config changes.
8. Report exactly what changed.
9. Report test/build results.
10. Report any spec conflict or unresolved platform-format uncertainty instead of inventing behavior.

---

# 45. Anti-patterns to reject during review

Reject PR/code that does any of the following:

- sends ZIP to an API route “for easier parsing”;
- stores export in S3/Blob storage;
- asks for Instagram username/password to log in;
- uses Selenium/Puppeteer to scrape Instagram;
- imports a private Instagram API library;
- only reads `followers_1.json` and ignores `followers_2.json+`;
- performs nested-array O(n²) relationship comparisons;
- runs large `JSON.parse` on main thread;
- renders archive-provided href directly;
- uses `dangerouslySetInnerHTML` for archive content;
- saves raw ZIP to IndexedDB;
- claims exact intentional unfollow behavior without caveat;
- adds a database/auth/backend with no V1 requirement;
- adds session replay;
- hard-codes production secrets;
- suppresses TypeScript errors with `any`/double assertions;
- skips tests because parser “looks simple”.
- sends relationship ZIP/JSON through the Story backend;
- exposes a Story provider API key in client code or a public environment variable;
- implements direct Instagram scraping/private API fallback;
- claims access to private/Close Friends/deleted/expired Stories;
- accepts an arbitrary URL in a media proxy;
- follows media redirects without host/IP revalidation;
- permanently stores Story queries/media without an explicit revised privacy review;
- claims Story viewing is anonymous;
- omits copyright/permission guidance;
- lets provider outage or quota failure break the local relationship analyzer.

---

# 46. Future relationship-data cloud sync - NOT V1

Only consider this after local-first product validation.

The Folmetry identity database introduced in revision 1.2 is not relationship-data cloud sync. A potential later sync model would be:

```text
Browser parser
   ↓
normalized relationship identities
   ↓
optional client-side protected sync representation
   ↓
authenticated cloud account
```

Before adding cloud storage, conduct a separate privacy/security design review.

Do not simply upload current local snapshots as plaintext because a database makes product development easier.

Future features that may justify accounts:

- cross-device history;
- backup;
- paid long-term analytics;
- scheduled reminders to import another export.

Even then, Instagram passwords remain prohibited.

---

# 47. Product analytics — future only

If product analytics is added later, approved event examples:

```text
landing_cta_clicked
analyzer_opened
import_started
import_completed
import_failed:{error_code}
history_compared
csv_exported
local_data_deleted
```

Forbidden analytics properties:

```text
instagram_username
relationship_username
archive_filename
raw_file_size when uniquely identifying/extreme without need
file_content
profile_url
```

Aggregate counts may be considered only after a privacy review.

---

# 48. Current technology verification notes

Verified around 2026-09-15:

- Next.js 16.3.3 is an Active LTS security-patched release line.
- Node.js 24 is LTS; Node.js 26 is Current, so Node 24 is the safer production/CI baseline here.
- React 19.3 is a stable release.
- TypeScript 6.0 is current stable documentation baseline and is a transition release ahead of TypeScript 7.
- Tailwind CSS 4.3 is available.
- Vitest 5.0 is available.
- Playwright current docs show the 1.63 release line.
- Meta continues to expose Download Your Information through Accounts Center.
- Instagram's official API remains oriented around supported professional account use cases rather than providing the complete consumer follower-list capability needed for this product.
- Arbitrary-public-username Story/Highlights lookup is not supplied by the official professional-account API model and therefore requires a separately reviewed external public-data provider.
- At verification time, external providers exist that document active Story and Highlight endpoints using a server-side API key. One candidate documents full Highlight items but retains API usage/IP logs for 90 days without clearly stating whether query parameters are included; another explicitly documents logging lookup parameters such as Instagram usernames. Provider privacy/terms/cost review and clarification are therefore mandatory, and UI disclosure cannot claim that Story lookups remain on-device.

Do not assume these exact versions remain current forever. At implementation/update time, check security advisories and choose the newest compatible patched release while preserving architecture.

---

# 49. Reference sources

These links are for engineering verification, not runtime dependencies.

## Meta / Instagram

- Meta Accounts Center / Download Your Information announcement:  
  https://about.fb.com/news/2023/10/manage-your-information-across-apps/
- Meta Instagram API collection/docs via Meta's Postman workspace:  
  https://www.postman.com/meta/workspace/instagram/
- Meta Developers:  
  https://developers.meta.com/

## Framework/runtime

- Next.js releases/blog:  
  https://nextjs.org/blog
- Node.js releases:  
  https://nodejs.org/en/blog/release
- React blog:  
  https://react.dev/blog
- TypeScript 6.0 release notes:  
  https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- Tailwind CSS blog:  
  https://tailwindcss.com/blog

## Browser/local processing

- MDN File API:  
  https://developer.mozilla.org/en-US/docs/Web/API/File_API
- MDN IndexedDB:  
  https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- Dexie:  
  https://dexie.org/docs
- zip.js:  
  https://gildas-lormeau.github.io/zip.js/

## Security

- OWASP File Upload Cheat Sheet:  
  https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- OWASP Input Validation Cheat Sheet:  
  https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html

## Testing

- Vitest:  
  https://vitest.dev/
- Playwright:  
  https://playwright.dev/

## Story/Highlights provider evaluation

- Preferred technical evaluation candidate for Stories plus full Highlight items (not approved or endorsed until due diligence is complete):  
  https://www.instagapi.com/instagram-stories-api  
  https://www.instagapi.com/instagram-highlights-api
- Candidate terms and privacy policy:  
  https://www.instagapi.com/terms  
  https://www.instagapi.com/privacy
- Example public-data provider API documentation (evaluation candidate, not an endorsement or permanent dependency):  
  https://api.instagramapi.dev/docs
- Example active Stories endpoint documentation:  
  https://api.instagramapi.dev/docs/profile/stories
- Example provider privacy policy describing request-parameter logging:  
  https://api.instagramapi.dev/privacy

Re-verify provider availability, contract, terms, privacy, retention, pricing, response schema, and host allowlists immediately before implementation and production enablement.

---

# 50. Final architecture decision summary

The correct revised V1 is two isolated subsystems:

```text
Next.js hybrid website
  ├─ Local relationship analyzer
  │    ├─ React analyzer UI
  │    ├─ dedicated browser Web Worker
  │    ├─ @zip.js/zip.js selective extraction
  │    ├─ Instagram export adapter
  │    ├─ O(n) Set-based diff engine
  │    ├─ Dexie / IndexedDB local history
  │    ├─ ZERO Meta credentials
  │    └─ ZERO server-side relationship processing/storage
  │
  └─ Public Story/Highlights utility
       ├─ public handle/profile URL only
       ├─ same-origin minimal server routes
       ├─ reviewed provider adapter + server-only key
       ├─ schema/rate/timeout/size validation
       ├─ authenticated-encrypted short-lived media references
       ├─ individual preview/download
       └─ ZERO private-account/access-control bypass
```

The core product promise is:

> **The user brings their own official Instagram export, analysis happens locally, and history stays in their browser.**

The separate Story/Highlights promise is:

> **Public Stories and Highlights can be looked up without Instagram credentials, but the submitted handle is sent to our server and configured provider. Results are ephemeral in our application and private content is never supported.**

Any implementation that sends relationship data into the Story/server boundary, hides the Story network disclosure, exposes provider secrets, or bypasses public-access limits should be treated as a product architecture regression, not a minor engineering choice.
