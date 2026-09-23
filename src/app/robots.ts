import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/app", "/facebook/analyzer", "/story-downloader", "/account", "/admin/", "/login", "/register", "/forgot-password", "/reset-password"] }, sitemap: new URL("/sitemap.xml", siteUrl).toString(), host: siteUrl.origin };
}
