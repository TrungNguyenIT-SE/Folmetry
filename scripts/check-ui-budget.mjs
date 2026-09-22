import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { gzip } from "node:zlib";

const chunksDirectory = path.resolve(".next/static/chunks");
const limits = {
  cssTotal: 110_000,
  javascriptTotal: 1_500_000,
  largestJavascriptChunk: 300_000,
};
const baseline = {
  cssTotal: 66_299,
  javascriptTotal: 1_122_971,
  largestJavascriptChunk: 228_919,
};
const gzipAsync = promisify(gzip);

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
const gzipBytes = async (files) => (await Promise.all(files.map(async ({ file }) => (
  await gzipAsync(await readFile(file), { level: 9 })
).byteLength))).reduce((total, bytes) => total + bytes, 0);
const report = {
  cssTotal: css.reduce((total, asset) => total + asset.bytes, 0),
  javascriptTotal: javascript.reduce((total, asset) => total + asset.bytes, 0),
  largestJavascriptChunk: Math.max(0, ...javascript.map(({ bytes }) => bytes)),
  cssGzip: await gzipBytes(css),
  javascriptGzip: await gzipBytes(javascript),
};

const failures = Object.entries(limits).filter(([metric, limit]) => report[metric] > limit);
const signedDelta = (value, reference) => `${value - reference >= 0 ? "+" : ""}${value - reference}`;
console.log(`UI budget: CSS ${report.cssTotal}/${limits.cssTotal} B (${report.cssGzip} B gzip, ${signedDelta(report.cssTotal, baseline.cssTotal)} B vs M8UX); JS ${report.javascriptTotal}/${limits.javascriptTotal} B (${report.javascriptGzip} B gzip, ${signedDelta(report.javascriptTotal, baseline.javascriptTotal)} B vs M8UX); largest JS chunk ${report.largestJavascriptChunk}/${limits.largestJavascriptChunk} B (${signedDelta(report.largestJavascriptChunk, baseline.largestJavascriptChunk)} B vs M8UX).`);
if (failures.length > 0) {
  for (const [metric, limit] of failures) console.error(`${metric} exceeds ${limit} bytes (actual: ${report[metric]}).`);
  process.exitCode = 1;
}
