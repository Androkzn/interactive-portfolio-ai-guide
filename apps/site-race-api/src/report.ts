import { MEASURE_VERSION } from "../../../packages/contracts/src/site-race";
import type { LaneId, LaneMetrics, RaceEvent, RaceLogLine, RaceReportSummary } from "../../../packages/contracts/src/site-race";

/** KV keys are race:<id>; ids sort newest first, so a KV list returns the latest races first. */
export const REPORT_PREFIX = "race:";
export const REPORT_ID = /^[0-9a-z]{9}-[0-9a-f]{8}$/;
const NEWEST_FIRST = 36 ** 9 - 1;

export function newReportId(now = Date.now(), random: string = crypto.randomUUID()): string {
  return `${(NEWEST_FIRST - now).toString(36).padStart(9, "0")}-${random.replace(/-/g, "").slice(0, 8)}`;
}

type StartEvent = Extract<RaceEvent, { type: "start" }>;

/**
 * Collects what a race emits into the same replayable log the recordings use, partial results
 * included, so a reopened race fills in the way it did live. Every second frame per lane is
 * dropped to halve the size, except two a report needs: each lane's first-page last frame (the
 * "visually complete" target of Speed Index; it is sent just before the lane starts inspecting)
 * and its last frame, which the report opens on.
 */
export class RaceLog {
  private lines: RaceLogLine[] = [];
  private frameCount: Record<LaneId, number> = { a: 0, b: 0 };
  private dropped: Partial<Record<LaneId, RaceLogLine>> = {};

  constructor(private readonly started: number, private readonly version?: string) {}

  add(event: RaceEvent, now = Date.now()) {
    const line: RaceLogLine = { at: Math.max(0, now - this.started), event };
    if (event.type === "frame") {
      if (this.frameCount[event.lane]++ % 2 === 1) { this.dropped[event.lane] = line; return; }
      delete this.dropped[event.lane];
    }
    // The first page ends where the lane starts inspecting; a result comes once the lane stopped
    // filming what it covers. Either way the lane's held-back frame is its last one so far: keep it.
    if (event.type === "result" || (event.type === "phase" && event.phase === "inspecting")) this.flushDropped([event.lane]);
    this.lines.push(line);
  }

  private flushDropped(lanes: LaneId[] = ["a", "b"]) {
    for (const lane of lanes) {
      const line = this.dropped[lane];
      if (line) this.lines.push(line);
      delete this.dropped[lane];
    }
  }

  toNdjson(recordedAt: string, reportId: string, tail: RaceEvent[] = []): string {
    this.flushDropped();
    const end = this.lines.at(-1)?.at ?? 0;
    const all: RaceLogLine[] = [
      { at: 0, event: { type: "recording", recordedAt, reportId, measure: MEASURE_VERSION, ...(this.version ? { version: this.version } : {}) } },
      ...this.lines,
      ...tail.map((event) => ({ at: end, event })),
    ];
    return `${all.map((line) => JSON.stringify(line)).join("\n")}\n`;
  }
}

/** The list view's row for a saved race. KV metadata is capped at 1 KB, so URLs are trimmed. */
export function summarize(id: string, savedAt: string, start: StartEvent, metrics: Record<LaneId, LaneMetrics>, version?: string): RaceReportSummary {
  const lane = (key: LaneId) => ({
    url: start.lanes[key].url.slice(0, 200),
    preset: start.lanes[key].preset,
    lcp: metrics[key].timing.lcp,
    capped: !!metrics[key].capped,
    kb: Math.round(metrics[key].network.totalKb),
  });
  return { id, measure: MEASURE_VERSION, ...(version ? { version: version.slice(0, 40) } : {}), savedAt, page: start.page ?? "home", profile: start.profile, ...(start.capMs ? { capMs: start.capMs } : {}), lanes: { a: lane("a"), b: lane("b") } };
}
