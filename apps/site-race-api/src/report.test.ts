import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { LaneMetrics, RaceEvent, RaceLogLine } from "../../../packages/contracts/src/site-race";
import { newReportId, RaceLog, REPORT_ID, summarize } from "./report";

const recording = readFileSync(new URL("../../../public/lab/site-race/recorded-mobile-model.ndjson", import.meta.url), "utf8")
  .split("\n").filter(Boolean).map((line) => (JSON.parse(line) as RaceLogLine).event);
const start = recording.find((event) => event.type === "start") as Extract<RaceEvent, { type: "start" }>;
const metrics = (lane: "a" | "b") => (recording.find((event) => event.type === "result" && event.lane === lane) as { metrics: LaneMetrics }).metrics;

describe("report ids", () => {
  it("are valid and sort newest first", () => {
    const older = newReportId(1_700_000_000_000, "aaaaaaaa-0000");
    const newer = newReportId(1_800_000_000_000, "bbbbbbbb-0000");
    expect(older).toMatch(REPORT_ID);
    expect(newer).toMatch(REPORT_ID);
    expect([older, newer].sort()).toEqual([newer, older]);
  });
});

describe("RaceLog", () => {
  const frame = (lane: "a" | "b", t: number): RaceEvent => ({ type: "frame", lane, t, jpeg: `${lane}${t}` });
  const parse = (ndjson: string) => ndjson.trim().split("\n").map((line) => JSON.parse(line) as RaceLogLine);

  it("drops every second frame but keeps each lane's last one, before the results", () => {
    const log = new RaceLog(0);
    log.add(start, 0);
    for (let t = 0; t < 5; t += 1) log.add(frame("a", t), t);
    for (let t = 0; t < 2; t += 1) log.add(frame("b", t), t);
    log.add({ type: "result", lane: "a", metrics: metrics("a") }, 10);
    const lines = parse(log.toNdjson("2026-11-24T00:00:00.000Z", "id", [{ type: "done", elapsedMs: 11, reportId: "id" }]));
    expect(lines[0].event).toEqual({ type: "recording", recordedAt: "2026-11-24T00:00:00.000Z", reportId: "id", measure: "v2" });
    const frames = lines.filter((line) => line.event.type === "frame").map((line) => (line.event as { jpeg: string }).jpeg);
    expect(frames.sort()).toEqual(["a0", "a2", "a4", "b0", "b1"]);
    const firstResult = lines.findIndex((line) => line.event.type === "result");
    expect(lines.findIndex((line) => (line.event as { jpeg?: string }).jpeg === "b1")).toBeLessThan(firstResult);
    expect(lines.at(-1)?.event).toEqual({ type: "done", elapsedMs: 11, reportId: "id" });
  });
});

describe("summarize", () => {
  it("keeps what the list of saved races shows", () => {
    const row = summarize("id", "2026-11-24T00:00:00.000Z", start, { a: metrics("a"), b: metrics("b") });
    expect(row.page).toBe("model");
    expect(row.profile).toBe("mobile");
    expect(row.lanes.a.capped).toBe(true);
    expect(row.lanes.b.lcp).toBeGreaterThan(0);
    expect(new TextEncoder().encode(JSON.stringify(row)).length).toBeLessThan(1024);
  });
});
