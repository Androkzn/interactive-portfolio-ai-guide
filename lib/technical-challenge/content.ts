// Everything on the technical-challenge page around the timelapse. Sources: the nimbus-assistant
// repository — README, docs/requirements (BRD, TRD, acceptance matrix, retrospective), commit
// messages and the readiness report screenshot committed in docs/screenshots.

export const LIVE_URL = "https://nimbus-assistant-production.vercel.app";
export const REPO_URL = "https://github.com/Androkzn/nimbus-assistant";
const DOCS = `${REPO_URL}/blob/main/docs/requirements`;

/** Same brief, same AI tools: what changes is the process. Left is the typical one-shot result. */
export const contrast = [
  { topic: "Starting point", paste: "The PDF, pasted into a coding agent with “implement all of this”.", mine: "The client's documents, audited first: two planted conflicts found before any code." },
  { topic: "Definition of done", paste: "It runs, and the demo looks right on one model.", mine: "45 acceptance rows. A row passes only with evidence — a test or a recorded run." },
  { topic: "The one rule", paste: "Hoping the prompt holds.", mine: "An answer key run as an eval on three vendors, plus guards that don't depend on the model." },
  { topic: "Documents that disagree", paste: "The model quietly picks one.", mine: "Both values, both citations, both dates — with a test for each conflict." },
  { topic: "The two auto-fails", paste: "Found by the reviewer.", mine: "A bundle secret scan in CI; off-topic questions answered without calling a model." },
  { topic: "What the reviewer gets", paste: "A link and a promise.", mine: "A link, a repo that runs on a fresh machine, and the evidence for every requirement." },
];

/** One brief item followed through every document to its proof. */
export const trace = [
  { where: "Brief", code: "E8", text: "If a provider fails mid-conversation, the backup answers, shows which model answered, and the user never sees two models' output mixed." },
  { where: "BRD", code: "BR-15 · P0", text: "Backup answers automatically; the reply states which model actually answered; no mixed text." },
  { where: "TRD", code: "§4.4", text: "Error after the first token → emit reset, the client discards the partial text → fall back to the next model." },
  { where: "Acceptance", code: "NKA-MDL-005", text: "Primary fails mid-stream → the final text contains the backup's output only." },
  { where: "Test", code: "fallback.test.ts", text: "“NKA-MDL-005: mid-stream failure resets partial text — the user never sees mixed output.”" },
  { where: "Evidence", code: "Pass", text: "Passing since the first commit. One id ties the brief, the docs, the test and the report together." },
];

/** Stack decisions from the TRD's ADR table: the choice, what it beat, and why. */
export const stack = [
  { area: "Framework", choice: "Next.js App Router, TypeScript strict", over: "Express + Vite SPA", why: "One deployable. The server route keeps keys off the browser, and streaming is first-class." },
  { area: "LLM access", choice: "Vercel AI SDK across three vendors", over: "Three raw REST clients", why: "One streaming and usage interface, and typed errors with status codes — which the fallback needs." },
  { area: "Retrieval", choice: "In-process BM25 + synonyms + structural rules", over: "Embeddings + a vector database", why: "The corpus is ≈ 3k tokens. Lexical search is deterministic, testable offline and adds no vendor." },
  { area: "Stream protocol", choice: "Own NDJSON events, zod-typed", over: "The SDK's UI message stream", why: "First-class sources, fallback, reset and usage events — a contract testable without a UI library." },
  { area: "Tests", choice: "Vitest · Playwright with a mock LLM · eval runner", over: "Jest, Cypress", why: "Fast and TypeScript-native; browser tests that cost nothing to run on every change." },
  { area: "Hosting", choice: "Vercel, Node runtime", over: "Render, Railway", why: "Native streaming for Next.js, secrets as env vars, preview deploys." },
];

/** The project layout, trimmed to what shows the boundaries. */
export const layout = [
  { path: "config/models.json", role: "model catalog: prices, context windows, fallback order" },
  { path: "knowledge-base/", role: "the client's documents, read-only (0444) — the brief forbids edits" },
  { path: "src/server/", role: "retrieval, prompt, providers, fallback — the only place keys exist" },
  { path: "src/shared/", role: "zod contracts used by both the server and the browser" },
  { path: "src/client/", role: "streaming, usage and session helpers" },
  { path: "e2e/ · evals/", role: "browser journeys · golden questions and the live-eval runner" },
  { path: "scripts/", role: "bundle secret scan, CI and readiness tooling" },
  { path: "docs/requirements/", role: "discovery → BRD → TRD → plan → acceptance matrix" },
];

/** From the retrospective: what went wrong while building it, and the gate that caught each. */
export const defects = [
  { what: "“Weather in Paris” matched every document — a stray “s” from “what's”.", risk: "An answer from nowhere: the auto-fail", gate: "Retrieval eval, offline" },
  { what: "“How much is Relay Pro?” missed the $49 / $59 conflict.", risk: "A hidden conflict (E4)", gate: "Retrieval eval, offline" },
  { what: "Claude's answer was cut off: reasoning used the whole output budget.", risk: "Half an answer on a live call", gate: "Live eval" },
  { what: "An integration answer dropped “read-only” from a partner requirement.", risk: "A misquote to a customer", gate: "Live eval" },
  { what: "A fresh clone failed the typecheck: generated types existed only locally.", risk: "The README deliverable fails", gate: "CI on a clean checkout" },
  { what: "Provider errors sent to monitoring could echo a partly masked API key.", risk: "A key leaves the server", gate: "Review of the monitoring code" },
  { what: "“Connect” matched “OpenID Connect” and announced a conflict that doesn't exist.", risk: "A false disagreement", gate: "Independent review" },
  { what: "A model read Pro prices as “Custom”, intermittently.", risk: "A wrong price on a sales call", gate: "Live eval across runs → default model changed" },
];

/** The gate pipeline, cheapest and most deterministic first — timings from the readiness report. */
export const ladder = [
  { step: "Typecheck", proves: "types, routes, build assumptions", time: "3.2 s" },
  { step: "Lint", proves: "code rules", time: "3.6 s" },
  { step: "Unit · integration · retrieval eval", proves: "retrieval, fallback, limits, event contracts", time: "1.8 s · 300 tests" },
  { step: "Production build", proves: "it builds the way it deploys", time: "8.4 s" },
  { step: "Bundle secret scan", proves: "no key in anything the browser downloads", time: "69 ms" },
  { step: "Browser E2E", proves: "the real journey, with a mock LLM", time: "10 s · 18 tests" },
  { step: "Live answer eval", proves: "real vendors against the answer key", time: "3 m 20 s · 90 answers" },
  { step: "Live probes", proves: "the deployed server, right now", time: "3.3 s" },
];

/** Built beyond the brief, after the two-hour sprint — each with the reason it was worth it. */
export const extras = [
  {
    id: "readiness",
    title: "Readiness console",
    image: "/images/technical-challenge/readiness-overview.webp",
    alt: "Readiness report: READY, 39 of 39 requirements verified, 424 tests, and the gate pipeline from typecheck to live probes, all passed.",
    what: "Runs every gate and maps each requirement to its BRD item, acceptance row, check and test result. Recorded and live evidence are labelled, never mixed.",
    why: "A green build doesn't say which requirement it proved. Reviewers — and the next engineer — should see the evidence instead of taking my word for it.",
  },
  {
    id: "portal",
    title: "Knowledge-base portal",
    image: "/images/technical-challenge/knowledge-base-portal.webp",
    alt: "Knowledge base portal: a knowledge-gap issue for “a 500 on the API”, with the question and why the assistant could not answer it.",
    what: "Edit and publish the documents. Questions the assistant couldn't answer from them are logged as prioritised knowledge-gap issues, with the question and the reason.",
    why: "Refusing to invent an answer is half the job. Telling the content owner what's missing is the other half — the client's real problem is scattered, stale knowledge.",
  },
] as const;

export const moreExtras = [
  { title: "Production monitoring and incident triage", why: "The fallback keeps users unaware of an outage. Someone still has to be told — with redacted evidence that carries no customer text." },
  { title: "Gated CI/CD", why: "Reviewers test the live link, so only a commit that passed every gate can reach it. Developer tools are checked to be absent in production." },
  { title: "Saved conversations", why: "Sales reps come back to the same customer. Scoped to an anonymous browser owner, so no login was needed." },
];

export const afterwards = [
  { value: "90 / 90", label: "final 30-case golden set on three vendors" },
  { value: "39 / 39", label: "requirements verified by passing automated checks" },
  { value: "22", label: "defects stopped by a gate before a reviewer saw them" },
  { value: "29 / 30", label: "on the production default model — one intermittent miss, reported, not hidden" },
];

export const docLinks = [
  { label: "Discovery", href: `${DOCS}/00_KB_Discovery.md` },
  { label: "BRD", href: `${DOCS}/01_BRD.md` },
  { label: "TRD", href: `${DOCS}/02_TRD.md` },
  { label: "Plan", href: `${DOCS}/03_Implementation_Plan.md` },
  { label: "Acceptance matrix", href: `${DOCS}/04_Acceptance_Matrix.md` },
  { label: "Retrospective", href: `${DOCS}/05_Retrospective.md` },
];
