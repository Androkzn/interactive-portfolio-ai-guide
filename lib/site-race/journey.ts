// The optimization journey: every stage is a real, still-running deployment of
// the same original site, so the race can load any of them. The prose is
// written from the commit messages of each step; the numbers come from the
// projects' own perf reports via scripts/site-race/sync-journey.mjs
// (lib/site-race/journey-data.json). Add a stage here when a new optimization
// step is deployed, then re-run the sync.

import journeyData from "./journey-data.json";

export type StageId = "original" | "port" | "images" | "javascript" | "lcp" | "html" | "prefetch" | "tuned" | "edge";

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
    url: "https://d0d11b6f.hrconcretepumps.pages.dev",
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
    url: "https://56ce28ef.hr-concrete-pumps-next.pages.dev",
    commit: "e2b3af0",
    report: { base: "https://56ce28ef.hr-concrete-pumps-next.pages.dev", build: "e2b3af0" },
    summary: "On slow 4G the home hero was sharing the link with images nobody could see yet. Now it downloads first, and the home page hydrates no scene code at all.",
    changes: [
      "Below-the-fold scene layers (~280 KB) requested only when the scene nears the viewport, not from the server HTML",
      "800 px hero AVIF for 2x phones (71 KB instead of 96 KB) and measured sizes on every banner and model render",
      "Inter preloaded only on wide layouts: the swap fallback is metric-matched, so phones lose nothing",
      "Home scenes rendered on the server; their motion code loads per scene near the viewport (−22 KB startup JS)",
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
    commit: "f90f4b7",
    report: { base: "https://hr-concrete-pumps-next-edge.a-tekhtelev.workers.dev", build: "f90f4b7" },
    summary: "The same pages, now served by a Next.js server at the edge (OpenNext): still prerendered and cached, but content updates, A/B tests and the contact form no longer need a rebuild or a static workaround.",
    changes: [
      "Prerendered pages answered from the edge cache before the Next.js server loads; content corrections invalidate only the pages that show them (cache tags + revalidateTag)",
      "A/B test assigned in middleware and served as a prerendered variant: no anti-flicker, no render delay",
      "Tag lookups cached per data centre for an hour: low-traffic server time 329 → 19 ms",
      "Contact form as a Server Action that works without JavaScript",
    ],
  },
];

export const originalStage = stages[0];
export const latestStage = stages[stages.length - 1];
/** The static build with every optimization: the race's default "after". */
export const featuredStage = stages.find((stage) => stage.id === "tuned") ?? latestStage;

export function stageById(id: StageId): Stage {
  return stages.find((stage) => stage.id === id) ?? latestStage;
}

/** Which stage a raced URL belongs to, by host. */
export function stageForUrl(url: string | undefined | null): Stage | null {
  if (!url) return null;
  try {
    const host = new URL(url).host;
    return stages.find((stage) => new URL(stage.url).host === host) ?? null;
  } catch {
    return null;
  }
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
