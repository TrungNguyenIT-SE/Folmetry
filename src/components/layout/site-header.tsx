"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import folmetryLogo from "../../../folmetry.png";
import { AccountNavigation } from "@/components/layout/account-navigation";
import { PreferenceControls } from "@/components/layout/preference-controls";
import { useI18n } from "@/i18n";

const navigation = [
  { href: "/instagram", key: "instagram" },
  { href: "/facebook", key: "facebook" },
  { href: "/how-it-works", key: "howItWorks" },
  { href: "/faq", key: "faq" },
] as const;

function isCurrentPlatform(pathname: string, href: string): boolean {
  if (href === "/instagram") {
    return pathname === "/instagram" || pathname === "/app" || pathname === "/story-downloader";
  }
  if (href === "/facebook") {
    return pathname === "/facebook" || pathname.startsWith("/facebook/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { dictionary } = useI18n();
  const [menuOpenedAtPath, setMenuOpenedAtPath] = useState<string | null>(null);
  const menuOpen = menuOpenedAtPath === pathname;
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const realm = pathname === "/facebook" || pathname.startsWith("/facebook/") ? "facebook" : pathname === "/instagram" || pathname === "/app" || pathname === "/story-downloader" ? "instagram" : "global";

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
        setMenuOpenedAtPath(null);
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
    <header className="site-header" data-menu-open={menuOpen ? "true" : "false"} data-realm={realm}>
      <div className="site-header__inner">
        <a className="skip-link" href="#main-content">{dictionary.a11y.skipToContent}</a>
        <Link className="brand" href="/" aria-label={dictionary.nav.homeLabel} onClick={() => setMenuOpenedAtPath(null)} transitionTypes={["nav-back"]}>
          <Image alt="" className="brand__logo" height={44} priority src={folmetryLogo} width={44} />
          <span className="brand__name">Folmetry</span>
          <span className="brand__signal" aria-hidden="true" />
        </Link>
        <button
          aria-controls="site-navigation-panel"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? dictionary.a11y.closeMenu : dictionary.a11y.openMenu}
          className="site-menu-button"
          onClick={() => setMenuOpenedAtPath((openedAtPath) => openedAtPath === pathname ? null : pathname)}
          ref={menuButtonRef}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
        <button aria-label={dictionary.a11y.closeMenu} className="site-menu-backdrop" onClick={() => setMenuOpenedAtPath(null)} tabIndex={-1} type="button" />
        <div
          className="site-header__panel"
          id="site-navigation-panel"
          onClickCapture={(event) => {
            if (event.target instanceof Element && event.target.closest("a[href]")) {
              setMenuOpenedAtPath(null);
            }
          }}
          ref={panelRef}
        >
          <nav aria-label={dictionary.a11y.primaryNavigation}>
            <ul className="nav-list">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                  aria-current={isCurrentPlatform(pathname, item.href) ? "page" : undefined}
                  href={item.href as Route}
                  onClick={() => setMenuOpenedAtPath(null)}
                  transitionTypes={[item.href === "/instagram" || item.href === "/facebook" ? "nav-context" : "nav-forward"]}
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
