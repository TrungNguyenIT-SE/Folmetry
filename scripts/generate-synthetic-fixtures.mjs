import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const fixtureRoot = new URL("../tests/fixtures/instagram/", import.meta.url);
const corruptedZip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00, 0x00, 0x00, 0x00]);
const corruptedZipBase64 = `${corruptedZip.toString("base64")}\n`;
const resourceBoundaries = {
  description: "Synthetic numeric metadata only; no archive payload",
  archiveBytes: { below: 104_857_599, equal: 104_857_600, above: 104_857_601 },
  relevantEntryBytes: { below: 157_286_399, equal: 157_286_400, above: 157_286_401 },
  totalRelevantBytes: { below: 262_143_999, equal: 262_144_000, above: 262_144_001 },
  compressionRatio: { below: 199, equal: 200, above: 201 },
  entryCount: { below: 9_999, equal: 10_000, above: 10_001 },
};

await writeFile(
  fileURLToPath(new URL("corrupted-zip.base64", fixtureRoot)),
  corruptedZipBase64,
  "utf8",
);
await writeFile(
  fileURLToPath(new URL("manifests/resource-boundaries.json", fixtureRoot)),
  `${JSON.stringify(resourceBoundaries, null, 2)}\n`,
  "utf8",
);

console.log("Regenerated deterministic synthetic archive fixtures.");
