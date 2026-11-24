// What a visitor does after the first page: comes back to it (repeat visit, HTTP cache on)
// and opens a second page (a click on a link both builds share). Runs in the lane's own
// browser after the cold load is measured, with the same throttling and the same input
// for every lane. Nothing here knows which build it is driving.
import type { CDPSession, Page } from "@cloudflare/puppeteer";
import type { LaneId, NavigationMetrics, RaceEvent, RaceProfile, RepeatMetrics, WindowNetwork } from "../../../packages/contracts/src/site-race";
import { newWire, onData, onFinished, onResponse, wireBytes, type Wire } from "./bytes";

type Emit = (event: RaceEvent) => Promise<void>;

export const REPEAT_CAP_MS = 10_000;
export const NAV_CAP_MS = 20_000;
/** After scrolling the link into view, both lanes wait this long before the finger or pointer arrives. */
export const LINK_SETTLE_MS = 1_000;
/** A finger rests on the glass about 100 ms between touchstart and touchend. */
export const TOUCH_DWELL_MS = 100;
/** A desktop pointer typically rests 200–500 ms on a link before the click. */
export const HOVER_DWELL_MS = 300;

export type NavTarget = { selectors: string[]; to: string; h1: string };

/**
 * The link clicked from each race page. Each one is a visible link in the same place on both
 * builds (checked against both live sites' HTML). The home page has no visible link to a model
 * page (only the quick-search data), so from home the visitor takes the hero's call to action.
 */
export const NAV_TARGETS: Record<string, NavTarget> = {
  "/": { selectors: ['.landing-action a[href$="/pumps/"]'], to: "/pumps/", h1: "Concrete pumps" },
  "/pumps/": { selectors: ['a.model-card-button[href$="/boom-pumps/hr40-5rz/"]', 'a[href$="/boom-pumps/hr40-5rz/"]'], to: "/boom-pumps/hr40-5rz/", h1: "HR40-5RZ" },
  "/boom-pumps/hr40-5rz/": { selectors: ['a.model-strip-card[href$="/boom-pumps/hr21-4zr/"]', 'a[href$="/boom-pumps/hr21-4zr/"]'], to: "/boom-pumps/hr21-4zr/", h1: "HR21-4ZR" },
};

export function navTargetFor(url: string): NavTarget | null {
  try {
    const path = new URL(url).pathname.replace(/\/?$/, "/");
    return NAV_TARGETS[path] ?? null;
  } catch {
    return null;
  }
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
  // LCP is reported after the frame that paints it; give the observer a moment after load.
  await new Promise((resolve) => setTimeout(resolve, 400));
  const snap = (await page.evaluate(RELOAD_SNAPSHOT).catch(() => ({ lcp: null, load: null }))) as { lcp: number | null; load: number | null };
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
  if (window.__navWatch) return;
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
      let best = null, size = 0;
      for (const img of document.images) { const a = area(img); if (a > size) { size = a; best = img; } }
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
  window.__navOldDoc = true;
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
export async function openSecondPage(page: Page, cdp: CDPSession, url: string, profile: RaceProfile, net: NetWindow): Promise<NavigationMetrics> {
  const from = new URL(url).pathname;
  const target = navTargetFor(url);
  if (!target) return skippedNavigation(from, null, profile, "No shared link to follow from this page.");
  const found = (await page.evaluate(`${FIND_LINK}(${JSON.stringify(target.selectors)})`).catch(() => null)) as { selector: string; text: string } | null;
  if (!found) return skippedNavigation(from, target, profile, "The link was not on the page.");
  await wait(LINK_SETTLE_MS);
  const point = (await page.evaluate(`${LINK_POINT}(${JSON.stringify(found.selector)})`).catch(() => null)) as { x: number; y: number } | null;
  if (!point) return skippedNavigation(from, target, profile, "The link was not on the page.");
  const cfg = JSON.stringify({ to: target.to, h1: target.h1 });
  await page.evaluateOnNewDocument(`${WATCHER}(${cfg})`);
  await page.evaluate(`${WATCHER}(${cfg})`);
  await page.evaluate(ARM_CLICK);
  const mobile = profile === "mobile";
  if (!mobile) await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  net.start();
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

const LINK_VISIBLE = `((selectors) => selectors.some((selector) => [...document.querySelectorAll(selector)].some((el) => {
  const b = el.getBoundingClientRect();
  return b.width >= 4 && b.height >= 4 && b.bottom > 0 && b.top < innerHeight * 3;
})))`;

/**
 * The visitor's cue to tap: the first page has painted its final LCP (nothing bigger still
 * loading in the viewport) and the link is on screen or one swipe away. Not the load event:
 * a visitor clicks once they see the link, and on slow 4G the original never fires load in time.
 */
export async function readyToTap(page: Page, url: string, lcpPendingScript: string): Promise<boolean> {
  const target = navTargetFor(url);
  if (!target) return false;
  const pending = (await page.evaluate(lcpPendingScript).catch(() => true)) as boolean;
  if (pending) return false;
  return (await page.evaluate(`${LINK_VISIBLE}(${JSON.stringify(target.selectors)})`).catch(() => false)) as boolean;
}

/**
 * After the first page: the tap to the second page, then (if the lane is still inside the time
 * budget) the repeat visit of the first page with the HTTP cache on. Same steps for every lane.
 * A lane whose first load ran to the cap without the link showing is not given extra time: both
 * are scored as not reached ("> cap"), so one slow lane cannot stretch the race.
 */
export async function afterFirstPage(page: Page, cdp: CDPSession, url: string, profile: RaceProfile, lane: LaneId, emit: Emit, opts: { tapped: boolean; repeat: boolean }, signal: AbortSignal): Promise<{ repeat: RepeatMetrics; navigation: NavigationMetrics }> {
  const from = new URL(url).pathname;
  const none = { kb: 0, network: 0, cached: 0, revalidated: 0 };
  const noRepeat = (reason: string): RepeatMetrics => ({ skipped: reason, lcp: null, load: null, capped: true, capMs: REPEAT_CAP_MS, net: none, html: null });
  if (!opts.tapped || signal.aborted) {
    const reason = "The first page never showed its LCP and the link inside the cap, so the visitor never tapped.";
    return { repeat: noRepeat(reason), navigation: skippedNavigation(from, navTargetFor(url), profile, reason) };
  }
  const net = new NetWindow(cdp);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 38, maxWidth: profile === "mobile" ? 300 : 560, maxHeight: profile === "mobile" ? 650 : 350, everyNthFrame: 1 }).catch(() => {});
  try {
    await emit({ type: "phase", lane, phase: "navigating" });
    // The cache stays as the first load had it (off): the tap lands while the first page may still be downloading.
    const navigation = await openSecondPage(page, cdp, url, profile, net).catch(() => skippedNavigation(from, navTargetFor(url), profile, "The navigation failed."));
    if (!opts.repeat || signal.aborted) return { repeat: noRepeat("Skipped to keep the race inside its time budget."), navigation };
    await emit({ type: "phase", lane, phase: "revisiting" });
    const repeat = await repeatVisit(page, cdp, url, net).catch(() => noRepeat("The reload failed."));
    return { repeat, navigation };
  } finally {
    net.dispose();
    await cdp.send("Page.stopScreencast").catch(() => {});
  }
}
