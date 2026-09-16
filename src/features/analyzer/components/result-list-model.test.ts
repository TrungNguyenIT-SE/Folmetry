import { describe, expect, it } from "vitest";

import { instagramProfileUrl, relationshipPage } from "./result-list-model";

const records = Array.from({ length: 120 }, (_, index) => ({
  handle: `User${String(index).padStart(3, "0")}`,
  normalizedHandle: `user${String(index).padStart(3, "0")}`,
  connectedAt: index,
}));

describe("relationship result list model", () => {
  it("searches normalized handles case-insensitively and paginates", () => {
    expect(relationshipPage(records, "USER01", "handle-asc", 1).filteredCount).toBe(10);
    const page = relationshipPage(records, "", "handle-asc", 3);
    expect(page.items).toHaveLength(20);
    expect(page.pageCount).toBe(3);
  });

  it("sorts by handle and connected date", () => {
    expect(relationshipPage(records, "", "handle-desc", 1).items[0]?.normalizedHandle).toBe(
      "user119",
    );
    expect(
      relationshipPage(records, "", "connected-oldest", 1).items[0]?.connectedAt,
    ).toBe(0);
  });

  it("builds a fixed-host encoded Instagram profile URL", () => {
    expect(instagramProfileUrl("safe.user")).toBe("https://www.instagram.com/safe.user/");
  });
});
