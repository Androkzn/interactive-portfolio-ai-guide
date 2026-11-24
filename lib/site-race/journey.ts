// The optimization journey: every stage is a real, still-running deployment of
// the same original site, so the race can load any of them. The prose is
// written from the commit messages of each step; the numbers come from the
// projects' own perf reports via scripts/site-race/sync-journey.mjs
// (lib/site-race/journey-data.json). Add a stage here when a new optimization
// step is deployed, then re-run the sync. The Pages project's production alias
// is not a stage of its own: it always belongs to the newest Pages stage, so a
// new production deploy needs its own stage (and immutable URL) here.

import { RACE_PRESETS } from "../../packages/contracts/src/site-race";
import journeyData from "./journey-data.json";

export type StageId = "original" | "port" | "images" | "javascript" | "lcp" | "html" | "prefetch" | "tuned" | "deferred" | "compile" | "edge";

export type Stage = {
  id: StageId;
  /** Short name for pickers and chart axes. */
  short: string;
  title: string;
  build: "astro" | "next";
  /** Immutable deployment URL (no trailing slash): it never moves when newer builds ship. */
  url: string;
  commit: string;
  /** Which perf-report runs measured this stage. */
  report: { base: string; build?: string };
  /** Set when the change does not show in a single cold page load. */
  showsIn?: string;
  summary: string;
  changes: string[];
};

export const stages: Stage[] = [
  {
    id: "original",
    short: "Original",
    title: "The original site",
    build: "astro",
    url: "https://hrconcretepumps.pages.dev",
    commit: "7f66469",
    report: { base: "https://hrconcretepumps.pages.dev" },
    summary: "The site as it was first shipped, never tuned. Light on JavaScript, heavy on everything else.",
    changes: [
      "Product renders served as full-size PNG (1.2–1.9 MB each) wherever they appear",
      "Decorative home-page scene layers downloaded as lossless images on load",
      "No image priorities: the hero competes with everything else for a slow connection",
    ],
  },
  {
    id: "port",
    short: "Port",
    title: "Straight port to Next.js",
    build: "next",
    url: "https://24285377.hr-concrete-pumps-next.pages.dev",
    commit: "3844a6b",
    report: { base: "https://hr-concrete-pumps-next.pages.dev", build: "3844a6b" },
    summary: "Page-for-page rebuild in Next.js 16 with a static export — and no performance work yet. It got slower.",
    changes: [
      "Same content, routes, languages and images as the original",
      "Adds the React runtime and hydration to every page",
      "All 15 component scripts imported on every page after hydration",
      "React preloaded the 1.2 MB hero PNG at high priority, crowding the slow link even more",
    ],
  },
  {
    id: "images",
    short: "Images",
    title: "Images: AVIF, responsive, hashed",
    build: "next",
    url: "https://b7f7eab8.hr-concrete-pumps-next.pages.dev",
    commit: "9c9f5ee",
    report: { base: "https://perf-step-1-images.hr-concrete-pumps-next.pages.dev" },
    summary: "Every product render re-encoded as AVIF and WebP in six widths, served through <picture> with per-context sizes.",
    changes: [
      "HR40-5RZ hero: 1,208 KB PNG → 39 KB AVIF at 1280 px",
      "All 17 renders: 21 MB → 0.8 MB at 1280 px; 84-px thumbnails get the 160-px file",
      "File names carry a hash of their bytes, so /images/optimized/* is cached as immutable",
      "Scene layers: 5 MB of lossless layers → 322 KB of WebP, loaded only near the viewport",
    ],
  },
  {
    id: "javascript",
    short: "JavaScript",
    title: "JavaScript: load only what the page uses",
    build: "next",
    url: "https://56f8b50e.hr-concrete-pumps-next.pages.dev",
    commit: "f526b70",
    report: { base: "https://perf-step-3-js.hr-concrete-pumps-next.pages.dev" },
    summary: "Removed the animation library and stopped shipping every component's script to every page.",
    changes: [
      "framer-motion (213 KB raw) replaced by the Web Animations API — same easing, compositor-only",
      "Component scripts are imported only on pages that render that component",
      "Form-state restoration waits for the scripts it drives, so client navigation stays correct",
    ],
  },
  {
    id: "lcp",
    short: "LCP",
    title: "Largest paint first",
    build: "next",
    url: "https://bed9f105.hr-concrete-pumps-next.pages.dev",
    commit: "02b3f9c",
    report: { base: "https://perf-step-4-lcp.hr-concrete-pumps-next.pages.dev" },
    summary: "On slow 4G the page was bandwidth-bound, so nothing below the fold may compete with the hero.",
    changes: [
      "AVIF twin for every hero photo, preloaded from <head> with imageSrcSet",
      "Home hero 1200 px: 130 KB → 94 KB; campus hero: 91 KB → 50 KB",
      "The below-the-fold scene requests nothing until it is within one viewport",
    ],
  },
  {
    id: "html",
    short: "HTML",
    title: "HTML: ship content, not decoration",
    build: "next",
    url: "https://2d618958.hr-concrete-pumps-next.pages.dev",
    commit: "843ddbb",
    report: { base: "https://perf-step-5-html.hr-concrete-pumps-next.pages.dev" },
    summary: "349 KB of the home page's HTML was one decorative drawing below the fold. The client already had the code to draw it.",
    changes: [
      "Inline SVG of 489 paths with float-noise coordinates (416.09000000000003) removed from the server output",
      "The drawing mounts from client code when its scene is within one viewport",
      "Home HTML: 470 KB → 181 KB raw, 73 KB → 26 KB Brotli; the first frame keeps its viewBox, so nothing shifts",
    ],
  },
  {
    id: "prefetch",
    short: "Prefetch",
    title: "Navigation: prefetch on intent",
    build: "next",
    url: "https://8a5d5231.hr-concrete-pumps-next.pages.dev",
    commit: "c1c6ce6",
    report: { base: "https://perf-step-6-prefetch.hr-concrete-pumps-next.pages.dev" },
    showsIn: "the second page a visitor opens — a cold single-page race cannot see it",
    summary: "The next page's RSC payload is fetched when the visitor shows intent, so the click lands on data already in memory.",
    changes: [
      "router.prefetch() after a 65 ms hover, on touchstart (≈100 ms before the click) or keyboard focus",
      "Each URL once; same origin and locale only; no viewport prefetching on metered connections",
      "Measured on its own: click-to-rendered-<h1> on slow 4G, with and without a 300 ms hover first",
    ],
  },
  {
    id: "tuned",
    short: "Hero first",
    title: "Hero first: nothing competes with the largest paint",
    build: "next",
    url: "https://92ecff30.hr-concrete-pumps-next.pages.dev",
    commit: "e2b3af0",
    // The deployment was built from ddd36b0: e2b3af0 plus a catalogue copy change.
    report: { base: "https://92ecff30.hr-concrete-pumps-next.pages.dev", build: "ddd36b0" },
    summary: "On slow 4G the home hero was sharing the link with images nobody could see yet. Now it downloads first, and the home page hydrates no scene code at all.",
    changes: [
      "Below-the-fold scene layers (~280 KB) requested only when the scene nears the viewport, not from the server HTML",
      "800 px hero AVIF for 2x phones (71 KB instead of 96 KB) and measured sizes on every banner and model render",
      "Inter preloaded only on wide layouts: the swap fallback is metric-matched, so phones lose nothing",
      "Home scenes rendered on the server; their motion code loads per scene near the viewport (−22 KB startup JS)",
    ],
  },
  {
    id: "deferred",
    short: "JS after hero",
    title: "Scripts after the hero: Next.js waits for the main photo",
    build: "next",
    url: "https://eeb1e9f7.hr-concrete-pumps-next.pages.dev",
    commit: "2767772",
    report: { base: "https://eeb1e9f7.hr-concrete-pumps-next.pages.dev", build: "2767772" },
    summary: "On slow 4G the hero was still sharing the link with the Next.js scripts. Now they are requested once it has loaded: the page is server-rendered, and its links work before hydration.",
    changes: [
      "Next.js chunks start from a small loader at the end of <body> once the fetchpriority=high image has loaded — at once if it is already there or absent, 2.5 s at most",
      "Home on a phone, 6 cloud races vs the previous build: LCP 2100 → 1212 ms, TBT 359 → 142 ms, FCP 1080 → 890 ms, CLS 0; model page and desktop home within noise",
      "Inter subset to the glyphs the English and Spanish pages use: 48 → 39 KB, with the full weight axis and every OpenType feature",
      "The intent prefetch of a model page also preloads its hero render (not on 2G); with Save-Data on, nothing is fetched before the tap",
    ],
  },
  {
    id: "compile",
    short: "Compile hints",
    title: "Compile hints: start-up code compiled off the main thread",
    build: "next",
    url: "https://124fd5ad.hr-concrete-pumps-next.pages.dev",
    commit: "a26f882",
    report: { base: "https://124fd5ad.hr-concrete-pumps-next.pages.dev", build: "a26f882" },
    summary: "Nearly all of the home page's blocking time was one boot task, and two thirds of it was V8 compiling functions on the main thread as each first ran. Chrome now compiles the start-up chunks in the background while they download.",
    changes: [
      "//# allFunctionsCalledOnLoad (Chrome 136+, ignored elsewhere) on the 9 chunks the pages boot with: main-thread compiles in the boot task 416 → 0 in a local trace",
      "Home on a phone, medians of 8 cloud races vs the previous build: TBT 236 → 42 ms (lower in 7 of 8), TTI 4.6 → 2.7 s; LCP and FCP within noise",
      "Inter is now font-display: optional, because a swap after first paint re-laid out 810 of 824 layout objects; it is used when it is there at first paint",
      "Trade-off: a first visit on a slow phone keeps the metric-matched Arial fallback for the whole visit — now with a bold face, so headings keep their weight",
    ],
  },
  {
    id: "edge",
    short: "Edge",
    title: "Next.js server on Cloudflare Workers",
    build: "next",
    // Workers have no immutable per-deployment URL here (preview URLs are off), so this stage
    // follows the Worker's latest deployment of branch edge/opennext-workers.
    url: "https://hr-concrete-pumps-next-edge.a-tekhtelev.workers.dev",
    commit: "2055379",
    report: { base: "https://hr-concrete-pumps-next-edge.a-tekhtelev.workers.dev", build: "2055379" },
    summary: "The same pages and every step above, now served by a Next.js server at the edge (OpenNext): still prerendered and cached, but content updates, A/B tests and the contact form no longer need a rebuild or a static workaround.",
    changes: [
      "Prerendered pages answered from the edge cache before the Next.js server loads; content corrections invalidate only the pages that show them (cache tags + revalidateTag)",
      "A/B test assigned in middleware and served as a prerendered variant: no anti-flicker, no render delay",
      "Hero first in the response path: HTMLRewriter moves the Next.js chunks behind the hero on every HTML page — prerendered, regenerated or A/B variant — and leaves RSC requests alone",
      "Tag lookups cached per data centre for an hour (low-traffic server time 329 → 19 ms); the contact form is a Server Action that works without JavaScript",
      "Lab run, phone (4x CPU, slow 4G), 7 pages, before and after the earlier steps came over: median LCP 2.08 → 0.87 s",
    ],
  },
];

export const originalStage = stages[0];
export const latestStage = stages[stages.length - 1];

/** The Pages project's production alias (the race's "next" preset). It moves to every production deploy. */
const production = new URL(RACE_PRESETS.next.url);
const onPages = (stage: Stage) => new URL(stage.url).host.endsWith(`.${production.host}`);

/**
 * The newest build on Cloudflare Pages, the one the production alias serves: the static
 * build with every optimization and the race's default "after".
 */
export const featuredStage = [...stages].reverse().find(onPages) ?? latestStage;

export function stageById(id: StageId): Stage {
  return stages.find((stage) => stage.id === id) ?? latestStage;
}

/** Which stage a raced URL belongs to, by host. The production alias belongs to the newest Pages stage. */
export function stageForUrl(url: string | undefined | null): Stage | null {
  if (!url) return null;
  try {
    const host = new URL(url).host;
    if (host === production.host) return featuredStage;
    return stages.find((stage) => new URL(stage.url).host === host) ?? null;
  } catch {
    return null;
  }
}

/**
 * What a race loads for a stage: the live production alias for the build it serves, so a
 * redeploy shows in the next race, and every other stage's own deployment.
 */
export function raceUrl(id: StageId): string {
  return id === featuredStage.id ? production.origin : stageById(id).url;
}

export type PageMetrics = {
  lcp: number | null;
  fcp: number | null;
  tbt: number | null;
  cls: number | null;
  inp: number | null;
  pageKb: number;
  jsKb: number;
  imgKb: number;
  htmlKb: number;
  requests: number;
  imageFormats: Record<string, number>;
  lcpElement: string | null;
  lcpResource: string | null;
};

export type StageRun = {
  run: string;
  date: string;
  base: string;
  build: string;
  chrome: string | null;
  pages: Record<string, { mobile?: PageMetrics; desktop?: PageMetrics }>;
};

export type JourneyData = {
  syncedAt: string;
  source: string;
  pageLabels: Record<string, string>;
  runs: StageRun[];
};

export const journey = journeyData as unknown as JourneyData;

/** The newest report run that measured this stage's deployment, if any. */
export function runFor(stageId: StageId): StageRun | null {
  const { report } = stageById(stageId);
  const matches = journey.runs.filter((run) => run.base === report.base && (!report.build || run.build === report.build));
  return matches.sort((a, b) => b.run.localeCompare(a.run))[0] ?? null;
}

/** One stage's numbers for a page path, or the median across every page the run measured ("*"). */
export function stageMetrics(stageId: StageId, pagePath: string, profile: "mobile" | "desktop"): PageMetrics | null {
  const run = runFor(stageId);
  if (!run) return null;
  if (pagePath !== "*") return run.pages[pagePath]?.[profile] ?? null;
  const rows = Object.values(run.pages).map((page) => page[profile]).filter((row): row is PageMetrics => !!row);
  if (!rows.length) return null;
  const med = (pick: (row: PageMetrics) => number | null) => median(rows.map(pick).filter((v): v is number => v !== null));
  return {
    lcp: med((r) => r.lcp), fcp: med((r) => r.fcp), tbt: med((r) => r.tbt), cls: med((r) => r.cls), inp: med((r) => r.inp),
    pageKb: med((r) => r.pageKb) ?? 0, jsKb: med((r) => r.jsKb) ?? 0, imgKb: med((r) => r.imgKb) ?? 0, htmlKb: med((r) => r.htmlKb) ?? 0,
    requests: med((r) => r.requests) ?? 0, imageFormats: {}, lcpElement: null, lcpResource: null,
  };
}

/** The newest stage a report run measured: the default "after" for the race and the journey. */
export function latestMeasuredStage(): Stage {
  return [...stages].reverse().find((stage) => runFor(stage.id)) ?? latestStage;
}

export function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
