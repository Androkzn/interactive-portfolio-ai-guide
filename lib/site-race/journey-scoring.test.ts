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
  it("old races without the journey keep their five rounds", () => {
    expect(journeyRounds(base("a"), base("b"))).toEqual([]);
    expect(scoreRace(base("a"), base("b")).rounds).toHaveLength(5);
  });

  it("scores the second page and the repeat visit", () => {
    const a = lane(base("a"), { navigation: nav({ content: 3000, image: 9000, net: net(1500) }), repeat: rep({ lcp: 1000, net: net(40, 12) }) });
    const b = lane(base("b"), { navigation: nav({}), repeat: rep({}) });
    const rounds = journeyRounds(a, b);
    expect(rounds.map((r) => r.id)).toEqual(["navigation", "repeat"]);
    expect(rounds[0].rows.map((r) => r.winner)).toEqual(["b", "b", "b"]);
    expect(rounds[1].winner).toBe("b");
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
