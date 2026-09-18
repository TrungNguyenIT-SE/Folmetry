import type { ReactNode } from "react";

interface RouteIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export function RouteIntro({ eyebrow, title, description, children }: RouteIntroProps) {
  return (
    <main className="page-shell" id="main-content">
      <header className="route-intro" aria-labelledby="page-title">
        <span className="route-intro__index" aria-hidden="true">F—01</span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 id="page-title">{title}</h1>
          <p className="lede">{description}</p>
        </div>
      </header>
      {children}
    </main>
  );
}
