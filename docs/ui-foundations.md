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

## M8UX2 addendum — Kinetic Signal Atlas

M8UX2 evolves the selected `Private Signal Observatory` into **Kinetic Signal Atlas**. The recognizable system is now a warm technical-paper canvas in light mode and layered graphite in dark mode, with a source-owned signal aperture, coordinate axes, boundary rails, data wells, and editorial metric typography. Instagram and Facebook use distinct active signal dialects while sharing accessible interaction primitives. Neither platform borrows Meta trade dress.

The implementation stays code-native. Decorative imagery is inline SVG/CSS owned by this repository, all decorative SVG remains hidden from assistive technology, and no remote font, icon pack, stock image, generated raster image, animation runtime, WebGL layer, tracking request, or fabricated product data was added. The native system and monospace stacks remain the typography choice because they provide reliable Vietnamese coverage and avoid font-driven layout shift.

### Transition and motion policy

React View Transitions are enabled only as progressive enhancement for navigation direction/context and tab continuity. `nav-forward`, `nav-back`, and `nav-context` communicate spatial intent; the static DOM, focus order, URL behavior, and browser back/forward behavior do not depend on them. Motion is limited to compositor-friendly properties and meaningful states. Signal sweeps stop for reduced motion, save-data, hidden documents, or non-hover/coarse-pointer contexts where appropriate. Loading and parser treatments remain coupled to real application states.

The maximum motion ranges are 90–160 ms for micro feedback, 180–260 ms for component changes, and 320–480 ms for route/spatial transitions. Content is never held behind an intro sequence. Reduced motion removes spatial transforms rather than merely accelerating them.

### Motion inventory and stop conditions

| Motion | Trigger | Stop/cancellation condition | Static/reduced fallback |
| --- | --- | --- | --- |
| Signal aperture sweep | Visible landing or platform instrument | Reduced motion, save-data, hidden document, coarse pointer, or unmount | Complete aperture and coordinates remain visible |
| Pipeline trace | Visible semantic export pipeline | Same capability gates as the aperture | Ordered stages, arrows, labels, and boundary text remain visible |
| Header condensation | Root document scroll on desktop | Scroll returns to top, reduced motion, unsupported scroll timeline, or unmount | Full-size sticky navigation instrument |
| Route handoff | A Link explicitly declares `nav-forward`, `nav-back`, or `nav-context` | Transition completes, navigation is interrupted, browser lacks support, or reduced motion | Native navigation with unchanged URL/focus semantics |
| Result tab handoff | User selects or keyboard-navigates to a real tab | Transition completes, another tab is chosen, unmount, or reduced motion | Immediate tab-panel replacement |
| Import scan | Analyzer state machine is validating/parsing | Success, error, cancel, hidden document, save-data, or reduced motion | Live status text and determinate progress where available |
| Story request trace | A real same-origin Story request is pending | Response, error, cancel, abort, hidden document, save-data, or reduced motion | `aria-live` request status and enabled cancel control |
| Focus/interaction trace | Keyboard focus or supported hover on an interactive control | Blur, pointer leave, disabled state, coarse pointer, or reduced motion | Persistent focus ring, border, text, and semantic state |
| Dialog entry/exit | A real dialog opens or closes | Close, Escape, browser Back, unmount, or reduced motion | Immediate modal visibility with focus trap/restore |

No animation starts a provider request, uploads a raw archive, changes ownership, invents progress, or scales with the number of relationship rows.

### Layout and accessibility evidence

The analyzer now uses a wide-data workspace with a full-width introduction, real state-machine workflow rail, profile/import task columns, full-width insight/history output, and a separate danger zone. At narrow widths it becomes a single task-first column. Landing and platform hubs use editorial sections and semantic pipeline/boundary visuals instead of uniform dashboard cards. Auth uses a restrained secure-access frame; account and admin prioritize scanability.

The automated matrix covers keyboard focus, mobile-menu trapping/Escape/restore, responsive overflow, 200% text, forced colors, reduced motion, accessibility scans, route rendering, analyzer geometry, and Chromium/mobile Chromium/Firefox/WebKit. Database-backed analyzer scenarios are explicitly conditional on `DATABASE_URL`; unit/component fixtures continue to exercise local parsing and workflow behavior without production data.

The CSS gate is tightened to 110 KB total production CSS, while static JavaScript remains capped at 1.5 MB total and 300 KB for the largest chunk. These are regression budgets, not claims about production Core Web Vitals. Field p75 measurements, physical iOS/Android checks, real PostgreSQL/provider smoke tests, and production-preview sign-off remain deployment gates.

Final local acceptance on 2026-09-23 passed strict type checking, zero-warning lint, 47 unit/component files with 247 tests, and a production build of 23 pages/routes. The measured production output was 89,724 B CSS (17,127 B gzip), 1,147,779 B total static JavaScript (376,853 B gzip), and a 228,919 B largest JavaScript chunk. The expanded Playwright matrix ran 128 cases across Chromium, mobile Chromium, Firefox, and WebKit: 111 passed and 14 were intentionally skipped; three database-backed requests timed out under six-worker contention and all affected assertions passed 6/6 when rerun serially. The production dependency audit reported no known vulnerabilities at the high threshold.

### M8UX2 rollback

The V3 presentation layer can be rolled back independently from parser, persistence, ownership, authentication, and provider contracts. If production performance or motion comfort regresses, disable the View Transition/motion block first while retaining the static token and layout system. Compatibility aliases remain in the token layer so the interface can fall back without a domain migration.
