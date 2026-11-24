// Wire contract between the site-race Worker (apps/site-race-api) and the
// portfolio's race page (components/site-race). The Worker streams these as
// Server-Sent Events, one JSON object per `data:` line.

export const SITE_RACE_PROTOCOL = "site-race/1" as const;

export type LaneId = "a" | "b";
export type RaceProfile = "mobile" | "desktop";

/**
 * Sites the race knows by name. Anything else is a visitor's challenger URL.
 * The story is before → after: the Astro build is the original site as it was,
 * never tuned; the Next.js build is the same site rebuilt specifically to be fast.
 */
export const RACE_PRESETS = {
  astro: { url: "https://hrconcretepumps.pages.dev/", role: "Before", label: "Astro", stack: "Original site · not optimized" },
  next: { url: "https://hr-concrete-pumps-next.pages.dev/", role: "After", label: "Next.js", stack: "Rebuilt in Next.js 16 · optimized" },
} as const;
export type RacePresetId = keyof typeof RACE_PRESETS;

/** Pages both builds share. A race loads the same path on every own-host lane. */
export const RACE_PAGES = {
  home: { path: "/", label: "Home", detail: "Hero photo slider, scene animation" },
  catalogue: { path: "/pumps/", label: "Pump catalogue", detail: "Model cards with product renders" },
  model: { path: "/boom-pumps/hr40-5rz/", label: "Model page", detail: "HR40-5RZ: large product renders, specs" },
} as const;
export type RacePageId = keyof typeof RACE_PAGES;

/**
 * Hosts that belong to this project: either build's production alias, any of its
 * immutable deployment URLs (<hash>.project.pages.dev) and branch aliases. Lanes
 * on these hosts count as "ours" (not a visitor's challenger) and take the race page path.
 */
export const OWN_HOST_PATTERN = /^(?:[a-z0-9-]+\.)?(?:hrconcretepumps|hr-concrete-pumps-next)\.pages\.dev$/;

export type TimingMetrics = {
  /** Navigation Timing responseStart, ms from navigation start. */
  ttfb: number | null;
  fcp: number | null;
  lcp: number | null;
  domContentLoaded: number | null;
  load: number | null;
  /** Sum of (long task − 50 ms) after FCP, the lab proxy for INP. */
  tbt: number | null;
  cls: number | null;
};

export type ResourceBucket = { count: number; kb: number };

export type NetworkMetrics = {
  requests: number;
  totalKb: number;
  byType: Record<"document" | "script" | "stylesheet" | "image" | "font" | "other", ResourceBucket>;
  /** HTTP protocol of the main document, e.g. "h2" or "h3". */
  protocol: string | null;
  thirdPartyHosts: string[];
};

export type EdgeMetrics = {
  /** cf-cache-status (or x-cache) of the HTML document on the browser's request. */
  documentCache: string | null;
  documentCacheControl: string | null;
  documentEncoding: string | null;
  server: string | null;
  /** Same-origin script/style/font/image responses. */
  staticAssets: number;
  /** …of which carry `immutable` or a max-age of a year. */
  immutableAssets: number;
  /** …of which the CDN reported as a cache HIT. */
  edgeHitAssets: number;
  textAssets: number;
  /** Text responses (HTML/JS/CSS/SVG/JSON) served with br, zstd or gzip. */
  compressedTextAssets: number;
  /** Median of three back-to-back HTML fetches made from the Worker, ms. */
  edgeHtmlMs: number | null;
  robotsTxt: boolean;
  sitemapXml: boolean;
};

export type SeoCheck = { id: string; label: string; pass: boolean; detail: string };

export type DocumentMetrics = {
  htmlKb: number;
  domNodes: number;
  /** Words of visible text in the HTML as served, before any JavaScript runs. */
  wordsWithoutJs: number;
  lcpElement: string | null;
};

export type LcpDetail = {
  /** e.g. "img.model-variant-image" */
  element: string | null;
  /** Path of the LCP image ("" for a text LCP). */
  path: string | null;
  /** Where the element sits in the viewport, CSS px — frames are scaled screenshots of the same viewport. */
  rect: { x: number; y: number; width: number; height: number } | null;
  viewport: { width: number; height: number };
  kb: number | null;
  format: string | null;
  fetchPriority: string | null;
  loading: string | null;
  /** srcset or a <picture> parent: the browser can pick a size. */
  responsive: boolean;
  /** A <link rel=preload as=image> points at this image. */
  preloaded: boolean;
  natural: { width: number; height: number } | null;
  displayed: { width: number; height: number } | null;
};

export type ResourceType = "document" | "script" | "stylesheet" | "image" | "font" | "other";

export type HeavyResource = { path: string; type: ResourceType; kb: number; format: string | null };

export type WaterfallEntry = {
  path: string;
  type: ResourceType;
  /** ms from navigation start */
  start: number;
  end: number;
  kb: number;
  /** renderBlockingStatus === "blocking" */
  blocking: boolean;
  thirdParty: boolean;
  /** Still downloading when the lane stopped: `end` is the stop time, `kb` what had arrived. */
  inFlight?: boolean;
};

export type LaneMetrics = {
  url: string;
  finalUrl: string;
  status: number | null;
  /** True when the lane hit the time cap before the load event or a quiet network. */
  capped: boolean;
  /** The cap this lane ran under, ms. */
  capMs?: number;
  lcpDetail?: LcpDetail | null;
  images?: { byFormat: Record<string, ResourceBucket>; heaviest: HeavyResource[] };
  waterfall?: WaterfallEntry[];
  timing: TimingMetrics;
  network: NetworkMetrics;
  edge: EdgeMetrics;
  seo: SeoCheck[];
  document: DocumentMetrics;
};

export type LanePhase = "queued" | "launching" | "loading" | "settling" | "inspecting" | "done" | "failed";
export type MarkName = "ttfb" | "fcp" | "lcp" | "dcl" | "load";

export type RaceLaneInfo = { url: string; label: string; stack: string; preset: RacePresetId | null; own?: boolean };

export type RaceEvent =
  | { type: "start"; protocol: typeof SITE_RACE_PROTOCOL; raceId: string; profile: RaceProfile; profileLabel: string; page?: RacePageId; capMs?: number; lanes: Record<LaneId, RaceLaneInfo> }
  | { type: "phase"; lane: LaneId; phase: LanePhase; detail?: string }
  /** performance.timeOrigin of the lane's page, epoch ms; frames are timed against it. */
  | { type: "origin"; lane: LaneId; timeOrigin: number }
  /** One screencast frame. `t` is ms since navigation start (may be negative before it). */
  | { type: "frame"; lane: LaneId; t: number; jpeg: string }
  | { type: "mark"; lane: LaneId; name: MarkName; t: number }
  | { type: "net"; lane: LaneId; requests: number; kb: number }
  | { type: "result"; lane: LaneId; metrics: LaneMetrics }
  | { type: "error"; lane?: LaneId; message: string }
  /** `reportId` is set when the finished race was saved and can be reopened at /reports/<id>. */
  | { type: "done"; elapsedMs: number; reportId?: string };

/** One line of a race log: a recording or a saved report, newline-delimited JSON. */
export type RaceLogLine = { at: number; event: RaceEvent | { type: "recording"; recordedAt: string; reportId?: string } };

/** What the list of saved races shows per race, kept in the KV key's metadata (≤ 1 KB). */
export type RaceReportSummary = {
  id: string;
  savedAt: string;
  page: RacePageId;
  profile: RaceProfile;
  lanes: Record<LaneId, { url: string; preset: RacePresetId | null; lcp: number | null; capped: boolean; kb: number }>;
};
