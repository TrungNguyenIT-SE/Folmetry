import path from "node:path";

const fixturesDirectory = path.resolve(import.meta.dirname, "../fixtures");

export function fixturePath(...segments: readonly string[]): string {
  return path.join(fixturesDirectory, ...segments);
}
