import { describe, expect, it } from "vitest";
import { band, CURVES, logNormalScore, performanceScore } from "./lighthouse-score";
import { emptyHistogram, frameProgress, histogram, speedIndex, visuallyComplete } from "./visual-progress";
import { latestStage, median, runFor, stageById, stageForUrl, stageMetrics, stages } from "./journey";

describe("logNormalScore", () => {
  const lcp = CURVES.mobile.lcp;
  it("hits Lighthouse's control points", () => {
    expect(logNormalScore(lcp, lcp.p10)).toBeCloseTo(0.9, 2);
    expect(logNormalScore(lcp, lcp.median)).toBeCloseTo(0.5, 2);
    expect(logNormalScore(lcp, 0)).toBe(1);
  });
  it("falls monotonically and stays inside its band", () => {
    const values = [500, 1500, 2500, 3000, 4000, 6000, 12000, 30000].map((v) => logNormalScore(lcp, v));
    for (let i = 1; i < values.length; i += 1) expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    expect(logNormalScore(lcp, 3000)).toBeLessThan(0.9);
    expect(logNormalScore(lcp, 30000)).toBeLessThan(0.05);
  });
});

describe("performanceScore", () => {
  it("weights five metrics into 0–100", () => {
    const fast = performanceScore({ fcp: 900, si: 1200, lcp: 1400, tbt: 50, cls: 0 }, "mobile");
    const slow = performanceScore({ fcp: 3500, si: 9000, lcp: 30000, tbt: 900, cls: 0.3 }, "mobile");
    expect(fast.score).toBeGreaterThanOrEqual(95);
    expect(slow.score).toBeLessThan(30);
    expect(fast.parts.reduce((sum, part) => sum + part.weight, 0)).toBeCloseTo(1, 6);
  });
  it("refuses to score with a metric missing", () => {
    expect(performanceScore({ fcp: 900, si: null, lcp: 1400, tbt: 50, cls: 0 }, "mobile").score).toBeNull();
  });
  it("bands like Lighthouse", () => {
    expect([band(95), band(90), band(89), band(50), band(49)]).toEqual(["good", "good", "average", "average", "poor"]);
  });
});

describe("visual progress", () => {
  const solid = (r: number, g: number, b: number, n = 100) => {
    const px = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < px.length; i += 4) { px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255; }
    return px;
  };
  it("ignores near-white pixels", () => {
    expect(histogram(solid(250, 250, 250))[0].reduce((a, b) => a + b, 0)).toBe(0);
    expect(histogram(solid(10, 20, 30))[0][10]).toBe(100);
  });
  it("measures progress from blank to target", () => {
    const target = histogram(solid(10, 20, 30, 100));
    const half = histogram(solid(10, 20, 30, 50));
    expect(frameProgress(emptyHistogram(), emptyHistogram(), target)).toBe(0);
    expect(frameProgress(half, emptyHistogram(), target)).toBe(0.5);
    expect(frameProgress(target, emptyHistogram(), target)).toBe(1);
  });
  it("integrates Speed Index from navigation start", () => {
    // Blank until 1 s, half painted until 2 s, complete after: 1000 + 500 = 1500.
    const points = [{ t: -200, progress: 0 }, { t: 1000, progress: 0.5 }, { t: 2000, progress: 1 }, { t: 2600, progress: 1 }];
    expect(speedIndex(points)).toBe(1500);
    expect(visuallyComplete(points)).toBe(2000);
    expect(speedIndex([])).toBeNull();
  });
});

describe("journey", () => {
  it("has a stage per optimization step, original first", () => {
    expect(stages[0].id).toBe("original");
    expect(stages[0].build).toBe("astro");
    expect(new Set(stages.map((s) => s.id)).size).toBe(stages.length);
    for (const stage of stages) expect(stage.url).toMatch(/^https:\/\/[a-z0-9.-]+\.pages\.dev$/);
  });
  it("finds a stage by any URL on its host", () => {
    expect(stageForUrl(`${latestStage.url}/boom-pumps/hr40-5rz/`)?.id).toBe(latestStage.id);
    expect(stageForUrl("https://example.com/")).toBeNull();
    expect(stageById("original").short).toBe("Original");
  });
  it("matches report runs to stages", () => {
    expect(runFor("original")?.base).toBe("https://hrconcretepumps.pages.dev");
    expect(runFor("port")?.build).toBe("3844a6b");
    const model = stageMetrics("original", "/boom-pumps/hr40-5rz/", "mobile");
    expect(model?.lcp).toBeGreaterThan(10_000);
    expect(stageMetrics("original", "*", "mobile")?.pageKb).toBeGreaterThan(0);
  });
  it("takes medians", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});
