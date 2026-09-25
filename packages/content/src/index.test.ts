import { describe, expect, it } from "vitest";
import corpus from "../approved-corpus.json";

describe("approved content contract", () => {
  it("keeps every approved project boundary explicit", () => {
    expect(corpus.projects.map((project) => project.id)).toEqual(["hoc-v2", "symply-budget", "symply-health", "symply-house"]);
    expect(corpus.projects.find((project) => project.id === "hoc-v2")?.sources).toContain("hoc-v2.platform-matrix");
    expect(corpus.projects.find((project) => project.id === "symply-budget")?.sources).toContain("symply-budget.platform-matrix");
    expect(corpus.projects.find((project) => project.id === "symply-health")?.sources).toContain("symply-health.platform-matrix");
    expect(corpus.projects.find((project) => project.id === "symply-house")?.sources).toContain("symply-house.platform-matrix");
  });
});
