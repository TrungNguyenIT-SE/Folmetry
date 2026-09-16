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
      <section className="route-intro" aria-labelledby="page-title">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="page-title">{title}</h1>
        <p className="lede">{description}</p>
        {children}
      </section>
    </main>
  );
}
