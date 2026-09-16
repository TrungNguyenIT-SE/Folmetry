import Link from "next/link";

const navigation = [
  { href: "/app", label: "Analyzer" },
  { href: "/story-downloader", label: "Stories" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/" aria-label="Private Social Insights home">
          <span className="brand__mark" aria-hidden="true">P</span>
          <span>Private Social Insights</span>
        </Link>
        <nav aria-label="Primary navigation">
          <ul className="nav-list">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
