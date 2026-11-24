import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { LaneMetrics, RaceEvent } from "@/packages/contracts/src/site-race";
import { compare, scoreRace } from "./scoring";
import { playbook } from "./playbook";

const recorded = readFileSync(new URL("../../public/lab/site-race/recorded-mobile.ndjson", import.meta.url), "utf8")
  .split("\n").filter(Boolean).map((line) => JSON.parse(line).event as RaceEvent | { type: "recording" });
const result = (lane: "a" | "b") => (recorded.find((e) => e.type === "result" && e.lane === lane) as Extract<RaceEvent, { type: "result" }>).metrics;

describe("compare", () => {
  it("treats gaps inside 5% or the absolute floor as a draw", () => {
    expect(compare(1000, 1040, "lower")).toBe("tie");
    expect(compare(100, 125, "lower", 30)).toBe("tie");
    expect(compare(1000, 1200, "lower")).toBe("a");
    expect(compare(0.9, 0.5, "higher")).toBe("a");
  });
  it("gives the metric to the lane that has a value", () => {
    expect(compare(null, 300, "lower")).toBe("b");
    expect(compare(null, null, "lower")).toBeNull();
  });
});

describe("scoreRace", () => {
  it("scores the recorded race into five rounds with a consistent tally", () => {
    const verdict = scoreRace(result("a"), result("b"));
    expect(verdict.rounds.map((r) => r.id)).toEqual(["speed", "smoothness", "weight", "edge", "seo"]);
    for (const round of verdict.rounds) {
      expect(round.points.a + round.points.b).toBeLessThanOrEqual(round.rows.length);
    }
    expect(verdict.roundsWon.a + verdict.roundsWon.b).toBeLessThanOrEqual(5);
    expect(["a", "b", "tie"]).toContain(verdict.winner);
  });

  it("is symmetric: swapping lanes swaps the winner", () => {
    const ab = scoreRace(result("a"), result("b"));
    const ba = scoreRace(result("b"), result("a"));
    const flip = { a: "b", b: "a", tie: "tie" } as const;
    expect(ba.winner).toBe(flip[ab.winner]);
    expect(ba.metricWins).toEqual({ a: ab.metricWins.b, b: ab.metricWins.a });
  });

  it("does not crash on a lane with missing timings", () => {
    const partial: LaneMetrics = { ...result("a"), timing: { ttfb: null, fcp: null, lcp: null, domContentLoaded: null, load: null, tbt: null, cls: null } };
    expect(() => scoreRace(partial, result("b"))).not.toThrow();
  });
});

describe("recording", () => {
  it("is a complete race with frames for both lanes", () => {
    expect(recorded[0].type).toBe("recording");
    for (const lane of ["a", "b"] as const) {
      expect(recorded.filter((e) => e.type === "frame" && e.lane === lane).length).toBeGreaterThan(5);
      expect(result(lane).seo.length).toBeGreaterThan(5);
    }
  });
});

describe("playbook", () => {
  it("names the metric every play should move", () => {
    for (const play of playbook) expect(play.moves.length).toBeGreaterThan(3);
  });
});
