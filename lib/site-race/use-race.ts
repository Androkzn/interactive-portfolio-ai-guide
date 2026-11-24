"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { LaneId, LaneMetrics, LanePhase, MarkName, RaceEvent, RaceLaneInfo, RacePageId, RaceProfile } from "@/packages/contracts/src/site-race";

export const SITE_RACE_API = process.env.NEXT_PUBLIC_SITE_RACE_API ?? "https://site-race-api.a-tekhtelev.workers.dev";

export type Frame = { t: number; src: string };

export type LaneState = {
  info: RaceLaneInfo | null;
  phase: LanePhase;
  /** Why the lane is in this phase, e.g. "Still downloading at the 30 s cap". */
  phaseDetail: string | null;
  frames: Frame[];
  marks: Partial<Record<MarkName, number>>;
  net: { requests: number; kb: number };
  /** Wall-clock (performance.now) when this lane's navigation started, for the live stopwatch. */
  startedAt: number | null;
  metrics: LaneMetrics | null;
  error: string | null;
};

export type RaceSource = "live" | "replay";

export type RaceState = {
  status: "idle" | "connecting" | "racing" | "finished" | "failed";
  source: RaceSource | null;
  profile: RaceProfile;
  profileLabel: string;
  page: RacePageId | null;
  recordedAt: string | null;
  lanes: Record<LaneId, LaneState>;
  error: string | null;
  elapsedMs: number | null;
};

const emptyLane = (): LaneState => ({ info: null, phase: "queued", phaseDetail: null, frames: [], marks: {}, net: { requests: 0, kb: 0 }, startedAt: null, metrics: null, error: null });

const initial = (profile: RaceProfile = "mobile"): RaceState => ({
  status: "idle", source: null, profile, profileLabel: "", page: null, recordedAt: null, lanes: { a: emptyLane(), b: emptyLane() }, error: null, elapsedMs: null,
});

type Action =
  | { type: "begin"; source: RaceSource; profile: RaceProfile }
  | { type: "event"; event: RaceEvent; now: number }
  | { type: "recording"; recordedAt: string }
  | { type: "fail"; message: string };

function updateLane(state: RaceState, lane: LaneId, patch: (current: LaneState) => Partial<LaneState>): RaceState {
  return { ...state, lanes: { ...state.lanes, [lane]: { ...state.lanes[lane], ...patch(state.lanes[lane]) } } };
}

function reducer(state: RaceState, action: Action): RaceState {
  switch (action.type) {
    case "begin":
      return { ...initial(action.profile), status: "connecting", source: action.source };
    case "recording":
      return { ...state, recordedAt: action.recordedAt };
    case "fail":
      return { ...state, status: "failed", error: action.message };
    case "event": {
      const { event, now } = action;
      switch (event.type) {
        case "start":
          return {
            ...state, status: "racing", profile: event.profile, profileLabel: event.profileLabel, page: event.page ?? "home",
            lanes: { a: { ...emptyLane(), info: event.lanes.a }, b: { ...emptyLane(), info: event.lanes.b } },
          };
        case "phase":
          return updateLane(state, event.lane, (lane) => ({
            phase: event.phase,
            phaseDetail: event.detail ?? (event.phase === "inspecting" || event.phase === "done" ? lane.phaseDetail : null),
            ...(event.phase === "failed" ? { error: event.detail ?? "Failed" } : {}),
          }));
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
          return updateLane(state, event.lane, () => ({ metrics: event.metrics }));
        case "error":
          return event.lane ? updateLane(state, event.lane, () => ({ error: event.message })) : { ...state, status: "failed", error: event.message };
        case "done": {
          const ok = state.lanes.a.metrics && state.lanes.b.metrics;
          return { ...state, status: ok ? "finished" : "failed", elapsedMs: event.elapsedMs, error: ok ? null : state.error ?? "One of the sites did not finish, so there is no verdict." };
        }
      }
    }
  }
  return state;
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
  const [state, dispatch] = useReducer(reducer, undefined, () => initial());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const runLive = useCallback(async ({ a, b, profile, page }: RaceRequest) => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
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
      if (!finished) dispatch({ type: "fail", message: "The connection to the race closed early." });
      return { ok: finished, status: 200 };
    } catch (error) {
      if (abort.signal.aborted) return { ok: false as const, status: 0 };
      dispatch({ type: "fail", message: "Could not reach the race service." });
      return { ok: false as const, status: 0 };
    }
  }, []);

  const runReplay = useCallback(async (file: string, speed = 1) => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    dispatch({ type: "begin", source: "replay", profile: "mobile" });
    try {
      const res = await fetch(file, { signal: abort.signal });
      if (!res.ok) throw new Error(`recording ${res.status}`);
      const text = await res.text();
      const lines = text.split("\n").filter(Boolean).map((line) => JSON.parse(line) as { at: number; event: RaceEvent | { type: "recording"; recordedAt: string } });
      const started = performance.now();
      for (const { at, event } of lines) {
        const wait = at / speed - (performance.now() - started);
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        if (abort.signal.aborted) return;
        if (event.type === "recording") dispatch({ type: "recording", recordedAt: event.recordedAt });
        else dispatch({ type: "event", event, now: performance.now() });
      }
    } catch {
      if (!abort.signal.aborted) dispatch({ type: "fail", message: "Could not load the recorded race." });
    }
  }, []);

  return { state, runLive, runReplay, stop };
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
