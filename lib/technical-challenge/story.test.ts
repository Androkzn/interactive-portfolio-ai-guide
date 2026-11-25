import { describe, expect, it } from "vitest";
import { board, chapterStarts, chapters, locate, REQUIRED_IDS, runs, snapshot, TOTAL_SECONDS } from "./story";

const ids = new Set(board.map((item) => item.id));
const endOf = (id: string) => { const i = chapters.findIndex((chapter) => chapter.id === id); return chapterStarts[i] + chapters[i].seconds * 0.999; };

describe("the chapters", () => {
  it("fill exactly one hour each, and play in about a minute", () => {
    for (const hour of [1, 2] as const) {
      expect(chapters.filter((chapter) => chapter.hour === hour).reduce((sum, chapter) => sum + chapter.minutes, 0), `hour ${hour}`).toBe(60);
    }
    expect(TOTAL_SECONDS).toBeGreaterThanOrEqual(55);
    expect(TOTAL_SECONDS).toBeLessThanOrEqual(70);
  });

  it("keep hour one's fixed points: first live eval after 43 minutes, the commit inside the hour", () => {
    const minutesUntil = (id: string) => chapters.slice(0, chapters.findIndex((chapter) => chapter.id === id)).reduce((sum, chapter) => sum + chapter.minutes, 0);
    expect(minutesUntil("eval")).toBe(43);
    expect(minutesUntil("ship")).toBe(55);
  });

  it("have unique ids, a decision and a why, and touch only tiles on the board", () => {
    expect(new Set(chapters.map((chapter) => chapter.id)).size).toBe(chapters.length);
    for (const chapter of chapters) {
      expect(chapter.decision.length, chapter.id).toBeGreaterThan(10);
      expect(chapter.why.length, chapter.id).toBeGreaterThan(20);
      for (const effect of chapter.effects) {
        for (const id of [...(effect.define ?? []), ...(effect.pass ?? []), ...Object.keys(effect.note ?? {}), ...Object.keys(effect.run?.items ?? {})]) expect(ids.has(id), `${chapter.id}: ${id}`).toBe(true);
        expect(effect.at).toBeGreaterThanOrEqual(0);
        expect(effect.at).toBeLessThanOrEqual(1);
      }
    }
  });

  it("add up every eval run from its per-item counts", () => {
    for (const run of Object.values(runs)) {
      const counted = Object.values(run.items).reduce<[number, number]>(([p, n], score) => [p + score![0], n + score![1]], [0, 0]);
      expect(counted, run.label).toEqual([run.pass, run.total]);
    }
  });
});

describe("locate", () => {
  it("maps playback seconds to a chapter and progress", () => {
    expect(locate(0)).toEqual({ index: 0, progress: 0 });
    expect(locate(chapterStarts[3])).toEqual({ index: 3, progress: 0 });
    expect(locate(TOTAL_SECONDS).index).toBe(chapters.length - 1);
  });
});

describe("snapshot", () => {
  it("starts with nothing specified", () => {
    const start = snapshot(0);
    expect(start.defined).toBe(0);
    expect(start.tests).toBe(0);
  });

  it("specifies every item before any code is written", () => {
    const beforeBuild = snapshot(endOf("plan"));
    expect(beforeBuild.defined).toBe(board.length);
    expect(beforeBuild.passing).toBe(0);
    expect(beforeBuild.tests).toBe(0);
  });

  it("ends hour one with every required item built and tested, on an honest 48 / 54", () => {
    const end = snapshot(endOf("ship"));
    expect(end.lastRun).toMatchObject({ pass: 48, total: 54 });
    expect(end.tests).toBe(76);
    const notStarted = REQUIRED_IDS.filter((id) => end.tiles[id].status === "pending" || end.tiles[id].status === "defined");
    expect(notStarted).toEqual(["D-REPO", "D-LIVE"]);
  });

  it("proves the deliverables in the bonus hour", () => {
    const proved = snapshot(endOf("prove"));
    expect(proved.tiles["D-REPO"].status).toBe("pass");
    expect(proved.tiles["D-LIVE"]).toMatchObject({ status: "pass", score: [18, 18] });
  });

  it("drops on the stricter set, then finishes with everything passing at 75 / 75", () => {
    expect(snapshot(chapterStarts[chapters.length - 1] + 1).tiles.E2).toMatchObject({ status: "partial", score: [6, 15] });
    const end = snapshot(TOTAL_SECONDS);
    expect(end.lastRun).toMatchObject({ pass: 75, total: 75, set: "b" });
    expect(end.passing).toBe(REQUIRED_IDS.length);
    expect(Object.values(end.tiles).every((tile) => tile.status === "pass")).toBe(true);
  });
});
