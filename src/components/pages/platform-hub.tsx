"use client";

import Link from "next/link";
import type { Route } from "next";

import { PageTransition } from "@/components/layout/page-transition";
import { SignalField } from "@/components/layout/signal-field";
import { useI18n } from "@/i18n";

interface PlatformHubProps {
  readonly platform: "instagram" | "facebook";
  readonly copy: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly primaryTitle: string;
    readonly primaryBody: string;
    readonly primaryAction: string;
    readonly secondaryTitle: string;
    readonly secondaryBody: string;
    readonly secondaryAction: string;
  };
  readonly primaryHref: Route;
  readonly secondaryHref: Route;
}

function PlatformHub({
  platform,
  copy,
  primaryHref,
  secondaryHref,
}: PlatformHubProps) {
  return (
    <PageTransition>
    <main className="page-shell platform-hub" data-platform={platform} id="main-content">
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
          <h2>{copy.primaryTitle}</h2>
          <p>{copy.primaryBody}</p>
          <Link className="button button--primary" href={primaryHref} transitionTypes={["nav-forward"]}>{copy.primaryAction}</Link>
        </article>
        <article className="platform-card">
          <span className="platform-card__index" aria-hidden="true">02</span>
          <span className="platform-card__trace" aria-hidden="true" />
          <h2>{copy.secondaryTitle}</h2>
          <p>{copy.secondaryBody}</p>
          <Link className="button button--secondary" href={secondaryHref} transitionTypes={["nav-forward"]}>{copy.secondaryAction}</Link>
        </article>
      </div>
    </main>
    </PageTransition>
  );
}

export function InstagramHub() {
  const { dictionary } = useI18n();
  const copy = dictionary.platforms.instagram;
  return (
    <PlatformHub
      copy={{
        eyebrow: copy.eyebrow,
        title: copy.title,
        description: copy.description,
        primaryTitle: copy.analyzerTitle,
        primaryBody: copy.analyzerBody,
        primaryAction: copy.analyzerAction,
        secondaryTitle: copy.storiesTitle,
        secondaryBody: copy.storiesBody,
        secondaryAction: copy.storiesAction,
      }}
      platform="instagram"
      primaryHref="/app"
      secondaryHref="/story-downloader"
    />
  );
}

export function FacebookHub() {
  const { dictionary } = useI18n();
  const copy = dictionary.platforms.facebook;
  return (
    <PlatformHub
      copy={{
        eyebrow: copy.eyebrow,
        title: copy.title,
        description: copy.description,
        primaryTitle: copy.analyzerTitle,
        primaryBody: copy.analyzerBody,
        primaryAction: copy.analyzerAction,
        secondaryTitle: copy.guideTitle,
        secondaryBody: copy.guideBody,
        secondaryAction: copy.guideAction,
      }}
      platform="facebook"
      primaryHref="/facebook/analyzer"
      secondaryHref="/facebook/analyzer#facebook-export-guide"
    />
  );
}
