// Saved races. The race Worker stores every finished Before/After race in KV and
// serves it back as the same newline-delimited log the recordings use, so a saved
// report opens with the full race view: final screens, scorecard, rounds, waterfall.
// The lab page never lists earlier races; a report opens only from its own link.

import type { RaceLogLine, RacePageId, RacePresetId, RaceProfile } from "@/packages/contracts/src/site-race";
import { stageForUrl, type StageId } from "./journey";
import type { RaceState } from "./use-race";

export const SITE_RACE_API = process.env.NEXT_PUBLIC_SITE_RACE_API ?? "https://site-race-api.a-tekhtelev.workers.dev";
export const REPORT_ID = /^[0-9a-z]{9}-[0-9a-f]{8}$/;

export function parseRaceLog(text: string): RaceLogLine[] {
  return text.split("\n").filter(Boolean).map((line) => JSON.parse(line) as RaceLogLine);
}

export async function fetchReportLog(id: string, signal?: AbortSignal): Promise<RaceLogLine[]> {
  if (!REPORT_ID.test(id)) throw new Error("bad report id");
  const res = await fetch(`${SITE_RACE_API}/reports/${id}`, { signal });
  if (!res.ok) throw new Error(`report ${res.status}`);
  return parseRaceLog(await res.text());
}

/** What the race setup row selects: one page, one optimization stage, one device. */
export type RaceSetup = { page: RacePageId; stage: StageId; profile: RaceProfile };
export const setupKey = (setup: RaceSetup) => `${setup.page}|${setup.stage}|${setup.profile}`;

function setupFromLanes(page: RacePageId | null, profile: RaceProfile, aUrl: string | undefined, aPreset: RacePresetId | null, bUrl: string | undefined): RaceSetup | null {
  if (!page || !aUrl || !bUrl) return null;
  const before = aPreset === "astro" || stageForUrl(aUrl)?.id === "original";
  const after = stageForUrl(bUrl);
  if (!before || !after || after.id === "original") return null;
  return { page, stage: after.id, profile };
}

/** The setup a Before/After race belongs to; null for a challenger race. */
export function setupOf(state: Pick<RaceState, "page" | "profile" | "lanes">): RaceSetup | null {
  return setupFromLanes(state.page, state.profile, state.lanes.a.info?.url, state.lanes.a.info?.preset ?? null, state.lanes.b.info?.url);
}

/** A link to the race page with this report open. */
export function reportLink(id: string, href: string): string {
  const url = new URL(href);
  url.searchParams.set("report", id);
  url.hash = "race";
  return url.toString();
}
