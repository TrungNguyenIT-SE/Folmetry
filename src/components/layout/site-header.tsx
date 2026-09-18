"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = (): HTMLElement[] => Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select:not([disabled])') ?? [],
    );
    const focusFrame = window.requestAnimationFrame(() => focusable()[0]?.focus());
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = focusable();
      const first = controls[0];
      const last = controls.at(-1);
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="site-header" data-menu-open={menuOpen ? "true" : "false"}>
      <div className="site-header__inner">
        <a className="skip-link" href="#main-content">{dictionary.a11y.skipToContent}</a>
        <Link className="brand" href="/" aria-label={dictionary.nav.homeLabel} onClick={() => setMenuOpen(false)}>
          <Image alt="" className="brand__logo" height={44} priority src={folmetryLogo} width={44} />
          <span className="brand__name">Folmetry</span>
          <span className="brand__signal" aria-hidden="true" />
        </Link>
        <button
          aria-controls="site-navigation-panel"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? dictionary.a11y.closeMenu : dictionary.a11y.openMenu}
          className="site-menu-button"
          onClick={() => setMenuOpen((open) => !open)}
          ref={menuButtonRef}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
        <button aria-label={dictionary.a11y.closeMenu} className="site-menu-backdrop" onClick={() => setMenuOpen(false)} tabIndex={-1} type="button" />
        <div className="site-header__panel" id="site-navigation-panel" ref={panelRef}>
          <nav aria-label={dictionary.a11y.primaryNavigation}>
            <ul className="nav-list">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                  aria-current={pathname === item.href ? "page" : undefined}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
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
      </div>
    </header>
  );
}
