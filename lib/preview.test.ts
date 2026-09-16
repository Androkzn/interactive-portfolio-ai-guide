import { describe, expect, it } from "vitest";
import { acceptsPreviewMessage, deviceWidths } from "./preview";

describe("live preview message boundary", () => {
  const frame = {} as Window;
  const origin = "https://symply-house-web.pages.dev";
  const ready = { source: frame, origin, data: { type: "portfolio:theme-ready" } };
  it("accepts the current app frame and exact origin", () => {
    expect(acceptsPreviewMessage(ready, frame, origin)).toBe(true);
    expect(acceptsPreviewMessage({ ...ready, data: { type: "portfolio:theme-applied", theme: "dark" } }, frame, origin)).toBe(true);
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
  it("keeps distinct fluid frame widths for the device controls", () => {
    expect(deviceWidths).toEqual({ iphone: 390, ipad: 768, android: 412, desktop: 1280 });
  });
});
