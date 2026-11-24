import type { LaneId, LaneMetrics } from "@/packages/contracts/src/site-race";

export type Better = "lower" | "higher";

export type MetricRow = {
  id: string;
  label: string;
  /** What the metric means, in one line, for a non-specialist. */
  hint: string;
  a: number | null;
  b: number | null;
  format: (value: number) => string;
  better: Better;
  winner: LaneId | "tie" | null;
  /** The lane hit the time cap first: its value is a lower bound ("> 30 s"). */
  censored?: Partial<Record<LaneId, boolean>>;
  /** A per-lane footnote under the value, e.g. the compressed size of a raw number. */
  note?: Partial<Record<LaneId, string>>;
};

export type Round = {
  id: "speed" | "smoothness" | "weight" | "edge" | "seo" | "navigation" | "repeat";
  title: string;
  subtitle: string;
  rows: MetricRow[];
  points: Record<LaneId, number>;
  winner: LaneId | "tie";
};

export type Verdict = {
  rounds: Round[];
  roundsWon: Record<LaneId, number>;
  metricWins: Record<LaneId, number>;
  winner: LaneId | "tie";
};

export const ms = (v: number) => (v >= 10_000 ? `${(v / 1000).toFixed(1)} s` : v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`);
export const kb = (v: number) => (v >= 1024 ? `${(v / 1024).toFixed(2)} MB` : `${Math.round(v)} KB`);
const count = (v: number) => `${Math.round(v)}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const cls = (v: number) => v.toFixed(3);

/**
 * Draw thresholds: a gap is a win only when it is larger than what two runs of the SAME
 * site differ by. `abs` is in the metric's unit, `rel` a share of the larger value; a gap
 * within either is a draw. Calibrated from live races (see NOISE_SOURCE).
 */
export const NOISE: Record<string, { abs: number; rel: number }> = {
  // Timings: |a − b| between two lanes/runs of the same build, v2 Worker, 2026-11-24.
  // 15 A/A races (same build on two hosts) + 5 A/B races, 110 same-site pairs (66 mobile, 44 desktop).
  // Mobile p80/p90: TTFB 14/35 ms · FCP 592/924 ms · LCP 172/252 ms (7%/11%) · load 247/297 ms (7%/9%) · TBT 292/801 ms.
  // Desktop p80/p90: TTFB 18/28 · FCP 188/256 · LCP 188/348 · load 133/297 · TBT 40/40 ms.
  ttfb: { abs: 35, rel: 0.1 },
  fcp: { abs: 600, rel: 0.2 },
  lcp: { abs: 250, rel: 0.1 },
  load: { abs: 300, rel: 0.1 },
  tbt: { abs: 300, rel: 0.4 },
  cls: { abs: 0.02, rel: 0.1 },
  // Bytes are deterministic now (p90 of same-site gaps < 1 KB, 0.3%); small floors only.
  total: { abs: 10, rel: 0.02 },
  images: { abs: 10, rel: 0.02 },
  js: { abs: 5, rel: 0.02 },
  requests: { abs: 1, rel: 0 },
  share: { abs: 0.02, rel: 0 },
  "edge-html": { abs: 15, rel: 0.1 },
  html: { abs: 5, rel: 0.02 },
  words: { abs: 10, rel: 0.05 },
  // Second page and repeat visit: not calibrated by A/A runs yet; set like LCP (paint-bound timings)
  // and like Weight (bytes), so a gap must clear the same noise as the first-load rows.
  "nav-content": { abs: 250, rel: 0.1 },
  "nav-image": { abs: 250, rel: 0.1 },
  "nav-kb": { abs: 10, rel: 0.02 },
  "repeat-lcp": { abs: 250, rel: 0.1 },
  "repeat-kb": { abs: 10, rel: 0.02 },
  "repeat-requests": { abs: 1, rel: 0 },
};
export const NOISE_SOURCE = "110 same-site pairs from 20 live races (15 A/A) on the v2 Worker, 2026-11-24: thresholds sit near the 80th–90th percentile of the gap between two runs of one build.";

/**
 * Who wins one metric, or a draw when the gap is within single-run noise (`floor` absolute,
 * `rel` relative). A censored value is a lower bound (the lane was stopped at the cap): it can
 * lose, but never win or draw against a value it might really exceed — for a "lower" metric it
 * loses only when even its lower bound is clearly worse, otherwise it is a draw.
 */
export function compare(a: number | null, b: number | null, better: Better, floor = 0, rel = 0.05, censored: Partial<Record<LaneId, boolean>> = {}): LaneId | "tie" | null {
  if (a === null && b === null) return null;
  if (a === null) return "b";
  if (b === null) return "a";
  if (censored.a && censored.b) return "tie";
  const gap = Math.abs(a - b);
  const winner: LaneId = (better === "lower" ? a < b : a > b) ? "a" : "b";
  if (gap <= floor || gap <= Math.max(Math.abs(a), Math.abs(b)) * rel) return "tie";
  // A lower bound that looks better proves nothing: the real value may be worse.
  if (censored[winner] && better === "lower") return "tie";
  return winner;
}

function row(id: string, label: string, hint: string, a: number | null, b: number | null, format: MetricRow["format"], better: Better, noise = NOISE[id], censored: Partial<Record<LaneId, boolean>> = {}): MetricRow {
  return { id, label, hint, a, b, format, better, winner: compare(a, b, better, noise?.abs ?? 0, noise?.rel ?? 0.05, censored), ...(censored.a || censored.b ? { censored } : {}) };
}

const share = (part: number, whole: number) => (whole > 0 ? part / whole : null);

/** A capped lane never painted its final LCP: score it at the cap, shown as "> cap". */
export function lcpOrCap(m: LaneMetrics): { value: number | null; censored: boolean } {
  if (m.timing.lcp !== null) return { value: m.timing.lcp, censored: false };
  if (m.capped) return { value: m.capMs ?? 30_000, censored: true };
  return { value: null, censored: false };
}

/** The load event, or the cap as a lower bound when the lane was stopped before it fired. */
export function loadOrCap(m: LaneMetrics): { value: number | null; censored: boolean } {
  if (m.timing.load !== null) return { value: m.timing.load, censored: false };
  if (m.capped) return { value: m.capMs ?? 30_000, censored: true };
  // Journey: the visitor tapped before the load event, so it is "later than the tap".
  if (m.tappedAt !== undefined) return { value: m.tappedAt, censored: true };
  return { value: null, censored: false };
}

/** v2 lanes report TTI; one stopped at the cap without it has TBT counted only up to the cap. */
export const tbtCensored = (m: LaneMetrics) => (m.capped || m.tappedAt !== undefined) && m.timing.tti === null;
/** Still downloading when stopped: byte and request counts are lower bounds. */
export const weightCensored = (m: LaneMetrics) => (m.capped || m.tappedAt !== undefined) && m.timing.load === null;

export function formatValue(row: MetricRow, lane: LaneId): string {
  const value = row[lane];
  if (value === null) return "n/a";
  return row.censored?.[lane] ? `> ${row.format(value)}` : row.format(value);
}
const passed = (m: LaneMetrics) => m.seo.filter((check) => check.pass).length;

function round(id: Round["id"], title: string, subtitle: string, rows: MetricRow[]): Round {
  const points = { a: 0, b: 0 };
  for (const r of rows) if (r.winner === "a" || r.winner === "b") points[r.winner] += 1;
  const winner = points.a === points.b ? "tie" : points.a > points.b ? "a" : "b";
  return { id, title, subtitle, rows, points, winner };
}

const both = (a: boolean, b: boolean) => ({ a, b });

export function scoreRace(a: LaneMetrics, b: LaneMetrics): Verdict {
  const lcpA = lcpOrCap(a);
  const lcpB = lcpOrCap(b);
  const loadA = loadOrCap(a);
  const loadB = loadOrCap(b);
  const weight = both(weightCensored(a), weightCensored(b));
  const htmlNote = (m: LaneMetrics) => (m.document.transferKb !== undefined ? `${kb(m.document.transferKb)} on the wire` : undefined);
  const rounds: Round[] = [
    round("speed", "Speed", "How soon the visitor sees the page", [
      row("ttfb", "Time to first byte", "The edge answers with the first byte of HTML", a.timing.ttfb, b.timing.ttfb, ms, "lower"),
      row("fcp", "First contentful paint", "Anything at all appears on screen", a.timing.fcp, b.timing.fcp, ms, "lower"),
      row("lcp", "Largest contentful paint", "The main hero content is on screen · Core Web Vital", lcpA.value, lcpB.value, ms, "lower", NOISE.lcp, both(lcpA.censored, lcpB.censored)),
      row("load", "Fully loaded", "The load event: every image, script and font the page asked for has arrived", loadA.value, loadB.value, ms, "lower", NOISE.load, both(loadA.censored, loadB.censored)),
    ]),
    round("smoothness", "Smoothness", "Does the page respond and hold still", [
      row("tbt", "Total blocking time", "Long tasks from first paint until the page is interactive (Lighthouse's window) · lab proxy for INP", a.timing.tbt, b.timing.tbt, ms, "lower", NOISE.tbt, both(tbtCensored(a), tbtCensored(b))),
      row("cls", "Layout shift", "Content jumping around while it loads · Core Web Vital", a.timing.cls, b.timing.cls, cls, "lower"),
    ]),
    round("weight", "Weight", "What the visitor had to download", [
      row("total", "Transferred", "All bytes over the wire, as sent (compressed), headers included", a.network.totalKb, b.network.totalKb, kb, "lower", NOISE.total, weight),
      row("images", "Images", "Photos, renders and icons, as delivered", a.network.byType.image.kb, b.network.byType.image.kb, kb, "lower", NOISE.images, weight),
      row("js", "JavaScript", "Script bytes on the wire (compressed); the phone parses several times more", a.network.byType.script.kb, b.network.byType.script.kb, kb, "lower", NOISE.js, weight),
      row("requests", "Requests", "Every request the page made, redirects and failures included", a.network.requests, b.network.requests, count, "lower", NOISE.requests, weight),
    ]),
    round("edge", "Edge cache", "How well the CDN is told what it may keep", [
      row("immutable", "Immutable assets", "Share of same-origin files cached for a year, never revalidated (by count: each one saves a round trip)", share(a.edge.immutableAssets, a.edge.staticAssets), share(b.edge.immutableAssets, b.edge.staticAssets), pct, "higher", NOISE.share),
      row("compressed", "Compressed text", "HTML, JS and CSS served with Brotli, zstd or gzip", share(a.edge.compressedTextAssets, a.edge.textAssets), share(b.edge.compressedTextAssets, b.edge.textAssets), pct, "higher", NOISE.share),
      row("edge-html", "Warm HTML fetch", "HTML fetched again from Cloudflare's edge, no throttling", a.edge.edgeHtmlMs, b.edge.edgeHtmlMs, ms, "lower"),
      { ...row("html", "HTML document, uncompressed", "Raw bytes the browser parses before anything else", a.document.htmlKb, b.document.htmlKb, kb, "lower"), note: { a: htmlNote(a), b: htmlNote(b) } },
    ]),
    round("seo", "Search", "What a crawler gets without running JavaScript", [
      row("seo-checks", "SEO checks passed", "Title, description, canonical, hreflang, structured data, alt text…", passed(a), passed(b), (v) => `${Math.round(v)}/${a.seo.length}`, "higher", { abs: 0, rel: 0 }),
      row("words", "Content in the HTML", "Words readable before any JavaScript runs (SSG signal)", a.document.wordsWithoutJs, b.document.wordsWithoutJs, count, "higher"),
    ]),
  ];
  rounds.push(...journeyRounds(a, b));
  const roundsWon = { a: 0, b: 0 };
  const metricWins = { a: 0, b: 0 };
  for (const r of rounds) {
    if (r.winner !== "tie") roundsWon[r.winner] += 1;
    metricWins.a += r.points.a;
    metricWins.b += r.points.b;
  }
  let winner: LaneId | "tie" = roundsWon.a === roundsWon.b ? "tie" : roundsWon.a > roundsWon.b ? "a" : "b";
  if (winner === "tie" && metricWins.a !== metricWins.b) winner = metricWins.a > metricWins.b ? "a" : "b";
  return { rounds, roundsWon, metricWins, winner };
}

/** A second-page or repeat-visit timing: the value, or the cap as a lower bound when it was never reached. */
export function stepOrCap(value: number | null, step: { skipped: string | null; capped: boolean; capMs: number } | null | undefined): { value: number | null; censored: boolean } {
  if (!step) return { value: null, censored: false };
  if (value !== null && !step.skipped) return { value, censored: false };
  return { value: step.capMs, censored: true };
}

/** Rounds for what the visitor does after the first page; only races that measured it have them. */
export function journeyRounds(a: LaneMetrics, b: LaneMetrics): Round[] {
  const out: Round[] = [];
  if (a.navigation !== undefined || b.navigation !== undefined) {
    const na = a.navigation, nb = b.navigation;
    const ca = stepOrCap(na?.content ?? null, na), cb = stepOrCap(nb?.content ?? null, nb);
    const ia = stepOrCap(na?.image ?? null, na), ib = stepOrCap(nb?.image ?? null, nb);
    const bytes = (n: typeof na) => (n && !n.skipped ? n.net.kb : null);
    out.push(round("navigation", "Next page", "Opening a second page: tap a link, wait for the new page", [
      row("nav-content", "Tap → content", "From the tap to the new page's heading on screen", ca.value, cb.value, ms, "lower", NOISE["nav-content"], both(ca.censored, cb.censored)),
      row("nav-image", "Tap → main image", "From the tap to the new page's largest visible image loaded, decoded and painted", ia.value, ib.value, ms, "lower", NOISE["nav-image"], both(ia.censored, ib.censored)),
      row("nav-kb", "Downloaded for it", "Bytes over the wire from the touch (or hover) on, prefetches included", bytes(na), bytes(nb), kb, "lower", NOISE["nav-kb"], both(!!na?.capped, !!nb?.capped)),
    ]));
  }
  if (a.repeat !== undefined || b.repeat !== undefined) {
    const ra = a.repeat, rb = b.repeat;
    const la = stepOrCap(ra?.lcp ?? null, ra), lb = stepOrCap(rb?.lcp ?? null, rb);
    const done = (r: typeof ra) => (r && !r.skipped ? r : null);
    out.push(round("repeat", "Repeat visit", "What a returning visitor pays: the first page again, HTTP cache on", [
      row("repeat-lcp", "Repeat LCP", "The main content on screen again, from the cache where the site allows it", la.value, lb.value, ms, "lower", NOISE["repeat-lcp"], both(la.censored, lb.censored)),
      row("repeat-kb", "Re-downloaded", "Bytes that still crossed the network (revalidations and anything not cacheable)", done(ra)?.net.kb ?? null, done(rb)?.net.kb ?? null, kb, "lower", NOISE["repeat-kb"]),
      row("repeat-requests", "Network requests", "Requests that left the browser, 304 revalidations included (the rest came from cache)", done(ra)?.net.network ?? null, done(rb)?.net.network ?? null, count, "lower", NOISE["repeat-requests"]),
    ]));
  }
  return out;
}
