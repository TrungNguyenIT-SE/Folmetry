"use client";

import Link from "next/link";

import { PageTransition } from "@/components/layout/page-transition";
import { SignalField } from "@/components/layout/signal-field";
import { useI18n } from "@/i18n";

export function InstagramHub() {
  const { dictionary } = useI18n();
  const copy = dictionary.platforms.instagram;
  return (
    <PageTransition>
    <main className="page-shell platform-hub" data-platform="instagram" id="main-content">
      <div className="platform-hub__hero">
        <header className="platform-hub__heading">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </header>
        <SignalField compact />
      </div>
      <div className="platform-hub__grid">
        <article className="platform-card platform-card--primary">
          <span className="platform-card__index" aria-hidden="true">01</span>
          <span className="platform-card__trace" aria-hidden="true" />
          <h2>{copy.analyzerTitle}</h2>
          <p>{copy.analyzerBody}</p>
          <Link className="button button--primary" href="/app" transitionTypes={["nav-forward"]}>{copy.analyzerAction}</Link>
        </article>
        <article className="platform-card">
          <span className="platform-card__index" aria-hidden="true">02</span>
          <span className="platform-card__trace" aria-hidden="true" />
          <h2>{copy.storiesTitle}</h2>
          <p>{copy.storiesBody}</p>
          <Link className="button button--secondary" href="/story-downloader" transitionTypes={["nav-forward"]}>{copy.storiesAction}</Link>
        </article>
      </div>
    </main>
    </PageTransition>
  );
}

export function FacebookHub() {
  const { dictionary } = useI18n();
  const copy = dictionary.platforms.facebook;
  return (
    <PageTransition>
    <main className="page-shell platform-hub" data-platform="facebook" id="main-content">
      <div className="platform-hub__hero platform-hub__hero--blueprint">
        <header className="platform-hub__heading">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </header>
        <div className="blueprint-instrument" aria-hidden="true"><span>FB / ADAPTER</span><i /><i /><i /><strong>VALIDATION</strong></div>
      </div>
      <article className="platform-card platform-card--pending">
        <span className="badge">{copy.status}</span>
        <span className="platform-card__trace" aria-hidden="true" />
        <p>{copy.body}</p>
        <Link className="button button--secondary" href="/how-it-works" transitionTypes={["nav-forward"]}>{copy.action}</Link>
      </article>
    </main>
    </PageTransition>
  );
}
