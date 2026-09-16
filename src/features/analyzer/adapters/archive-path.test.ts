import { describe, expect, it } from "vitest";

import { normalizeArchivePath } from "@/features/analyzer/adapters/archive-path";

describe("normalizeArchivePath", () => {
  it("normalizes Windows separators without resolving to a filesystem path", () => {
    expect(
      normalizeArchivePath("connections\\followers_and_following\\followers_1.json"),
    ).toEqual({
      safe: true,
      path: "connections/followers_and_following/followers_1.json",
    });
  });

  it.each([
    ["../followers.json", "TRAVERSAL_COMPONENT"],
    ["connections/../followers.json", "TRAVERSAL_COMPONENT"],
    ["/absolute/followers.json", "ABSOLUTE_PATH"],
    ["C:\\exports\\followers.json", "WINDOWS_DRIVE_PATH"],
    ["\\\\server\\share\\followers.json", "UNC_PATH"],
    ["bad\u0000name.json", "CONTROL_CHARACTER"],
    ["", "EMPTY"],
  ])("rejects unsafe path %j", (path, reason) => {
    expect(normalizeArchivePath(path)).toEqual({ safe: false, reason });
  });
});
