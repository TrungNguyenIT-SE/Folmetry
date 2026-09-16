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
