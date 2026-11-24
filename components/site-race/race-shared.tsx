"use client";

import { useEffect, useState } from "react";
import type { LaneId } from "@/packages/contracts/src/site-race";
import { RACE_PRESETS } from "@/packages/contracts/src/site-race";
import type { LaneState } from "@/lib/site-race/use-race";
import { originalStage, stageById, stageForUrl, type StageId } from "@/lib/site-race/journey";
import styles from "./site-race.module.css";

export type LaneIdentity = { kind: "before" | "after" | "challenger"; role: string; label: string; stack: string };

/** Who a lane is, from the URL it raced (so recordings label themselves), or from the selection before a race. */
export function laneIdentity(lane: LaneState, id: LaneId, selected: StageId): LaneIdentity {
  const info = lane.info;
  const stage = info ? (info.preset === "astro" ? originalStage : stageForUrl(info.url)) : id === "a" ? originalStage : stageById(selected);
  if (stage?.id === "original") return { kind: "before", role: "Before", label: "Original", stack: "Astro · shipped as-is, never optimized" };
  if (stage) return { kind: "after", role: "After", label: `Next.js · ${stage.short}`, stack: stage.title };
  if (info?.preset === "next") return { kind: "after", role: "After", label: "Next.js", stack: RACE_PRESETS.next.stack };
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

const FROZEN: LaneState["phase"][] = ["settling", "inspecting", "done", "failed"];

/**
 * Where a lane crossed its finish line, ms: its LCP once that is final; the cap
 * when it was still waiting on a bigger image in the viewport; FCP as a last resort.
 */
export function finishTime(lane: LaneState): number | null {
  if (!FROZEN.includes(lane.phase) && !lane.metrics) return null;
  if (lane.marks.lcp !== undefined) return Math.max(lane.marks.lcp, lane.marks.fcp ?? 0);
  if (lane.metrics?.capped || lane.phaseDetail) return lane.metrics?.capMs ?? 30_000;
  return Math.max(lane.marks.fcp ?? 0, lane.phase === "failed" ? lane.frames.at(-1)?.t ?? 0 : 0) || null;
}

/** Lane clock in ms since its navigation start: live while loading, frozen at its finish line. */
export function laneClock(lane: LaneState, now: number): number | null {
  if (lane.startedAt === null) return null;
  return finishTime(lane) ?? Math.max(0, now - lane.startedAt);
}

