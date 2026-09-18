# M5 localization, theme, and UI foundations

## Client boundary

The root layout remains a Server Component so metadata and static generation stay intact. `AppPreferencesProvider` is the narrow client boundary for locale/theme state and browser-only IndexedDB settings. Pages pass typed route identifiers to localized client content instead of scattering UI copy through analyzer components.

The initial document is English with `data-theme="system"`. CSS honors the operating-system scheme before hydration. After hydration, preferences are read from the typed M4 settings repository. Explicit light/dark choices update `data-theme`; system mode continues listening to `prefers-color-scheme` changes. If IndexedDB is unavailable, safe in-memory defaults remain functional.

## Typed localization

`src/i18n/en.ts` is canonical. `vi.ts` uses `satisfies Dictionary`, enforcing the exact recursive key shape at compile time. Components consume typed properties through `useI18n`; domain error, persistence error, warning, and worker-stage unions have dedicated typed accessors, so arbitrary message keys are not accepted.

The dictionaries cover shell/marketing, accounts, import and review, results/history, diagnostics/deletion/CSV, privacy caveats, and all planned Story states. Copy does not infer intentional unfollowing. It explicitly notes username changes, deactivation, deletion, suspension, and export differences. Story copy discloses server/provider transmission and possible provider operational logging, and never describes that flow as local-only or anonymous.

Numbers and dates use `Intl.NumberFormat` and `Intl.DateTimeFormat` with `en-US` or `vi-VN`; separators are not hard-coded. Switching locale updates the document `lang` attribute and persists to IndexedDB.

## Accessible primitives

Source-owned primitives include buttons/links, labelled input and select fields, keyboard tabs, modal/alert dialogs, status regions, semantic badges, cards, determinate/indeterminate progress, empty states, and non-semantic skeletons.

- All interactive controls have visible `:focus-visible` treatment and a minimum 44px target where practical.
- Tabs support Left/Right/Home/End.
- Dialogs trap Tab focus, support Escape when non-alert, and restore focus on close.
- Status regions use appropriate live-region behavior.
- Badge meaning includes text and a symbol, not color alone.
- Reduced-motion CSS disables decorative progress/skeleton animation.

## Responsive shell

The sticky shell includes a first-focus skip link, main landmark, active navigation with `aria-current` plus underline/font-weight, localized footer, and clearly separated Story utility CTA. Content uses constrained widths and responsive wrapping. Automated checks cover 360, 390, 430, 768, 1024, and 1440px without horizontal page overflow.

The app uses the local system font stack and contains no remote font, analytics, or tracking request.

---

# M8UX Folmetry Signature Experience

## Selected direction and rejected alternatives

The selected direction is **Private Signal Observatory**: an editorial, high-precision interface built from relationship topology, snapshot frames, local-processing pulses, tabular metrics, and explicit data boundaries. It remains recognizable through the indigo/cyan signal system, orbital node motif, numbered route markers, snapshot timeline, and hairline material system even when the logo is removed.

Two alternatives were evaluated and deliberately not adopted:

1. **Editorial Intelligence** offered excellent long-form readability but did not express local relationship processing strongly enough on product screens.
2. **Dual Realm** made local/network separation visually obvious but created two competing visual systems and made the authenticated workspace feel disconnected from marketing.

The chosen system combines the strongest editorial hierarchy with one restrained observatory motif. Random blobs, broad neon glow, fake dashboards, fake security badges, stock imagery, particle fields, WebGL, custom cursors, scroll hijacking, parallax, and perpetual analyzer/auth/admin animation are prohibited.

## Route and state inventory

| Surface | Representative states covered by implementation/tests |
| --- | --- |
| Home | light/dark/system, EN/VI, desktop/tablet/mobile, local/network boundary, pipeline, CTA/footer |
| Analyzer | loading, no local profile, ready import, drag, validation/parsing, review, saving, first/historical result, history/compare, error, destructive dialogs |
| Story/Highlights | idle, real request loading, empty/error, gallery, expired media, highlight selection, copyright/provider boundary |
| Authentication | login, registration, password strength, forgot/reset, setup notice |
| Account | identity/verification/role, sessions, password change, local-data privacy boundary |
| Administration | search, empty, pagination, role/access/session/delete confirmation, responsive user cards |
| Editorial | how-it-works sequence, FAQ, Privacy/Terms table of contents |
| Recovery | 404 and error boundary with clear recovery action and no secret/config disclosure |

The pre-M8UX state remains recoverable at Git commit `ab4606f`. This commit is the durable before-reference; temporary QA screenshots are intentionally not retained because they can contain environment-specific account state. Synthetic fixtures remain the only relationship data used by automated tests.

## Token and component migration

Primitive palette values are separated from semantic roles in `src/app/globals.css`. Existing names such as `--background`, `--card`, and `--accent` remain compatibility aliases while V2 roles (`--surface-*`, `--text-*`, `--border-*`, `--interactive-*`, and `--data-*`) support incremental migration. Space, container, duration, and easing scales replace new one-off values.

The source-owned primitives provide primary, secondary, quiet, danger, and icon-only button treatments; labelled fields with hint/error/success anatomy; plain/elevated/inset/interactive/critical surfaces; semantic badges; progress; status; empty/skeleton states; tabs; pagination; and accessible dialogs. No tooltip or popover is shipped because no current task requires hidden hover-only information.

The chosen typography is the native system UI stack with a system monospace stack for metrics and metadata. This won the implementation bake-off because it has reliable Vietnamese coverage, zero font request, no font-driven layout shift, native platform rendering, and the lowest critical-path cost. Display hierarchy comes from size, measure, weight, and tracking rather than a fashionable remote font.

## Motion policy

Motion is bounded and state-linked:

- the hero orbit runs once and then stops;
- drop-zone scanning exists only while drag is active;
- the Story request line exists only during a real request;
- section reveal is CSS scroll-timeline progressive enhancement;
- hover displacement is limited to devices that expose hover and is removed under reduced motion;
- no core workflow depends on animation or View Transition support.

Route-level View Transitions are intentionally not enabled. The current routes do not share a semantic visual object whose morph would clarify continuity, and a generic page crossfade would add motion without information. Navigation remains complete in every supported browser.

## Asset register

| Asset | Source/owner | Usage | Runtime request |
| --- | --- | --- | --- |
| `folmetry.png` | User-provided Folmetry brand asset; deployment owner must retain proof of rights | Header, favicon/application icon, social metadata | Same-origin optimized image |
| `SignalField` SVG | Authored in this repository for Folmetry | Decorative topology motif; `aria-hidden` | None; inline markup |
| Grid/noise/material effects | Authored CSS in this repository | Spatial structure and surface depth | None |
| UI symbols | Unicode/system-rendered | Status meaning in addition to text/color | None |

No third-party illustration, remote icon pack, remote texture, tracking pixel, or stock/AI imagery is used.

## Performance and release evidence

`pnpm check:ui-budget` measures the production build and fails when total CSS exceeds 120 KB, total static JavaScript chunks exceed 1.5 MB, or a JavaScript chunk exceeds 300 KB. These are repository regression budgets, not field Core Web Vitals claims. LCP/INP/CLS p75 require production real-user telemetry and therefore remain a deployment gate.

Automated coverage includes type checking, zero-warning lint, unit/component tests, production build, dependency audit, route/accessibility smoke tests, geometry/overflow assertions, 320px Vietnamese dark-mode reflow, mobile menu keyboard/focus behavior, reduced motion, forced colors, 200% text sizing, analyzer fixtures, Story same-origin behavior, and Chromium/mobile Chromium/Firefox/WebKit runs.

Final local acceptance on 2026-09-18 produced the following evidence:

- `pnpm check`: 40 test files and 227 tests passed; typecheck and zero-warning lint passed; all 19 application routes built successfully.
- UI budget: 66,299 B CSS, 1,122,971 B total static JavaScript, and 228,919 B largest JavaScript chunk—below all enforced limits.
- `pnpm test:e2e`: 102 tests passed across Chromium, mobile Chromium, Firefox, and WebKit; two forced-colors cases were intentionally skipped on engines without Playwright media emulation support.
- `pnpm audit --prod --audit-level high`: no known vulnerabilities.
- Representative 390px, 768px, and 1440px screenshots were reviewed for home, mobile navigation, analyzer, and long-form editorial composition. Temporary captures were deleted after review to avoid retaining environment-specific state.

Field Core Web Vitals at p75, physical iOS/Android behavior, and production-preview approval cannot be established by a local build. They remain explicit post-deployment release gates rather than being reported as completed measurements.

## Rollback

M8UX changes are isolated to semantic tokens/global presentation, layout/visual components, translated presentation copy, and tests. Domain parsing, persistence, authentication, and Story provider contracts are unchanged. If a production metric regresses, revert the M8UX commit as one unit or first disable the bounded motion block and signal-field rendering; do not alter analyzer or provider data contracts as a visual rollback.
