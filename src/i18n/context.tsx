"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createAnalyzerDatabase, SettingsRepository } from "@/features/analyzer/persistence";
import { en } from "@/i18n/en";
import type { Dictionary, Locale } from "@/i18n/types";
import { vi } from "@/i18n/vi";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

interface I18nContextValue {
  readonly locale: Locale;
  readonly dictionary: Dictionary;
  readonly theme: ThemePreference;
  readonly resolvedTheme: ResolvedTheme;
  readonly setLocale: (locale: Locale) => void;
  readonly setTheme: (theme: ThemePreference) => void;
  readonly formatNumber: (value: number) => string;
  readonly formatDate: (value: number | Date) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function AppPreferencesProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const settingsRef = useRef<SettingsRepository | undefined>(undefined);
  const localeTouchedRef = useRef(false);
  const themeTouchedRef = useRef(false);

  const applyLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  const applyTheme = useCallback((nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
    document.documentElement.dataset["theme"] = nextTheme;
    setResolvedTheme(nextTheme === "system" ? systemTheme() : nextTheme);
  }, []);

  useEffect(() => {
    let active = true;
    let database: ReturnType<typeof createAnalyzerDatabase> | undefined;
    try {
      database = createAnalyzerDatabase();
      const settings = new SettingsRepository(database);
      settingsRef.current = settings;
      void settings.getAll().then((stored) => {
        if (!active) return;
        if (!localeTouchedRef.current) applyLocale(stored.locale);
        if (!themeTouchedRef.current) applyTheme(stored.theme);
      }).catch(() => undefined);
    } catch {
      // Defaults remain usable when private mode or browser policy blocks IndexedDB.
    }
    return () => {
      active = false;
      settingsRef.current = undefined;
      database?.close();
    };
  }, [applyLocale, applyTheme]);

  useEffect(() => {
    if (theme !== "system" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = (): void => setResolvedTheme(query.matches ? "dark" : "light");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [theme]);

  const setLocale = useCallback((nextLocale: Locale) => {
    localeTouchedRef.current = true;
    applyLocale(nextLocale);
    void settingsRef.current?.set("locale", nextLocale).catch(() => undefined);
  }, [applyLocale]);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    themeTouchedRef.current = true;
    applyTheme(nextTheme);
    void settingsRef.current?.set("theme", nextTheme).catch(() => undefined);
  }, [applyTheme]);

  const intlLocale = locale === "vi" ? "vi-VN" : "en-US";
  const value = useMemo<I18nContextValue>(() => ({
    locale,
    dictionary: locale === "vi" ? vi : en,
    theme,
    resolvedTheme,
    setLocale,
    setTheme,
    formatNumber: (number) => new Intl.NumberFormat(intlLocale).format(number),
    formatDate: (date) => new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeStyle: "short" }).format(date),
  }), [intlLocale, locale, resolvedTheme, setLocale, setTheme, theme]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (value === undefined) throw new Error("useI18n must be used within AppPreferencesProvider");
  return value;
}
