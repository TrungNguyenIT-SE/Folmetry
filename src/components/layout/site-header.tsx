"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import folmetryLogo from "../../../folmetry.png";
import { AccountNavigation } from "@/components/layout/account-navigation";
import { PreferenceControls } from "@/components/layout/preference-controls";
import { useI18n } from "@/i18n";

const navigation = [
  { href: "/app", key: "analyzer" },
  { href: "/story-downloader", key: "stories" },
  { href: "/how-it-works", key: "howItWorks" },
  { href: "/faq", key: "faq" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const { dictionary } = useI18n();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="skip-link" href="#main-content">{dictionary.a11y.skipToContent}</a>
        <Link className="brand" href="/" aria-label={dictionary.nav.homeLabel}>
          <Image alt="" className="brand__logo" height={44} priority src={folmetryLogo} width={44} />
          <span>Folmetry</span>
        </Link>
        <nav aria-label={dictionary.a11y.primaryNavigation}>
          <ul className="nav-list">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  aria-current={pathname === item.href ? "page" : undefined}
                  href={item.href}
                >
                  {dictionary.nav[item.key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="site-header__actions">
          <AccountNavigation />
          <PreferenceControls />
        </div>
      </div>
    </header>
  );
}
