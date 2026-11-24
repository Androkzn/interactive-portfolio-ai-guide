import { OWN_HOST_PATTERN, RACE_PAGES, RACE_PRESETS, SITE_RACE_PROTOCOL } from "../../../packages/contracts/src/site-race";
import type { LaneId, RaceEvent, RaceLaneInfo, RacePageId, RacePresetId, RaceProfile } from "../../../packages/contracts/src/site-race";
import { LANE_CAP_MS, PROFILES, runLane } from "./lane";
import { normalizeRaceUrl } from "./url-guard";

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  return origin && allowed.includes(origin) ? { "access-control-allow-origin": origin, vary: "Origin" } : {};
}

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
}

export type LaneRequest = { ok: true; lane: RaceLaneInfo } | { ok: false; reason: string };

/**
 * A lane is a preset name ("astro", "next"), a URL on one of the project's own hosts
 * (any deployment of either build — it gets the race page's path), or a visitor's URL.
 */
export function resolveLane(value: string | null, pagePath: string = RACE_PAGES.home.path): LaneRequest {
  if (!value) return { ok: false, reason: "Missing site." };
  if (value in RACE_PRESETS) {
    const preset = RACE_PRESETS[value as RacePresetId];
    const url = new URL(preset.url);
    url.pathname = pagePath;
    return { ok: true, lane: { url: url.toString(), label: preset.label, stack: preset.stack, preset: value as RacePresetId, own: true } };
  }
  const guarded = normalizeRaceUrl(value);
  if (!guarded.ok) return guarded;
  const url = new URL(guarded.url);
  if (OWN_HOST_PATTERN.test(url.hostname)) {
    url.pathname = pagePath;
    url.search = "";
    url.protocol = "https:";
    return { ok: true, lane: { url: url.toString(), label: url.hostname, stack: "Project build", preset: null, own: true } };
  }
  return { ok: true, lane: { url: guarded.url, label: url.hostname.replace(/^www\./, ""), stack: "Challenger", preset: null, own: false } };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...cors, "access-control-allow-methods": "GET, OPTIONS", "access-control-max-age": "86400" } });
    if (url.pathname === "/health") return json({ ok: true, protocol: SITE_RACE_PROTOCOL }, 200, cors);
    if (url.pathname !== "/race" || request.method !== "GET") return json({ error: "not-found" }, 404, cors);

    const pageParam = url.searchParams.get("page") ?? "home";
    if (!(pageParam in RACE_PAGES)) return json({ error: "invalid-page", message: "Unknown page." }, 400, cors);
    const page = pageParam as RacePageId;
    const a = resolveLane(url.searchParams.get("a"), RACE_PAGES[page].path);
    const b = resolveLane(url.searchParams.get("b"), RACE_PAGES[page].path);
    if (!a.ok) return json({ error: "invalid-site", lane: "a", message: a.reason }, 400, cors);
    if (!b.ok) return json({ error: "invalid-site", lane: "b", message: b.reason }, 400, cors);
    // At most one visitor URL per race: the other lane is always one of ours.
    if (!a.lane.own && !b.lane.own) return json({ error: "invalid-site", message: "One side of a race must be one of the project's builds." }, 400, cors);
    if (a.lane.url === b.lane.url) return json({ error: "invalid-site", message: "Pick two different sites." }, 400, cors);
    const profile: RaceProfile = url.searchParams.get("profile") === "desktop" ? "desktop" : "mobile";

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const challenger = !a.lane.own || !b.lane.own;
    const limiter = challenger ? env.CHALLENGE_LIMITER : env.RACE_LIMITER;
    if (limiter) {
      const { success } = await limiter.limit({ key: ip });
      if (!success) return json({ error: "rate-limited", message: "Too many races from this connection. Give the browsers a minute to cool down." }, 429, { ...cors, "retry-after": "60" });
    }

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const abort = new AbortController();
    let closed = false;
    let queue = Promise.resolve();
    const emit = (event: RaceEvent) => {
      if (closed) return Promise.resolve();
      queue = queue.then(() => writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))).catch(() => { closed = true; abort.abort(); });
      return queue;
    };

    const started = Date.now();
    const race = async () => {
      try {
        await emit({ type: "start", protocol: SITE_RACE_PROTOCOL, raceId: crypto.randomUUID(), profile, profileLabel: PROFILES[profile].label, page, capMs: LANE_CAP_MS, lanes: { a: a.lane, b: b.lane } });
        const heartbeat = setInterval(() => { if (!closed) void writer.write(encoder.encode(`: keep-alive\n\n`)).catch(() => {}); }, 10_000);
        const lanes: LaneId[] = ["a", "b"];
        const results = await Promise.all(lanes.map((lane) => runLane(env, lane, (lane === "a" ? a : b).lane.url, profile, emit, abort.signal)));
        clearInterval(heartbeat);
        for (const [index, metrics] of results.entries()) if (metrics) await emit({ type: "result", lane: lanes[index], metrics });
        await emit({ type: "done", elapsedMs: Date.now() - started });
      } catch {
        await emit({ type: "error", message: "The race could not be completed." });
      } finally {
        closed = true;
        await queue.catch(() => {});
        await writer.close().catch(() => {});
      }
    };
    ctx.waitUntil(race());

    return new Response(readable, {
      headers: { ...cors, "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
    });
  },
} satisfies ExportedHandler<Env>;
