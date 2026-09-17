import "server-only";

import type { Metadata } from "next";

export const SITE_NAME = "Folmetry";
export const SITE_DESCRIPTION = "Analyze Instagram relationship exports privately in your browser, with a clearly separated utility for public Stories and Highlights.";

export const PUBLIC_ROUTES = ["/", "/how-it-works", "/privacy", "/terms", "/faq"] as const;
export const SITE_ROUTES = [...PUBLIC_ROUTES, "/app", "/story-downloader"] as const;

export function getSiteUrl(environment: Readonly<Record<string, string | undefined>> = process.env): URL {
  const configured = environment["SITE_URL"] ?? environment["VERCEL_PROJECT_PRODUCTION_URL"];
  const candidate = configured ? (/^https?:\/\//i.test(configured) ? configured : `https://${configured}`) : "http://localhost:3000";
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return new URL("http://localhost:3000");
  }
}

export function createPageMetadata(input: Readonly<{ title: string; description: string; path: (typeof SITE_ROUTES)[number]; index?: boolean }>): Metadata {
  return {
    title: { absolute: `${input.title} — ${SITE_NAME}` },
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: { type: "website", siteName: SITE_NAME, title: input.title, description: input.description, url: input.path, images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME} — ${input.title}` }] },
    twitter: { card: "summary_large_image", title: input.title, description: input.description, images: ["/opengraph-image"] },
    robots: { index: input.index ?? true, follow: input.index ?? true },
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
