// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppPreferencesProvider } from "@/i18n";

import { FacebookHub, InstagramHub } from "./platform-hub";

function renderHub(hub: React.ReactNode) {
  return render(<AppPreferencesProvider>{hub}</AppPreferencesProvider>);
}

describe("platform hubs", () => {
  it("keeps Facebook and Instagram on the same hero and two-card layout", () => {
    const facebook = renderHub(<FacebookHub />);
    expect(facebook.container.querySelector(".signal-field")).toBeTruthy();
    expect(facebook.container.querySelectorAll(".platform-card")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Open analyzer" }).getAttribute("href"))
      .toBe("/facebook/analyzer");
    expect(screen.getByRole("link", { name: "View export steps" }).getAttribute("href"))
      .toBe("/facebook/analyzer#facebook-export-guide");
    facebook.unmount();

    const instagram = renderHub(<InstagramHub />);
    expect(instagram.container.querySelector(".signal-field")).toBeTruthy();
    expect(instagram.container.querySelectorAll(".platform-card")).toHaveLength(2);
  });
});
