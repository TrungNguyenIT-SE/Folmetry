// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "@/components/layout/site-header";
import { AppPreferencesProvider } from "@/i18n";

describe("SiteHeader", () => {
  it("exposes the foundation routes through semantic navigation", () => {
    render(<AppPreferencesProvider><SiteHeader /></AppPreferencesProvider>);

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Analyzer" }).getAttribute("href")).toBe("/app");
    expect(screen.getByRole("link", { name: "Stories" }).getAttribute("href")).toBe(
      "/story-downloader",
    );
  });
});
