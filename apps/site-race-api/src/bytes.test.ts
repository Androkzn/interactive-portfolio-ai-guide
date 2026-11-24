import { describe, expect, it } from "vitest";
import { newWire, onData, onFinished, onResponse, wireBytes } from "./bytes";

// Sizes from curl on 2026-11-24: /_next/static/chunks/1ej-76qg2fpcb.js is 71,618 B br, 229,288 B raw.
describe("wire bytes", () => {
  it("counts a finished Brotli script at its encoded size, not encoded + decoded", () => {
    const w = newWire();
    onResponse(w, 300, "br");
    // Chrome interleaves decoded body chunks (encoded 0) with transfer-size updates (decoded 0).
    for (let i = 0; i < 4; i += 1) { onData(w, 229_288 / 4, 0); onData(w, 0, 71_618 / 4); }
    expect(wireBytes(w)).toBe(300 + 71_618);
    onFinished(w, 71_918);
    expect(wireBytes(w)).toBe(71_918);
  });

  it("counts an uncompressed font once (47 KB woff2 was shown as 94 KB)", () => {
    const w = newWire();
    onResponse(w, 250, undefined);
    onData(w, 48_256, 0);
    onData(w, 0, 48_256);
    onFinished(w, 48_506);
    expect(wireBytes(w)).toBe(48_506);
  });

  it("uses decoded bytes in flight only when the body is not content-encoded", () => {
    const image = newWire();
    onResponse(image, 200, undefined);
    onData(image, 500_000, 0);
    expect(wireBytes(image)).toBe(500_200);
    const html = newWire();
    onResponse(html, 400, "br");
    onData(html, 457_000, 0);
    expect(wireBytes(html)).toBe(400);
  });

  it("takes loadingFinished as authoritative for a document reported only as decoded chunks", () => {
    const w = newWire();
    onResponse(w, 400, "br");
    onData(w, 457_526, 0);
    onFinished(w, 95_508);
    expect(wireBytes(w)).toBe(95_508);
  });
});
