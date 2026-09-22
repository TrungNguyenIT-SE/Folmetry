// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppPreferencesProvider } from "@/i18n";

import { StoryDownloaderApp } from "./story-downloader-app";

afterEach(() => vi.unstubAllGlobals());

describe("StoryDownloaderApp", () => {
  it("shows disclosure before submit and renders mocked Story/Highlight results", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ ok: true, data: {
      handle: "public.name", fetchedAt: new Date().toISOString(),
      stories: [{ id: "s1", mediaType: "image", previewRef: "opaque-preview", downloadRef: "opaque-download" }],
      highlights: [{ id: "highlight:1", title: "Summer", itemCount: 1 }],
    } })).mockResolvedValueOnce(Response.json({ ok: true, data: [{ id: "h1", mediaType: "video", previewRef: "opaque-h-preview", downloadRef: "opaque-h-download" }] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AppPreferencesProvider><StoryDownloaderApp /></AppPreferencesProvider>);
    expect(screen.getByText(/Before you continue/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Public Instagram handle"), { target: { value: "@Public.Name" } });
    fireEvent.submit(screen.getByRole("button", { name: "View public Stories" }).closest("form")!);
    expect(await screen.findByText("@public.name")).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/story/lookup");
    const preview = screen.getByRole("button", { name: "Open media viewer" });
    preview.focus();
    fireEvent.click(preview);
    expect(screen.getByRole("dialog", { name: "Public Story media" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Public Story media" })).toBeNull());
    expect(document.activeElement).toBe(preview);
    fireEvent.click(preview);
    fireEvent.popState(window);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Public Story media" })).toBeNull());
    fireEvent.click(screen.getByRole("tab", { name: "Highlights" }));
    fireEvent.click(screen.getByRole("button", { name: /Summer/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/story/highlight-items");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("relationship");
  });

  it("shows the safe disabled state without reflecting the handle", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: false, error: { code: "STORY_PROVIDER_NOT_CONFIGURED" } }, { status: 503 })));
    render(<AppPreferencesProvider><StoryDownloaderApp /></AppPreferencesProvider>);
    fireEvent.change(screen.getByLabelText("Public Instagram handle"), { target: { value: "private-marker" } });
    fireEvent.click(screen.getByRole("button", { name: "View public Stories" }));
    expect(await screen.findByText(/not enabled/)).toBeTruthy();
    expect(screen.queryByText("private-marker")).toBeNull();
  });
});
