/**
 * Time to Interactive and Total Blocking Time, Lighthouse's observed definitions,
 * so both lanes get the same, standard measurement window.
 *
 * TTI: the start of the first CPU-quiet period after FCP (no long task) that contains
 * 5 s during which at most 2 requests are in flight. TBT: for every long task inside
 * [FCP, TTI], clipped to that window, the part beyond 50 ms. When a lane hits the cap
 * before such a window exists, TTI is unknown and TBT is counted up to the cap — a
 * lower bound, reported as censored.
 *
 * All times are ms on the page's timeline (since navigation start).
 */
export const QUIET_WINDOW_MS = 5_000;
const MAX_IN_FLIGHT = 2;
const BLOCKING_MS = 50;

export type Task = [start: number, duration: number];
export type Req = { start: number; end: number | null };

/** Intervals within [0, now] where at most MAX_IN_FLIGHT requests are open. */
function networkQuiet(reqs: Req[], now: number): [number, number][] {
  const edges: [number, number][] = [];
  for (const r of reqs) {
    if (r.start > now) continue;
    edges.push([r.start, 1]);
    if (r.end !== null && r.end <= now) edges.push([r.end, -1]);
  }
  edges.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const quiet: [number, number][] = [];
  let open = 0;
  let quietFrom: number | null = 0;
  for (const [t, d] of edges) {
    open += d;
    if (open > MAX_IN_FLIGHT && quietFrom !== null) { if (t > quietFrom) quiet.push([quietFrom, t]); quietFrom = null; }
    else if (open <= MAX_IN_FLIGHT && quietFrom === null) quietFrom = t;
  }
  if (quietFrom !== null && now > quietFrom) quiet.push([quietFrom, now]);
  return quiet;
}

export function computeTti(fcp: number | null, tasks: Task[], reqs: Req[], now: number): number | null {
  if (fcp === null) return null;
  const sorted = [...tasks].map(([s, d]) => [s, s + d] as const).filter(([, end]) => end > fcp).sort((x, y) => x[0] - y[0]);
  const quiet = networkQuiet(reqs, now);
  // CPU-quiet periods after FCP: from FCP (or a task's end) to the next task's start (or now).
  let start = fcp;
  const periods: [number, number][] = [];
  for (const [s, e] of sorted) {
    if (s > start) periods.push([start, s]);
    start = Math.max(start, e);
  }
  if (now > start) periods.push([start, now]);
  for (const [cs, ce] of periods) {
    if (ce - cs < QUIET_WINDOW_MS) continue;
    for (const [ns, ne] of quiet) {
      if (Math.min(ce, ne) - Math.max(cs, ns) >= QUIET_WINDOW_MS) return Math.round(cs);
    }
  }
  return null;
}

/** Lighthouse's sum: tasks clipped to [from, to], blocking portion beyond 50 ms. */
export function totalBlockingTime(tasks: Task[], from: number | null, to: number): number | null {
  if (from === null || to <= from) return from === null ? null : 0;
  let sum = 0;
  for (const [s, d] of tasks) {
    const clipped = Math.min(s + d, to) - Math.max(s, from);
    if (clipped > BLOCKING_MS) sum += clipped - BLOCKING_MS;
  }
  return Math.round(sum);
}
