// Folds saved race runs (scripts/site-race run-races style JSON: one file per race with
// lanes {a,b}, results {a,b}) into lib/site-race/results-data.json: the medians the
// result block shows. Usage:
//   node scripts/site-race/build-results.mjs <dir-of-race-jsons> [before-preset=astro] [after-preset=next] [after-label]
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [dir, beforeId = "astro", afterId = "next", afterLabel = "Next.js 16"] = process.argv.slice(2);
if (!dir) { console.error("usage: build-results.mjs <dir> [before] [after] [afterLabel]"); process.exit(1); }

const median = (xs) => {
  const v = xs.filter((x) => typeof x === "number").sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const get = {
  lcp: (m) => m.timing.lcp ?? (m.capped ? m.capMs ?? 30000 : null),
  load: (m) => m.timing.load ?? (m.capped ? m.capMs ?? 30000 : null),
  tbt: (m) => m.timing.tbt,
  totalKb: (m) => m.network.totalKb,
  imageKb: (m) => m.network.byType.image.kb,
};

const cells = {};
let races = 0;
for (const file of (await readdir(dir)).filter((f) => f.endsWith(".json")).sort()) {
  const run = JSON.parse(await readFile(path.join(dir, file), "utf8"));
  if (run.error || !run.results) continue;
  const lane = (id) => Object.entries(run.lanes).find(([, v]) => v === id)?.[0];
  const [a, b] = [lane(beforeId), lane(afterId)];
  if (!a || !b || !run.results[a] || !run.results[b]) continue;
  const cell = (cells[`${run.page}/${run.profile}`] ??= { before: {}, after: {}, beforeCapped: [], n: 0 });
  cell.n += 1; races += 1;
  for (const [name, fn] of Object.entries(get)) {
    (cell.before[name] ??= []).push(fn(run.results[a]));
    (cell.after[name] ??= []).push(fn(run.results[b]));
  }
  cell.beforeCapped.push(!!run.results[a].capped);
}

const out = { measuredOn: new Date().toISOString().slice(0, 10), after: afterLabel, cells: {} };
for (const [key, c] of Object.entries(cells)) {
  out.cells[key] = {
    races: c.n,
    // A lane that was still loading at the cap in most races is reported as "> cap".
    beforeCapped: c.beforeCapped.filter(Boolean).length > c.n / 2,
    before: Object.fromEntries(Object.entries(c.before).map(([k, v]) => [k, median(v)])),
    after: Object.fromEntries(Object.entries(c.after).map(([k, v]) => [k, median(v)])),
  };
}
const target = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../lib/site-race/results-data.json");
await writeFile(target, JSON.stringify(out, null, 2) + "\n");
console.log(`${races} races → ${Object.keys(out.cells).length} cells → ${path.relative(process.cwd(), target)}`);
