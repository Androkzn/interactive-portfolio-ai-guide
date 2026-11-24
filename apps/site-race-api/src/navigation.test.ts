import { describe, expect, it } from "vitest";
import { navTargetFor, since, summarizeRows } from "./navigation";
import { newWire } from "./bytes";

describe("navigation helpers", () => {
  it("knows the link to follow from each race page, on any host", () => {
    expect(navTargetFor("https://hrconcretepumps.pages.dev/")?.to).toBe("/pumps/");
    expect(navTargetFor("https://hr-concrete-pumps-next.pages.dev/pumps/")?.h1).toBe("HR40-5RZ");
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
