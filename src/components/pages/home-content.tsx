"use client";

import Link from "next/link";

import { PageTransition } from "@/components/layout/page-transition";
import { SignalField } from "@/components/layout/signal-field";
import { useI18n } from "@/i18n";

export function HomeContent() {
  const { dictionary } = useI18n();
  const copy = dictionary.home;
  const marketing = dictionary.marketing.home;
  return (
    <PageTransition>
    <main className="page-shell atlas-home" id="main-content">
      <section className="hero hero--signature" aria-labelledby="home-title">
        <div className="hero__copy">
          <div className="hero__coordinates" aria-hidden="true"><span>FOLMETRY / 01</span><i /><span>PRIVATE SIGNAL ATLAS</span></div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 id="home-title">{copy.title}</h1>
          <p className="lede">{copy.description}</p>
          <div className="actions">
            <Link className="button button--primary" href="/app" transitionTypes={["nav-forward"]}>{copy.openAnalyzer}</Link>
            <Link className="button button--secondary" href="/how-it-works" transitionTypes={["nav-forward"]}>{copy.howItWorks}</Link>
          </div>
          <dl className="hero-boundaries">
            <div><dt>{copy.localRealmLabel}</dt><dd><strong>{copy.localTitle}</strong><span>{copy.localBody}</span></dd></div>
            <div><dt>{copy.networkRealmLabel}</dt><dd><strong>{copy.boundariesTitle}</strong><span>{copy.boundariesBody}</span></dd></div>
          </dl>
        </div>
        <SignalField />
      </section>
      <section className="principle-grid" aria-label={copy.principlesLabel}>
        <article className="card" data-index="01"><h2>{copy.noLoginTitle}</h2><p>{copy.noLoginBody}</p></article>
        <article className="card" data-index="02"><h2>{copy.localTitle}</h2><p>{copy.localBody}</p></article>
        <article className="card" data-index="03"><h2>{copy.boundariesTitle}</h2><p>{copy.boundariesBody}</p></article>
      </section>
      <section className="marketing-section" aria-labelledby="learn-title">
        <p className="eyebrow">{marketing.learnEyebrow}</p>
        <h2 id="learn-title">{marketing.learnTitle}</h2>
        <p className="section-lede">{marketing.learnBody}</p>
        <div className="feature-grid">{marketing.learnItems.map((item, index) => <article className="card" data-index={`0${index + 1}`} key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
      </section>
      <section className="marketing-section" aria-labelledby="steps-title">
        <p className="eyebrow">{marketing.stepsEyebrow}</p>
        <h2 id="steps-title">{marketing.stepsTitle}</h2>
        <ol aria-label={marketing.pipelineLabel} className="data-pipeline">
          {[marketing.pipelineZip, marketing.pipelineWorker, marketing.pipelineStore, marketing.pipelineInsight].map((label, index) => (
            <li data-stage={index + 1} key={label}><span aria-hidden="true">0{index + 1}</span><strong>{label}</strong><i aria-hidden="true" /></li>
          ))}
        </ol>
        <ol className="step-grid">{marketing.steps.map((step, index) => <li key={step.title}><span aria-hidden="true">{index + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}</ol>
      </section>
      <section className="marketing-split" aria-labelledby="privacy-architecture-title">
        <div><p className="eyebrow">{marketing.privacyEyebrow}</p><h2 id="privacy-architecture-title">{marketing.privacyTitle}</h2><p>{marketing.privacyBody}</p></div>
        <ul>{marketing.privacyPoints.map((point) => <li key={point}>{point}</li>)}</ul>
      </section>
      <section className="marketing-section limitations" aria-labelledby="limitations-title">
        <p className="eyebrow">{marketing.limitationsEyebrow}</p><h2 id="limitations-title">{marketing.limitationsTitle}</h2><p className="section-lede">{marketing.limitationsBody}</p>
        <ul>{marketing.limitationsPoints.map((point) => <li key={point}>{point}</li>)}</ul>
      </section>
      <section className="faq-preview" aria-labelledby="faq-preview-title"><div><p className="eyebrow">{marketing.faqEyebrow}</p><h2 id="faq-preview-title">{marketing.faqTitle}</h2><p>{marketing.faqBody}</p></div><Link className="button button--secondary" href="/faq">{marketing.faqAction}</Link></section>
      <aside className="story-cta" aria-labelledby="story-cta-title">
        <div>
          <p className="eyebrow">{dictionary.nav.stories}</p>
          <h2 id="story-cta-title">{copy.storyCtaTitle}</h2>
          <p>{copy.storyCtaBody}</p>
        </div>
        <Link className="button button--secondary" href="/story-downloader">{copy.storyCtaAction}</Link>
      </aside>
      <section className="final-cta" aria-labelledby="final-cta-title"><div><h2 id="final-cta-title">{marketing.finalTitle}</h2><p>{marketing.finalBody}</p></div><Link className="button button--primary" href="/app" transitionTypes={["nav-forward"]}>{marketing.finalAction}</Link></section>
    </main>
    </PageTransition>
  );
}
