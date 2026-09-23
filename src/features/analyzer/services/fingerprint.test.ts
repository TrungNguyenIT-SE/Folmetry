import { describe, expect, it } from "vitest";

import { computeSnapshotFingerprint } from "@/features/analyzer/services/fingerprint";
import type { RelationshipRecord } from "@/features/analyzer/model/types";

const record = (normalizedHandle: string): RelationshipRecord => ({
  handle: normalizedHandle,
  normalizedHandle,
});

describe("snapshot fingerprint", () => {
  it("is stable across order, display metadata, timestamp, and duplicate differences", async () => {
    const first = await computeSnapshotFingerprint({
      platform: "instagram",
      followers: [record("bravo"), record("alpha"), record("alpha")],
      following: [record("delta"), record("charlie")],
    });
    const second = await computeSnapshotFingerprint({
      platform: "instagram",
      followers: [
        { handle: "ALPHA", normalizedHandle: "alpha", connectedAt: 1_700_000_000_000 },
        record("bravo"),
      ],
      following: [record("charlie"), record("delta")],
    });
    expect(second).toBe(first);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when either named relationship set changes", async () => {
    const base = await computeSnapshotFingerprint({
      platform: "instagram",
      followers: [record("alpha")],
      following: [record("bravo")],
    });
    const changedFollower = await computeSnapshotFingerprint({
      platform: "instagram",
      followers: [record("charlie")],
      following: [record("bravo")],
    });
    const changedFollowing = await computeSnapshotFingerprint({
      platform: "instagram",
      followers: [record("alpha")],
      following: [record("charlie")],
    });
    expect(changedFollower).not.toBe(base);
    expect(changedFollowing).not.toBe(base);
  });

  it("keeps followers and following in separate namespaces", async () => {
    const first = await computeSnapshotFingerprint({
      platform: "instagram",
      followers: [record("alpha")],
      following: [record("bravo")],
    });
    const swapped = await computeSnapshotFingerprint({
      platform: "instagram",
      followers: [record("bravo")],
      following: [record("alpha")],
    });
    expect(swapped).not.toBe(first);
  });

  it("includes Facebook friends as a third independent namespace", async () => {
    const first = await computeSnapshotFingerprint({
      platform: "facebook",
      friends: [record("friend-a")],
      followers: [record("follower-a")],
      following: [record("following-a")],
    });
    const changedFriend = await computeSnapshotFingerprint({
      platform: "facebook",
      friends: [record("friend-b")],
      followers: [record("follower-a")],
      following: [record("following-a")],
    });
    expect(changedFriend).not.toBe(first);
  });

  it("preserves duplicate Facebook friend rows in the fingerprint", async () => {
    const oneFriend = await computeSnapshotFingerprint({
      platform: "facebook",
      friends: [record("same-name")],
      followers: [],
      following: [],
    });
    const twoFriends = await computeSnapshotFingerprint({
      platform: "facebook",
      friends: [record("same-name"), record("same-name")],
      followers: [],
      following: [],
    });

    expect(twoFriends).not.toBe(oneFriend);
  });
});
