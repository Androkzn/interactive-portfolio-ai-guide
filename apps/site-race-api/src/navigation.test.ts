import { describe, expect, it } from "vitest";
import { RACE_CAPS } from "../../../packages/contracts/src/site-race";
import type { LaneMetrics, NavigationMetrics, RepeatMetrics } from "../../../packages/contracts/src/site-race";
import { journeyFor, NAV_CAP_MS, navTargetFor, REPEAT_CAP_MS, since, summarizeRows, visitSnapshot } from "./navigation";
import { LANE_CAP_MS } from "./lane";
import { newWire } from "./bytes";

describe("navigation helpers", () => {
  it("knows the link to follow from each race page, on any host", () => {
    expect(navTargetFor("https://hrconcretepumps.pages.dev/")?.to).toBe("/pumps/");
    expect(navTargetFor("https://hr-concrete-pumps-next.pages.dev/pumps/")?.h1).toBe("HR40-5RZ");
    expect(journeyFor("https://hrconcretepumps.pages.dev/").map((t) => t.to)).toEqual(["/pumps/", "/boom-pumps/hr40-5rz/"]);
    expect(journeyFor("https://hrconcretepumps.pages.dev/")[0].selectors).toEqual([`main a[href="/pumps/"]`]);
    expect(navTargetFor("https://x.pages.dev/boom-pumps/hr40-5rz")?.to).toBe("/boom-pumps/hr21-4zr/");
    expect(navTargetFor("https://example.com/about/")).toBeNull();
  });
  it("measures between two page timestamps", () => {
    expect(since(1000.4, 1500.6)).toBe(500);
    expect(since(null, 5)).toBeNull();
    expect(since(10, 5)).toBe(0);
  });
  it("counts finished bytes, cache hits and revalidations", () => {
    const done = (bytes: number) => { const w = newWire(); w.final = bytes; return w; };
    const sum = summarizeRows([
      { wire: done(2048), status: 200, cached: false },
      { wire: done(300), status: 304, cached: false },
      { wire: done(0), status: 200, cached: true },
    ]);
    expect(sum).toEqual({ kb: 2.3, network: 2, cached: 1, revalidated: 1 });
  });
});

describe("a visitor's patience", () => {
  it("caps every step at the contract's 10 s", () => {
    expect(LANE_CAP_MS).toBe(RACE_CAPS.firstPageMs);
    expect(REPEAT_CAP_MS).toBe(RACE_CAPS.repeatMs);
    expect(NAV_CAP_MS).toBe(RACE_CAPS.tapMs);
    expect(Math.max(...Object.values(RACE_CAPS))).toBe(10_000);
  });
});

describe("visitSnapshot", () => {
  const first = { url: "https://x.pages.dev/", capped: false } as LaneMetrics;
  const net = { kb: 1, network: 1, cached: 0, revalidated: 0 };
  const repeat: RepeatMetrics = { skipped: null, lcp: 300, load: 400, capped: false, capMs: 10_000, net, html: null };
  const tap = (to: string): NavigationMetrics => ({ from: "/", to, link: "a", input: "touch", dwellMs: 100, skipped: null, soft: true, commit: 1, content: 2, image: 3, imagePath: null, capped: false, capMs: 10_000, net });

  it("is the first page alone before the visit", () => {
    expect(visitSnapshot(first, null, 2)).toBe(first);
  });
  it("adds the steps so far, and the scored tap only once every tap is in", () => {
    const afterRepeat = visitSnapshot(first, { repeat, navigationSteps: [] }, 2);
    expect(afterRepeat.repeat).toBe(repeat);
    expect(afterRepeat.navigation).toBeUndefined();
    const afterOne = visitSnapshot(first, { repeat, navigationSteps: [tap("/pumps/")] }, 2);
    expect(afterOne.navigationSteps).toHaveLength(1);
    expect(afterOne.navigation).toBeUndefined();
    const done = visitSnapshot(first, { repeat, navigationSteps: [tap("/pumps/"), tap("/boom-pumps/hr40-5rz/")] }, 2);
    expect(done.navigation?.to).toBe("/boom-pumps/hr40-5rz/");
  });
});
