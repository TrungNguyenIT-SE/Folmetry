import { describe, expect, it } from "vitest";

import type { AdapterInput } from "@/features/analyzer/adapters";
import {
  facebookAdapter,
  FACEBOOK_PARSER_VERSION,
} from "@/features/analyzer/adapters/facebook";
import { computeHistoricalDiff } from "@/features/analyzer/diff";
import { readJsonFixture } from "../../../../../tests/helpers/read-json-fixture";

async function fixtureInput(fixture: "fixture-a" | "fixture-b"): Promise<AdapterInput> {
  const friends = await readJsonFixture("facebook", fixture, "friends.json");
  const following = await readJsonFixture("facebook", fixture, "following.json");
  const prefix = "your_facebook_activity/connections/friends_and_followers";
  return {
    mode: "archive",
    manifest: { entries: [{ name: `${prefix}/friends.json` }, { name: `${prefix}/following.json` }] },
    files: [
      { path: `${prefix}/friends.json`, content: friends },
      { path: `${prefix}/following.json`, content: following },
    ],
  };
}

describe("facebookAdapter", () => {
  it("detects and parses current friends/following JSON without Instagram assumptions", async () => {
    const input = await fixtureInput("fixture-a");
    await expect(facebookAdapter.canHandle(input.manifest)).resolves.toMatchObject({
      matched: true,
      confidence: "strong",
      reasons: ["FRIENDS_JSON_PRESENT", "FOLLOWING_JSON_PRESENT"],
    });
    const result = await facebookAdapter.parse(input, {});
    expect(result.platform).toBe("facebook");
    expect(result.parserVersion).toBe(FACEBOOK_PARSER_VERSION);
    expect(result.friends?.map((record) => record.handle)).toEqual([
      "Alice Nguyễn",
      "Bình Trần",
      "Charlie Example",
    ]);
    expect(result.following).toHaveLength(2);
  });

  it("keeps Facebook name changes separate from lost/new connection counts", async () => {
    const previous = await facebookAdapter.parse(await fixtureInput("fixture-a"), {});
    const current = await facebookAdapter.parse(await fixtureInput("fixture-b"), {});
    const diff = computeHistoricalDiff(
      { followers: previous.friends ?? [], following: [] },
      { followers: current.friends ?? [], following: [] },
    );
    expect(diff?.possibleFollowerRenames.map((item) => [item.previous.handle, item.current.handle])).toEqual([
      ["Alice Nguyễn", "Alice N."],
    ]);
    expect(diff?.lostFollowers.map((record) => record.handle)).toEqual(["Bình Trần"]);
    expect(diff?.newFollowers.map((record) => record.handle)).toEqual(["Delta Synthetic"]);
  });

  it("accepts a friends-only export and treats following as an empty optional set", async () => {
    const input = await fixtureInput("fixture-a");
    const friendsOnly: AdapterInput = {
      mode: "archive",
      manifest: { entries: [input.manifest.entries[0]!] },
      files: [input.files[0]!],
    };
    const result = await facebookAdapter.parse(friendsOnly, {});
    expect(result.friends).toHaveLength(3);
    expect(result.followers).toEqual([]);
    expect(result.following).toEqual([]);
  });

  it("supports the current Facebook export paths and v3 follower wrappers", async () => {
    const base: AdapterInput = {
      mode: "archive",
      manifest: { entries: [
        { name: "connections/friends/your_friends.json" },
        { name: "connections/followers/people_who_followed_you.json" },
        { name: "connections/followers/who_you've_followed.json" },
      ] },
      files: [
        { path: "connections/friends/your_friends.json", content: { friends_v2: [
          { name: "Friend One", timestamp: 1_700_000_001 },
          { name: "Friend One", timestamp: 1_700_000_002 },
        ] } },
        { path: "connections/followers/people_who_followed_you.json", content: { followers_v3: [{ name: "Follower One" }] } },
        { path: "connections/followers/who_you've_followed.json", content: { following_v3: [{ name: "Following One", timestamp: 2 }] } },
      ],
    };
    const result = await facebookAdapter.parse(base, {});
    expect(result.friends?.map((record) => [record.handle, record.connectedAt])).toEqual([
      ["Friend One", 1_700_000_001_000],
      ["Friend One", 1_700_000_002_000],
    ]);
    expect(result.followers.map((record) => record.handle)).toEqual(["Follower One"]);
    expect(result.following.map((record) => record.handle)).toEqual(["Following One"]);
  });

  it("preserves all 424 friend rows when only 410 exported names are distinct", async () => {
    const friends = Array.from({ length: 424 }, (_, index) => ({
      name: `Synthetic Friend ${index % 410}`,
      timestamp: 1_700_000_000 + (index === 423 ? 422 : index),
    }));
    const input: AdapterInput = {
      mode: "archive",
      manifest: { entries: [{ name: "connections/friends/your_friends.json" }] },
      files: [{
        path: "connections/friends/your_friends.json",
        content: { friends_v2: friends },
      }],
    };

    const result = await facebookAdapter.parse(input, {});

    expect(result.friends).toHaveLength(424);
    expect(new Set(result.friends?.map((record) => record.normalizedHandle)).size).toBe(410);
  });

  it("rejects HTML-only and unrecognized Facebook shapes", async () => {
    await expect(facebookAdapter.parse({
      mode: "archive",
      manifest: { entries: [{ name: "friends_and_followers/friends.html" }] },
      files: [],
    }, {})).rejects.toMatchObject({ code: "UNSUPPORTED_HTML_EXPORT" });

    await expect(facebookAdapter.parse({
      mode: "archive",
      manifest: { entries: [{ name: "friends_and_followers/friends.json" }] },
      files: [{ path: "friends_and_followers/friends.json", content: { unknown: [] } }],
    }, {})).rejects.toMatchObject({ code: "UNSUPPORTED_FACEBOOK_SCHEMA" });
  });
});
