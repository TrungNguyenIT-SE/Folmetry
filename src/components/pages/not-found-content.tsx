"use client";

import Link from "next/link";

import { SignalField } from "@/components/layout/signal-field";
import { useI18n } from "@/i18n";

export function NotFoundContent() {
  const { dictionary } = useI18n();
  return (
    <main className="page-shell" id="main-content">
      <section className="utility-state">
        <div>
          <p className="eyebrow">{dictionary.common.notFoundEyebrow}</p>
          <h1>{dictionary.common.notFoundTitle}</h1>
          <p className="lede">{dictionary.common.notFoundBody}</p>
          <div className="actions">
            <Link className="button button--primary" href="/">{dictionary.common.returnHome}</Link>
          </div>
        </div>
        <SignalField compact />
      </section>
    </main>
  );
}
