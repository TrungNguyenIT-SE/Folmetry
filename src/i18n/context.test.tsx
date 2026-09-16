// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppPreferencesProvider, useI18n } from "@/i18n";

function Probe() {
  const { dictionary, formatDate, formatNumber, locale, resolvedTheme } = useI18n();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="theme">{resolvedTheme}</span>
      <span data-testid="title">{dictionary.pages.faq.title}</span>
      <span data-testid="analyzer-loading">{dictionary.analyzer.ux.loading}</span>
      <span data-testid="number">{formatNumber(12345.6)}</span>
      <span data-testid="date">{formatDate(new Date("2026-09-16T10:00:00Z"))}</span>
    </div>
  );
}

function ControlsProbe() {
  const { setLocale, setTheme } = useI18n();
  return <><button type="button" onClick={() => setLocale("vi")}>vi</button><button type="button" onClick={() => setTheme("dark")}>dark</button><Probe /></>;
}

describe("AppPreferencesProvider", () => {
  it("defaults to English, switches to accented Vietnamese, updates lang, and uses Intl", () => {
    render(<AppPreferencesProvider><ControlsProbe /></AppPreferencesProvider>);
    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("number").textContent).toBe("12,345.6");
    fireEvent.click(screen.getByRole("button", { name: "vi" }));
    expect(screen.getByTestId("title").textContent).toContain("Sản phẩm làm được gì");
    expect(screen.getByTestId("number").textContent).toBe("12.345,6");
    expect(document.documentElement.lang).toBe("vi");
    expect(screen.getByTestId("date").textContent).not.toBe("");
  });

  it("applies an explicit dark theme without a remote service", () => {
    render(<AppPreferencesProvider><ControlsProbe /></AppPreferencesProvider>);
    fireEvent.click(screen.getByRole("button", { name: "dark" }));
    expect(document.documentElement.dataset["theme"]).toBe("dark");
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("keeps the extended Vietnamese analyzer copy valid UTF-8", () => {
    render(<AppPreferencesProvider><ControlsProbe /></AppPreferencesProvider>);
    fireEvent.click(screen.getByRole("button", { name: "vi" }));
    expect(screen.getByTestId("analyzer-loading").textContent).toBe("\u0110ang t\u1ea3i c\u00f4ng c\u1ee5 ph\u00e2n t\u00edch c\u1ee5c b\u1ed9...");
    expect(document.body.textContent).not.toContain("\uFFFD");
  });
});
