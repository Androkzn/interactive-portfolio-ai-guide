import { describe, expect, it } from "vitest";
import { normalizeRaceUrl } from "./url-guard";

describe("normalizeRaceUrl", () => {
  it("accepts public sites and adds https when the scheme is missing", () => {
    expect(normalizeRaceUrl("example.com")).toEqual({ ok: true, url: "https://example.com/" });
    expect(normalizeRaceUrl(" https://www.example.co.uk/path?q=1#top ")).toEqual({ ok: true, url: "https://www.example.co.uk/path?q=1" });
    expect(normalizeRaceUrl("http://example.com:80/")).toMatchObject({ ok: true });
  });

  it.each([
    ["", "empty"],
    ["localhost", "no dot"],
    ["http://localhost:3000", "localhost"],
    ["http://127.0.0.1/", "IPv4 literal"],
    ["http://[::1]/", "IPv6 literal"],
    ["http://10.0.0.5", "private IP"],
    ["https://printer.local", "mDNS"],
    ["https://db.internal/", "internal suffix"],
    ["https://user:pass@example.com", "credentials"],
    ["https://example.com:8443/", "non-default port"],
    ["ftp://example.com", "scheme"],
    ["javascript:alert(1)", "scheme"],
    ["https://-bad-.com", "label"],
  ])("rejects %s (%s)", (input) => {
    expect(normalizeRaceUrl(input).ok).toBe(false);
  });
});
