"use client";

import { RouteIntro } from "@/components/layout/route-intro";
import type { Dictionary } from "@/i18n";
import { useI18n } from "@/i18n";

type RouteKey = keyof Dictionary["pages"];

export function LocalizedRoutePage({ route }: Readonly<{ route: RouteKey }>) {
  const { dictionary } = useI18n();
  const content = dictionary.pages[route];
  const notice = "notice" in content ? content.notice : undefined;
  return (
    <RouteIntro eyebrow={content.eyebrow} title={content.title} description={content.description}>
      {notice === undefined ? null : (
        <div className={`notice${route === "stories" ? " notice--warning" : ""}`} role={route === "analyzer" ? "status" : "note"}>
          {notice}
        </div>
      )}
    </RouteIntro>
  );
}
