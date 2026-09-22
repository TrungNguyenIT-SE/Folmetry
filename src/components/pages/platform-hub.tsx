"use client";

import Link from "next/link";

import { useI18n } from "@/i18n";

export function InstagramHub() {
  const { dictionary } = useI18n();
  const copy = dictionary.platforms.instagram;
  return (
    <main className="page-shell platform-hub" id="main-content">
      <header className="platform-hub__heading">
        <span className="eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </header>
      <div className="platform-hub__grid">
        <article className="platform-card platform-card--primary">
          <span className="platform-card__index" aria-hidden="true">01</span>
          <h2>{copy.analyzerTitle}</h2>
          <p>{copy.analyzerBody}</p>
          <Link className="button button--primary" href="/app">{copy.analyzerAction}</Link>
        </article>
        <article className="platform-card">
          <span className="platform-card__index" aria-hidden="true">02</span>
          <h2>{copy.storiesTitle}</h2>
          <p>{copy.storiesBody}</p>
          <Link className="button button--secondary" href="/story-downloader">{copy.storiesAction}</Link>
        </article>
      </div>
    </main>
  );
}

export function FacebookHub() {
  const { dictionary } = useI18n();
  const copy = dictionary.platforms.facebook;
  return (
    <main className="page-shell platform-hub" id="main-content">
      <header className="platform-hub__heading">
        <span className="eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </header>
      <article className="platform-card platform-card--pending">
        <span className="badge">{copy.status}</span>
        <p>{copy.body}</p>
        <Link className="button button--secondary" href="/how-it-works">{copy.action}</Link>
      </article>
    </main>
  );
}
