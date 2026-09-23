import { describe, expect, it } from "vitest";

import { safeReturnTo } from "@/features/auth/return-to";

describe("safeReturnTo", () => {
  it("allows only known same-origin destinations", () => {
    expect(safeReturnTo("/story-downloader")).toBe("/story-downloader");
    expect(safeReturnTo("/facebook/analyzer")).toBe("/facebook/analyzer");
    expect(safeReturnTo("https://example.com")).toBe("/app");
    expect(safeReturnTo("//example.com")).toBe("/app");
    expect(safeReturnTo("/admin/users")).toBe("/app");
  });
});
