"use client";

import { useState } from "react";
import type { RacePageId, RaceProfile } from "@/packages/contracts/src/site-race";
import { latestMeasuredStage, type StageId } from "@/lib/site-race/journey";
import { Journey } from "./journey";
import { SiteRace } from "./site-race";

/**
 * The race and the journey share one selection — page, stage and device — so
 * "Race this stage" in the journey sets up and starts the race above it.
 * The model page is the default: it is where the rebuild changed the most.
 */
export function LabExperience() {
  const [page, setPage] = useState<RacePageId>("home");
  // The newest stage with report numbers, so the journey's charts have a highlighted column.
  const [stage, setStage] = useState<StageId>(() => latestMeasuredStage().id);
  const [profile, setProfile] = useState<RaceProfile>("mobile");
  const [startSignal, setStartSignal] = useState(0);

  const raceStage = (next: StageId) => {
    setStage(next);
    setStartSignal((value) => value + 1);
  };

  return (
    <>
      <SiteRace page={page} stage={stage} profile={profile} onPage={setPage} onStage={setStage} onProfile={setProfile} startSignal={startSignal} />
      <Journey page={page} profile={profile} stage={stage} onPage={setPage} onStage={setStage} onRace={raceStage} />
    </>
  );
}
