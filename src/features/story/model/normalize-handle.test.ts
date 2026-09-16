import { describe, expect, it } from "vitest";

import { StoryError } from "./errors";
import { normalizePublicInstagramHandle } from "./normalize-handle";

describe("normalizePublicInstagramHandle", () => {
  it.each([
    ["Example.User", "example.user"],
    [" @Example_User ", "example_user"],
    ["https://instagram.com/Example.User", "example.user"],
    ["https://www.instagram.com/example_user/", "example_user"],
  ])("normalizes %s", (input, expected) => expect(normalizePublicInstagramHandle(input)).toBe(expected));

  it.each([
    "", "a".repeat(31), "one two", "one,two", "user..name", "../name", "name.json",
    "http://instagram.com/name", "https://example.com/name", "https://user:pass@instagram.com/name",
    "https://instagram.com:444/name", "https://instagram.com/name?x=1", "https://instagram.com/name#x",
    "https://instagram.com/stories/name", "https://instagram.com/p/abc", "https://127.0.0.1/name",
  ])("rejects unsafe input %s", (input) => {
    expect(() => normalizePublicInstagramHandle(input)).toThrowError(StoryError);
  });
});
