"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/i18n";

export function AuthShell({
  page,
  children,
}: Readonly<{
  page: "login" | "register" | "forgot" | "reset";
  children: ReactNode;
}>) {
  const { dictionary } = useI18n();
  const copy = dictionary.auth[page];
  return (
    <div className="auth-shell">
      <header className="auth-shell__heading">
        <span className="eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </header>
      <section className="card auth-card">{children}</section>
    </div>
  );
}
