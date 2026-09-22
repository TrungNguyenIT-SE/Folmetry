import type { MetadataRoute } from "next";

import { getSiteUrl, PUBLIC_ROUTES } from "@/lib/site-metadata";

const priorities: Readonly<Record<(typeof PUBLIC_ROUTES)[number], number>> = {
  "/": 1,
  "/instagram": 0.9,
  "/facebook": 0.6,
  "/how-it-works": 0.8,
  "/privacy": 0.5,
  "/terms": 0.4,
  "/faq": 0.7,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return PUBLIC_ROUTES.map((path) => ({ url: new URL(path, siteUrl).toString(), changeFrequency: path === "/" ? "weekly" : "monthly", priority: priorities[path] }));
}
