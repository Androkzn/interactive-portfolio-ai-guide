import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEGACY_CAPS, RACE_CAPS } from "../../packages/contracts/src/site-race";
import type { LaneId, LaneMetrics, RaceEvent, RaceLogLine } from "../../packages/contracts/src/site-race";
import { parseRaceLog } from "./reports";
import { scoreRace } from "./scoring";
import { firstPagesIn, foldRaceLog, pendingLanes, verdictFinal, verdictOf } from "./use-race";

// A recorded journey race (site-race/1: both results at the very end) and the same race as the
// site-race/2 Worker streams it: each lane's first page as soon as it is measured, its visit
// after the repeat visit, its final numbers when it is done. Same numbers, earlier.
const oldLog = parseRaceLog(readFileSync(new URL("../../public/lab/site-race/recorded-mobile-home.ndjson", import.meta.url), "utf8"));
const finalOf = (lane: LaneId) => (oldLog.find((line) => line.event.type === "result" && line.event.lane === lane)!.event as { metrics: LaneMetrics }).metrics;
const firstPage = (m: LaneMetrics): LaneMetrics => { const { repeat: _r, navigation: _n, navigationSteps: _s, ...rest } = m; return { ...rest, capMs: RACE_CAPS.firstPageMs }; };
const full = (lane: LaneId): LaneMetrics => ({ ...finalOf(lane), capMs: RACE_CAPS.firstPageMs, fullPage: { kb: 5914.9, requests: 40, loaded: true } });

function asProtocol2(lines: RaceLogLine[]): RaceLogLine[] {
  const out: RaceLogLine[] = [];
  const result = (at: number, lane: LaneId, metrics: LaneMetrics, partial?: "first-page" | "visit"): RaceLogLine => ({ at, event: { type: "result", lane, metrics, ...(partial ? { partial } : {}) } });
  for (const line of lines) {
    const event = line.event;
    if (event.type === "result") continue; // sent per lane below, as the Worker now does
    if (event.type === "start") { out.push({ at: line.at, event: { ...event, protocol: "site-race/2", capMs: RACE_CAPS.firstPageMs, caps: { ...RACE_CAPS }, link: { downMbps: 1.6, rttMs: 150 } } }); continue; }
    if (event.type === "phase" && event.phase === "navigating") out.push(result(line.at, event.lane, { ...firstPage(full(event.lane)), repeat: finalOf(event.lane).repeat, navigationSteps: [] }, "visit"));
    if (event.type === "phase" && event.phase === "done") out.push(result(line.at, event.lane, full(event.lane)));
    out.push(line);
    if (event.type === "phase" && event.phase === "launching") out.push({ at: line.at, event: { type: "warmup", lane: event.lane, fullPage: full(event.lane).fullPage! } });
    if (event.type === "phase" && event.phase === "inspecting") out.push(result(line.at, event.lane, firstPage(full(event.lane)), "first-page"));
  }
  return out;
}

const newLog = asProtocol2(oldLog);
/** Rounds and verdicts as data: their rows carry format functions, made fresh on every scoring. */
const plain = <T,>(value: T): unknown => JSON.parse(JSON.stringify(value));
const upTo = (log: RaceLogLine[], test: (event: RaceLogLine["event"], index: number) => boolean) => log.slice(0, log.findIndex((line, index) => test(line.event, index)) + 1);
const isResult = (lane: LaneId, partial?: string) => (event: RaceLogLine["event"]) => event.type === "result" && event.lane === lane && event.partial === partial;

describe("early verdict (site-race/2)", () => {
  it("has the scoreboard the moment both first pages are in, while the race is still running", () => {
    // In this race the Next.js lane's first page ends first, the original's after its cap.
    const firstA = newLog.findIndex((line) => isResult("a", "first-page")(line.event));
    const firstB = newLog.findIndex((line) => isResult("b", "first-page")(line.event));
    const before = foldRaceLog(newLog.slice(0, Math.max(firstA, firstB)), "replay");
    expect(firstPagesIn(before)).toBe(false);
    expect(verdictOf(before)).toBeNull();

    const state = foldRaceLog(newLog.slice(0, Math.max(firstA, firstB) + 1), "replay");
    expect(state.status).toBe("racing");
    expect(state.protocol).toBe("site-race/2");
    expect(state.caps).toEqual(RACE_CAPS);
    expect(firstPagesIn(state)).toBe(true);
    expect(pendingLanes(state)).toEqual({ a: true, b: true });
    expect(verdictFinal(state)).toBe(false);
    const verdict = verdictOf(state)!;
    expect(verdict.rounds.filter((r) => r.part === "first-page" && !r.pending)).toHaveLength(5);
    expect(verdict.rounds.filter((r) => r.pending).map((r) => r.id)).toEqual(["repeat", "navigation"]);
    // The first page's verdict is already the full race's on those rounds.
    expect(plain(verdict.rounds.slice(0, 5))).toEqual(plain(scoreRace(full("a"), full("b")).rounds.slice(0, 5)));
  });

  it("keeps the warm-up's full-page weight and the cap's reason on the lane", () => {
    const state = foldRaceLog(upTo(newLog, isResult("a", "first-page")), "replay");
    expect(state.lanes.a.fullPage).toEqual({ kb: 5914.9, requests: 40, loaded: true });
    expect(state.lanes.a.cap).toBe("loading");
    expect(state.lanes.a.capMs).toBe(RACE_CAPS.firstPageMs);
    expect(state.lanes.b.cap).toBeNull();
  });

  it("merges the visit in as it arrives, without losing the first page", () => {
    // Here the fast lane is back on its home page before the slow one has finished its first.
    const afterRepeatB = foldRaceLog(upTo(newLog, isResult("b", "visit")), "replay");
    expect(afterRepeatB.lanes.b.metrics?.repeat).toBeTruthy();
    expect(afterRepeatB.lanes.b.metrics?.timing).toEqual(full("b").timing);
    expect(afterRepeatB.lanes.b.complete).toBe(false);
    const firstA = foldRaceLog(upTo(newLog, isResult("a", "first-page")), "replay");
    const waiting = verdictOf(firstA)!.rounds.find((r) => r.id === "repeat")!;
    expect(waiting.pending).toBe(true);
    expect(waiting.rows[0].b).toBe(full("b").repeat!.lcp);
    expect(waiting.rows[0].pending).toEqual({ a: true, b: false });

    const bothRepeats = foldRaceLog(upTo(newLog, (event, index) => index > newLog.findIndex((l) => isResult("a", "visit")(l.event)) && index > newLog.findIndex((l) => isResult("b", "visit")(l.event))), "replay");
    const verdict = verdictOf(bothRepeats)!;
    expect(verdict.rounds.find((r) => r.id === "repeat")!.pending).toBeUndefined();
    expect(verdict.rounds.find((r) => r.id === "navigation")!.pending).toBe(true);
    expect(verdict.pending).toBe(1);
  });

  it("ends on the full verdict, the same as scoring the final numbers", () => {
    const state = foldRaceLog(newLog, "report");
    expect(state.status).toBe("finished");
    expect(state.lanes.a.complete && state.lanes.b.complete).toBe(true);
    expect(verdictFinal(state)).toBe(true);
    const verdict = verdictOf(state)!;
    expect(verdict.pending).toBe(0);
    expect(plain(verdict)).toEqual(plain(scoreRace(full("a"), full("b"))));
  });

  it("keeps the first page's verdict when the race is stopped mid-visit", () => {
    const running = foldRaceLog(upTo(newLog, (event, index) => index > newLog.findIndex((l) => isResult("a", "first-page")(l.event)) && index > newLog.findIndex((l) => isResult("b", "first-page")(l.event))), "live");
    const stopped = { ...running, status: "failed" as const };
    const verdict = verdictOf(stopped)!;
    expect(verdict.pending).toBe(0);
    expect(verdict.rounds.map((r) => r.id)).toEqual(["speed", "smoothness", "weight", "edge", "seo"]);
  });
});

describe("old saved races (site-race/1)", () => {
  it("replay as before: no verdict until both results, at the end, then the full one", () => {
    const inspecting = oldLog.findIndex((line, index) => index > 0 && line.event.type === "phase" && line.event.phase === "navigating" && line.event.lane === "a");
    const midway = foldRaceLog(oldLog.slice(0, inspecting + 1), "replay");
    expect(midway.status).toBe("racing");
    expect(verdictOf(midway)).toBeNull();

    const state = foldRaceLog(oldLog, "report");
    expect(state.status).toBe("finished");
    expect(state.protocol).toBe("site-race/1");
    // The start says 30 s; the taps of those races were capped at the legacy 20 s.
    expect(state.caps).toEqual({ ...LEGACY_CAPS, firstPageMs: 30_000 });
    expect(state.lanes.a.capMs).toBe(30_000);
    expect(state.lanes.a.cap).toBe("loading");
    expect(state.lanes.a.fullPage).toBeNull();
    const verdict = verdictOf(state)!;
    expect(verdict.pending).toBe(0);
    expect(plain(verdict)).toEqual(plain(scoreRace(finalOf("a"), finalOf("b"))));
    expect(verdict.rounds.map((r) => r.id)).toEqual(["speed", "smoothness", "weight", "edge", "seo", "repeat", "navigation"]);
  });

  it("without a journey keep their five rounds", () => {
    const state = foldRaceLog(parseRaceLog(readFileSync(new URL("../../public/lab/site-race/recorded-mobile-model.ndjson", import.meta.url), "utf8")), "report");
    expect(verdictOf(state)!.rounds).toHaveLength(5);
    expect(state.lanes.a.cap).toBe("loading");
  });

  it("read unknown future events as nothing", () => {
    const state = foldRaceLog([...oldLog.slice(0, 3), { at: 1, event: { type: "something-new", lane: "a" } as unknown as RaceEvent }, ...oldLog.slice(3)], "report");
    expect(state.status).toBe("finished");
  });
});
