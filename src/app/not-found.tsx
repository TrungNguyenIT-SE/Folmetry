import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell" id="main-content">
      <section className="route-intro">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="lede">The address may be incorrect or the page may have moved.</p>
        <div className="actions">
          <Link className="button button--primary" href="/">Return home</Link>
        </div>
      </section>
    </main>
  );
}
