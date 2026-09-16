import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AppPreferencesProvider } from "@/i18n";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Private Social Insights",
    template: "%s · Private Social Insights",
  },
  description: "Privacy-first Instagram relationship analysis with a separate public Stories utility.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-theme="system" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <AppPreferencesProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
