"use client";

import { useI18n } from "@/i18n";
import { SignalField } from "@/components/layout/signal-field";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  const { dictionary } = useI18n();

  return (
    <main className="page-shell" id="main-content">
      <section className="utility-state" role="alert">
        <div>
          <p className="eyebrow">{dictionary.common.errorEyebrow}</p>
          <h1>{dictionary.common.errorTitle}</h1>
          <p className="lede">{dictionary.common.errorBody}</p>
          <div className="actions">
            <button className="button button--primary" type="button" onClick={reset}>{dictionary.common.retry}</button>
          </div>
        </div>
        <SignalField compact />
      </section>
    </main>
  );
}
