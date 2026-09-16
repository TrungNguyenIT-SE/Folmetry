"use client";

import Link from "next/link";

import { useI18n } from "@/i18n";

export function SiteFooter() {
  const { dictionary } = useI18n();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <p>{dictionary.footer.localBoundary}</p>
          <p>{dictionary.footer.storyBoundary}</p>
        </div>
        <nav aria-label={dictionary.a11y.legalNavigation}>
          <Link href="/privacy">{dictionary.nav.privacy}</Link>
          <Link href="/terms">{dictionary.nav.terms}</Link>
        </nav>
      </div>
    </footer>
  );
}
