import { describe, expect, it } from "vitest";
import { computeTti, totalBlockingTime } from "./tti";

describe("computeTti", () => {
  it("is FCP when nothing happens for 5 s after it", () => {
    expect(computeTti(1000, [], [], 6000)).toBe(1000);
    expect(computeTti(1000, [], [], 5999)).toBeNull();
  });
  it("starts after the last long task before a 5 s quiet window", () => {
    expect(computeTti(1000, [[2000, 300], [4000, 200]], [], 9300)).toBe(4200);
    expect(computeTti(1000, [[2000, 300], [4000, 200]], [], 9100)).toBeNull();
  });
  it("needs the network quiet too (at most 2 requests in flight)", () => {
    const busy = [{ start: 0, end: 8000 }, { start: 0, end: 8000 }, { start: 0, end: 8000 }];
    expect(computeTti(1000, [], busy, 12_000)).toBeNull();
    expect(computeTti(1000, [], busy, 13_000)).toBe(1000);
    expect(computeTti(1000, [], [...busy.slice(0, 2), { start: 500, end: null }], 7000)).toBeNull();
  });
});

describe("totalBlockingTime", () => {
  it("clips tasks to the window before subtracting 50 ms (Lighthouse)", () => {
    expect(totalBlockingTime([[0, 150]], 50, 1000)).toBe(50);
    expect(totalBlockingTime([[900, 300]], 0, 1000)).toBe(50);
    expect(totalBlockingTime([[100, 40], [200, 120]], 0, 1000)).toBe(70);
    expect(totalBlockingTime([[5000, 500]], 0, 1000)).toBe(0);
    expect(totalBlockingTime([], null, 1000)).toBeNull();
  });
});
