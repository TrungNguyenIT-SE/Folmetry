"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Route rendering failed", error);
  }, [error]);

  return (
    <main className="page-shell" id="main-content">
      <section className="route-intro" role="alert">
        <p className="eyebrow">Something went wrong</p>
        <h1>This page could not be displayed.</h1>
        <p className="lede">Your local relationship data has not been sent anywhere.</p>
        <div className="actions">
          <button className="button button--primary" type="button" onClick={reset}>Try again</button>
        </div>
      </section>
    </main>
  );
}
