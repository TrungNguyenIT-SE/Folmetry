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
});
