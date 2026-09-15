import { describe, expect, it } from "vitest";
import corpus from "../approved-corpus.json";

describe("approved content contract", () => {
  it("keeps the connected Symply House platform matrix explicit", () => {
    expect(corpus.projects.find((project) => project.id === "symply-house")?.boundary).toContain("browser is an iOS or Android runtime");
    expect(corpus.projects.find((project) => project.id === "symply-house")?.sources).toContain("symply-house.platform-matrix");
  });

  it("keeps the agreed five candidate projects represented", () => {
    expect(corpus.projects.map((project) => project.id)).toEqual(expect.arrayContaining(["swiper", "brij", "wifi-map", "one-dialer", "pixalere"]));
  });
});
