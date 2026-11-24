// Folds saved race runs (scripts/site-race/run-races.mjs: one JSON per race with lanes {a,b} and
// results {a,b}) into lib/site-race/results-data.json, the medians the result blocks show.
//   node scripts/site-race/build-results.mjs <dir-of-race-jsons> [before=astro] [after=next] [afterLabel]
// Per page and device: the first page (cold load), and for journey races the repeat visit and each
// tap of the visit. A value that hit its cap counts as the cap, and the cell is flagged censored when
// most races hit it, so the page can say "> cap" instead of pretending it is a measurement. The
// first-page cap the races ran under is saved as top-level capMs, so the copy never hard-codes it.
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
/** [value, censored] pairs → { value: median, censored: majority } */
const fold = (pairs) => {
  const ok = pairs.filter((p) => p && typeof p[0] === "number");
  if (!ok.length) return null;
  return { value: median(ok.map((p) => p[0])), censored: ok.filter((p) => p[1]).length > ok.length / 2 };
};
const first = {
  lcp: (m) => [m.timing.lcp ?? (m.capped ? m.capMs ?? 30000 : null), m.timing.lcp === null && m.capped],
  load: (m) => [m.timing.load ?? (m.capped ? m.capMs ?? 30000 : null), m.timing.load === null && m.capped],
  tbt: (m) => [m.timing.tbt, m.capped && m.timing.tti === null],
  totalKb: (m) => [m.network.totalKb, m.capped && m.timing.load === null],
  // A lane cut off by the cap before its load event has only part of the page: take the whole page
  // from the warm-up load (protocol 2). Every other lane observed its full load, so what arrived is the
  // page (the warm-up counts to the load event and misses scripts that start after the hero).
  fullPageKb: (m) => (m.capped && m.timing.load === null
    ? (m.fullPage?.kb != null ? [m.fullPage.kb, false] : [m.network.totalKb, true])
    : [m.network.totalKb, false]),
  imageKb: (m) => [m.network.byType.image.kb, m.capped && m.timing.load === null],
  jsKb: (m) => [m.network.byType.script.kb, m.capped && m.timing.load === null],
};
const step = (s, key) => (!s ? null : s.skipped || s[key] === null ? [s.capMs, true] : [s[key], false]);

const cells = {};
let races = 0;
/** The first-page cap of every folded race (lane metrics, else a saved start event), for the page copy. */
const caps = new Set();
for (const file of (await readdir(dir)).filter((f) => f.endsWith(".json")).sort()) {
  const run = JSON.parse(await readFile(path.join(dir, file), "utf8"));
  if (run.error || !run.results) continue;
  const laneOf = (id) => Object.entries(run.lanes).find(([, v]) => v === id)?.[0];
  const sides = { before: run.results[laneOf(beforeId)], after: run.results[laneOf(afterId)] };
  if (!sides.before || !sides.after) continue;
  races += 1;
  for (const m of Object.values(sides)) {
    const cap = m.capMs ?? run.capMs ?? run.start?.capMs;
    if (typeof cap === "number") caps.add(cap);
  }
  const cell = (cells[`${run.page}/${run.profile}`] ??= { n: 0, before: {}, after: {} });
  cell.n += 1;
  for (const [side, m] of Object.entries(sides)) {
    const acc = cell[side];
    for (const [name, fn] of Object.entries(first)) (acc[name] ??= []).push(fn(m));
    if (m.repeat && !m.repeat.skipped) {
      // The cap only when the reload never finished; a finished reload without an LCP entry is left out.
      (acc.repeatLcp ??= []).push(m.repeat.capped && m.repeat.load === null ? [m.repeat.capMs, true] : m.repeat.lcp === null ? null : [m.repeat.lcp, false]);
      (acc.repeatKb ??= []).push([m.repeat.net.kb, false]);
      (acc.repeatRequests ??= []).push([m.repeat.net.network, false]);
    }
    for (const s of m.navigationSteps ?? []) {
      const key = s.to.replace(/^\/|\/$/g, "").split("/").pop() || "home";
      (acc[`tap:${key}:content`] ??= []).push(step(s, "content"));
      (acc[`tap:${key}:image`] ??= []).push(step(s, "image"));
      (acc[`tap:${key}:kb`] ??= []).push(s.skipped ? null : [s.net.kb, !!s.capped]);
    }
  }
}

// The page says "> cap" and "stopped at the cap" with this number. Races under different caps should
// not be mixed; if they are, the longest cap is the honest bound for a censored median.
const capMs = caps.size ? Math.max(...caps) : null;
if (caps.size > 1) console.warn(`warning: races ran under different caps (${[...caps].sort((a, b) => a - b).join(", ")} ms); recording capMs ${capMs}`);
if (capMs === null) console.warn("warning: no lane recorded its cap; capMs left out (the page falls back to 30000)");
const out = { measuredOn: new Date().toISOString().slice(0, 10), after: afterLabel, ...(capMs === null ? {} : { capMs }), cells: {} };
for (const [key, c] of Object.entries(cells)) {
  const side = (acc) => Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, fold(v)]));
  const before = side(c.before), after = side(c.after);
  out.cells[key] = {
    races: c.n,
    beforeCapped: !!before.load?.censored,
    // Plain medians for the existing readers (lcp, load, tbt, totalKb, imageKb)…
    before: Object.fromEntries(Object.entries(before).map(([k, v]) => [k, v?.value ?? null])),
    after: Object.fromEntries(Object.entries(after).map(([k, v]) => [k, v?.value ?? null])),
    // …and which of them are lower bounds ("> cap").
    censored: {
      before: Object.fromEntries(Object.entries(before).filter(([, v]) => v?.censored).map(([k]) => [k, true])),
      after: Object.fromEntries(Object.entries(after).filter(([, v]) => v?.censored).map(([k]) => [k, true])),
    },
  };
}
const target = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../lib/site-race/results-data.json");
await writeFile(target, JSON.stringify(out, null, 2) + "\n");
console.log(`${races} races → ${Object.keys(out.cells).length} cells → ${path.relative(process.cwd(), target)}`);
