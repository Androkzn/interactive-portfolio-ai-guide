import puppeteer from "@cloudflare/puppeteer";
import type { Browser, CDPSession, Page } from "@cloudflare/puppeteer";
import { MEASURE_VERSION, RACE_CAPS } from "../../../packages/contracts/src/site-race";
import { newWire, onData, onFinished, onResponse, wireBytes as bytesOf, type Wire } from "./bytes";
import { afterFirstPage, journeyFor, navTargetFor, NetWindow, visitSnapshot, type VisitSoFar } from "./navigation";
import { computeTti, QUIET_WINDOW_MS, totalBlockingTime, type Req, type Task } from "./tti";
import type { FullPageWeight, HeavyResource, LaneId, LaneMetrics, LcpDetail, MarkName, RaceEvent, RaceLink, RaceProfile, ResourceBucket, ResourceType, ResultStage, SeoCheck, WaterfallEntry } from "../../../packages/contracts/src/site-race";

type Emit = (event: RaceEvent) => Promise<void>;

/** Same profiles as the HR projects' own scripts/perf-report.mjs, so numbers line up with their reports. */
export const PROFILES: Record<RaceProfile, { label: string; viewport: { width: number; height: number; deviceScaleFactor: number; isMobile: boolean; hasTouch: boolean }; network: { latency: number; downloadThroughput: number; uploadThroughput: number } | null; cpu: number; userAgent?: string }> = {
  mobile: {
    label: "Mobile · slow 4G (1.6 Mbps, 150 ms) · 4× CPU slowdown",
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    network: { latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 },
    cpu: 4,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 SiteRace/1",
  },
  desktop: {
    label: "Desktop · 1440px · no throttling",
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
    network: null,
    cpu: 1,
  },
};

/** The throttled link a profile loads over, for download-time estimates; null when unthrottled. */
export function linkOf(profile: RaceProfile): RaceLink | null {
  const network = PROFILES[profile].network;
  return network ? { downMbps: Math.round((network.downloadThroughput * 8) / 1e5) / 10, rttMs: network.latency } : null;
}

/**
 * A visitor's patience for the first page (RACE_CAPS): a page not done by 10 s is stopped there and
 * scores "> 10 s". 10 s is Nielsen's limit for keeping a user's attention (NN/g); on phones, 53% of
 * visits are likely to be abandoned past 3 s (Google, 2016). A lane that reaches TTI sooner stops on
 * its own rule. This is what makes the verdict arrive while the visitor is still watching.
 */
export const LANE_CAP_MS = RACE_CAPS.firstPageMs;
/** Safety net for the first page's navigation, never shorter than the cap: a slow page is capped (a result), not failed. */
const NAV_TIMEOUT_MS = LANE_CAP_MS + 20_000;
const SETTLE_MS = 1_200;
/** Unthrottled warm-up load per lane, in a discarded browser context, before the timed load. */
const WARM_TIMEOUT_MS = 10_000;
const FRAME_INTERVAL_MS = 200;

// Runs in the page before any of its own scripts.
const OBSERVERS = `(() => {
  const r = window.__race = { fcp: null, lcp: null, lcpEl: null, cls: 0, longTasks: [] };
  const watch = (type, cb) => { try { new PerformanceObserver((list) => cb(list.getEntries())).observe({ type, buffered: true }); } catch {} };
  watch("paint", (es) => { for (const e of es) if (e.name === "first-contentful-paint") r.fcp = e.startTime; });
  watch("largest-contentful-paint", (es) => { const e = es[es.length - 1]; if (!e) return; r.lcp = e.startTime; r.lcpEntry = e;
    const el = e.element; r.lcpEl = el ? (el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (e.url ? " · image" : " · text")) : null; });
  watch("layout-shift", (es) => { for (const e of es) if (!e.hadRecentInput) r.cls += e.value; });
  watch("longtask", (es) => { for (const e of es) r.longTasks.push([e.startTime, e.duration]); });
})();`;

type Snapshot = { ttfb: number | null; fcp: number | null; lcp: number | null; dcl: number | null; load: number | null; timeOrigin: number; now: number; longTasks: Task[] };

const SNAPSHOT = `(() => { const n = performance.getEntriesByType("navigation")[0]; const r = window.__race || {};
  const v = (x) => (typeof x === "number" && x > 0 ? Math.round(x) : null);
  return { ttfb: n ? v(n.responseStart) : null, fcp: v(r.fcp), lcp: v(r.lcp), dcl: n ? v(n.domContentLoadedEventEnd) : null, load: n ? v(n.loadEventEnd) : null, timeOrigin: performance.timeOrigin, now: performance.now(), longTasks: r.longTasks || [] }; })()`;

// True when an image inside the viewport, larger than the current LCP candidate,
// is still loading: the LCP will move once it paints, so the current one is not final.
const LCP_PENDING = `(() => {
  const e = (window.__race || {}).lcpEntry; const size = e ? e.size : 0;
  return [...document.images].some((img) => {
    if (img.complete && img.naturalWidth > 0) return false;
    // An image nobody can see (a hidden carousel slide, opacity 0 or visibility hidden on it or
    // an ancestor) or one not requested yet can't become the LCP until it is shown, so it must
    // not hold the LCP back.
    if (!img.currentSrc) return false;
    for (let el = img; el; el = el.parentElement) {
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return false;
    }
    const b = img.getBoundingClientRect();
    const visible = Math.max(0, Math.min(b.right, innerWidth) - Math.max(b.left, 0)) * Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0));
    return visible > size;
  });
})()`;

const INSPECT = `(() => {
  const r = window.__race || {}; const q = (s) => document.querySelector(s);
  const meta = (n) => q('meta[name="' + n + '"]')?.getAttribute("content")?.trim() || "";
  const og = (p) => q('meta[property="' + p + '"]')?.getAttribute("content")?.trim() || "";
  const imgs = [...document.images].filter((i) => i.getBoundingClientRect().width > 1);
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => { try { const j = JSON.parse(s.textContent || ""); const list = Array.isArray(j) ? j : j["@graph"] || [j]; return list.map((x) => x && x["@type"]).flat().filter(Boolean); } catch { return []; } });
  return {
    title: document.title.trim(), description: meta("description"), robots: meta("robots"),
    canonical: q('link[rel="canonical"]')?.getAttribute("href") || "", lang: document.documentElement.lang || "",
    viewport: meta("viewport"), h1: document.querySelectorAll("h1").length,
    hreflang: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
    ogTitle: og("og:title"), ogImage: og("og:image"), jsonLd: [...new Set(ld)].slice(0, 6),
    images: imgs.length, imagesWithAlt: imgs.filter((i) => i.hasAttribute("alt")).length,
    domNodes: document.getElementsByTagName("*").length,
    cls: Math.round((r.cls || 0) * 1000) / 1000, lcpEl: r.lcpEl || null,
    lcp: lcpDetail(), waterfall: waterfall(),
  };
  function lcpDetail() {
    const e = r.lcpEntry; if (!e) return null;
    const el = e.element && e.element.isConnected ? e.element : null;
    const rect = el ? el.getBoundingClientRect() : null;
    const img = el && el.tagName === "IMG" ? el : null;
    const cls = el && typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/)[0] : "";
    const file = (e.url || "").split("?")[0].split("/").pop() || "";
    const preloaded = !!e.url && [...document.querySelectorAll('link[rel="preload"][as="image"]')].some((l) => l.href === e.url || (!!file && ((l.getAttribute("imagesrcset") || "") + " " + (l.getAttribute("href") || "")).includes(file)));
    return {
      element: el ? el.tagName.toLowerCase() + cls : null, url: e.url || null,
      rect: rect ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height } : null,
      viewport: { width: innerWidth, height: innerHeight },
      fetchPriority: img ? img.getAttribute("fetchpriority") : null, loading: img ? img.getAttribute("loading") : null,
      responsive: !!img && (!!img.getAttribute("srcset") || (!!img.parentElement && img.parentElement.tagName === "PICTURE")),
      preloaded,
      natural: img && img.naturalWidth ? { width: img.naturalWidth, height: img.naturalHeight } : null,
      displayed: rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null,
    };
  }
  function waterfall() {
    const nav = performance.getEntriesByType("navigation")[0];
    const list = performance.getEntriesByType("resource").map((x) => ({ url: x.name, start: x.startTime, end: x.responseEnd, initiator: x.initiatorType, blocking: x.renderBlockingStatus === "blocking", size: x.transferSize || 0 }));
    if (nav) list.unshift({ url: nav.name, start: 0, end: nav.responseEnd, initiator: "navigation", blocking: false, size: nav.transferSize || 0 });
    return list.filter((x) => /^https?:/.test(x.url)).sort((a, b) => a.start - b.start).slice(0, 80);
  }
})()`;

type Inspect = {
  title: string; description: string; robots: string; canonical: string; lang: string; viewport: string; h1: number; hreflang: number;
  ogTitle: string; ogImage: string; jsonLd: string[]; images: number; imagesWithAlt: number; domNodes: number; cls: number; lcpEl: string | null;
  lcp: (Omit<LcpDetail, "path" | "kb" | "format"> & { url: string | null }) | null;
  waterfall: { url: string; start: number; end: number; initiator: string; blocking: boolean; size: number }[];
};

type Resp = { url: string; type: string; mime: string; status: number; headers: Record<string, string>; protocol: string | null; bytes: number; finished: boolean; redirect?: boolean };

const kb = (bytes: number) => Math.round((bytes / 1024) * 10) / 10;
const lower = (headers: Record<string, string>) => Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
const bucketOf = (type: string): keyof LaneMetrics["network"]["byType"] => {
  switch (type) {
    case "Document": return "document";
    case "Script": return "script";
    case "Stylesheet": return "stylesheet";
    case "Image": return "image";
    case "Font": return "font";
    default: return "other";
  }
};
const cacheStatus = (h: Record<string, string>) => h["cf-cache-status"] ?? h["x-vercel-cache"] ?? h["x-cache"] ?? h["x-nextjs-cache"] ?? null;
const isImmutable = (cc: string | undefined) => !!cc && (/immutable/.test(cc) || Number(/max-age=(\d+)/.exec(cc)?.[1] ?? 0) >= 31_536_000);

/**
 * Loads the lane's page once at full speed in a separate, discarded browser context, so
 * the CDN edge in front of it is warm. Same procedure for every lane. The timed load
 * that follows still starts cold on the browser side: its own context, HTTP cache
 * disabled, service workers bypassed, no connection reused (contexts do not share sockets).
 *
 * The same load also weighs the first page in full (the bytes its load event waits for), for a
 * lane the cap stops before it gets there: no extra load, no extra time. It fetches what the timed
 * load fetches: same URL, user agent and viewport, cache off, service workers bypassed. Only the
 * speed differs, and with it at most the timers that fire before the load event, so on a throttled
 * lane the real figure can only be higher: the weight is a lower bound, as the page says.
 */
async function warmUp(browser: Browser, url: string, profile: (typeof PROFILES)[RaceProfile], journey: boolean): Promise<FullPageWeight | null> {
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    if (profile.userAgent) await page.setUserAgent(profile.userAgent);
    await page.setViewport(profile.viewport);
    const cdp = await page.createCDPSession();
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.setBypassServiceWorker", { bypass: true }).catch(() => {});
    const net = new NetWindow(cdp);
    net.start();
    const loaded = await page.goto(url, { waitUntil: "load", timeout: WARM_TIMEOUT_MS }).then(() => true, () => false);
    net.stop();
    const counted = net.summary();
    net.dispose();
    const fullPage: FullPageWeight | null = counted.network > 0 ? { kb: counted.kb, requests: counted.network + counted.cached, loaded } : null;
    // The journey's pages too, reached the way the timed lane reaches them (a click on the same
    // link), so the edge also holds the second pages and any client-navigation payloads.
    if (journey) {
      for (const target of journeyFor(url)) {
        const clicked = await page.evaluate(`(() => { const a = document.querySelector(${JSON.stringify(target.selectors[0])}); if (!a) return false; a.click(); return true; })()`).catch(() => false);
        if (!clicked) break;
        await page.waitForFunction(`location.pathname === ${JSON.stringify(target.to)}`, { timeout: 5_000 }).catch(() => {});
        await page.waitForNetworkIdle({ idleTime: 400, timeout: 6_000 }).catch(() => {});
      }
    }
    return fullPage;
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * One lane. With `journeyEnabled` (both lanes are this project's builds) the visitor's visit goes on
 * after the first page has been measured completely: a repeat visit, then taps through the site.
 * The lane sends its own results: the first page as soon as it is measured, then again after each
 * step of the visit, then the whole visit (site-race/2), so the verdict never waits for the visit.
 */
/**
 * Both timed loads start together. Each lane launches, warms its site's CDN and sets up throttling
 * on its own, and those take different times (a page with background requests waits longer for the
 * network to go quiet); each lane then waits here, so the visitor sees both screens start at once.
 * A lane that fails before the start lets the other go; a lane stuck in its warm-up is not waited for
 * longer than the timeout. Timings are per lane from its own navigation either way.
 */
export type StartGate = { arrive: () => Promise<void>; abandon: () => void };
export function startGate(count: number, timeoutMs: number): StartGate {
  let waiting = count;
  let open!: () => void;
  const opened = new Promise<void>((resolve) => { open = resolve; });
  const timer = setTimeout(() => open(), timeoutMs);
  const done = () => { waiting -= 1; if (waiting <= 0) { clearTimeout(timer); open(); } };
  return { arrive: () => { done(); return opened; }, abandon: done };
}

export async function runLane(env: Env, lane: LaneId, url: string, profileId: RaceProfile, emit: Emit, signal: AbortSignal, journeyEnabled = false, gate?: StartGate): Promise<LaneMetrics | null> {
  const profile = PROFILES[profileId];
  let atGate = false;
  let browser: Browser | null = null;
  const responses = new Map<string, Resp>();
  const wires = new Map<string, Wire>();
  let lastFrameAt = 0;
  // The newest frame that the 200 ms thinning dropped: flushed when the first page ends, so its
  // final visual state is always recorded (it is the "visually complete" target for Speed Index),
  // and again when the journey ends, so the lane's last frame is its last page as it settled.
  let trailing: { abs: number; jpeg: string } | null = null;
  let timeOrigin: number | null = null;
  const flushTrailing = async () => {
    if (!trailing || timeOrigin === null) return;
    const last = trailing as { abs: number; jpeg: string };
    trailing = null;
    await emit({ type: "frame", lane, t: Math.round(last.abs - timeOrigin), jpeg: last.jpeg }).catch(() => {});
  };
  const pendingFrames: { abs: number; jpeg: string }[] = [];
  const marks = new Map<MarkName, number>();
  let netTimer: ReturnType<typeof setInterval> | null = null;

  let capped = false;
  // Every http(s) request the page issued, on the browser's monotonic clock (seconds):
  // places still-downloading requests on the waterfall (Resource Timing lists only finished
  // ones), counts requests, and gives the in-flight timeline for TTI's network-quiet rule.
  const requested = new Map<string, { url: string; ts: number; type: string; end: number | null }>();
  let navTs: number | null = null;
  const failed = new Set<string>();
  let redirects = 0;
  const bytesNow = (id: string, r: Resp) => (r.redirect ? r.bytes : bytesOf(wires.get(id) ?? newWire()));
  const totalBytes = () => {
    let total = 0;
    for (const [id, r] of responses) if (/^https?:/.test(r.url)) total += bytesNow(id, r);
    return total;
  };
  const requestCount = () => [...requested.values()].filter((q) => /^https?:/.test(q.url)).length + redirects;
  const pageMs = (ts: number) => (navTs === null ? 0 : (ts - navTs) * 1000);
  const netTimeline = (): Req[] => [...requested.values()]
    .filter((q) => /^https?:/.test(q.url))
    .map((q) => ({ start: pageMs(q.ts), end: q.end === null ? null : pageMs(q.end) }));
  const adoptOrigin = async (origin: number) => {
    timeOrigin = origin;
    await emit({ type: "origin", lane, timeOrigin: origin });
    for (const f of pendingFrames.splice(0)) await emit({ type: "frame", lane, t: Math.round(f.abs - origin), jpeg: f.jpeg });
  };

  /** Emits a milestone once; `update` re-sends it if the final value differs from what was shown. */
  const emitMark = async (name: MarkName, t: number | null, update = false) => {
    if (t === null || (marks.has(name) && (!update || marks.get(name) === t))) return;
    marks.set(name, t);
    await emit({ type: "mark", lane, name, t });
  };

  try {
    await emit({ type: "phase", lane, phase: "launching" });
    browser = await puppeteer.launch(env.BROWSER, { keep_alive: 60_000 });
    const journey = journeyEnabled && navTargetFor(url) !== null;
    const fullPage = await warmUp(browser, url, profile, journey);
    // Before the clock starts, so a lane that the cap stops can say at once what it would have had to download.
    await emit({ type: "warmup", lane, fullPage });
    if (signal.aborted) return null;
    const context = await browser.createBrowserContext();
    const page: Page = await context.newPage();
    if (profile.userAgent) await page.setUserAgent(profile.userAgent);
    await page.setViewport(profile.viewport);
    await page.evaluateOnNewDocument(OBSERVERS);
    const cdp: CDPSession = await page.createCDPSession();
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.setBypassServiceWorker", { bypass: true }).catch(() => {});
    if (profile.network) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...profile.network });
    if (profile.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });

    cdp.on("Network.requestWillBeSent", (e) => {
      // A redirect reuses the request id: keep the hop as its own response and request.
      if (e.redirectResponse) {
        const hop = e.redirectResponse;
        redirects += 1;
        responses.set(`${e.requestId}:r${redirects}`, { url: hop.url, type: e.type ?? "Other", mime: hop.mimeType, status: hop.status, headers: lower(hop.headers as Record<string, string>), protocol: hop.protocol ?? null, bytes: Math.max(0, hop.encodedDataLength ?? 0), finished: true, redirect: true });
        wires.delete(e.requestId);
      }
      const known = requested.get(e.requestId);
      requested.set(e.requestId, { url: e.request.url, ts: known?.ts ?? e.timestamp, type: e.type ?? "Other", end: null });
      if (navTs === null && e.type === "Document") navTs = e.timestamp;
    });
    cdp.on("Network.responseReceived", (e) => {
      const r = e.response;
      const headers = lower(r.headers as Record<string, string>);
      responses.set(e.requestId, { url: r.url, type: e.type ?? "Other", mime: r.mimeType, status: r.status, headers, protocol: r.protocol ?? null, bytes: 0, finished: false });
      const w = newWire();
      onResponse(w, r.encodedDataLength, headers["content-encoding"]);
      wires.set(e.requestId, w);
    });
    cdp.on("Network.dataReceived", (e) => {
      const w = wires.get(e.requestId);
      if (w) onData(w, e.dataLength, e.encodedDataLength);
    });
    cdp.on("Network.loadingFinished", (e) => {
      const w = wires.get(e.requestId);
      if (w) onFinished(w, e.encodedDataLength);
      const r = responses.get(e.requestId);
      if (r) r.finished = true;
      const q = requested.get(e.requestId);
      if (q) q.end = e.timestamp;
    });
    cdp.on("Network.loadingFailed", (e) => {
      failed.add(e.requestId);
      const q = requested.get(e.requestId);
      if (q) q.end = e.timestamp;
    });

    cdp.on("Page.screencastFrame", (frame) => {
      void cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
      const abs = (frame.metadata.timestamp ?? Date.now() / 1000) * 1000;
      if (abs - lastFrameAt < FRAME_INTERVAL_MS) { trailing = { abs, jpeg: frame.data }; return; }
      trailing = null;
      lastFrameAt = abs;
      if (timeOrigin === null) pendingFrames.push({ abs, jpeg: frame.data });
      else void emit({ type: "frame", lane, t: Math.round(abs - timeOrigin), jpeg: frame.data }).catch(() => {});
    });
    atGate = true;
    if (gate) {
      await emit({ type: "phase", lane, phase: "launching", detail: "Ready — waiting for the other browser" }).catch(() => {});
      await gate.arrive();
    }
    if (signal.aborted) return null;
    await cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 38,
      maxWidth: profileId === "mobile" ? 300 : 560,
      maxHeight: profileId === "mobile" ? 650 : 350,
      everyNthFrame: 1,
    });

    netTimer = setInterval(() => {
      void emit({ type: "net", lane, requests: requestCount(), kb: kb(totalBytes()) }).catch(() => {});
    }, 400);

    await emit({ type: "phase", lane, phase: "loading" });
    const startedAt = Date.now();
    let navError: unknown = null;
    let committed = false;
    const navigation = page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS }).then(() => { committed = true; }, (error) => { navError = error; });
    const navWall = Date.now();

    // Poll the page's own timeline so milestones light up as they happen. Every lane follows
    // the same stop rule: the load event has fired AND TTI is established (5 s with no long
    // task and ≤ 2 requests in flight, Lighthouse's rule) — so TBT has the same, standard
    // window on both sides — or the cap: a 6 MB page on slow 4G may never get there, and
    // that is a result too.
    let tti: number | null = null;
    let settlingShown = false;
    let last: Snapshot | null = null;
    while (!signal.aborted) {
      await Promise.race([navigation, new Promise((resolve) => setTimeout(resolve, 250))]);
      if (navError) throw navError;
      const snap = (await page.evaluate(SNAPSHOT).catch(() => null)) as Snapshot | null;
      if (snap && snap.timeOrigin > 0) {
        last = snap;
        if (timeOrigin === null && snap.ttfb !== null) await adoptOrigin(snap.timeOrigin);
        await emitMark("ttfb", snap.ttfb);
        await emitMark("fcp", snap.fcp);
        await emitMark("dcl", snap.dcl);
        await emitMark("load", snap.load);
        if (committed && snap.load !== null) {
          // After load every image in the DOM has loaded: the LCP is final unless a bigger one
          // is still coming into the viewport. Show it now rather than when the lane stops.
          if (!marks.has("lcp") && snap.lcp !== null && !((await page.evaluate(LCP_PENDING).catch(() => true)) as boolean)) await emitMark("lcp", snap.lcp);
          if (!settlingShown) { settlingShown = true; await emit({ type: "phase", lane, phase: "settling" }); }
          tti = computeTti(snap.fcp, snap.longTasks, netTimeline(), snap.now);
          if (tti !== null) break;
        }
      }
      // The patience cap bounds when the page becomes usable, not Lighthouse's confirmation of it:
      // TTI is only known after a 5 s quiet window, so a page that loaded within the cap is watched
      // for one more window past it. Any TTI found that way began before the cap.
      const loadedInTime = last?.load != null && last.load <= LANE_CAP_MS;
      if (Date.now() - startedAt > LANE_CAP_MS + (loadedInTime ? QUIET_WINDOW_MS : 0)) { capped = true; break; }
    }
    if (signal.aborted) return null;
    // Interactive only after the visitor's patience ran out: that is the cap too.
    if (tti !== null && tti > LANE_CAP_MS) { tti = null; capped = true; }
    const stoppedAt = Date.now() - navWall;

    if (capped) {
      const loading = last?.load == null;
      const detail = loading ? `Still downloading at the ${LANE_CAP_MS / 1000} s cap` : `Main thread or network still busy at the ${LANE_CAP_MS / 1000} s cap`;
      await emit({ type: "phase", lane, phase: "settling", detail, cap: loading ? "loading" : "busy" });
      // Only a capped lane needs the grace period: a lane that stopped on its own rule is quiet already.
      await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    }
    const snap = (await page.evaluate(SNAPSHOT)) as Snapshot;
    // A lane still loading may yet paint a bigger LCP: it counts only if nothing bigger is loading in the viewport.
    const lcpFinal = snap.load !== null || !((await page.evaluate(LCP_PENDING).catch(() => true)) as boolean);
    if (timeOrigin === null) await adoptOrigin(snap.timeOrigin);
    await emitMark("ttfb", snap.ttfb);
    await emitMark("fcp", snap.fcp);
    await emitMark("dcl", snap.dcl);
    if (lcpFinal) await emitMark("lcp", snap.lcp, true);
    await emitMark("load", snap.load);
    await cdp.send("Page.stopScreencast").catch(() => {});
    await flushTrailing();
    const observedMs = Math.round(snap.now);
    // TBT window: [FCP, TTI]; a capped lane without TTI is counted to where it was stopped (lower bound).
    const tbt = totalBlockingTime(snap.longTasks, snap.fcp, tti ?? observedMs);

    await emit({ type: "phase", lane, phase: "inspecting" });
    const inspect = (await page.evaluate(INSPECT)) as Inspect;
    const finalUrl = page.url();
    for (const [id, r] of responses) r.bytes = bytesNow(id, r);
    // The first page's own requests, frozen where its measurement ended: what the visit fetches next is counted apart.
    const firstPage = [...responses.values()].map((r) => ({ ...r }));
    const firstRequests = requestCount();
    const startOf = (id: string) => {
      const sent = requested.get(id);
      return sent && navTs !== null ? Math.max(0, Math.round((sent.ts - navTs) * 1000)) : 0;
    };
    // Taken here, where the first page stopped: once the visit starts, these finish and new ones begin.
    const inFlight = [
      // Responding but not finished…
      ...[...responses.entries()].filter(([id, r]) => !r.finished && !failed.has(id)).map(([id, r]) => ({ url: r.url, type: r.type, start: startOf(id), bytes: r.bytes })),
      // …and requested but still waiting for a response (queued behind the bandwidth).
      ...[...requested.entries()].filter(([id]) => !responses.has(id) && !failed.has(id)).map(([id, q]) => ({ url: q.url, type: q.type, start: startOf(id), bytes: 0 })),
    ].map((item) => ({ ...item, end: Math.max(item.start, stoppedAt) }));
    // The Worker's own checks (the HTML as served, warm edge fetches, robots.txt, sitemap) take a
    // moment and need nothing more from the browser, so the visit starts without waiting for them.
    const measured = assemble(url, finalUrl, snap, inspect, firstPage, capped, inFlight, lcpFinal, { tti, tbt, observedMs, requests: firstRequests })
      .then((m): LaneMetrics => ({ ...m, firstPageEndMs: observedMs, fullPage }));
    measured.catch(() => {});
    // Every result holds all the lane knows so far; they go out in order and never hold the visit up.
    const taps = journey ? journeyFor(url).length : 0;
    let sent: Promise<void> = Promise.resolve();
    const send = (visit: VisitSoFar | null, partial?: ResultStage) => {
      sent = sent.then(async () => emit({ type: "result", lane, metrics: visitSnapshot(await measured, visit, taps), ...(partial ? { partial } : {}) })).catch(() => {});
    };
    if (journey) send(null, "first-page");
    const looks = journey ? await afterFirstPage(page, cdp, url, profileId, lane, emit, { network: profile.network, onStep: (visit) => send(visit, "visit") }, signal) : null;
    if (looks) await flushTrailing();
    const metrics: LaneMetrics = looks ? { ...(await measured), ...looks } : await measured;
    await sent;
    await emit({ type: "result", lane, metrics });
    await emit({ type: "phase", lane, phase: "done" });
    return metrics;
  } catch (error) {
    // The navigation's own timeout is longer than the cap, so a timeout here is the browser's, not the page's.
    const message = error instanceof Error && /timeout/i.test(error.message)
      ? "The browser timed out on this page."
      : "The browser could not load this page.";
    await emit({ type: "phase", lane, phase: "failed", detail: message }).catch(() => {});
    await emit({ type: "error", lane, message }).catch(() => {});
    return null;
  } finally {
    // A lane that never reached the start does not hold the other one back.
    if (gate && !atGate) gate.abandon();
    if (netTimer) clearInterval(netTimer);
    await browser?.close().catch(() => {});
  }
}

type InFlight = { url: string; type: string; start: number; end: number; bytes: number };

async function assemble(url: string, finalUrl: string, snap: Snapshot, inspect: Inspect, all: Resp[], capped: boolean, inFlight: InFlight[] = [], lcpFinal = true, extra: { tti: number | null; tbt: number | null; observedMs: number; requests: number }): Promise<LaneMetrics> {
  const origin = new URL(finalUrl).origin;
  const site = new URL(finalUrl).hostname.split(".").slice(-2).join(".");
  const doc = all.find((r) => r.type === "Document" && !r.redirect && r.url === finalUrl) ?? all.find((r) => r.type === "Document" && !r.redirect);
  const byType: LaneMetrics["network"]["byType"] = { document: b(), script: b(), stylesheet: b(), image: b(), font: b(), other: b() };
  let total = 0;
  const thirdParty = new Set<string>();
  let staticAssets = 0, immutableAssets = 0, edgeHitAssets = 0, textAssets = 0, compressedTextAssets = 0;
  for (const r of all) {
    if (!/^https?:/.test(r.url)) continue;
    const bucket = byType[bucketOf(r.type)];
    bucket.count += 1;
    bucket.kb = Math.round((bucket.kb + r.bytes / 1024) * 10) / 10;
    total += r.bytes;
    const host = new URL(r.url).hostname;
    if (!host.endsWith(site)) thirdParty.add(host);
    const sameOrigin = new URL(r.url).origin === origin;
    if (sameOrigin && ["Script", "Stylesheet", "Font", "Image"].includes(r.type)) {
      staticAssets += 1;
      if (isImmutable(r.headers["cache-control"])) immutableAssets += 1;
      if (cacheStatus(r.headers)?.toUpperCase() === "HIT") edgeHitAssets += 1;
    }
    if (/html|javascript|css|svg|json|text\//.test(r.mime) && r.status === 200) {
      textAssets += 1;
      if (/br|zstd|gzip|deflate/.test(r.headers["content-encoding"] ?? "")) compressedTextAssets += 1;
    }
  }

  const [html, edgeHtmlMs, robotsTxt, sitemapXml] = await Promise.all([
    fetchText(finalUrl),
    edgeTiming(finalUrl),
    probe(`${origin}/robots.txt`, /user-agent|sitemap|disallow|allow/i),
    probe(`${origin}/sitemap.xml`, /<urlset|<sitemapindex/i),
  ]);
  const wordsWithoutJs = html ? visibleWords(html) : 0;

  const xRobots = doc?.headers["x-robots-tag"] ?? "";
  const indexable = !/noindex/i.test(inspect.robots) && !/noindex/i.test(xRobots);
  const altShare = inspect.images ? inspect.imagesWithAlt / inspect.images : 1;
  const seo: SeoCheck[] = [
    { id: "indexable", label: "Indexable", pass: indexable, detail: indexable ? "No noindex in meta robots or X-Robots-Tag" : `noindex via ${/noindex/i.test(xRobots) ? "X-Robots-Tag header" : "meta robots"}` },
    { id: "prerendered", label: "Content in the HTML", pass: wordsWithoutJs >= 150, detail: `${wordsWithoutJs} words readable before JavaScript runs` },
    { id: "title", label: "Title", pass: inspect.title.length >= 10 && inspect.title.length <= 65, detail: inspect.title ? `${inspect.title.length} characters` : "Missing" },
    { id: "description", label: "Meta description", pass: inspect.description.length >= 50 && inspect.description.length <= 170, detail: inspect.description ? `${inspect.description.length} characters` : "Missing" },
    { id: "canonical", label: "Canonical URL", pass: !!inspect.canonical, detail: inspect.canonical || "Missing" },
    { id: "h1", label: "One H1", pass: inspect.h1 === 1, detail: `${inspect.h1} found` },
    { id: "lang", label: "Language declared", pass: !!inspect.lang, detail: inspect.lang || "Missing <html lang>" },
    { id: "hreflang", label: "Language alternates", pass: inspect.hreflang > 0, detail: inspect.hreflang ? `${inspect.hreflang} hreflang links` : "None" },
    { id: "structured-data", label: "Structured data", pass: inspect.jsonLd.length > 0, detail: inspect.jsonLd.length ? inspect.jsonLd.join(", ") : "No JSON-LD" },
    { id: "social", label: "Social preview", pass: !!inspect.ogTitle && !!inspect.ogImage, detail: inspect.ogTitle && inspect.ogImage ? "og:title and og:image" : "Open Graph incomplete" },
    { id: "alt", label: "Image alt text", pass: altShare >= 0.9, detail: `${inspect.imagesWithAlt}/${inspect.images} images` },
    { id: "robots-sitemap", label: "robots.txt + sitemap", pass: robotsTxt && sitemapXml, detail: `robots.txt ${robotsTxt ? "✓" : "✗"} · sitemap.xml ${sitemapXml ? "✓" : "✗"}` },
  ];

  const byUrl = new Map<string, Resp>();
  for (const r of all) {
    const known = byUrl.get(r.url);
    if (!known || r.bytes > known.bytes) byUrl.set(r.url, r);
  }
  const images = imageBreakdown(all, origin);
  const lcpDetail: LcpDetail | null = inspect.lcp ? (() => {
    const { url: lcpUrl, ...rest } = inspect.lcp;
    const resp = lcpUrl ? byUrl.get(lcpUrl) : undefined;
    return { ...rest, path: lcpUrl ? shortPath(lcpUrl, origin) : "", kb: resp ? kb(resp.bytes) : null, format: resp ? formatOf(resp.mime) : lcpUrl ? formatOf(extMime(lcpUrl)) : null };
  })() : null;
  const waterfall: WaterfallEntry[] = inspect.waterfall.map((entry) => {
    const resp = byUrl.get(entry.url);
    return {
      path: shortPath(entry.url, origin),
      type: resp ? bucketOf(resp.type) : initiatorType(entry.initiator, entry.url),
      start: Math.round(entry.start),
      end: Math.round(Math.max(entry.end, entry.start)),
      kb: kb(resp?.bytes || entry.size),
      blocking: entry.blocking,
      thirdParty: !new URL(entry.url).hostname.endsWith(site),
    };
  });
  const listed = new Set(inspect.waterfall.map((entry) => entry.url));
  for (const pending of inFlight) {
    if (listed.has(pending.url) || !/^https?:/.test(pending.url)) continue;
    waterfall.push({
      path: shortPath(pending.url, origin), type: bucketOf(pending.type), start: pending.start, end: pending.end,
      kb: kb(pending.bytes), blocking: false, thirdParty: !new URL(pending.url).hostname.endsWith(site), inFlight: true,
    });
  }
  waterfall.sort((x, y) => x.start - y.start);

  return {
    measure: MEASURE_VERSION,
    observedMs: extra.observedMs,
    capped,
    capMs: LANE_CAP_MS,
    lcpDetail,
    images,
    waterfall,
    url,
    finalUrl,
    status: doc?.status ?? null,
    // A capped lane still loading a bigger in-viewport image has no final LCP yet.
    timing: { ttfb: snap.ttfb, fcp: snap.fcp, lcp: lcpFinal ? snap.lcp : null, domContentLoaded: snap.dcl, load: snap.load, tti: extra.tti, tbt: extra.tbt, cls: inspect.cls },
    network: { requests: extra.requests, totalKb: kb(total), byType, protocol: doc?.protocol ?? null, thirdPartyHosts: [...thirdParty].slice(0, 12) },
    edge: {
      documentCache: doc ? cacheStatus(doc.headers) : null,
      documentCacheControl: doc?.headers["cache-control"] ?? null,
      documentEncoding: doc?.headers["content-encoding"] ?? null,
      server: doc?.headers["server"] ?? null,
      staticAssets, immutableAssets, edgeHitAssets, textAssets, compressedTextAssets,
      edgeHtmlMs, robotsTxt, sitemapXml,
    },
    seo,
    document: { htmlKb: kb(html ? new TextEncoder().encode(html).length : 0), transferKb: doc ? kb(doc.bytes) : undefined, domNodes: inspect.domNodes, wordsWithoutJs, lcpElement: inspect.lcpEl },
  };
}

function b(): ResourceBucket { return { count: 0, kb: 0 }; }

/** "image/svg+xml" → "svg", "image/jpeg" → "jpeg". */
export function formatOf(mime: string | undefined): string | null {
  if (!mime || !mime.startsWith("image/")) return null;
  const sub = mime.slice(6).split(";")[0].trim();
  if (sub.startsWith("svg")) return "svg";
  if (sub === "jpg" || sub === "pjpeg") return "jpeg";
  if (sub === "x-icon" || sub === "vnd.microsoft.icon") return "ico";
  return sub;
}

function extMime(url: string): string {
  const ext = /\.([a-z0-9]+)(?:$|[?#])/i.exec(url)?.[1]?.toLowerCase() ?? "";
  return ({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif", svg: "image/svg+xml", gif: "image/gif" } as Record<string, string>)[ext] ?? "";
}

function initiatorType(initiator: string, url: string): ResourceType {
  if (initiator === "navigation") return "document";
  if (initiator === "script") return "script";
  if (initiator === "css" && /\.woff2?|\.ttf|\.otf/i.test(url)) return "font";
  if (initiator === "img" || initiator === "image" || extMime(url)) return "image";
  if (initiator === "link" && /\.css(?:$|\?)/i.test(url)) return "stylesheet";
  return "other";
}

/** Same-origin URLs become their path; others keep the host. Long paths keep their tail. */
export function shortPath(url: string, origin: string): string {
  try {
    const u = new URL(url);
    const text = u.origin === origin ? u.pathname : `${u.hostname}${u.pathname}`;
    return text.length > 64 ? `…${text.slice(-63)}` : text;
  } catch {
    return url.slice(0, 64);
  }
}

function imageBreakdown(all: Resp[], origin: string): { byFormat: Record<string, ResourceBucket>; heaviest: HeavyResource[] } {
  const byFormat: Record<string, ResourceBucket> = {};
  for (const r of all) {
    const format = formatOf(r.mime) ?? (r.type === "Image" ? "other" : null);
    if (!format) continue;
    const bucket = (byFormat[format] ??= b());
    bucket.count += 1;
    bucket.kb = Math.round((bucket.kb + r.bytes / 1024) * 10) / 10;
  }
  const heaviest = [...all]
    .filter((r) => /^https?:/.test(r.url) && r.bytes > 0)
    .sort((x, y) => y.bytes - x.bytes)
    .slice(0, 6)
    .map((r) => ({ path: shortPath(r.url, origin), type: bucketOf(r.type), kb: kb(r.bytes), format: formatOf(r.mime) }));
  return { byFormat, heaviest };
}

const FETCH_INIT: RequestInit = { headers: { "user-agent": "Mozilla/5.0 SiteRace/1 (+https://andreitekhtelev.dev)", accept: "text/html,*/*" }, redirect: "follow" };

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { ...FETCH_INIT, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 3_000_000);
  } catch { return null; }
}

/** Three back-to-back HTML fetches from the Worker: what the edge returns once warm. */
async function edgeTiming(url: string): Promise<number | null> {
  const samples: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    const started = performance.now();
    try {
      const res = await fetch(url, { ...FETCH_INIT, signal: AbortSignal.timeout(6_000) });
      await res.arrayBuffer();
      samples.push(performance.now() - started);
    } catch { /* skip sample */ }
  }
  if (!samples.length) return null;
  samples.sort((x, y) => x - y);
  // Workers freeze performance.now() between I/O, so a 0 here means "under the timer's resolution".
  return Math.round(samples[Math.floor(samples.length / 2)]);
}

async function probe(url: string, pattern: RegExp): Promise<boolean> {
  try {
    const res = await fetch(url, { ...FETCH_INIT, signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return false;
    return pattern.test((await res.text()).slice(0, 20_000));
  } catch { return false; }
}

export function visibleWords(html: string): number {
  const body = /<body[\s\S]*<\/body>/i.exec(html)?.[0] ?? html;
  const text = body
    .replace(/<(script|style|noscript|template|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ");
  return text.split(/\s+/).filter((word) => /\p{L}{2,}/u.test(word)).length;
}
