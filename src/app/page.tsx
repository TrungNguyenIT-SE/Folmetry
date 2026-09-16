import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell" id="main-content">
      <section className="hero" aria-labelledby="home-title">
        <p className="eyebrow">Private by architecture</p>
        <h1 id="home-title">Understand relationship changes without handing over your password.</h1>
        <p className="lede">
          Analyze an official Instagram JSON export locally in your browser. Public Story lookup is a
          separate, clearly disclosed network feature.
        </p>
        <div className="actions">
          <Link className="button button--primary" href="/app">Open analyzer</Link>
          <Link className="button button--secondary" href="/how-it-works">How it works</Link>
        </div>
      </section>
      <section className="principle-grid" aria-label="Product principles">
        <article className="card">
          <h2>No account login</h2>
          <p>We never ask for an Instagram password, cookie, access token, or two-factor code.</p>
        </article>
        <article className="card">
          <h2>Local relationship analysis</h2>
          <p>Your relationship ZIP and normalized follower data are processed on this device.</p>
        </article>
        <article className="card">
          <h2>Honest boundaries</h2>
          <p>Networked Story requests are isolated from your local relationship history.</p>
        </article>
      </section>
    </main>
  );
}
