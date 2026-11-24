#!/usr/bin/env node
// Lists the races the site-race Worker saved, newest first, each with the link that
// opens its full report in the lab. The lab page itself never lists earlier races.
//
//   node scripts/site-race/list-reports.mjs [--limit 20] [--site http://localhost:3000]

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const api = arg("api", "https://site-race-api.a-tekhtelev.workers.dev");
const site = arg("site", "http://localhost:3000");
const limit = arg("limit", "20");

const res = await fetch(`${api}/reports?limit=${limit}`);
if (!res.ok) throw new Error(`listing failed: ${res.status} ${await res.text()}`);
const { reports } = await res.json();
if (!reports.length) console.log("No saved races yet.");

const lcp = (lane) => (lane.lcp !== null ? `${(lane.lcp / 1000).toFixed(2)} s` : lane.capped ? "> 30 s" : "n/a");
const build = (url) => { const host = new URL(url).hostname; return host.split(".")[0].replace(/^hr-?concrete-?pumps(-next)?$/, (_, next) => (next ? "next (production)" : "original")); };
for (const row of reports) {
  const saved = new Date(row.savedAt).toLocaleString("en-CA", { dateStyle: "short", timeStyle: "short" });
  console.log([
    saved.padEnd(22),
    row.page.padEnd(10),
    row.profile.padEnd(8),
    `vs ${build(row.lanes.b.url)}`.padEnd(22),
    `LCP ${lcp(row.lanes.a)} → ${lcp(row.lanes.b)}`.padEnd(26),
    `${site}/lab/site-race/?report=${row.id}#race`,
  ].join(" "));
}
