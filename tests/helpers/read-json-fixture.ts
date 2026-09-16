import { readFile } from "node:fs/promises";

import { fixturePath } from "./fixture-path";

export async function readJsonFixture(...segments: readonly string[]): Promise<unknown> {
  const content = await readFile(fixturePath(...segments), "utf8");
  return JSON.parse(content) as unknown;
}
