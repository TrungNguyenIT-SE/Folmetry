import type { Metadata } from "next";
import type { ReactNode } from "react";

import folmetryLogo from "../../folmetry.png";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AssistantWidget } from "@/features/assistant/components";
import { AppPreferencesProvider } from "@/i18n";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME, serializeJsonLd } from "@/lib/site-metadata";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: folmetryLogo.src, type: "image/png", sizes: "1254x1254" }],
    apple: [{ url: folmetryLogo.src, type: "image/png", sizes: "1254x1254" }],
  },
  openGraph: { type: "website", siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION, url: "/", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_NAME }] },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION, images: ["/opengraph-image"] },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const websiteJsonLd = { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: getSiteUrl().toString(), description: SITE_DESCRIPTION, inLanguage: ["en", "vi"] };
  return (
    <html lang="en" data-theme="system" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        {/* eslint-disable-next-line react/no-danger -- JSON-LD is serialized with markup characters escaped. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }} />
        <AppPreferencesProvider>
          <SiteHeader />
          {children}
          <AssistantWidget />
          <SiteFooter />
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
