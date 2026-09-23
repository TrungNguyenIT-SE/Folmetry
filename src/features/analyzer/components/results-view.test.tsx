// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LocalSnapshot } from "@/features/analyzer/model";
import { AppPreferencesProvider } from "@/i18n";

import { ResultsView } from "./results-view";

const snapshot = (
  id: string,
  handle: string,
  snapshotAt: number,
): LocalSnapshot => ({
  id,
  accountId: "synthetic-account",
  platform: "instagram",
  snapshotAt,
  importedAt: snapshotAt,
  fingerprint: `fingerprint-${id}`,
  parserVersion: "test",
  followers: [{ handle, normalizedHandle: handle, connectedAt: 1_700_000_000_000 }],
  following: [],
  warnings: [],
  followerCount: 1,
  followingCount: 0,
});

describe("ResultsView", () => {
  it("presents a unique matching connection date as an uncertain username change", () => {
    const baseline = snapshot("older", "old_name", 1_700_000_000_000);
    const current = snapshot("newer", "new_name", 1_710_000_000_000);

    render(
      <AppPreferencesProvider>
        <ResultsView
          baseline={baseline}
          current={current}
          onDeleteSnapshot={vi.fn(async () => undefined)}
          onSelectSnapshot={vi.fn()}
          saved
          snapshots={[current, baseline]}
        />
      </AppPreferencesProvider>,
    );

    const renameTab = screen.getByRole("tab", { name: "Possible username changes" });
    fireEvent.click(renameTab);

    expect(screen.getByText("@old_name")).toBeTruthy();
    expect(screen.getByText("@new_name")).toBeTruthy();
    expect(screen.getByText(/not proof that both handles belong to the same person/i)).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Lost followers" })).toBeTruthy();
  });

  it("uses Facebook connection semantics without fabricating Instagram profile links", () => {
    const baseline = { ...snapshot("older", "Nguyễn An", 1_700_000_000_000), platform: "facebook" as const };
    const current = { ...snapshot("newer", "Nguyễn Anh", 1_710_000_000_000), platform: "facebook" as const };

    render(
      <AppPreferencesProvider>
        <ResultsView
          baseline={baseline}
          current={current}
          onDeleteSnapshot={vi.fn(async () => undefined)}
          onSelectSnapshot={vi.fn()}
          platform="facebook"
          saved
          snapshots={[current, baseline]}
        />
      </AppPreferencesProvider>,
    );

    expect(screen.getByRole("tab", { name: "Friends in export" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Mutuals" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Open Instagram profile" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Possible follower name changes" }));
    expect(screen.getByText("Nguyễn An")).toBeTruthy();
    expect(screen.getByText("Nguyễn Anh")).toBeTruthy();
    expect(screen.getByText(/not identity proof/i)).toBeTruthy();
  });

  it("renders every Facebook friend row when exported names are identical", () => {
    const current: LocalSnapshot = {
      ...snapshot("facebook-current", "Follower", 1_710_000_000_000),
      platform: "facebook",
      friends: [
        { handle: "Same Name", normalizedHandle: "same name", connectedAt: 10 },
        { handle: "Same Name", normalizedHandle: "same name", connectedAt: 20 },
      ],
      friendCount: 2,
    };

    render(
      <AppPreferencesProvider>
        <ResultsView
          current={current}
          onDeleteSnapshot={vi.fn(async () => undefined)}
          onSelectSnapshot={vi.fn()}
          platform="facebook"
          saved
          snapshots={[current]}
        />
      </AppPreferencesProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Friends in export" }));
    expect(screen.getAllByText("Same Name")).toHaveLength(2);
  });
});
