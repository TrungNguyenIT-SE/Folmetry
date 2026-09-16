import type { LocalSetting } from "@/features/analyzer/model/types";
import type { AnalyzerDatabase } from "@/features/analyzer/persistence/database";
import { PersistenceDomainError, mapPersistenceError } from "@/features/analyzer/persistence/errors";

export interface AnalyzerSettings {
  readonly locale: "en" | "vi";
  readonly theme: "system" | "light" | "dark";
  readonly localRetentionNoticeSeen: boolean;
}

export type AnalyzerSettingKey = keyof AnalyzerSettings;

export const DEFAULT_ANALYZER_SETTINGS: AnalyzerSettings = Object.freeze({
  locale: "en",
  theme: "system",
  localRetentionNoticeSeen: false,
});

function validSetting<K extends AnalyzerSettingKey>(
  key: K,
  value: unknown,
): value is AnalyzerSettings[K] {
  switch (key) {
    case "locale":
      return value === "en" || value === "vi";
    case "theme":
      return value === "system" || value === "light" || value === "dark";
    case "localRetentionNoticeSeen":
      return typeof value === "boolean";
    default: {
      const exhaustive: never = key;
      throw exhaustive;
    }
  }
}

export class SettingsRepository {
  constructor(private readonly database: AnalyzerDatabase) {}

  async get<K extends AnalyzerSettingKey>(key: K): Promise<AnalyzerSettings[K]> {
    try {
      const setting = await this.database.settings.get(key);
      return validSetting(key, setting?.value) ? setting.value : DEFAULT_ANALYZER_SETTINGS[key];
    } catch (error) {
      throw mapPersistenceError(error, "operation");
    }
  }

  async set<K extends AnalyzerSettingKey>(key: K, value: AnalyzerSettings[K]): Promise<void> {
    if (!validSetting(key, value)) throw new PersistenceDomainError("INVALID_SETTING");
    const setting: LocalSetting = { key, value };
    try {
      await this.database.settings.put(setting);
    } catch (error) {
      throw mapPersistenceError(error, "operation");
    }
  }

  async getAll(): Promise<AnalyzerSettings> {
    const [locale, theme, localRetentionNoticeSeen] = await Promise.all([
      this.get("locale"),
      this.get("theme"),
      this.get("localRetentionNoticeSeen"),
    ]);
    return { locale, theme, localRetentionNoticeSeen };
  }
}
