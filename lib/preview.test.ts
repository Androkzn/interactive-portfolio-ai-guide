import { describe, expect, it } from "vitest";
import { acceptsPreviewMessage, createPortfolioSessionId, deviceWidths, portfolioDemoMessageFor } from "./preview";

describe("live preview message boundary", () => {
  const frame = {} as Window;
  const origin = "https://symply-house-web.pages.dev";
  const ready = { source: frame, origin, data: { type: "portfolio:theme-ready" } };
  it("accepts the current app frame and exact origin", () => {
    expect(acceptsPreviewMessage(ready, frame, origin)).toBe(true);
    expect(acceptsPreviewMessage({ ...ready, data: { type: "portfolio:theme-applied", theme: "dark" } }, frame, origin)).toBe(true);
    expect(acceptsPreviewMessage({ ...ready, data: { type: "portfolio:demo-ready", projectId: "symply-house" } }, frame, origin)).toBe(true);
    expect(acceptsPreviewMessage({ ...ready, data: { type: "portfolio:navigation", pathname: "/projects" } }, frame, origin)).toBe(true);
  });
  it("rejects other frames, missing frames and lookalike origins", () => {
    expect(acceptsPreviewMessage(ready, {} as Window, origin)).toBe(false);
    expect(acceptsPreviewMessage(ready, null, origin)).toBe(false);
    expect(acceptsPreviewMessage({ ...ready, origin: origin + ".example.com" }, frame, origin)).toBe(false);
  });
  it("rejects malformed and unrelated messages", () => {
    for (const data of [null, "portfolio:theme-ready", {}, { type: "auth:token" }]) {
      expect(acceptsPreviewMessage({ ...ready, data }, frame, origin)).toBe(false);
    }
  });
  it("gives the phones comparable real screen widths while preserving larger tablet and desktop frames", () => {
    expect(deviceWidths).toEqual({ iphone: 538, ipad: 768, android: 515, desktop: 1280 });
  });
  it("marks the demo frames without shipping any credential", () => {
    expect(portfolioDemoMessageFor("hoc-v2")).toBeNull();
    expect(portfolioDemoMessageFor("symply-house")).toEqual({ type: "portfolio:demo", projectId: "symply-house" });
    expect(portfolioDemoMessageFor("symply-budget")).toEqual({ type: "portfolio:demo", projectId: "symply-budget" });
  });
  it("never puts a credential in the demo message", () => {
    // The embedded apps pre-fill from their own `portfolioDemo` query flag, so
    // the portfolio has no reason to know an email or a password. This test
    // exists to stop one being reintroduced and shipped in the public bundle.
    for (const id of ["symply-house", "symply-budget"]) {
      const message = portfolioDemoMessageFor(id);
      expect(Object.keys(message ?? {}).sort()).toEqual(["projectId", "type"]);
      expect(JSON.stringify(message)).not.toMatch(/password|@|Guest/i);
    }
  });
  it("creates a separate visitor session id for each portfolio visit", () => {
    const first = createPortfolioSessionId();
    const second = createPortfolioSessionId();
    expect(first).toEqual(expect.any(String));
    expect(first).not.toBe(second);
  });
});
