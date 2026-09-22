import type { ReactNode } from "react";

import { PageTransition } from "@/components/layout/page-transition";

interface RouteIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export function RouteIntro({ eyebrow, title, description, children }: RouteIntroProps) {
  return (
    <PageTransition>
      <main className="page-shell route-page" id="main-content">
        <header className="route-intro" aria-labelledby="page-title">
          <span className="route-intro__index" aria-hidden="true"><i />F-01</span>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 id="page-title">{title}</h1>
            <p className="lede">{description}</p>
          </div>
          <div className="route-intro__axis" aria-hidden="true"><span>00</span><i /><span>∞</span></div>
        </header>
        {children}
      </main>
    </PageTransition>
  );
}
