"use client";

import { useEffect, useState } from "react";
import type { LaneId } from "@/packages/contracts/src/site-race";
import type { LaneState } from "@/lib/site-race/use-race";
import { originalStage, stageById, stageForUrl, type StageId } from "@/lib/site-race/journey";
import styles from "./site-race.module.css";

export type LaneIdentity = { kind: "before" | "after" | "challenger"; role: string; label: string; stack?: string };

/** Who a lane is, from the URL it raced (so recordings label themselves), or from the selection before a race. */
export function laneIdentity(lane: LaneState, id: LaneId, selected: StageId): LaneIdentity {
  const info = lane.info;
  const stage = info ? (info.preset === "astro" ? originalStage : stageForUrl(info.url)) : id === "a" ? originalStage : stageById(selected);
  // Before vs after is the whole story here: which optimization stage raced is not shown.
  if (stage?.id === "original") return { kind: "before", role: "Before", label: "Original site" };
  if (stage || info?.preset === "next") return { kind: "after", role: "After", label: "Next.js" };
  return { kind: "challenger", role: "Challenger", label: info?.label ?? "Your site", stack: "Visitor's site · as served today" };
}

export function toneClass(kind: LaneIdentity["kind"]): string {
  return kind === "before" ? styles.toneAstro : kind === "after" ? styles.toneNext : styles.toneChallenger;
}

export function useClock(active: boolean) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const tick = () => { setNow(performance.now()); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return now;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = () => setReduced(query.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}

/** The lane was stopped at the time cap — known from the phase it entered there, before its metrics arrive. */
export function isCapped(lane: LaneState): boolean {
  return lane.cap !== null || !!lane.metrics?.capped;
}

/** Stopped at the cap while still downloading: the visitor would have been left waiting (not just a busy main thread). */
export const stoppedLoading = (lane: LaneState) => lane.cap === "loading";

/**
 * Where a lane crossed its finish line, ms: its LCP, which the Worker sends only once
 * it is final (after the page settles); the cap when it never painted a final LCP;
 * first paint as a last resort. Null while the lane is still on its way — including
 * the moment it settles, before the LCP arrives, so the clock never shows a stand-in.
 */
export function finishTime(lane: LaneState): number | null {
  if (lane.marks.lcp !== undefined) return Math.max(lane.marks.lcp, lane.marks.fcp ?? 0);
  if (isCapped(lane)) return lane.capMs;
  if (lane.phase === "failed") return Math.max(lane.marks.fcp ?? 0, lane.frames.at(-1)?.t ?? 0) || null;
  if (lane.phase === "inspecting" || lane.phase === "revisiting" || lane.phase === "navigating" || lane.phase === "done" || lane.metrics) return lane.marks.fcp ?? null;
  return null;
}

/** Lane clock in ms since its navigation start: live while loading, frozen at its finish line. */
export function laneClock(lane: LaneState, now: number): number | null {
  if (lane.startedAt === null) return null;
  return finishTime(lane) ?? Math.max(0, now - lane.startedAt);
}

