import { describe, expect, it } from "vitest";
import corpus from "../approved-corpus.json";

describe("approved content contract", () => {
  it("keeps the two approved project boundaries explicit", () => {
    expect(corpus.projects.map((project) => project.id)).toEqual(["hoc-v2", "symply-budget"]);
    expect(corpus.projects.find((project) => project.id === "hoc-v2")?.sources).toContain("hoc-v2.platform-matrix");
    expect(corpus.projects.find((project) => project.id === "symply-budget")?.sources).toContain("symply-budget.platform-matrix");
  });
});
