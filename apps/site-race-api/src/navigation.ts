// What a visitor does after the first page, in the order WebPageTest uses for a first view and a
// repeat view, then a scripted journey: the first page is measured completely (lane.ts); the same
// page is loaded again with the HTTP cache on (repeat visit); then the visitor taps through to a
// second and a third page. Before every step the previous page is allowed to finish (see settle),
// so a step measures itself and not the leftovers of the page before. Same steps, same throttling
// and the same input for every lane; nothing here knows which build it is driving.
import type { CDPSession, Page } from "@cloudflare/puppeteer";
import type { LaneId, NavigationMetrics, RaceEvent, RaceProfile, RepeatMetrics, WindowNetwork } from "../../../packages/contracts/src/site-race";
import { newWire, onData, onFinished, onResponse, wireBytes, type Wire } from "./bytes";

type Emit = (event: RaceEvent) => Promise<void>;

export const REPEAT_CAP_MS = 10_000;
export const NAV_CAP_MS = 20_000;
/** After scrolling the link into view, both lanes wait this long before the finger or pointer arrives. */
export const LINK_SETTLE_MS = 500;
/** A finger rests on the glass about 100 ms between touchstart and touchend. */
export const TOUCH_DWELL_MS = 100;
/** A desktop pointer typically rests 200–500 ms on a link before the click. */
export const HOVER_DWELL_MS = 300;
/** Longest wait for the previous page to finish before a step; then the step starts anyway. */
export const SETTLE_CAP_MS = 10_000;

type Throttle = { latency: number; downloadThroughput: number; uploadThroughput: number } | null;

/**
 * Lets the previous page finish downloading before the next step, then restores the lane's
 * profile. On a throttled profile the link is opened up meanwhile, so a page still pulling
 * megabytes does not stretch the race by minutes; the step that follows runs under the full
 * profile again. Identical for every lane.
 */
export async function settle(page: Page, cdp: CDPSession, throttle: Throttle): Promise<void> {
  if (throttle) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(() => {});
  await page.waitForNetworkIdle({ idleTime: 500, concurrency: 0, timeout: SETTLE_CAP_MS }).catch(() => {});
  if (throttle) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...throttle }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 250));
}

/** `img`: the main image is the hero render whose file name carries this model name. */
export type NavTarget = { selectors: string[]; to: string; h1: string; img?: string };

const link = (to: string) => [`main a[href="${to}"]`];

/** The visitor's path from each race page: one tap per step, each to a visible link inside <main> on both builds. */
export const JOURNEYS: Record<string, NavTarget[]> = {
  // The home page links to no model page on either build, so the visitor goes through the catalogue.
  "/": [
    { selectors: link("/pumps/"), to: "/pumps/", h1: "Concrete pumps" },
    { selectors: link("/boom-pumps/hr40-5rz/"), to: "/boom-pumps/hr40-5rz/", h1: "HR40-5RZ", img: "HR40-5RZ" },
  ],
  "/pumps/": [{ selectors: link("/boom-pumps/hr40-5rz/"), to: "/boom-pumps/hr40-5rz/", h1: "HR40-5RZ", img: "HR40-5RZ" }],
  "/boom-pumps/hr40-5rz/": [{ selectors: link("/boom-pumps/hr21-4zr/"), to: "/boom-pumps/hr21-4zr/", h1: "HR21-4ZR", img: "HR21-4ZR" }],
};

export function journeyFor(url: string): NavTarget[] {
  try {
    return JOURNEYS[new URL(url).pathname.replace(/\/?$/, "/")] ?? [];
  } catch {
    return [];
  }
}

/** The first tap of the journey from this page, or null when there is none. */
export function navTargetFor(url: string): NavTarget | null {
  return journeyFor(url)[0] ?? null;
}

/** ms between two epoch timestamps, or null; never negative. */
export function since(from: number | null | undefined, to: number | null | undefined): number | null {
  if (typeof from !== "number" || typeof to !== "number") return null;
  return Math.max(0, Math.round(to - from));
}

type Row = { wire: Wire; status: number | null; cached: boolean; type: string; url: string };

/** Requests started inside a window, with honest byte counts (see bytes.ts). */
export class NetWindow {
  private rows = new Map<string, Row>();
  private active = false;
  private readonly handlers: [string, (e: never) => void][];

  constructor(private readonly cdp: CDPSession) {
    const on = <T>(name: string, fn: (e: T) => void) => [name, fn as (e: never) => void] as [string, (e: never) => void];
    this.handlers = [
      on<{ requestId: string; type?: string; request: { url: string } }>("Network.requestWillBeSent", (e) => {
        if (this.active && /^https?:/.test(e.request.url) && !this.rows.has(e.requestId)) this.rows.set(e.requestId, { wire: newWire(), status: null, cached: false, type: e.type ?? "Other", url: e.request.url });
      }),
      on<{ requestId: string }>("Network.requestServedFromCache", (e) => { const r = this.rows.get(e.requestId); if (r) r.cached = true; }),
      on<{ requestId: string; response: { status: number; encodedDataLength?: number; headers: Record<string, string>; fromDiskCache?: boolean; fromPrefetchCache?: boolean } }>("Network.responseReceived", (e) => {
        const r = this.rows.get(e.requestId);
        if (!r) return;
        r.status = e.response.status;
        if (e.response.fromDiskCache || e.response.fromPrefetchCache) r.cached = true;
        const enc = Object.entries(e.response.headers ?? {}).find(([k]) => k.toLowerCase() === "content-encoding")?.[1];
        onResponse(r.wire, e.response.encodedDataLength, enc);
      }),
      on<{ requestId: string; dataLength?: number; encodedDataLength?: number }>("Network.dataReceived", (e) => { const r = this.rows.get(e.requestId); if (r) onData(r.wire, e.dataLength, e.encodedDataLength); }),
      on<{ requestId: string; encodedDataLength: number }>("Network.loadingFinished", (e) => { const r = this.rows.get(e.requestId); if (r) onFinished(r.wire, e.encodedDataLength); }),
    ];
    for (const [name, fn] of this.handlers) cdp.on(name as never, fn as never);
  }

  start() { this.rows.clear(); this.active = true; }
  stop() { this.active = false; }
  dispose() { this.active = false; for (const [name, fn] of this.handlers) this.cdp.off(name as never, fn as never); }

  summary(): WindowNetwork { return summarizeRows([...this.rows.values()]); }
  document(): { status: number | null; kb: number; cached: boolean } | null {
    const doc = [...this.rows.values()].find((r) => r.type === "Document");
    return doc ? { status: doc.status, kb: kb(doc.cached ? 0 : wireBytes(doc.wire)), cached: doc.cached } : null;
  }
}

const kb = (bytes: number) => Math.round((bytes / 1024) * 10) / 10;

export function summarizeRows(rows: { wire: Wire; status: number | null; cached: boolean }[]): WindowNetwork {
  let bytes = 0, network = 0, cached = 0, revalidated = 0;
  for (const r of rows) {
    if (r.cached) { cached += 1; continue; }
    network += 1;
    if (r.status === 304) revalidated += 1;
    bytes += wireBytes(r.wire);
  }
  return { kb: kb(bytes), network, cached, revalidated };
}

const RELOAD_SNAPSHOT = `(() => { const n = performance.getEntriesByType("navigation")[0]; const r = window.__race || {};
  const v = (x) => (typeof x === "number" && x > 0 ? Math.round(x) : null);
  return { lcp: v(r.lcp), load: n ? v(n.loadEventEnd) : null }; })()`;

/** The same URL again in the same browser, HTTP cache on: what a returning visitor pays. */
export async function repeatVisit(page: Page, cdp: CDPSession, url: string, net: NetWindow): Promise<RepeatMetrics> {
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
  net.start();
  let capped = false;
  await page.goto(url, { waitUntil: "load", timeout: REPEAT_CAP_MS }).catch(() => { capped = true; });
  // LCP is reported after the frame that paints it, sometimes well after load on a fast reload:
  // poll for it (up to 2 s) rather than reading once. Still missing then means "not measured",
  // which scores nothing; only a reload that never finished counts as the cap.
  let snap = { lcp: null as number | null, load: null as number | null };
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    snap = ((await page.evaluate(RELOAD_SNAPSHOT).catch(() => null)) as typeof snap | null) ?? snap;
    if (snap.lcp !== null) break;
  }
  net.stop();
  return { skipped: null, lcp: snap.lcp, load: snap.load, capped: capped || snap.load === null, capMs: REPEAT_CAP_MS, net: net.summary(), html: net.document() };
}

const FIND_LINK = `((selectors) => {
  for (const selector of selectors) {
    for (const el of document.querySelectorAll(selector)) {
      const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (b.width < 4 || b.height < 4 || cs.visibility === "hidden" || cs.display === "none") continue;
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      return { selector, text: (el.textContent || el.getAttribute("aria-label") || "").replace(/\\s+/g, " ").trim().slice(0, 60) };
    }
  }
  return null;
})`;

const LINK_POINT = `((selector) => {
  for (const el of document.querySelectorAll(selector)) {
    const b = el.getBoundingClientRect();
    if (b.width < 4 || b.height < 4) continue;
    const x = Math.min(innerWidth - 2, Math.max(2, b.left + b.width / 2)); const y = Math.min(innerHeight - 2, Math.max(2, b.top + b.height / 2));
    return { x, y };
  }
  return null;
})`;

/**
 * Records, on the page's own clock (epoch ms), when the target URL is current, when the
 * expected h1 has been painted, and when the largest in-viewport image of the new page is
 * loaded, decoded and painted (two rAFs after the condition). Installed in the current
 * document (soft navigation) and in any new one (hard navigation).
 */
const WATCHER = `((cfg) => {
  const now = () => performance.timeOrigin + performance.now();
  const s = window.__navWatch = { commitAt: null, h1At: null, imgAt: null, img: null };
  const norm = (t) => (t || "").replace(/\\s+/g, " ").trim().toLowerCase();
  const area = (el) => { const b = el.getBoundingClientRect(); return Math.max(0, Math.min(b.right, innerWidth) - Math.max(b.left, 0)) * Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0)); };
  let h1Seen = false, imgPending = false;
  const check = () => {
    if (s.commitAt === null && location.pathname === cfg.to) s.commitAt = now();
    if (s.commitAt === null) return;
    if (!h1Seen) {
      const h = document.querySelector("h1");
      if (h && norm(h.textContent).includes(norm(cfg.h1))) { h1Seen = true; requestAnimationFrame(() => requestAnimationFrame(() => { s.h1At = now(); })); }
    }
    if (h1Seen && !imgPending) {
      // The page's hero render (named after the model) when there is one, else the largest image in view.
      let best = null, size = 0;
      if (cfg.img) for (const img of document.querySelectorAll("main .scenic-banner-art img")) { if ((img.currentSrc || img.src).includes(cfg.img)) { best = img; size = Math.max(4000, area(img)); break; } }
      if (!best) for (const img of document.images) { const a = area(img); if (a > size) { size = a; best = img; } }
      if (best && size >= 4000 && best.complete && best.naturalWidth > 0) {
        imgPending = true;
        const src = best.currentSrc || best.src;
        Promise.resolve(best.decode()).catch(() => {}).then(() => requestAnimationFrame(() => requestAnimationFrame(() => { s.imgAt = now(); s.img = src; })));
      }
    }
  };
  check();
  const tick = () => { if (s.imgAt !== null) return; check(); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})`;

const ARM_CLICK = `(() => {
  window.__navOldDoc = true; window.__navClick = null; window.__navWatch = null;
  try { sessionStorage.removeItem("__navClick"); } catch {}
  addEventListener("click", (e) => { const t = performance.timeOrigin + e.timeStamp; window.__navClick = t; try { sessionStorage.setItem("__navClick", String(t)); } catch {} }, { capture: true, once: true });
  addEventListener("touchstart", (e) => { window.__navIntent = performance.timeOrigin + e.timeStamp; }, { capture: true, once: true });
})()`;

const READ = `(() => { let click = null; try { click = Number(sessionStorage.getItem("__navClick")) || null; } catch {}
  return { watch: window.__navWatch || null, click: window.__navClick || click, soft: !!window.__navOldDoc }; })()`;

type Read = { watch: { commitAt: number | null; h1At: number | null; imgAt: number | null; img: string | null } | null; click: number | null; soft: boolean };

const pathOf = (src: string | null) => { if (!src) return null; try { return new URL(src).pathname; } catch { return src.slice(0, 80); } };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function skippedNavigation(from: string, target: NavTarget | null, profile: RaceProfile, reason: string): NavigationMetrics {
  return {
    from, to: target?.to ?? "", link: "", input: profile === "mobile" ? "touch" : "mouse", dwellMs: profile === "mobile" ? TOUCH_DWELL_MS : HOVER_DWELL_MS,
    skipped: reason, soft: null, commit: null, content: null, image: null, imagePath: null, capped: true, capMs: NAV_CAP_MS,
    net: { kb: 0, network: 0, cached: 0, revalidated: 0 },
  };
}

/** Clicks the page's target link like a visitor would and times what follows. */
export async function openSecondPage(page: Page, cdp: CDPSession, from: string, target: NavTarget, profile: RaceProfile, net: NetWindow, throttle: Throttle): Promise<NavigationMetrics> {
  // The step starts when the visitor scrolls to the link: what scrolling sets off (lazy images that
  // come into view, on the original catalogue its full-size PNG thumbnails) is part of the step, in
  // bytes and in time, under the full profile; that is what a visitor who scrolls and taps pays.
  // (Settling those first and not counting them would hide megabytes.) Timings start at the click.
  void throttle;
  net.start();
  const found = (await page.evaluate(`${FIND_LINK}(${JSON.stringify(target.selectors)})`).catch(() => null)) as { selector: string; text: string } | null;
  if (!found) return skippedNavigation(from, target, profile, "The link was not on the page.");
  await wait(LINK_SETTLE_MS);
  const point = (await page.evaluate(`${LINK_POINT}(${JSON.stringify(found.selector)})`).catch(() => null)) as { x: number; y: number } | null;
  if (!point) return skippedNavigation(from, target, profile, "The link was not on the page.");
  const cfg = JSON.stringify({ to: target.to, h1: target.h1, img: target.img ?? null });
  await page.evaluate(ARM_CLICK);
  const script = await page.evaluateOnNewDocument(`${WATCHER}(${cfg})`);
  await page.evaluate(`${WATCHER}(${cfg})`);
  const mobile = profile === "mobile";
  if (!mobile) await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  if (mobile) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: point.x, y: point.y }] });
    await wait(TOUCH_DWELL_MS);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
    await wait(HOVER_DWELL_MS);
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
  }
  const clickedAt = Date.now();
  let read: Read | null = null;
  while (Date.now() - clickedAt < NAV_CAP_MS) {
    await wait(150);
    read = ((await page.evaluate(READ).catch(() => null)) as Read | null) ?? read;
    if (read?.watch?.imgAt) break;
  }
  net.stop();
  await page.removeScriptToEvaluateOnNewDocument(script.identifier).catch(() => {});
  const w = read?.watch ?? null;
  const click = read?.click ?? null;
  const base: NavigationMetrics = {
    from, to: target.to, link: `${found.selector} · ${found.text}`, input: mobile ? "touch" : "mouse", dwellMs: mobile ? TOUCH_DWELL_MS : HOVER_DWELL_MS,
    skipped: null, soft: w?.commitAt ? !!read?.soft : null,
    commit: since(click, w?.commitAt), content: since(click, w?.h1At), image: since(click, w?.imgAt), imagePath: pathOf(w?.img ?? null),
    capped: !w?.imgAt, capMs: NAV_CAP_MS, net: net.summary(),
  };
  if (click === null) return { ...base, skipped: "The browser did not register the click.", commit: null, content: null, image: null };
  return base;
}

/**
 * After the first page has been measured completely: the repeat visit (same URL, HTTP cache on),
 * then one tap per journey step (home → catalogue → model page), each once the previous page has
 * finished and shown its heading. The HTTP cache stays on for the whole visit, as in a real
 * browser. Same steps for every lane; a step that never showed its page ends the journey there,
 * scored as not reached ("> cap").
 */
export async function afterFirstPage(page: Page, cdp: CDPSession, url: string, profile: RaceProfile, lane: LaneId, emit: Emit, opts: { network: Throttle }, signal: AbortSignal): Promise<{ repeat: RepeatMetrics; navigation: NavigationMetrics; navigationSteps: NavigationMetrics[] }> {
  const none = { kb: 0, network: 0, cached: 0, revalidated: 0 };
  const noRepeat = (reason: string): RepeatMetrics => ({ skipped: reason, lcp: null, load: null, capped: true, capMs: REPEAT_CAP_MS, net: none, html: null });
  const targets = journeyFor(url);
  const froms = [new URL(url).pathname, ...targets.map((t) => t.to)];
  const skipAll = (reason: string, done: NavigationMetrics[] = []) => [...done, ...targets.slice(done.length).map((t, i) => skippedNavigation(froms[done.length + i], t, profile, reason))];
  const finish = (steps: NavigationMetrics[], repeat: RepeatMetrics) => ({ repeat, navigation: steps[steps.length - 1], navigationSteps: steps });
  const net = new NetWindow(cdp);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 38, maxWidth: profile === "mobile" ? 300 : 560, maxHeight: profile === "mobile" ? 650 : 350, everyNthFrame: 1 }).catch(() => {});
  try {
    // The first load ran with the cache bypassed (a cold first view; responses were still stored).
    // From here on the browser behaves like a visitor's: it uses what it has.
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
    if (signal.aborted) return finish(skipAll("Stopped."), noRepeat("Stopped."));
    await emit({ type: "phase", lane, phase: "revisiting" });
    await settle(page, cdp, opts.network);
    const repeat = await repeatVisit(page, cdp, url, net).catch(() => noRepeat("The reload failed."));
    await emit({ type: "phase", lane, phase: "navigating" });
    const steps: NavigationMetrics[] = [];
    for (const [i, target] of targets.entries()) {
      if (signal.aborted) return finish(skipAll("Stopped.", steps), repeat);
      const prev = steps[i - 1];
      if (prev && (prev.skipped || prev.content === null)) return finish(skipAll("The previous page never showed up inside the cap.", steps), repeat);
      await settle(page, cdp, opts.network);
      steps.push(await openSecondPage(page, cdp, froms[i], target, profile, net, opts.network).catch(() => skippedNavigation(froms[i], target, profile, "The navigation failed.")));
    }
    return finish(steps, repeat);
  } finally {
    net.dispose();
    await cdp.send("Page.stopScreencast").catch(() => {});
  }
}
