// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

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

  it("manages mobile menu focus, Escape, and scroll locking", async () => {
    render(<AppPreferencesProvider><SiteHeader /></AppPreferencesProvider>);
    const trigger = screen.getByRole("button", { name: "Open navigation menu" });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("link", { name: "Analyzer" })));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
  });
});
