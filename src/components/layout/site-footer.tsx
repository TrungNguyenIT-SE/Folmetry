"use client";

import Link from "next/link";

import { useI18n } from "@/i18n";

export function SiteFooter() {
  const { dictionary } = useI18n();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__summary">
          <div className="site-footer__brand-line">
            <strong className="site-footer__brand">Folmetry</strong>
            <span className="site-footer__status" aria-hidden="true">SYNC / PRIVATE</span>
          </div>
          <p>{dictionary.footer.localBoundary}</p>
          <p>{dictionary.footer.storyBoundary}</p>
          <p className="site-footer__disclaimer">{dictionary.marketing.footerDisclaimer}</p>
        </div>
        <nav aria-label={dictionary.a11y.legalNavigation}>
          <Link href="/how-it-works" transitionTypes={["nav-context"]}>{dictionary.nav.howItWorks}</Link>
          <Link href="/faq" transitionTypes={["nav-context"]}>{dictionary.nav.faq}</Link>
          <Link href="/privacy" transitionTypes={["nav-context"]}>{dictionary.nav.privacy}</Link>
          <Link href="/terms" transitionTypes={["nav-context"]}>{dictionary.nav.terms}</Link>
        </nav>
      </div>
    </footer>
  );
}
