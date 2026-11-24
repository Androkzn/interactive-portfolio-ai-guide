import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { LaneMetrics, NavigationMetrics, RaceEvent, RepeatMetrics } from "@/packages/contracts/src/site-race";
import { formatValue, journeyRounds, loadOrCap, scoreRace, stepOrCap } from "./scoring";

const events = readFileSync(new URL("../../public/lab/site-race/recorded-mobile-model.ndjson", import.meta.url), "utf8")
  .split("\n").filter(Boolean).map((line) => JSON.parse(line).event as RaceEvent);
const base = (lane: "a" | "b") => (events.find((e) => e.type === "result" && e.lane === lane) as Extract<RaceEvent, { type: "result" }>).metrics;

const net = (kb: number, network = 3) => ({ kb, network, cached: 0, revalidated: 0 });
const nav = (over: Partial<NavigationMetrics>): NavigationMetrics => ({
  from: "/", to: "/pumps/", link: "x", input: "touch", dwellMs: 100, skipped: null, soft: true,
  commit: 100, content: 400, image: 900, imagePath: "/a.avif", capped: false, capMs: 20_000, net: net(50), ...over,
});
const rep = (over: Partial<RepeatMetrics>): RepeatMetrics => ({ skipped: null, lcp: 800, load: 1200, capped: false, capMs: 10_000, net: net(5, 2), html: null, ...over });
const lane = (m: LaneMetrics, extra: Partial<LaneMetrics>): LaneMetrics => ({ ...m, ...extra });

describe("journey rounds", () => {
  it("does not score a repeat visit that finished but reported no LCP (a missed reading, not the cap)", () => {
    const a = lane(base("a"), { navigation: nav({}), repeat: rep({ lcp: null, load: 300 }) });
    const b = lane(base("b"), { navigation: nav({}), repeat: rep({ lcp: 300 }) });
    const lcpRow = journeyRounds(a, b).find((r) => r.id === "repeat")!.rows[0];
    expect(lcpRow.a).toBeNull();
    expect(lcpRow.winner).toBeNull();
  });

  it("scores a repeat visit that never finished loading at its cap, as a lower bound", () => {
    const a = lane(base("a"), { navigation: nav({}), repeat: rep({ lcp: null, load: null, capped: true }) });
    const b = lane(base("b"), { navigation: nav({}), repeat: rep({ lcp: 300 }) });
    const lcpRow = journeyRounds(a, b).find((r) => r.id === "repeat")!.rows[0];
    expect(lcpRow.a).toBe(10_000);
    expect(lcpRow.censored?.a).toBe(true);
    expect(lcpRow.winner).toBe("b");
  });

  it("old races without the journey keep their five rounds", () => {
    expect(journeyRounds(base("a"), base("b"))).toEqual([]);
    expect(scoreRace(base("a"), base("b")).rounds).toHaveLength(5);
  });

  it("scores the second page and the repeat visit", () => {
    const a = lane(base("a"), { navigation: nav({ content: 3000, image: 9000, net: net(1500) }), repeat: rep({ lcp: 1000, net: net(40, 12) }) });
    const b = lane(base("b"), { navigation: nav({}), repeat: rep({}) });
    const rounds = journeyRounds(a, b);
    expect(rounds.map((r) => r.id)).toEqual(["repeat", "navigation"]); // the order the visit runs them
    expect(rounds[1].rows.map((r) => r.winner)).toEqual(["b", "b", "b"]);
    expect(rounds[0].winner).toBe("b");
    expect(scoreRace(a, b).rounds).toHaveLength(7);
  });

  it("is symmetric", () => {
    const a = lane(base("a"), { navigation: nav({ content: 3000 }) });
    const b = lane(base("b"), { navigation: nav({}) });
    expect(journeyRounds(a, b)[0].winner).toBe("b");
    expect(journeyRounds(b, a)[0].winner).toBe("a");
  });

  it("treats gaps inside the noise floor as a draw", () => {
    const a = lane(base("a"), { navigation: nav({ content: 500, image: 1000, net: net(52) }) });
    const b = lane(base("b"), { navigation: nav({}) });
    expect(journeyRounds(a, b)[0].winner).toBe("tie");
  });

  it("scores a lane that never tapped at the cap, as a lower bound", () => {
    const a = lane(base("a"), { navigation: nav({ skipped: "never tapped", content: null, image: null, capped: true }) });
    const b = lane(base("b"), { navigation: nav({}) });
    const row = journeyRounds(a, b)[0].rows[0];
    expect(row.winner).toBe("b");
    expect(formatValue(row, "a")).toBe("> 20.0 s");
    expect(stepOrCap(null, a.navigation)).toEqual({ value: 20_000, censored: true });
  });

  it("counts an unfinished load as later than the tap", () => {
    const m = lane(base("a"), { capped: false, tappedAt: 7000, timing: { ...base("a").timing, load: null } });
    expect(loadOrCap(m)).toEqual({ value: 7000, censored: true });
  });
});

describe("a visit still running", () => {
  const first = (m: LaneMetrics): LaneMetrics => { const { repeat: _r, navigation: _n, navigationSteps: _s, ...rest } = m; return rest; };

  it("shows the visit's rounds as waiting, not as draws, and counts only decided rounds", () => {
    const a = first(base("a")), b = first(base("b"));
    const verdict = scoreRace(a, b, { a: true, b: true });
    expect(verdict.rounds.map((r) => r.id)).toEqual(["speed", "smoothness", "weight", "edge", "seo", "repeat", "navigation"]);
    const visit = verdict.rounds.filter((r) => r.part === "visit");
    expect(visit.every((r) => r.pending && r.points.a === 0 && r.points.b === 0)).toBe(true);
    expect(visit.flatMap((r) => r.rows).every((row) => row.winner === null && formatValue(row, "a") === "…")).toBe(true);
    expect(verdict.pending).toBe(2);
    const settled = scoreRace(a, b);
    expect(verdict.roundsWon).toEqual(settled.roundsWon);
    expect(verdict.winner).toBe(settled.winner);
  });

  it("fills in one lane's values while the other is still on its way", () => {
    const a = lane(first(base("a")), { repeat: rep({ lcp: 1000 }) });
    const b = first(base("b"));
    const repeat = journeyRounds(a, b, { a: true, b: true }).find((r) => r.id === "repeat")!;
    expect(repeat.pending).toBe(true);
    expect(repeat.rows[0].a).toBe(1000);
    expect(repeat.rows[0].pending).toEqual({ a: false, b: true });
    expect(formatValue(repeat.rows[0], "b")).toBe("…");
  });

  it("scores the repeat visit as soon as both lanes have it, while the taps still wait", () => {
    const a = lane(first(base("a")), { repeat: rep({ lcp: 1000, net: net(40, 12) }) });
    const b = lane(first(base("b")), { repeat: rep({}) });
    const rounds = journeyRounds(a, b, { a: true, b: true });
    expect(rounds.find((r) => r.id === "repeat")!.pending).toBeUndefined();
    expect(rounds.find((r) => r.id === "repeat")!.winner).toBe("b");
    expect(rounds.find((r) => r.id === "navigation")!.pending).toBe(true);
  });

  it("scores a lane's last tap as missing once its visit is over without one", () => {
    const a = lane(base("a"), { navigation: nav({}) });
    const b = first(base("b"));
    expect(journeyRounds(a, b, { b: true }).find((r) => r.id === "navigation")!.pending).toBe(true);
    expect(journeyRounds(a, b, {}).find((r) => r.id === "navigation")!.pending).toBeUndefined();
  });
});
