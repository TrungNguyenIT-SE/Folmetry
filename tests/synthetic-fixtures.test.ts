// @vitest-environment node

import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { fixturePath } from "./helpers/fixture-path";
import { readJsonFixture } from "./helpers/read-json-fixture";

describe("synthetic fixture manifest", () => {
  it("keeps the corrupt ZIP representation deterministic and intentionally truncated", async () => {
    const encoded = (
      await readFile(fixturePath("instagram", "corrupted-zip.base64"), "utf8")
    ).trim();
    const bytes = Buffer.from(encoded, "base64");
    expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(bytes.byteLength).toBeLessThan(30);
  });

  it("documents exact below/equal/above resource boundaries", async () => {
    const fixture = await readJsonFixture(
      "instagram",
      "manifests",
      "resource-boundaries.json",
    );
    expect(fixture).toMatchObject({
      archiveBytes: { below: 104_857_599, equal: 104_857_600, above: 104_857_601 },
      compressionRatio: { below: 199, equal: 200, above: 201 },
    });
  });

  it("contains an explicit declaration that all fixtures are synthetic", async () => {
    const readme = await readFile(fixturePath("instagram", "README.md"), "utf8");
    expect(readme).toContain("tạo nhân tạo");
    expect(readme).toContain("Không file nào đến từ tài khoản hoặc export thật");
  });
});
