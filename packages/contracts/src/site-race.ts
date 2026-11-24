// Wire contract between the site-race Worker (apps/site-race-api) and the
// portfolio's race page (components/site-race). The Worker streams these as
// Server-Sent Events, one JSON object per `data:` line.

/**
 * Event stream version. The page replays every version it ever saved, so bump it when the
 * stream changes shape and keep reading the old one.
 *  site-race/1: each lane's `result` is sent once, after both lanes finished the whole visit.
 *  site-race/2: each lane sends `result` as soon as its first page is measured (`partial:
 *    "first-page"`), again after each step of its visit (`partial: "visit"`), and a last time
 *    without `partial` when it is done. Every `result` holds all the lane's numbers so far and
 *    replaces the previous one, so a client that ignores `partial` still ends on the full
 *    result. Also new: the caps and the throttled link in `start`, the warm-up's full-page
 *    weight (`warmup`), and why a lane stopped at the cap (`phase.cap`).
 */
export const SITE_RACE_PROTOCOL = "site-race/2" as const;
export type SiteRaceProtocol = "site-race/1" | typeof SITE_RACE_PROTOCOL;

/**
 * Measurement method. Bump when what a number means changes, so saved reports stay
 * comparable only with their own kind. Reports without a tag are v1.
 *  v1: bytes double-counted (decoded + encoded), TBT until each lane stopped, no warm-up.
 *  v2: bytes = encoded transfer size; TBT from FCP to TTI (Lighthouse); lanes observed until
 *      load + a 5 s quiet window; both CDNs warmed identically before the timed load.
 *  v3: the visit after the first page (repeat visit, taps), first page capped at 30 s, taps at 20 s.
 *  v4: every step capped at a visitor's patience (RACE_CAPS, 10 s), so a stopped lane's lower
 *      bounds sit at 10 s; the first page's full weight comes from the warm-up load.
 */
export const MEASURE_VERSION = "v4" as const;

/**
 * How long the visitor waits at each step before the lane is stopped and the step scores as
 * "> cap", a lower bound. 10 s is "about the limit for keeping the user's attention" (Nielsen,
 * NN/g, "Response Times: The 3 Important Limits"); on phones most visitors are gone long
 * before: "53% of visits are likely to be abandoned if pages take longer than 3 seconds to
 * load" (Google, "The need for mobile speed", 2016). Waiting longer would only make the race's
 * own visitor wait for a page nobody would wait for. A lane that reaches TTI sooner still stops
 * on its own rule. The Worker runs on these; the page's copy reads them.
 */
export const RACE_CAPS = { firstPageMs: 10_000, repeatMs: 10_000, tapMs: 10_000 } as const;
export type RaceCaps = { firstPageMs: number; repeatMs: number; tapMs: number };
/** The caps of races run before site-race/2 (measure v3 and older), for saved data that does not record its own. */
export const LEGACY_CAPS: RaceCaps = { firstPageMs: 30_000, repeatMs: 10_000, tapMs: 20_000 };

export type LaneId = "a" | "b";
export type RaceProfile = "mobile" | "desktop";

/**
 * Sites the race knows by name. Anything else is a visitor's challenger URL.
 * The story is before → after: the original site as it was, never tuned, and
 * the same site rebuilt in Next.js specifically to be fast.
 */
export const RACE_PRESETS = {
  astro: { url: "https://hrconcretepumps.pages.dev/", role: "Before", label: "Original site", stack: "Original site · not optimized" },
  next: { url: "https://hr-concrete-pumps-next.pages.dev/", role: "After", label: "Next.js optimized site", stack: "Rebuilt in Next.js 16 · optimized" },
} as const;
export type RacePresetId = keyof typeof RACE_PRESETS;

/** Pages both builds share. A race loads the same path on every own-host lane. */
export const RACE_PAGES = {
  home: { path: "/", label: "Home", detail: "Hero photo slider, scene animation" },
  catalogue: { path: "/pumps/", label: "Pump catalogue", detail: "Model cards with product renders" },
  model: { path: "/boom-pumps/hr40-5rz/", label: "Model page", detail: "Large product renders and specifications" },
} as const;
export type RacePageId = keyof typeof RACE_PAGES;

/**
 * Hosts that belong to this project: either build's production alias, any of its
 * immutable deployment URLs (<hash>.project.pages.dev) and branch aliases, and the Next.js
 * build's Cloudflare Worker (edge stage). Lanes
 * on these hosts count as "ours" (not a visitor's challenger) and take the race page path.
 */
export const OWN_HOST_PATTERN = /^(?:(?:[a-z0-9-]+\.)?(?:hrconcretepumps|hr-concrete-pumps-next)\.pages\.dev|hr-concrete-pumps-next-edge\.a-tekhtelev\.workers\.dev)$/;

export type TimingMetrics = {
  /** Navigation Timing responseStart, ms from navigation start. */
  ttfb: number | null;
  fcp: number | null;
  lcp: number | null;
  /** DOMContentLoaded end. Not comparable across builds: async scripts do not delay it, module scripts do. */
  domContentLoaded: number | null;
  /** Load event end ("fully loaded"); null if it had not fired when the lane stopped. */
  load: number | null;
  /**
   * Time to Interactive (Lighthouse): start of the first 5 s with no long task and ≤ 2 requests
   * in flight after FCP. Null when the lane hit the cap first. Absent in v1 reports.
   */
  tti?: number | null;
  /**
   * Lighthouse TBT: long tasks clipped to [FCP, TTI], minus 50 ms each. If TTI was not reached
   * the window ends at the cap and this is a lower bound. (v1: tasks after FCP until the lane stopped.)
   */
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
  /** Uncompressed HTML as parsed by the browser (fetched text length). */
  htmlKb: number;
  /** The HTML document's transfer size on the wire (compressed, with headers). Absent in v1. */
  transferKb?: number;
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

/**
 * The first page in full, from the warm-up load before the clock starts: same page, viewport and
 * user agent, cache off, unthrottled, counted the same way as `network.totalKb` up to the load
 * event (everything "Fully loaded" waits for). No extra load and no extra time: the warm-up runs
 * anyway. A lane stopped at the cap had only part of it; this is the rest of the story.
 */
export type FullPageWeight = {
  kb: number;
  requests: number;
  /** False when the warm-up's load event did not fire in time: `kb` is then what had arrived (a lower bound). */
  loaded: boolean;
};

export type LaneMetrics = {
  /** Measurement method (see MEASURE_VERSION); absent means v1. */
  measure?: string;
  /** How long the lane was observed, ms of page time. */
  observedMs?: number;
  url: string;
  finalUrl: string;
  status: number | null;
  /** True when the lane hit the time cap before its stop condition (v2: load event + TTI quiet window). */
  capped: boolean;
  /** The cap this lane ran under, ms. Absent in the oldest races (see LEGACY_CAPS). */
  capMs?: number;
  /** The first page's full weight from the warm-up (site-race/2); null when the warm-up could not count it. */
  fullPage?: FullPageWeight | null;
  lcpDetail?: LcpDetail | null;
  images?: { byFormat: Record<string, ResourceBucket>; heaviest: HeavyResource[] };
  waterfall?: WaterfallEntry[];
  timing: TimingMetrics;
  network: NetworkMetrics;
  edge: EdgeMetrics;
  seo: SeoCheck[];
  document: DocumentMetrics;
  /** Second page: a click on a link both builds share, after the first load (absent in older races). */
  navigation?: NavigationMetrics | null;
  /**
   * Every tap of the journey in order (home → catalogue → model page); `navigation` is the last.
   * A partial result (site-race/2) lists the taps made so far and sets `navigation` only once all are done.
   */
  navigationSteps?: NavigationMetrics[];
  /** Journey races: the visitor tapped at this page time (ms), so load/TTI not reached by then are lower bounds. */
  tappedAt?: number;
  /** Page time (ms) when the first page's own observation ended: frames after it belong to the journey, not the first page. */
  firstPageEndMs?: number;
  /** The same URL loaded again in the same browser with the HTTP cache on (absent in older races). */
  repeat?: RepeatMetrics | null;
};

/** Requests in a measured window (requests started inside it only). */
export type WindowNetwork = {
  /** Bytes over the wire, Network.loadingFinished encodedDataLength (headers included), KB. */
  kb: number;
  /** Requests that went to the network (304 revalidations included). */
  network: number;
  /** Requests answered by the browser's cache without touching the network. */
  cached: number;
  /** Network requests answered 304 Not Modified (a revalidation round trip). */
  revalidated: number;
};

export type NavigationMetrics = {
  /** Path clicked from and to. */
  from: string;
  to: string;
  /** The link that was clicked, e.g. ".landing-action a" · "Explore concrete pumps". */
  link: string;
  input: "touch" | "mouse";
  /** Pointer on the link before the click (touchstart → touchend, or hover), ms. */
  dwellMs: number;
  /** null: the lane never got to click (first load stopped at the cap, or no such link). */
  skipped: string | null;
  /** No new document: the site swapped the page in with JavaScript. */
  soft: boolean | null;
  /** ms from the click (input event timeStamp) to the URL changing. */
  commit: number | null;
  /** …to the new page's h1 painted. */
  content: number | null;
  /** …to its largest in-viewport image loaded, decoded and painted. */
  image: number | null;
  imagePath: string | null;
  /** Stopped before the image painted: values missing are "> capMs". */
  capped: boolean;
  capMs: number;
  /** From the first input (pointer arrives or touchstart) to the end: intent prefetches count. */
  net: WindowNetwork;
};

export type RepeatMetrics = {
  skipped: string | null;
  /** Page timings of the reload, ms from its navigation start. */
  lcp: number | null;
  load: number | null;
  capped: boolean;
  capMs: number;
  net: WindowNetwork;
  /** The HTML document: status (200 or 304) and its bytes, KB. */
  html: { status: number | null; kb: number; cached: boolean } | null;
};

export type LanePhase = "queued" | "launching" | "loading" | "settling" | "inspecting" | "revisiting" | "navigating" | "done" | "failed";
export type MarkName = "ttfb" | "fcp" | "lcp" | "dcl" | "load";

export type RaceLaneInfo = { url: string; label: string; stack: string; preset: RacePresetId | null; own?: boolean };

/** The throttled connection both lanes load over: what a download time can be estimated from. */
export type RaceLink = { downMbps: number; rttMs: number };

/** Why a lane stopped at the cap: still downloading (no load event yet), or loaded but never quiet for TTI. */
export type CapReason = "loading" | "busy";

/** A partial result: the first page alone, or the first page plus the visit's steps so far. */
export type ResultStage = "first-page" | "visit";

export type RaceEvent =
  /** `capMs` is the first page's cap (absent in the oldest races); `caps` and `link` are site-race/2 (`link` null: unthrottled). */
  | { type: "start"; protocol: SiteRaceProtocol; raceId: string; profile: RaceProfile; profileLabel: string; page?: RacePageId; capMs?: number; caps?: RaceCaps; link?: RaceLink | null; lanes: Record<LaneId, RaceLaneInfo> }
  /** `cap` is set on the "settling" phase a lane enters when it hits the first-page cap (site-race/2). */
  | { type: "phase"; lane: LaneId; phase: LanePhase; detail?: string; cap?: CapReason }
  /** The warm-up load's count of the first page in full, sent before the timed load starts (site-race/2). */
  | { type: "warmup"; lane: LaneId; fullPage: FullPageWeight | null }
  /** performance.timeOrigin of the lane's page, epoch ms; frames are timed against it. */
  | { type: "origin"; lane: LaneId; timeOrigin: number }
  /** One screencast frame. `t` is ms since navigation start (may be negative before it). */
  | { type: "frame"; lane: LaneId; t: number; jpeg: string }
  | { type: "mark"; lane: LaneId; name: MarkName; t: number }
  | { type: "net"; lane: LaneId; requests: number; kb: number }
  /**
   * A lane's numbers. site-race/1: once, at the end. site-race/2: `partial` while the lane's visit
   * is still going (see SITE_RACE_PROTOCOL); each replaces the previous one, the last has no `partial`.
   */
  | { type: "result"; lane: LaneId; metrics: LaneMetrics; partial?: ResultStage }
  | { type: "error"; lane?: LaneId; message: string }
  /** `reportId` is set when the finished race was saved and can be reopened at /reports/<id>. */
  | { type: "done"; elapsedMs: number; reportId?: string };

/** One line of a race log: a recording or a saved report, newline-delimited JSON. */
export type RaceLogLine = { at: number; event: RaceEvent | { type: "recording"; recordedAt: string; reportId?: string; measure?: string; version?: string } };

/** What the list of saved races shows per race, kept in the KV key's metadata (≤ 1 KB). */
export type RaceReportSummary = {
  id: string;
  /** Measurement method of this report; absent = v1 (double-counted bytes). */
  measure?: string;
  /** Worker version id that ran the race, when known. */
  version?: string;
  savedAt: string;
  page: RacePageId;
  profile: RaceProfile;
  /** The first page's cap the race ran under, ms; absent in older rows (LEGACY_CAPS). */
  capMs?: number;
  lanes: Record<LaneId, { url: string; preset: RacePresetId | null; lcp: number | null; capped: boolean; kb: number }>;
};
