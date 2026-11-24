// Runs live races against the deployed Worker and saves each result as JSON, then:
//   node scripts/site-race/build-results.mjs <outDir>   (folds them into lib/site-race/results-data.json)
//   node scripts/site-race/run-races.mjs <outDir> home:mobile:4 catalogue:mobile:4 model:mobile:4 home:desktop:4 catalogue:desktop:4 model:desktop:4
// RACE_A / RACE_B pick the lanes (preset or own-host URL). Rate limit: 3 races a minute.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const API = "https://site-race-api.a-tekhtelev.workers.dev/race";
const [outDir, ...plan] = process.argv.slice(2);
await mkdir(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// RACE_A / RACE_B: a preset ("astro", "next") or a URL on one of the project's hosts,
// e.g. https://perf2-base.hr-concrete-pumps-next.pages.dev. Lanes are reported under these values.
const A = process.env.RACE_A ?? "astro";
const B = process.env.RACE_B ?? "next";
async function race(page, profile, swap) {
  const [a, b] = swap ? [B, A] : [A, B];
  const res = await fetch(`${API}?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}&page=${page}&profile=${profile}`, { headers: { origin: "https://andreitekhtelev.dev" } });
  if (!res.ok) return { error: `HTTP ${res.status}: ${await res.text()}` };
  const out = { page, profile, lanes: { a, b }, marks: { a: {}, b: {} }, phases: { a: [], b: [] }, results: {}, elapsedMs: null, errors: [] };
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const ev = JSON.parse(line.slice(6));
      if (ev.type === "mark") out.marks[ev.lane][ev.name] = ev.t;
      else if (ev.type === "phase") out.phases[ev.lane].push(ev.phase + (ev.detail ? ` (${ev.detail})` : ""));
      else if (ev.type === "result") out.results[ev.lane] = ev.metrics;
      else if (ev.type === "done") out.elapsedMs = ev.elapsedMs;
      else if (ev.type === "error") out.errors.push(ev.message);
    }
  }
  return out;
}

let n = 0;
for (const step of plan) {
  const [page, profile, count] = step.split(":");
  for (let i = 0; i < Number(count); i += 1) {
    n += 1;
    const swap = i % 2 === 1; // alternate lanes so neither site always gets lane "a"
    const started = Date.now();
    let r = await race(page, profile, swap);
    if (r.error && /429/.test(r.error)) { console.log(`rate limited, waiting 60 s`); await sleep(61_000); r = await race(page, profile, swap); }
    const file = path.join(outDir, `${String(n).padStart(2, "0")}-${page}-${profile}.json`);
    await writeFile(file, JSON.stringify(r, null, 1));
    const site = (lane) => r.lanes?.[lane];
    const brief = r.error ?? ["a", "b"].map((l) => { const m = r.results[l]; return m ? `${site(l)}: lcp=${m.timing.lcp} fcp=${m.timing.fcp} dcl=${m.timing.domContentLoaded} load=${m.timing.load} tbt=${m.timing.tbt} kb=${m.network.totalKb} js=${m.network.byType.script.kb} capped=${m.capped}` : `${site(l)}: no result`; }).join(" | ");
    console.log(`#${n} ${page}/${profile} (${Math.round((Date.now() - started) / 1000)} s) ${brief}`);
    await sleep(21_000); // RACE_LIMITER allows 3 races per 60 s per IP
  }
}
console.log("done");
