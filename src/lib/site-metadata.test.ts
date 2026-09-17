import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { createPageMetadata, getSiteUrl, PUBLIC_ROUTES, serializeJsonLd } from "@/lib/site-metadata";

describe("public metadata", () => {
  it("normalizes an explicit public origin and safely falls back", () => {
    expect(getSiteUrl({ SITE_URL: "https://example.test/subpath?x=1#part" }).toString()).toBe("https://example.test/");
    expect(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "folmetry.example" }).toString()).toBe("https://folmetry.example/");
    expect(getSiteUrl({ SITE_URL: "javascript:alert(1)" }).toString()).toBe("http://localhost:3000/");
  });

  it("creates route-specific canonical, social, and indexing metadata", () => {
    const metadata = createPageMetadata({ title: "Privacy", description: "Privacy details", path: "/privacy" });
    expect(metadata.alternates).toEqual({ canonical: "/privacy" });
    expect(metadata.openGraph).toMatchObject({ title: "Privacy", description: "Privacy details", url: "/privacy" });
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("publishes only the intended public routes", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(PUBLIC_ROUTES.length);
    expect(entries.map((entry) => new URL(entry.url).pathname)).toEqual(PUBLIC_ROUTES);
    expect(entries.some((entry) => entry.url.includes("/api/"))).toBe(false);
    expect(robots()).toMatchObject({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: expect.arrayContaining(["/api/", "/app", "/story-downloader", "/account", "/admin/"]),
      },
    });
  });

  it("ships a local icon in the web manifest", () => {
    expect(manifest()).toMatchObject({ start_url: "/", display: "standalone", icons: [{ type: "image/png", sizes: "1254x1254" }] });
  });

  it("escapes markup-significant characters in JSON-LD", () => {
    expect(serializeJsonLd({ value: "</script><script>" })).toBe('{"value":"\\u003c/script>\\u003cscript>"}');
  });
});
