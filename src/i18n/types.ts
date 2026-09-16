import type { en } from "@/i18n/en";

export type Locale = "en" | "vi";

export type WidenStrings<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : WidenStrings<T[K]>;
};

export type Dictionary = WidenStrings<typeof en>;
