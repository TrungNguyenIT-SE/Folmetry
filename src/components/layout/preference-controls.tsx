"use client";

import { useI18n, type ThemePreference } from "@/i18n";

export function PreferenceControls() {
  const { dictionary, locale, setLocale, theme, setTheme } = useI18n();

  return (
    <div className="preference-controls">
      <div className="locale-switcher" role="group" aria-label={dictionary.a11y.language}>
        <button
          aria-pressed={locale === "en"}
          className="preference-button"
          type="button"
          onClick={() => setLocale("en")}
        >
          EN
        </button>
        <button
          aria-pressed={locale === "vi"}
          className="preference-button"
          type="button"
          onClick={() => setLocale("vi")}
        >
          VI
        </button>
      </div>
      <label className="theme-control">
        <span className="visually-hidden">{dictionary.a11y.theme}</span>
        <select
          aria-label={dictionary.a11y.theme}
          value={theme}
          onChange={(event) => setTheme(event.target.value as ThemePreference)}
        >
          <option value="system">{dictionary.theme.system}</option>
          <option value="light">{dictionary.theme.light}</option>
          <option value="dark">{dictionary.theme.dark}</option>
        </select>
      </label>
    </div>
  );
}
