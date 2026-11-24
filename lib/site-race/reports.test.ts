import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RACE_PRESETS } from "../../packages/contracts/src/site-race";
import { newReportId } from "../../apps/site-race-api/src/report";
import { featuredStage } from "./journey";
import { parseRaceLog, REPORT_ID, reportLink, setupOf } from "./reports";
import { foldRaceLog } from "./use-race";

const log = (name: string) => parseRaceLog(readFileSync(new URL(`../../public/lab/site-race/${name}.ndjson`, import.meta.url), "utf8"));

describe("saved reports", () => {
  it("open straight at the finished race, with both results and the race's setup", () => {
    const state = foldRaceLog(log("recorded-mobile-model"), "report");
    expect(state.status).toBe("finished");
    expect(state.source).toBe("report");
    expect(state.lanes.a.metrics && state.lanes.b.metrics).toBeTruthy();
    expect(state.lanes.a.frames.length).toBeGreaterThan(5);
    expect(setupOf(state)).toEqual({ page: "model", stage: "prefetch", profile: "mobile" });
  });

  it("give a race against the production alias to the stage the race runs by default", () => {
    const state = foldRaceLog(log("recorded-mobile-home"), "report");
    // Recorded either with the `next` preset or with the alias URL itself: both are the alias.
    expect(new URL(state.lanes.b.info?.url ?? "").host).toBe(new URL(RACE_PRESETS.next.url).host);
    expect(setupOf(state)).toEqual({ page: "home", stage: featuredStage.id, profile: "mobile" });
  });

  it("carry the report id the Worker saved them under", () => {
    const state = foldRaceLog(log("recorded-desktop-model"), "report");
    expect(state.profile).toBe("desktop");
    expect(state.reportId).toMatch(REPORT_ID);
  });

  it("accept exactly the ids the Worker makes", () => {
    expect(newReportId()).toMatch(REPORT_ID);
    expect("../race:x").not.toMatch(REPORT_ID);
  });

  it("link to the race page with the report open", () => {
    expect(reportLink("zd351hbd6-748b1f8e", "http://localhost:3000/lab/site-race/?report=old#journey"))
      .toBe("http://localhost:3000/lab/site-race/?report=zd351hbd6-748b1f8e#race");
  });
});
