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
 * Collects what a race emits into the same replayable log the recordings use.
 * Every second frame per lane is dropped to halve the size, except each lane's
 * last frame: the report opens on the final screen, so that one must survive.
 */
export class RaceLog {
  private lines: RaceLogLine[] = [];
  private frameCount: Record<LaneId, number> = { a: 0, b: 0 };
  private dropped: Partial<Record<LaneId, RaceLogLine>> = {};

  constructor(private readonly started: number) {}

  add(event: RaceEvent, now = Date.now()) {
    const line: RaceLogLine = { at: Math.max(0, now - this.started), event };
    if (event.type === "frame") {
      if (this.frameCount[event.lane]++ % 2 === 1) { this.dropped[event.lane] = line; return; }
      delete this.dropped[event.lane];
    }
    // Results come after both lanes stopped filming: put any held-back last frame before them.
    if (event.type === "result") this.flushDropped();
    this.lines.push(line);
  }

  private flushDropped() {
    for (const lane of ["a", "b"] as LaneId[]) {
      const line = this.dropped[lane];
      if (line) this.lines.push(line);
      delete this.dropped[lane];
    }
  }

  toNdjson(recordedAt: string, reportId: string, tail: RaceEvent[] = []): string {
    this.flushDropped();
    const end = this.lines.at(-1)?.at ?? 0;
    const all: RaceLogLine[] = [
      { at: 0, event: { type: "recording", recordedAt, reportId } },
      ...this.lines,
      ...tail.map((event) => ({ at: end, event })),
    ];
    return `${all.map((line) => JSON.stringify(line)).join("\n")}\n`;
  }
}

/** The list view's row for a saved race. KV metadata is capped at 1 KB, so URLs are trimmed. */
export function summarize(id: string, savedAt: string, start: StartEvent, metrics: Record<LaneId, LaneMetrics>): RaceReportSummary {
  const lane = (key: LaneId) => ({
    url: start.lanes[key].url.slice(0, 200),
    preset: start.lanes[key].preset,
    lcp: metrics[key].timing.lcp,
    capped: !!metrics[key].capped,
    kb: Math.round(metrics[key].network.totalKb),
  });
  return { id, savedAt, page: start.page ?? "home", profile: start.profile, lanes: { a: lane("a"), b: lane("b") } };
}
