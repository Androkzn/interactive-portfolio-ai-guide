import { describe, expect, it } from "vitest";

import { DEFAULT_PROJECT_ID, projectById, screenInsightFor } from "./content";

describe("default project", () => {
  it("opens Symply House", () => {
    expect(projectById(DEFAULT_PROJECT_ID).id).toBe("symply-house");
  });

  it("maps live app routes to one screen-level narrative", () => {
    const house = projectById("symply-house");
    const budget = projectById("symply-budget");
    const civic = projectById("hoc-v2");

    expect(screenInsightFor(house, "/projects").id).toBe("house-projects");
    expect(screenInsightFor(budget, "/spending").id).toBe("budget-spending");
    expect(screenInsightFor(civic, "/mp/30552").id).toBe("civic-mp-detail");
    expect(screenInsightFor(civic, "/login").id).toBe("civic-login");
  });
});
