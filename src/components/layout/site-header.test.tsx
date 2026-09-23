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
    expect(screen.getByRole("link", { name: "Instagram" }).getAttribute("href")).toBe("/instagram");
    expect(screen.getByRole("link", { name: "Facebook" }).getAttribute("href")).toBe("/facebook");
  });

  it("manages mobile menu focus, Escape, and scroll locking", async () => {
    render(<AppPreferencesProvider><SiteHeader /></AppPreferencesProvider>);
    const trigger = screen.getByRole("button", { name: "Open navigation menu" });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("link", { name: "Instagram" })));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
  });

  it("closes the mobile menu after choosing a navigation destination", async () => {
    render(<AppPreferencesProvider><SiteHeader /></AppPreferencesProvider>);
    const trigger = screen.getByRole("button", { name: "Open navigation menu" });

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("link", { name: "Facebook" }));

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
  });
});
