"use client";

import Link from "next/link";

import { useI18n } from "@/i18n";

export function HomeContent() {
  const { dictionary } = useI18n();
  const copy = dictionary.home;
  return (
    <main className="page-shell" id="main-content">
      <section className="hero" aria-labelledby="home-title">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 id="home-title">{copy.title}</h1>
        <p className="lede">{copy.description}</p>
        <div className="actions">
          <Link className="button button--primary" href="/app">{copy.openAnalyzer}</Link>
          <Link className="button button--secondary" href="/how-it-works">{copy.howItWorks}</Link>
        </div>
      </section>
      <section className="principle-grid" aria-label={copy.principlesLabel}>
        <article className="card"><h2>{copy.noLoginTitle}</h2><p>{copy.noLoginBody}</p></article>
        <article className="card"><h2>{copy.localTitle}</h2><p>{copy.localBody}</p></article>
        <article className="card"><h2>{copy.boundariesTitle}</h2><p>{copy.boundariesBody}</p></article>
      </section>
      <aside className="story-cta" aria-labelledby="story-cta-title">
        <div>
          <p className="eyebrow">{dictionary.nav.stories}</p>
          <h2 id="story-cta-title">{copy.storyCtaTitle}</h2>
          <p>{copy.storyCtaBody}</p>
        </div>
        <Link className="button button--secondary" href="/story-downloader">{copy.storyCtaAction}</Link>
      </aside>
    </main>
  );
}
