import type { GuideAction, GuideTurnRequest, GuideTurnResponse } from "../../../packages/contracts/src";
import { GUIDE_PROTOCOL, isGuideTurnRequest } from "../../../packages/contracts/src";
import { resolveProject } from "./content";
import { generateGroundedAnswer } from "./ai-adapter";

const MAX_BODY_BYTES = 32_000;
const INJECTION_MARKERS = ["ignore previous", "ignore all instructions", "reveal the system prompt", "you are now", "forget the rules"];

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
}

function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const headers: Record<string, string> = {};
  if (origin && allowed.includes(origin)) {
    headers["access-control-allow-origin"] = origin;
    headers.vary = "Origin";
  }
  return headers;
}

function responseFor(requestId: string, projectId: string, answer: string, sourceIds: string[], next: GuideTurnResponse["next"], action?: GuideAction): GuideTurnResponse {
  return { protocol: GUIDE_PROTOCOL, requestId, mode: "curated", answer, sourceIds, next, ...(action ? { action } : {}) };
}

function curatedAnswer(input: GuideTurnRequest, requestId: string): GuideTurnResponse {
  const project = resolveProject(input.projectId);
  const question = input.question.toLowerCase();
  const isInjection = INJECTION_MARKERS.some((marker) => question.includes(marker));
  if (isInjection) {
    return responseFor(requestId, project.id, "I can answer questions about the approved portfolio materials, but I cannot change my operating rules, reveal private instructions or execute arbitrary code or URLs.", project.sources, "ask-follow-up");
  }
  if (question.includes("show") || question.includes("open") || question.includes("покаж") || question.includes("демо")) {
    return responseFor(requestId, project.id, `I’ll open ${project.name} in the embedded demo. ${project.boundary}`, project.sources, "try-demo", { type: "openProject", projectId: project.id });
  }
  if (question.includes("hard") || question.includes("challenge") || question.includes("сложн")) {
    return responseFor(requestId, project.id, `${project.challenge} ${project.boundary}`, project.sources, "inspect-evidence");
  }
  if (question.includes("ai") || question.includes("verify") || question.includes("провер")) {
    return responseFor(requestId, project.id, "AI is used to accelerate drafts and alternatives. The human check remains the approved source, deterministic scenario, explicit boundary and test result. I will not add an unsupported speed metric or project claim.", ["portfolio.ai-review-chain", ...project.sources], "inspect-evidence");
  }
  return responseFor(requestId, project.id, `I can help you inspect ${project.name}. Ask what was difficult, what was personally owned, how it was verified, or ask me to show the core flow. ${project.boundary}`, project.sources, input.mode === "tour" ? "continue-tour" : "ask-follow-up");
}

async function readJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new Error("body-too-large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid-json");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > MAX_BODY_BYTES) throw new Error("body-too-large");
    chunks.push(chunk.value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(body));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" } });
    if (new URL(request.url).pathname !== "/v1/guide/turn" || request.method !== "POST") return json({ error: "not-found" }, 404, headers);
    if (Object.keys(headers).length === 0 && request.headers.has("Origin")) return json({ error: "origin-not-allowed" }, 403);
    const requestId = crypto.randomUUID();
    try {
      const input = await readJson(request);
      if (!isGuideTurnRequest(input)) return json({ error: "invalid-request", requestId }, 400, headers);
      const fallback = curatedAnswer(input, requestId);
      const answer = await generateGroundedAnswer(env, input, resolveProject(input.projectId), fallback);
      console.log({ event: "guide_turn", requestId, projectId: input.projectId, mode: input.mode, answerMode: answer.mode });
      return json(answer, 200, { ...headers, "cache-control": "no-store" });
    } catch (error) {
      const reason = error instanceof Error && error.message === "body-too-large" ? "body-too-large" : "invalid-json";
      console.warn({ event: "guide_turn_rejected", requestId, reason });
      return json({ error: reason, requestId }, reason === "body-too-large" ? 413 : 400, headers);
    }
  },
};
