import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const chunksDirectory = path.resolve(".next/static/chunks");
const limits = {
  cssTotal: 120_000,
  javascriptTotal: 1_500_000,
  largestJavascriptChunk: 300_000,
};

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(target) : [target];
  }))).flat();
}

const assets = await Promise.all((await filesIn(chunksDirectory)).map(async (file) => ({
  file,
  bytes: (await stat(file)).size,
})));
const css = assets.filter(({ file }) => file.endsWith(".css"));
const javascript = assets.filter(({ file }) => file.endsWith(".js"));
const report = {
  cssTotal: css.reduce((total, asset) => total + asset.bytes, 0),
  javascriptTotal: javascript.reduce((total, asset) => total + asset.bytes, 0),
  largestJavascriptChunk: Math.max(0, ...javascript.map(({ bytes }) => bytes)),
};

const failures = Object.entries(limits).filter(([metric, limit]) => report[metric] > limit);
console.log(`UI budget: CSS ${report.cssTotal}/${limits.cssTotal} B; JS ${report.javascriptTotal}/${limits.javascriptTotal} B; largest JS chunk ${report.largestJavascriptChunk}/${limits.largestJavascriptChunk} B.`);
if (failures.length > 0) {
  for (const [metric, limit] of failures) console.error(`${metric} exceeds ${limit} bytes (actual: ${report[metric]}).`);
  process.exitCode = 1;
}
