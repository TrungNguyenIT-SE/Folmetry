"use client";

import { useI18n } from "@/i18n";

export function AdminHeading() {
  const { dictionary } = useI18n();
  const copy = dictionary.auth.admin;
  return <header className="auth-shell__heading"><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.description}</p></header>;
}
