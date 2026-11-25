import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { board, CELEBRATE_AT, chapterStarts, chapters, locate, REQUIRED_IDS, runs, screenCues, screens, snapshot, TOTAL_SECONDS } from "./story";

const ids = new Set(board.map((item) => item.id));
const indexOf = (id: string) => chapters.findIndex((chapter) => chapter.id === id);
const startOf = (id: string) => chapterStarts[indexOf(id)];
const at = (id: string, fraction: number) => startOf(id) + chapters[indexOf(id)].seconds * fraction;
const endOf = (id: string) => at(id, 0.999);

describe("the chapters", () => {
  it("fill exactly one hour each, and the two hours play in about a minute", () => {
    for (const hour of [1, 2] as const) {
      expect(chapters.filter((chapter) => chapter.hour === hour).reduce((sum, chapter) => sum + chapter.minutes, 0), `hour ${hour}`).toBe(60);
    }
    const twoHours = chapters.filter((chapter) => chapter.hour < 3).reduce((sum, chapter) => sum + chapter.seconds, 0);
    expect(twoHours).toBeGreaterThanOrEqual(55);
    expect(twoHours).toBeLessThanOrEqual(70);
    expect(TOTAL_SECONDS).toBeLessThanOrEqual(85);
  });

  it("put the epilogue after the two hours, never inside them", () => {
    const hours = chapters.map((chapter) => chapter.hour);
    expect(hours).toEqual([...hours].sort());
    for (const chapter of chapters.filter((item) => item.hour === 3)) expect(chapter.minutes).toBe(0);
  });

  it("keep hour one's fixed points: first live eval after 43 minutes, the commit inside the hour", () => {
    const minutesUntil = (id: string) => chapters.slice(0, indexOf(id)).reduce((sum, chapter) => sum + chapter.minutes, 0);
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

describe("the browser screens", () => {
  it("are real captures that exist, with highlights inside the image", () => {
    for (const screen of Object.values(screens)) {
      expect(existsSync(new URL(`../../public${screen.image}`, import.meta.url)), screen.image).toBe(true);
      expect(screen.provenance.length, screen.id).toBeGreaterThan(8);
      for (const box of screen.highlights ?? []) {
        expect(box.top + box.height, `${screen.id}: ${box.label}`).toBeLessThanOrEqual(100);
        expect(box.left + box.width, `${screen.id}: ${box.label}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("only appear after the celebration, in playback order", () => {
    const starts = screenCues.map((cue) => cue.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(starts[0]).toBeGreaterThanOrEqual(at("prove", CELEBRATE_AT));
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
    expect(start.mode).toBe("board");
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

  it("celebrates exactly when everything the brief demands is green, then becomes a browser", () => {
    expect(snapshot(at("prove", CELEBRATE_AT - 0.01)).mode).toBe("board");
    const party = snapshot(at("prove", CELEBRATE_AT + 0.01));
    expect(party.mode).toBe("celebrate");
    expect(party.passing).toBe(REQUIRED_IDS.length);
    expect(party.tiles["D-LIVE"]).toMatchObject({ status: "pass", score: [18, 18] });
    const browser = snapshot(startOf("observe") + 0.1);
    expect(browser.mode).toBe("browser");
    expect(browser.screen?.def.id).toBe("app");
  });

  it("shows the guard before and after, then the stricter set failing and passing", () => {
    expect(snapshot(at("guards", 0.2)).screen?.def.id).toBe("edgeBefore");
    expect(snapshot(at("guards", 0.6)).screen?.def.id).toBe("edgeAfter");
    expect(snapshot(at("raise", 0.3)).screen?.def.id).toBe("stricter");
    expect(snapshot(at("raise", 0.95)).screen?.def.id).toBe("final");
  });

  it("drops on the stricter set, then finishes the two hours with everything passing at 75 / 75", () => {
    expect(snapshot(startOf("raise") + 1).tiles.E2).toMatchObject({ status: "partial", score: [6, 15] });
    const end = snapshot(endOf("raise"));
    expect(end.lastRun).toMatchObject({ pass: 75, total: 75, set: "b" });
    expect(end.passing).toBe(REQUIRED_IDS.length);
    expect(Object.values(end.tiles).every((tile) => tile.status === "pass")).toBe(true);
  });

  it("closes on the readiness console and the portal, after the sprint", () => {
    expect(snapshot(at("readiness", 0.5)).screen?.def.id).toBe("readiness");
    expect(snapshot(TOTAL_SECONDS).screen?.def.id).toBe("portal");
  });
});
