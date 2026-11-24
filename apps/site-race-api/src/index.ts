import { OWN_HOST_PATTERN, RACE_PAGES, RACE_PRESETS, SITE_RACE_PROTOCOL } from "../../../packages/contracts/src/site-race";
import type { LaneId, LaneMetrics, RaceEvent, RaceLaneInfo, RacePageId, RacePresetId, RaceProfile, RaceReportSummary } from "../../../packages/contracts/src/site-race";
import { LANE_CAP_MS, PROFILES, runLane } from "./lane";
import { newReportId, RaceLog, REPORT_ID, REPORT_PREFIX, summarize } from "./report";
import { normalizeRaceUrl } from "./url-guard";

const SAVE_TIMEOUT_MS = 8_000;

/**
 * Saves a finished race as a report: the replayable log as the value, the list row as
 * metadata. Only races between the project's own builds are saved — a visitor's URL
 * and screenshots of their site are not kept. Returns the id, or null if it did not save.
 */
async function saveReport(env: Env, log: RaceLog, start: Extract<RaceEvent, { type: "start" }>, metrics: Record<LaneId, LaneMetrics>, elapsedMs: number): Promise<string | null> {
  const id = newReportId();
  const savedAt = new Date().toISOString();
  const body = log.toNdjson(savedAt, id, [{ type: "done", elapsedMs, reportId: id }]);
  const put = env.REPORTS.put(REPORT_PREFIX + id, body, { metadata: summarize(id, savedAt, start, metrics, env.CF_VERSION_METADATA?.id) });
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("save timed out")), SAVE_TIMEOUT_MS));
  try {
    await Promise.race([put, timeout]);
    return id;
  } catch (error) {
    console.error("report not saved", error);
    return null;
  }
}

async function listReports(env: Env, limit: number): Promise<RaceReportSummary[]> {
  const list = await env.REPORTS.list<RaceReportSummary>({ prefix: REPORT_PREFIX, limit });
  return list.keys.map((key) => key.metadata).filter((row): row is RaceReportSummary => !!row);
}

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
    if (request.method !== "GET") return json({ error: "not-found" }, 404, cors);

    if (url.pathname === "/reports") {
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
      return json({ reports: await listReports(env, limit) }, 200, cors);
    }
    const reportMatch = /^\/reports\/([^/]+)$/.exec(url.pathname);
    if (reportMatch) {
      const id = reportMatch[1];
      if (!REPORT_ID.test(id)) return json({ error: "not-found", message: "No saved race with that id." }, 404, cors);
      const body = await env.REPORTS.get(REPORT_PREFIX + id, "text");
      if (!body) return json({ error: "not-found", message: "No saved race with that id." }, 404, cors);
      // A saved race never changes, so the browser may keep it for good.
      return new Response(body, { headers: { ...cors, "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "public, max-age=31536000, immutable" } });
    }

    if (url.pathname !== "/race") return json({ error: "not-found" }, 404, cors);

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
    const started = Date.now();
    const log = new RaceLog(started, env.CF_VERSION_METADATA?.id);
    let closed = false;
    let queue = Promise.resolve();
    const emit = (event: RaceEvent) => {
      log.add(event);
      if (closed) return Promise.resolve();
      queue = queue.then(() => writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))).catch(() => { closed = true; abort.abort(); });
      return queue;
    };

    const race = async () => {
      try {
        const start: Extract<RaceEvent, { type: "start" }> = { type: "start", protocol: SITE_RACE_PROTOCOL, raceId: crypto.randomUUID(), profile, profileLabel: PROFILES[profile].label, page, capMs: LANE_CAP_MS, lanes: { a: a.lane, b: b.lane } };
        await emit(start);
        const heartbeat = setInterval(() => { if (!closed) void writer.write(encoder.encode(`: keep-alive\n\n`)).catch(() => {}); }, 10_000);
        const lanes: LaneId[] = ["a", "b"];
        // The visitor's journey (repeat visit, taps through the site) exists only between this project's
        // builds: a challenger's site has none of these pages, and a skipped step must not score.
        const journey = !!a.lane.own && !!b.lane.own;
        const results = await Promise.all(lanes.map((lane) => runLane(env, lane, (lane === "a" ? a : b).lane.url, profile, emit, abort.signal, journey)));
        clearInterval(heartbeat);
        for (const [index, metrics] of results.entries()) if (metrics) await emit({ type: "result", lane: lanes[index], metrics });
        const elapsedMs = Date.now() - started;
        const [metricsA, metricsB] = results;
        const reportId = !challenger && metricsA && metricsB ? await saveReport(env, log, start, { a: metricsA, b: metricsB }, elapsedMs) : null;
        await emit({ type: "done", elapsedMs, ...(reportId ? { reportId } : {}) });
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
