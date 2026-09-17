import { describe, expect, it } from "vitest";

import { DEFAULT_PROJECT_ID, projectById } from "./content";

describe("default project", () => {
  it("opens Symply House", () => {
    expect(projectById(DEFAULT_PROJECT_ID).id).toBe("symply-house");
  });
});
