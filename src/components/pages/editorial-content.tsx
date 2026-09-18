"use client";

import Link from "next/link";

import { RouteIntro } from "@/components/layout/route-intro";
import { useI18n } from "@/i18n";

type EditorialRoute = "howItWorks" | "privacy" | "terms" | "faq";

export function EditorialContent({ route }: Readonly<{ route: EditorialRoute }>) {
  const { dictionary } = useI18n();
  const page = dictionary.pages[route];

  if (route === "faq") {
    const faq = dictionary.marketing.faq;
    return (
      <RouteIntro description={page.description} eyebrow={page.eyebrow} title={page.title}>
        <section aria-labelledby="faq-list-title" className="editorial-section">
          <h2 id="faq-list-title">{faq.listTitle}</h2>
          <div className="faq-list">
            {faq.items.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
          </div>
        </section>
        <section className="final-cta" aria-labelledby="faq-cta-title"><div><h2 id="faq-cta-title">{faq.ctaTitle}</h2><p>{faq.ctaBody}</p></div><Link className="button button--primary" href="/app">{faq.ctaAction}</Link></section>
      </RouteIntro>
    );
  }

  const content = route === "howItWorks"
    ? dictionary.marketing.howItWorks
    : route === "privacy"
      ? dictionary.marketing.privacy
      : dictionary.marketing.terms;

  return (
    <RouteIntro description={page.description} eyebrow={page.eyebrow} title={page.title}>
      <div className={`editorial-layout${route === "howItWorks" ? " editorial-layout--sequence" : ""}`}>
        {route === "privacy" || route === "terms" ? (
          <nav aria-label={dictionary.common.onThisPage} className="editorial-toc">
            <strong>{dictionary.common.onThisPage}</strong>
            <ol>{content.sections.map((section) => <li key={section.id}><a href={`#${route}-${section.id}`}>{section.title}</a></li>)}</ol>
          </nav>
        ) : null}
        <div className="editorial-stack">
          {content.sections.map((section, index) => (
            <section aria-labelledby={`${route}-${section.id}`} className="editorial-section" data-section-index={index + 1} key={section.id}>
              <h2 id={`${route}-${section.id}`}>{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.points.length === 0 ? null : <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}
            </section>
          ))}
          {route === "howItWorks" ? <Link className="button button--primary editorial-cta" href="/app">{dictionary.marketing.howItWorks.cta}</Link> : null}
        </div>
      </div>
    </RouteIntro>
  );
}
