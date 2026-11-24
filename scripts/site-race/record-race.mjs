#!/usr/bin/env node
// Records one live race from the site-race Worker into a replay file the race page
// can play back when the live browsers are unavailable (rate limit, outage, no JS budget).
//
//   node scripts/site-race/record-race.mjs [--profile mobile|desktop] [--out public/lab/site-race/recorded-mobile.ndjson]
//
// Each line is {"at": ms since race start, "event": RaceEvent}. Frame and milestone
// times come from the page's own timeline (timeOrigin + t), so playback keeps the
// real pacing of both lanes; every second frame is dropped to halve the file.
import { writeFile } from "node:fs/promises";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const api = arg("api", "https://site-race-api.a-tekhtelev.workers.dev");
const profile = arg("profile", "mobile");
const out = arg("out", `public/lab/site-race/recorded-${profile}.ndjson`);

const res = await fetch(`${api}/race?a=astro&b=next&profile=${profile}`, { headers: { origin: "http://localhost:3000" } });
if (!res.ok || !res.body) throw new Error(`race failed: ${res.status} ${await res.text()}`);
const text = await res.text();
const events = text.split("\n").filter((line) => line.startsWith("data: ")).map((line) => JSON.parse(line.slice(6)));
if (!events.some((e) => e.type === "result")) throw new Error("race produced no results; not overwriting the recording");

const origins = {};
const frameIndex = { a: 0, b: 0 };
let base = null;
let last = 0;
const lines = [];
for (const event of events) {
  if (event.type === "origin") origins[event.lane] = event.timeOrigin;
  let at = last;
  if ((event.type === "frame" || event.type === "mark") && origins[event.lane]) {
    const abs = origins[event.lane] + event.t;
    base ??= abs;
    at = Math.max(last, Math.round(abs - base));
  }
  if (event.type === "frame" && frameIndex[event.lane]++ % 2 === 1) continue;
  last = at;
  lines.push(JSON.stringify({ at, event }));
}
lines.unshift(JSON.stringify({ at: 0, event: { type: "recording", recordedAt: new Date().toISOString(), profile } }));
await writeFile(out, `${lines.join("\n")}\n`);
console.log(`wrote ${out}: ${lines.length} events, ${(Buffer.byteLength(lines.join("\n")) / 1024 / 1024).toFixed(2)} MB, ${last} ms`);
