import { describe, expect, it } from "vitest";

import {
  analyzeCurrentRelationships,
  computeHistoricalDiff,
} from "@/features/analyzer/diff/analysis";
import { sortRelationships } from "@/features/analyzer/diff/sort";
import type { RelationshipRecord } from "@/features/analyzer/model/types";

const record = (normalizedHandle: string, connectedAt?: number): RelationshipRecord => ({
  handle: normalizedHandle,
  normalizedHandle,
  ...(connectedAt === undefined ? {} : { connectedAt }),
});

const handles = (records: readonly RelationshipRecord[]) =>
  records.map((item) => item.normalizedHandle);

describe("current relationship analysis", () => {
  it("computes mutuals and both directed differences", () => {
    const result = analyzeCurrentRelationships(
      [record("alpha"), record("bravo"), record("charlie")],
      [record("alpha"), record("delta")],
    );
    expect(handles(result.mutuals)).toEqual(["alpha"]);
    expect(handles(result.notFollowingBack)).toEqual(["delta"]);
    expect(handles(result.notFollowedByMe)).toEqual(["bravo", "charlie"]);
  });

  it.each([
    [[], []],
    [[record("alpha")], []],
    [[], [record("alpha")]],
    [[record("alpha")], [record("alpha")]],
    [[record("alpha")], [record("bravo")]],
  ] satisfies readonly (readonly [readonly RelationshipRecord[], readonly RelationshipRecord[]])[])(
    "preserves set invariants for boundary sets",
    (followers, following) => {
      const result = analyzeCurrentRelationships(followers, following);
      const followerSet = new Set(handles(followers));
      const followingSet = new Set(handles(following));
      expect(handles(result.mutuals).every((item) => followerSet.has(item))).toBe(true);
      expect(handles(result.mutuals).every((item) => followingSet.has(item))).toBe(true);
      expect(handles(result.notFollowingBack).some((item) => followerSet.has(item))).toBe(false);
    },
  );

  it("ignores duplicate input and source permutations", () => {
    const first = analyzeCurrentRelationships(
      [record("bravo"), record("alpha"), record("alpha")],
      [record("charlie"), record("alpha")],
    );
    const second = analyzeCurrentRelationships(
      [record("alpha"), record("bravo")],
      [record("alpha"), record("charlie"), record("charlie")],
    );
    expect(second).toEqual(first);
  });
});

describe("historical diff", () => {
  it("computes A to B changes and cross-checks net follower delta", () => {
    const result = computeHistoricalDiff(
      {
        followers: [record("alpha"), record("bravo"), record("charlie")],
        following: [record("alpha"), record("delta")],
      },
      {
        followers: [record("charlie"), record("echo"), record("alpha")],
        following: [record("foxtrot"), record("alpha")],
      },
    );
    expect(result).toBeDefined();
    expect(handles(result?.lostFollowers ?? [])).toEqual(["bravo"]);
    expect(handles(result?.newFollowers ?? [])).toEqual(["echo"]);
    expect(handles(result?.stoppedFollowing ?? [])).toEqual(["delta"]);
    expect(handles(result?.startedFollowing ?? [])).toEqual(["foxtrot"]);
    expect(result?.netFollowerChange).toBe(0);
    expect(result?.followerCountDelta).toBe(0);
    expect(result?.warnings).toEqual([]);
  });

  it("does not create a result without a baseline", () => {
    expect(computeHistoricalDiff(undefined, { followers: [], following: [] })).toBeUndefined();
  });

  it.each([
    [{ followers: [], following: [] }, { followers: [], following: [] }],
    [
      { followers: [record("alpha")], following: [record("bravo")] },
      { followers: [record("charlie")], following: [record("delta")] },
    ],
    [
      { followers: [record("alpha")], following: [record("bravo")] },
      { followers: [record("alpha")], following: [record("bravo")] },
    ],
  ])("keeps lost/new disjoint from opposite snapshots", (previous, current) => {
    const result = computeHistoricalDiff(previous, current);
    expect(result).toBeDefined();
    const currentFollowers = new Set(handles(current.followers));
    const previousFollowers = new Set(handles(previous.followers));
    expect(handles(result?.lostFollowers ?? []).some((item) => currentFollowers.has(item))).toBe(false);
    expect(handles(result?.newFollowers ?? []).some((item) => previousFollowers.has(item))).toBe(false);
  });
});

describe("relationship sorting", () => {
  const values = [record("bravo", 2), record("alpha", 1), record("charlie")];

  it("sorts A-Z and Z-A deterministically", () => {
    expect(handles(sortRelationships(values, "handle-asc"))).toEqual(["alpha", "bravo", "charlie"]);
    expect(handles(sortRelationships(values, "handle-desc"))).toEqual(["charlie", "bravo", "alpha"]);
  });

  it("sorts dates with missing values last", () => {
    expect(handles(sortRelationships(values, "connected-oldest"))).toEqual(["alpha", "bravo", "charlie"]);
    expect(handles(sortRelationships(values, "connected-newest"))).toEqual(["bravo", "alpha", "charlie"]);
  });
});
