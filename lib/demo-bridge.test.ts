import { describe, expect, it } from "vitest";

import { ackMessage, hostReadyMessage, parseDemoMessage } from "./demo-bridge";

describe("public demo bridge", () => {
  it("accepts a valid ready message", () => {
    expect(parseDemoMessage({
      source: "symply-house",
      version: 1,
      type: "ready",
      payload: { screen: "home", mode: "public-preview" },
    })?.type).toBe("ready");
  });

  it("rejects malformed or untrusted message shapes", () => {
    expect(parseDemoMessage({ source: "unknown", version: 1, type: "ready", payload: { screen: "home", mode: "public-preview" } })).toBeNull();
    expect(parseDemoMessage({ source: "symply-house", version: 1, type: "screen", payload: { screen: "settings" } })).toBeNull();
    expect(parseDemoMessage({ source: "symply-house", version: 1, type: "stepComplete", payload: { step: "task.complete" } })).toBeNull();
  });

  it("creates explicit host handshake and acknowledgements", () => {
    expect(hostReadyMessage()).toEqual({ source: "portfolio", version: 1, type: "hostReady", payload: {} });
    expect(ackMessage("ready")).toEqual({ source: "portfolio", version: 1, type: "ack", payload: { for: "ready" } });
  });
});
