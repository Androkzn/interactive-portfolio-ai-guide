"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { LEGACY_CAPS, RACE_CAPS } from "../../packages/contracts/src/site-race";
import type { CapReason, FullPageWeight, LaneId, LaneMetrics, LanePhase, MarkName, RaceCaps, RaceEvent, RaceLaneInfo, RaceLink, RaceLogLine, RacePageId, RaceProfile } from "@/packages/contracts/src/site-race";
import { fetchReportLog, parseRaceLog, SITE_RACE_API } from "./reports";
import { scoreRace, type Pending, type Verdict } from "./scoring";


export type Frame = { t: number; src: string };

export type LaneState = {
  info: RaceLaneInfo | null;
  phase: LanePhase;
  /** Why the lane is in this phase, e.g. "Still downloading at the cap". */
  phaseDetail: string | null;
  frames: Frame[];
  marks: Partial<Record<MarkName, number>>;
  net: { requests: number; kb: number };
  /** Wall-clock (performance.now) when this lane's navigation started, for the live stopwatch. */
  startedAt: number | null;
  /** The lane's numbers so far: its first page as soon as it is measured, then the visit as it goes. */
  metrics: LaneMetrics | null;
  /** True once `metrics` are final (the lane's last result, or an older race's only one). */
  complete: boolean;
  /** The first page's cap this lane ran under, ms: the race's until the lane's own metrics say. */
  capMs: number;
  /** Set when the lane hit that cap: still downloading, or loaded but never quiet long enough for TTI. */
  cap: CapReason | null;
  /** The first page's full weight from the warm-up load, sent before the clock started (site-race/2). */
  fullPage: FullPageWeight | null;
  error: string | null;
};

/** live: streamed from the Worker now; replay: a bundled recording; report: a saved race reopened. */
export type RaceSource = "live" | "replay" | "report";

export type RaceState = {
  status: "idle" | "connecting" | "racing" | "finished" | "failed";
  source: RaceSource | null;
  profile: RaceProfile;
  profileLabel: string;
  page: RacePageId | null;
  recordedAt: string | null;
  /** Set once the Worker saved this race; it reopens at ?report=<id>. */
  reportId: string | null;
  /** Event stream version of the race (see SITE_RACE_PROTOCOL); null before its start. */
  protocol: string | null;
  /** The caps the race ran under: the current ones before a race starts, LEGACY_CAPS for races that do not say. */
  caps: RaceCaps;
  /** The throttled connection, for download-time estimates; null when unthrottled or not recorded. */
  link: RaceLink | null;
  lanes: Record<LaneId, LaneState>;
  error: string | null;
  elapsedMs: number | null;
};

const emptyLane = (capMs: number = RACE_CAPS.firstPageMs): LaneState => ({
  info: null, phase: "queued", phaseDetail: null, frames: [], marks: {}, net: { requests: 0, kb: 0 }, startedAt: null,
  metrics: null, complete: false, capMs, cap: null, fullPage: null, error: null,
});

export const idleRace = (profile: RaceProfile = "mobile"): RaceState => ({
  status: "idle", source: null, profile, profileLabel: "", page: null, recordedAt: null, reportId: null,
  protocol: null, caps: { ...RACE_CAPS }, link: null, lanes: { a: emptyLane(), b: emptyLane() }, error: null, elapsedMs: null,
});

/** Why a capped lane stopped, for races that do not say (site-race/1): read from its numbers or its phase note. */
const capReason = (m: LaneMetrics): CapReason => (m.timing.load === null || m.timing.load > (m.capMs ?? LEGACY_CAPS.firstPageMs) ? "loading" : "busy");

type Action =
  | { type: "begin"; source: RaceSource; profile: RaceProfile }
  | { type: "event"; event: RaceEvent; now: number }
  | { type: "recording"; recordedAt: string; reportId?: string }
  | { type: "load"; state: RaceState }
  | { type: "fail"; message: string };

function updateLane(state: RaceState, lane: LaneId, patch: (current: LaneState) => Partial<LaneState>): RaceState {
  return { ...state, lanes: { ...state.lanes, [lane]: { ...state.lanes[lane], ...patch(state.lanes[lane]) } } };
}

function reducer(state: RaceState, action: Action): RaceState {
  switch (action.type) {
    case "begin":
      return { ...idleRace(action.profile), status: "connecting", source: action.source };
    case "recording":
      return { ...state, recordedAt: action.recordedAt, reportId: action.reportId ?? state.reportId };
    case "load":
      return action.state;
    case "fail": {
      // A lane still running when the race ends says so instead of "loading"; it keeps its phase,
      // so the progress bar shows the step where the race stopped.
      const end = (lane: LaneState): LaneState => (lane.phase === "done" || lane.phase === "failed" ? lane : { ...lane, phaseDetail: action.message });
      return { ...state, status: "failed", error: action.message, lanes: { a: end(state.lanes.a), b: end(state.lanes.b) } };
    }
    case "event": {
      const { event, now } = action;
      switch (event.type) {
        case "start": {
          // site-race/2 names every cap; older races name the first page's at most, and ran the legacy taps.
          const caps: RaceCaps = event.caps ?? { ...LEGACY_CAPS, firstPageMs: event.capMs ?? LEGACY_CAPS.firstPageMs };
          return {
            ...state, status: "racing", profile: event.profile, profileLabel: event.profileLabel, page: event.page ?? "home",
            protocol: event.protocol ?? null, caps, link: event.link ?? null,
            lanes: { a: { ...emptyLane(caps.firstPageMs), info: event.lanes.a }, b: { ...emptyLane(caps.firstPageMs), info: event.lanes.b } },
          };
        }
        case "phase":
          return updateLane(state, event.lane, (lane) => ({
            phase: event.phase,
            // A cap note ("still downloading at the 10 s cap") belongs to the first page: it may stay while
            // that page is inspected, but the visit's own steps show their own label, not the first page's cap.
            phaseDetail: event.detail ?? (event.phase === "inspecting" || event.phase === "done" ? lane.phaseDetail : null),
            ...(event.phase === "failed" ? { error: event.detail ?? "Failed" } : {}),
            // The settling phase with a note is the cap (site-race/1 says it only in words).
            ...(event.cap ? { cap: event.cap } : event.phase === "settling" && event.detail && !lane.cap ? { cap: /still downloading/i.test(event.detail) ? "loading" : "busy" } : {}),
          }));
        case "warmup":
          return updateLane(state, event.lane, () => ({ fullPage: event.fullPage }));
        case "origin":
          return updateLane(state, event.lane, (lane) => ({ startedAt: lane.startedAt ?? now }));
        case "frame":
          return updateLane(state, event.lane, (lane) => ({
            frames: [...lane.frames, { t: event.t, src: `data:image/jpeg;base64,${event.jpeg}` }],
            startedAt: event.t > 0 ? Math.min(lane.startedAt ?? now, now - event.t) : lane.startedAt,
          }));
        case "mark":
          // A milestone at page time t arrived now, so navigation started no later than now − t.
          return updateLane(state, event.lane, (lane) => ({ marks: { ...lane.marks, [event.name]: event.t }, startedAt: Math.min(lane.startedAt ?? now, now - event.t) }));
        case "net":
          return updateLane(state, event.lane, () => ({ net: { requests: event.requests, kb: event.kb } }));
        case "result":
          // Each result holds everything the lane knows so far (site-race/2) or everything (site-race/1).
          return updateLane(state, event.lane, (lane) => ({
            metrics: event.metrics,
            complete: !event.partial,
            capMs: event.metrics.capMs ?? lane.capMs,
            fullPage: event.metrics.fullPage ?? lane.fullPage,
            cap: event.metrics.capped ? lane.cap ?? capReason(event.metrics) : null,
          }));
        case "error":
          return event.lane ? updateLane(state, event.lane, () => ({ error: event.message })) : { ...state, status: "failed", error: event.message };
        case "done": {
          const ok = state.lanes.a.metrics && state.lanes.b.metrics;
          // The race is over: whatever a lane has is all it will have.
          const settle = (lane: LaneState): LaneState => (lane.metrics ? { ...lane, complete: true } : lane);
          return {
            ...state, status: ok ? "finished" : "failed", elapsedMs: event.elapsedMs, reportId: event.reportId ?? state.reportId,
            lanes: { a: settle(state.lanes.a), b: settle(state.lanes.b) },
            error: ok ? null : state.error ?? "One of the sites did not finish, so there is no verdict.",
          };
        }
      }
    }
  }
  return state;
}

const toAction = (line: RaceLogLine, now: number): Action => line.event.type === "recording"
  ? { type: "recording", recordedAt: line.event.recordedAt, reportId: line.event.reportId }
  : { type: "event", event: line.event, now };

/** A whole race log folded into its final state at once — how a saved report opens. */
export function foldRaceLog(lines: RaceLogLine[], source: RaceSource, now = 0): RaceState {
  return lines.reduce((state, line) => reducer(state, toAction(line, now)), reducer(idleRace(), { type: "begin", source, profile: "mobile" }));
}

/** Both first pages are measured: the scoreboard can show, while the visit may still be going. */
export const firstPagesIn = (state: RaceState) => !!(state.lanes.a.metrics && state.lanes.b.metrics);

/** Lanes still on their visit while the race runs: the visit's rounds wait for them. */
export function pendingLanes(state: RaceState): Pending {
  const running = state.status === "connecting" || state.status === "racing";
  return { a: running && !state.lanes.a.complete, b: running && !state.lanes.b.complete };
}

/** No lane has anything left to send: the verdict is the race's last word, even before `done`. */
export const verdictFinal = (state: RaceState) => state.status === "finished" || (state.status === "racing" && state.lanes.a.complete && state.lanes.b.complete);

/**
 * The verdict so far: the first page's rounds as soon as both first pages are in, the visit's
 * rounds as each lane finishes them (provisional until `pending` is 0). Null before that.
 */
export function verdictOf(state: RaceState): Verdict | null {
  const { a, b } = state.lanes;
  return a.metrics && b.metrics ? scoreRace(a.metrics, b.metrics, pendingLanes(state)) : null;
}

/** Parses an SSE body into events. EventSource is not used: it reconnects on close, which would start a second race. */
async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<RaceEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let split: number;
    while ((split = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const data = chunk.split("\n").filter((line) => line.startsWith("data: ")).map((line) => line.slice(6)).join("\n");
      if (data) yield JSON.parse(data) as RaceEvent;
    }
  }
}

export type RaceRequest = { a: string; b: string; profile: RaceProfile; page: RacePageId };

export function useRace() {
  const [state, dispatch] = useReducer(reducer, undefined, () => idleRace());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Stops a live race or a replay where it is: the frames so far stay, the race reads as stopped. */
  const stop = useCallback(() => {
    const current = abortRef.current;
    if (!current || current.signal.aborted) return;
    current.abort();
    dispatch({ type: "fail", message: "Race stopped." });
  }, []);

  const fresh = () => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    return abort;
  };

  const runLive = useCallback(async ({ a, b, profile, page }: RaceRequest) => {
    const abort = fresh();
    dispatch({ type: "begin", source: "live", profile });
    try {
      const query = new URLSearchParams({ a, b, profile, page });
      const res = await fetch(`${SITE_RACE_API}/race?${query}`, { signal: abort.signal, cache: "no-store" });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        dispatch({ type: "fail", message: body?.message ?? `The race service answered ${res.status}.` });
        return { ok: false as const, status: res.status };
      }
      let finished = false;
      for await (const event of readSse(res.body)) {
        dispatch({ type: "event", event, now: performance.now() });
        if (event.type === "done") finished = true;
      }
      if (!finished && !abort.signal.aborted) dispatch({ type: "fail", message: "The connection to the race closed early." });
      return { ok: finished, status: 200 };
    } catch {
      // Stopped on purpose (or replaced by a newer race): not a service failure, so no fallback.
      if (abort.signal.aborted) return { ok: false as const, status: 0, aborted: true };
      dispatch({ type: "fail", message: "Could not reach the race service." });
      return { ok: false as const, status: 0 };
    }
  }, []);

  /** Plays a bundled recording at its real pace. */
  const runReplay = useCallback(async (file: string, speed = 1) => {
    const abort = fresh();
    dispatch({ type: "begin", source: "replay", profile: "mobile" });
    try {
      const res = await fetch(file, { signal: abort.signal });
      if (!res.ok) throw new Error(`recording ${res.status}`);
      const lines = parseRaceLog(await res.text());
      const started = performance.now();
      for (const line of lines) {
        const wait = line.at / speed - (performance.now() - started);
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        if (abort.signal.aborted) return;
        dispatch(toAction(line, performance.now()));
      }
    } catch {
      if (!abort.signal.aborted) dispatch({ type: "fail", message: "Could not load the recorded race." });
    }
  }, []);

  /** Opens a saved race straight at its result. Resolves to the opened state, or null. */
  const openReport = useCallback(async (id: string): Promise<RaceState | null> => {
    const abort = fresh();
    try {
      const opened = foldRaceLog(await fetchReportLog(id, abort.signal), "report", performance.now());
      if (abort.signal.aborted) return null;
      dispatch({ type: "load", state: opened });
      return opened;
    } catch {
      if (!abort.signal.aborted) dispatch({ type: "fail", message: "Could not open that saved race. It may have been removed." });
      return null;
    }
  }, []);

  /** Shows a race this page already holds (one run earlier in the visit). */
  const show = useCallback((saved: RaceState) => {
    abortRef.current?.abort();
    dispatch({ type: "load", state: saved });
  }, []);

  return { state, runLive, runReplay, openReport, show, stop };
}

/** The frame on screen at time t (ms since that lane's navigation start). */
export function frameAt(frames: Frame[], t: number): Frame | null {
  let found: Frame | null = null;
  for (const frame of frames) {
    if (frame.t > t) break;
    found = frame;
  }
  return found ?? frames[0] ?? null;
}
