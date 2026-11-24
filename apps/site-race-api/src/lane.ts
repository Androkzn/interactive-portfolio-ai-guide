import puppeteer from "@cloudflare/puppeteer";
import type { Browser, CDPSession, Page } from "@cloudflare/puppeteer";
import type { HeavyResource, LaneId, LaneMetrics, LcpDetail, MarkName, RaceEvent, RaceProfile, ResourceBucket, ResourceType, SeoCheck, WaterfallEntry } from "../../../packages/contracts/src/site-race";

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

const NAV_TIMEOUT_MS = 30_000;
const SETTLE_MS = 1_200;
const QUIET_MS = 2_500;
export const LANE_CAP_MS = 30_000;
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

type Snapshot = { ttfb: number | null; fcp: number | null; lcp: number | null; dcl: number | null; load: number | null; timeOrigin: number };

const SNAPSHOT = `(() => { const n = performance.getEntriesByType("navigation")[0]; const r = window.__race || {};
  const v = (x) => (typeof x === "number" && x > 0 ? Math.round(x) : null);
  return { ttfb: n ? v(n.responseStart) : null, fcp: v(r.fcp), lcp: v(r.lcp), dcl: n ? v(n.domContentLoadedEventEnd) : null, load: n ? v(n.loadEventEnd) : null, timeOrigin: performance.timeOrigin }; })()`;

// True when an image inside the viewport, larger than the current LCP candidate,
// is still loading: the LCP will move once it paints, so the current one is not final.
const LCP_PENDING = `(() => {
  const e = (window.__race || {}).lcpEntry; const size = e ? e.size : 0;
  return [...document.images].some((img) => {
    if (img.complete && img.naturalWidth > 0) return false;
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
  const fcp = r.fcp || 0; const tbt = (r.longTasks || []).filter(([s]) => s >= fcp).reduce((sum, [, d]) => sum + Math.max(0, d - 50), 0);
  return {
    title: document.title.trim(), description: meta("description"), robots: meta("robots"),
    canonical: q('link[rel="canonical"]')?.getAttribute("href") || "", lang: document.documentElement.lang || "",
    viewport: meta("viewport"), h1: document.querySelectorAll("h1").length,
    hreflang: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
    ogTitle: og("og:title"), ogImage: og("og:image"), jsonLd: [...new Set(ld)].slice(0, 6),
    images: imgs.length, imagesWithAlt: imgs.filter((i) => i.hasAttribute("alt")).length,
    domNodes: document.getElementsByTagName("*").length,
    cls: Math.round((r.cls || 0) * 1000) / 1000, tbt: Math.round(tbt), lcpEl: r.lcpEl || null,
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
  ogTitle: string; ogImage: string; jsonLd: string[]; images: number; imagesWithAlt: number; domNodes: number; cls: number; tbt: number; lcpEl: string | null;
  lcp: (Omit<LcpDetail, "path" | "kb" | "format"> & { url: string | null }) | null;
  waterfall: { url: string; start: number; end: number; initiator: string; blocking: boolean; size: number }[];
};

type Resp = { url: string; type: string; mime: string; status: number; headers: Record<string, string>; protocol: string | null; bytes: number; finished: boolean };

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

export async function runLane(env: Env, lane: LaneId, url: string, profileId: RaceProfile, emit: Emit, signal: AbortSignal): Promise<LaneMetrics | null> {
  const profile = PROFILES[profileId];
  let browser: Browser | null = null;
  const responses = new Map<string, Resp>();
  let lastFrameAt = 0;
  let timeOrigin: number | null = null;
  const pendingFrames: { abs: number; jpeg: string }[] = [];
  const marks = new Set<MarkName>();
  let netTimer: ReturnType<typeof setInterval> | null = null;

  let capped = false;
  // Bytes on the wire per request as they arrive. loadingFinished only reports a
  // request's size once it completes, so a 2 MB image still streaming would
  // otherwise look like a quiet network.
  const received = new Map<string, number>();
  // Start of every request on the browser's monotonic clock (seconds), to place
  // still-downloading requests on the waterfall: Resource Timing only lists finished ones.
  const requested = new Map<string, { url: string; ts: number; type: string }>();
  let navTs: number | null = null;
  const failed = new Set<string>();
  let lastActivity = Date.now();
  const touch = () => { lastActivity = Date.now(); };
  const wireBytes = () => {
    let total = 0;
    for (const [id, bytes] of received) {
      const r = responses.get(id);
      total += r?.finished ? r.bytes : bytes;
    }
    for (const [id, r] of responses) if (!received.has(id)) total += r.bytes;
    return total;
  };
  const adoptOrigin = async (origin: number) => {
    timeOrigin = origin;
    await emit({ type: "origin", lane, timeOrigin: origin });
    for (const f of pendingFrames.splice(0)) await emit({ type: "frame", lane, t: Math.round(f.abs - origin), jpeg: f.jpeg });
  };

  const emitMark = async (name: MarkName, t: number | null) => {
    if (t === null || marks.has(name)) return;
    marks.add(name);
    await emit({ type: "mark", lane, name, t });
  };

  try {
    await emit({ type: "phase", lane, phase: "launching" });
    browser = await puppeteer.launch(env.BROWSER, { keep_alive: 60_000 });
    const page: Page = await browser.newPage();
    if (profile.userAgent) await page.setUserAgent(profile.userAgent);
    await page.setViewport(profile.viewport);
    await page.evaluateOnNewDocument(OBSERVERS);
    const cdp: CDPSession = await page.createCDPSession();
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    if (profile.network) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...profile.network });
    if (profile.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });

    cdp.on("Network.requestWillBeSent", (e) => {
      touch();
      requested.set(e.requestId, { url: e.request.url, ts: e.timestamp, type: e.type ?? "Other" });
      if (navTs === null && e.type === "Document") navTs = e.timestamp;
    });
    cdp.on("Network.responseReceived", (e) => {
      touch();
      const r = e.response;
      responses.set(e.requestId, { url: r.url, type: e.type ?? "Other", mime: r.mimeType, status: r.status, headers: lower(r.headers as Record<string, string>), protocol: r.protocol ?? null, bytes: 0, finished: false });
    });
    cdp.on("Network.dataReceived", (e) => {
      touch();
      received.set(e.requestId, (received.get(e.requestId) ?? 0) + (e.encodedDataLength || e.dataLength || 0));
      const r = responses.get(e.requestId);
      if (r && !r.finished) r.bytes = received.get(e.requestId) ?? 0;
    });
    cdp.on("Network.loadingFinished", (e) => {
      touch();
      const r = responses.get(e.requestId);
      if (r) { r.bytes = Math.max(e.encodedDataLength, r.bytes); r.finished = true; }
    });
    cdp.on("Network.loadingFailed", (e) => { touch(); failed.add(e.requestId); });

    cdp.on("Page.screencastFrame", (frame) => {
      void cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
      const abs = (frame.metadata.timestamp ?? Date.now() / 1000) * 1000;
      if (abs - lastFrameAt < FRAME_INTERVAL_MS) return;
      lastFrameAt = abs;
      if (timeOrigin === null) pendingFrames.push({ abs, jpeg: frame.data });
      else void emit({ type: "frame", lane, t: Math.round(abs - timeOrigin), jpeg: frame.data }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 38,
      maxWidth: profileId === "mobile" ? 300 : 560,
      maxHeight: profileId === "mobile" ? 650 : 350,
      everyNthFrame: 1,
    });

    netTimer = setInterval(() => {
      void emit({ type: "net", lane, requests: responses.size, kb: kb(wireBytes()) }).catch(() => {});
    }, 400);

    await emit({ type: "phase", lane, phase: "loading" });
    const startedAt = Date.now();
    let navError: unknown = null;
    let committed = false;
    const navigation = page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS }).then(() => { committed = true; }, (error) => { navError = error; });
    const navWall = Date.now();

    // Poll the page's own timeline so milestones light up as they happen. The lane ends at
    // the load event, or once the page has painted its LCP and no byte has arrived for
    // QUIET_MS, or at the cap: a 6 MB page on slow 4G may never fire load inside a demo,
    // and that is a result too.
    while (!signal.aborted) {
      await Promise.race([navigation, new Promise((resolve) => setTimeout(resolve, 250))]);
      if (navError) throw navError;
      const snap = (await page.evaluate(SNAPSHOT).catch(() => null)) as Snapshot | null;
      if (snap && snap.timeOrigin > 0) {
        if (timeOrigin === null && snap.ttfb !== null) await adoptOrigin(snap.timeOrigin);
        await emitMark("ttfb", snap.ttfb);
        await emitMark("fcp", snap.fcp);
        await emitMark("dcl", snap.dcl);
        if (snap.load !== null) break;
        if (committed && snap.lcp !== null && Date.now() - lastActivity > QUIET_MS) break;
      }
      if (Date.now() - startedAt > LANE_CAP_MS) { capped = true; break; }
    }
    if (signal.aborted) return null;
    const stoppedAt = Date.now() - navWall;

    await emit({ type: "phase", lane, phase: "settling", ...(capped ? { detail: `Still downloading at the ${LANE_CAP_MS / 1000} s cap` } : {}) });
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const snap = (await page.evaluate(SNAPSHOT)) as Snapshot;
    // A capped lane's LCP still counts if nothing bigger is loading in the viewport.
    const lcpFinal = !capped || !((await page.evaluate(LCP_PENDING).catch(() => true)) as boolean);
    if (timeOrigin === null) await adoptOrigin(snap.timeOrigin);
    await emitMark("ttfb", snap.ttfb);
    await emitMark("fcp", snap.fcp);
    await emitMark("dcl", snap.dcl);
    if (lcpFinal) await emitMark("lcp", snap.lcp);
    await emitMark("load", snap.load);
    await cdp.send("Page.stopScreencast").catch(() => {});

    await emit({ type: "phase", lane, phase: "inspecting" });
    const inspect = (await page.evaluate(INSPECT)) as Inspect;
    const finalUrl = page.url();
    const startOf = (id: string) => {
      const sent = requested.get(id);
      return sent && navTs !== null ? Math.max(0, Math.round((sent.ts - navTs) * 1000)) : 0;
    };
    const inFlight = [
      // Responding but not finished…
      ...[...responses.entries()].filter(([id, r]) => !r.finished && !failed.has(id)).map(([id, r]) => ({ url: r.url, type: r.type, start: startOf(id), bytes: r.bytes })),
      // …and requested but still waiting for a response (queued behind the bandwidth).
      ...[...requested.entries()].filter(([id]) => !responses.has(id) && !failed.has(id)).map(([id, q]) => ({ url: q.url, type: q.type, start: startOf(id), bytes: 0 })),
    ].map((item) => ({ ...item, end: Math.max(item.start, stoppedAt) }));
    const metrics = await assemble(url, finalUrl, snap, inspect, [...responses.values()], capped, inFlight, lcpFinal);
    await emit({ type: "phase", lane, phase: "done" });
    return metrics;
  } catch (error) {
    const message = error instanceof Error && /timeout/i.test(error.message)
      ? `The page did not finish loading within ${NAV_TIMEOUT_MS / 1000} s.`
      : "The browser could not load this page.";
    await emit({ type: "phase", lane, phase: "failed", detail: message }).catch(() => {});
    await emit({ type: "error", lane, message }).catch(() => {});
    return null;
  } finally {
    if (netTimer) clearInterval(netTimer);
    await browser?.close().catch(() => {});
  }
}

type InFlight = { url: string; type: string; start: number; end: number; bytes: number };

async function assemble(url: string, finalUrl: string, snap: Snapshot, inspect: Inspect, all: Resp[], capped: boolean, inFlight: InFlight[] = [], lcpFinal = true): Promise<LaneMetrics> {
  const origin = new URL(finalUrl).origin;
  const site = new URL(finalUrl).hostname.split(".").slice(-2).join(".");
  const doc = all.find((r) => r.type === "Document" && (r.url === finalUrl || r.url === url)) ?? all.find((r) => r.type === "Document");
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
    capped,
    capMs: LANE_CAP_MS,
    lcpDetail,
    images,
    waterfall,
    url,
    finalUrl,
    status: doc?.status ?? null,
    // A capped lane still loading a bigger in-viewport image has no final LCP yet.
    timing: { ttfb: snap.ttfb, fcp: snap.fcp, lcp: lcpFinal ? snap.lcp : null, domContentLoaded: snap.dcl, load: snap.load, tbt: inspect.tbt, cls: inspect.cls },
    network: { requests: all.length, totalKb: kb(total), byType, protocol: doc?.protocol ?? null, thirdPartyHosts: [...thirdParty].slice(0, 12) },
    edge: {
      documentCache: doc ? cacheStatus(doc.headers) : null,
      documentCacheControl: doc?.headers["cache-control"] ?? null,
      documentEncoding: doc?.headers["content-encoding"] ?? null,
      server: doc?.headers["server"] ?? null,
      staticAssets, immutableAssets, edgeHitAssets, textAssets, compressedTextAssets,
      edgeHtmlMs, robotsTxt, sitemapXml,
    },
    seo,
    document: { htmlKb: kb(html?.length ?? 0), domNodes: inspect.domNodes, wordsWithoutJs, lcpElement: inspect.lcpEl },
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
