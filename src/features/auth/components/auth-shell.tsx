"use client";

import type { ReactNode } from "react";

import { PageTransition } from "@/components/layout/page-transition";
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
    <PageTransition>
    <main className="auth-shell" data-auth-page={page} id="main-content">
      <div className="auth-shell__instrument" aria-hidden="true"><span>SECURE</span><i /><span>ACCESS</span></div>
      <header className="auth-shell__heading">
        <span className="eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </header>
      <section className="card auth-card">{children}</section>
    </main>
    </PageTransition>
  );
}
