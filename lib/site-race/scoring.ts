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
};

export type Round = {
  id: "speed" | "smoothness" | "weight" | "edge" | "seo";
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
 * Two values are a draw when they are within the noise a single lab run carries:
 * 5% relative, or an absolute floor per unit (a 20 ms TTFB gap is not a win).
 */
export function compare(a: number | null, b: number | null, better: Better, floor = 0): LaneId | "tie" | null {
  if (a === null && b === null) return null;
  if (a === null) return "b";
  if (b === null) return "a";
  const gap = Math.abs(a - b);
  if (gap <= floor || gap <= Math.max(Math.abs(a), Math.abs(b)) * 0.05) return "tie";
  return (better === "lower" ? a < b : a > b) ? "a" : "b";
}

function row(id: string, label: string, hint: string, a: number | null, b: number | null, format: MetricRow["format"], better: Better, floor = 0): MetricRow {
  return { id, label, hint, a, b, format, better, winner: compare(a, b, better, floor) };
}

const share = (part: number, whole: number) => (whole > 0 ? part / whole : null);

/** A capped lane never painted its final LCP: score it at the cap, shown as "> cap". */
export function lcpOrCap(m: LaneMetrics): { value: number | null; censored: boolean } {
  if (m.timing.lcp !== null) return { value: m.timing.lcp, censored: false };
  if (m.capped) return { value: m.capMs ?? 30_000, censored: true };
  return { value: null, censored: false };
}

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

export function scoreRace(a: LaneMetrics, b: LaneMetrics): Verdict {
  const lcpA = lcpOrCap(a);
  const lcpB = lcpOrCap(b);
  const lcpRow = { ...row("lcp", "Largest contentful paint", "The main hero content is on screen · Core Web Vital", lcpA.value, lcpB.value, ms, "lower", 100), censored: { a: lcpA.censored, b: lcpB.censored } };
  const rounds: Round[] = [
    round("speed", "Speed", "How soon the visitor sees the page", [
      row("ttfb", "Time to first byte", "The edge answers with the first byte of HTML", a.timing.ttfb, b.timing.ttfb, ms, "lower", 30),
      row("fcp", "First contentful paint", "Anything at all appears on screen", a.timing.fcp, b.timing.fcp, ms, "lower", 50),
      lcpRow,
      row("dcl", "HTML parsed", "DOMContentLoaded: the document and its blocking scripts are done", a.timing.domContentLoaded, b.timing.domContentLoaded, ms, "lower", 100),
    ]),
    round("smoothness", "Smoothness", "Does the page respond and hold still", [
      row("tbt", "Total blocking time", "Main thread blocked by long tasks · lab proxy for INP", a.timing.tbt, b.timing.tbt, ms, "lower", 25),
      row("cls", "Layout shift", "Content jumping around while it loads · Core Web Vital", a.timing.cls, b.timing.cls, cls, "lower", 0.01),
    ]),
    round("weight", "Weight", "What the visitor had to download", [
      row("total", "Transferred", "All bytes over the wire, compressed", a.network.totalKb, b.network.totalKb, kb, "lower", 10),
      row("images", "Images", "Photos, renders and icons, as delivered", a.network.byType.image.kb, b.network.byType.image.kb, kb, "lower", 10),
      row("js", "JavaScript", "Script bytes: parsed and executed on the phone's CPU", a.network.byType.script.kb, b.network.byType.script.kb, kb, "lower", 5),
      row("requests", "Requests", "Round trips the page needed", a.network.requests, b.network.requests, count, "lower", 1),
    ]),
    round("edge", "Edge cache", "How well the CDN is told what it may keep", [
      row("immutable", "Immutable assets", "Fingerprinted files cached for a year, never revalidated", share(a.edge.immutableAssets, a.edge.staticAssets), share(b.edge.immutableAssets, b.edge.staticAssets), pct, "higher", 0.02),
      row("compressed", "Compressed text", "HTML, JS and CSS served with Brotli, zstd or gzip", share(a.edge.compressedTextAssets, a.edge.textAssets), share(b.edge.compressedTextAssets, b.edge.textAssets), pct, "higher", 0.02),
      row("edge-html", "Warm HTML fetch", "HTML fetched again from Cloudflare's edge, no throttling", a.edge.edgeHtmlMs, b.edge.edgeHtmlMs, ms, "lower", 15),
      row("html", "HTML document", "Bytes the browser must parse before anything else", a.document.htmlKb, b.document.htmlKb, kb, "lower", 5),
    ]),
    round("seo", "Search", "What a crawler gets without running JavaScript", [
      row("seo-checks", "SEO checks passed", "Title, description, canonical, hreflang, structured data, alt text…", passed(a), passed(b), (v) => `${Math.round(v)}/${a.seo.length}`, "higher", 0),
      row("words", "Content in the HTML", "Words readable before any JavaScript runs (SSG signal)", a.document.wordsWithoutJs, b.document.wordsWithoutJs, count, "higher", 10),
    ]),
  ];
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
