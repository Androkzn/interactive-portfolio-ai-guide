"use client";

import { useState } from "react";
import type { RacePageId, RaceProfile } from "@/packages/contracts/src/site-race";
import { featuredStage, type StageId } from "@/lib/site-race/journey";
import { RaceCoachMark } from "./race-coach-mark";
import { RaceResults } from "./results";
import { SiteRace } from "./site-race";

/**
 * The race and the journey share one selection — page, stage and device — so
 * "Race this stage" in the journey sets up and starts the race above it.
 * The home page is the default.
 */
export function LabExperience() {
  const [page, setPage] = useState<RacePageId>("home");
  // The static build with every optimization.
  const [stage, setStage] = useState<StageId>(() => featuredStage.id);
  const [profile, setProfile] = useState<RaceProfile>("mobile");
  const [startSignal, setStartSignal] = useState(0);

  const raceStage = (next: StageId) => {
    setStage(next);
    setStartSignal((value) => value + 1);
  };

  return (
    <>
      <RaceResults />
      <RaceCoachMark />
      <SiteRace page={page} stage={stage} profile={profile} onPage={setPage} onStage={setStage} onProfile={setProfile} startSignal={startSignal} />
    </>
  );
}
