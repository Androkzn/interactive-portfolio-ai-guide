#!/usr/bin/env node
// Copies the source project's performance-report runs into the portfolio, so the
// lab page can chart the optimization journey without reaching into another repo
// at build time.
//
//   node scripts/site-race/sync-journey.mjs [--repo "~/Desktop/site-race-source"]
//
// Reads <repo>/content/reports/performance/history.json and every run's
// metrics.json (written by that repo's `npm run perf:report`), keeps the fields
// the page needs, and writes lib/site-race/journey-data.json. Stages are matched
// to runs in lib/site-race/journey.ts by deployment URL, so a new run of an
// existing stage replaces the old one on the next sync. Read-only on the source repo.
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const repo = path.resolve((arg("repo", process.env.SITE_RACE_SOURCE_REPO ?? "~/Desktop/site-race-source")).replace(/^~(?=$|\/)/, os.homedir()));
const reports = path.join(repo, "content/reports/performance");
const out = new URL("../../lib/site-race/journey-data.json", import.meta.url);

if (!existsSync(path.join(reports, "history.json"))) {
  console.error(`No perf history at ${reports}. Pass --repo <path to the source project>.`);
  process.exit(1);
}

const PAGE_LABELS = {
  "/": "Home",
  "/pumps/": "Pump catalogue",
  "/boom-pumps/hr40-5rz/": "Model · HR40-5RZ",
  "/boom-pumps/hr21-4zr/": "Model · HR21-4ZR",
  "/about/": "About",
  "/contact/": "Contact",
  "/es/": "Home (Spanish)",
};

const history = JSON.parse(await readFile(path.join(reports, "history.json"), "utf8"));
const runIds = [...new Set(history.map((row) => row.run))];

const num = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const runs = [];
for (const id of runIds) {
  const file = path.join(reports, id, "metrics.json");
  if (!existsSync(file)) { console.warn(`skip ${id}: no metrics.json`); continue; }
  const metrics = JSON.parse(await readFile(file, "utf8"));
  const pages = {};
  for (const result of metrics.results ?? []) {
    const formats = {};
    for (const [format, count] of Object.entries(result.images?.formats ?? {})) formats[format.replace("svg+xml", "svg")] = count;
    (pages[result.path] ??= {})[result.profile] = {
      lcp: num(result.vitals?.lcp),
      fcp: num(result.loading?.fcp),
      tbt: num(result.vitals?.tbt),
      cls: num(result.vitals?.cls),
      inp: num(result.vitals?.inp),
      pageKb: num(result.network?.pageKb) ?? 0,
      jsKb: num(result.javascript?.transferKb) ?? 0,
      imgKb: num(result.images?.kb) ?? 0,
      htmlKb: num(result.document?.htmlKb) ?? 0,
      requests: num(result.network?.requests) ?? 0,
      imageFormats: formats,
      lcpElement: result.loading?.lcpElement ?? null,
      lcpResource: result.loading?.lcpResource ?? null,
    };
  }
  runs.push({ run: metrics.id ?? id, date: metrics.date ?? id, base: String(metrics.base).replace(/\/$/, ""), build: metrics.build ?? "", chrome: metrics.chrome ?? null, pages });
}

const data = {
  syncedAt: new Date().toISOString(),
  source: "Project performance reports (real Chrome, cold cache, one load per page and profile)",
  pageLabels: PAGE_LABELS,
  runs,
};
await writeFile(out, `${JSON.stringify(data, null, 1)}\n`);
console.log(`wrote ${path.relative(process.cwd(), out.pathname)}: ${runs.length} runs (${runs.map((r) => `${r.run} ${r.base.replace("https://", "").split(".")[0]}`).join(", ")})`);
