// The technical challenge as a story in chapters: what I did at each step, roughly how long it
// took, the decision I made and why, and the artifact it produced.
//
// Sources, all in the (private) nimbus-assistant repository:
// - the docs and test counts at the challenge commit 95738b2 (12:37, inside hour one);
// - eval scores and per-question verdicts from the committed evals/reports/*/results.json;
// - defects and decisions from docs/requirements/05_Retrospective.md and the commit messages.
// Fixed points: brief at 11:42, first live eval 12:25, first commit 12:37, hour one ends 12:42.
// Durations inside those spans are the author's estimates, labelled "≈" on the page.

export type ItemTier = "rule" | "guard" | "core" | "should" | "deliverable";

export type BoardItem = { id: string; tier: ItemTier; code: string; label: string; ask: string };

/** Everything the brief demands, as tiles. SHOULD items are optional. */
export const board: BoardItem[] = [
  { id: "Rule", tier: "rule", code: "1 rule", label: "Answers only from the documents", ask: "If the knowledge base doesn't say it, the bot says so instead of guessing." },
  { id: "G-KEY", tier: "guard", code: "Auto-fail", label: "No API key in the browser", ask: "A key visible in the browser fails the challenge outright." },
  { id: "G-DOCS", tier: "guard", code: "Auto-fail", label: "No answer from outside the docs", ask: "One invented answer fails the challenge outright." },
  { id: "R1", tier: "core", code: "R1", label: "Streaming chat with memory", ask: "Word-by-word replies, follow-ups remember context, New Conversation." },
  { id: "R2", tier: "core", code: "R2", label: "Grounding with sources", ask: "Retrieve before calling the model; show the passages used." },
  { id: "R3", tier: "core", code: "R3", label: "3 vendors + fallback", ask: "Claude, OpenAI and Gemini; config-driven; automatic backup provider." },
  { id: "R4", tier: "core", code: "R4", label: "Tokens and cost", ask: "Input/output tokens, estimated cost, running session totals." },
  { id: "R5", tier: "core", code: "R5", label: "Keys stay on the server", ask: "Keys never reach the browser; rate limits and outages don't crash." },
  { id: "Q1", tier: "core", code: "Q1", label: "Pro vs Enterprise", ask: "A comparison across pricing tiers." },
  { id: "Q2", tier: "core", code: "Q2", label: "Salesforce + version", ask: "One fact plus a version requirement." },
  { id: "Q3", tier: "core", code: "Q3", label: "What's new in v4.2", ask: "Release notes for one specific version." },
  { id: "Q4", tier: "core", code: "Q4", label: "403 on the API", ask: "Troubleshooting: what to check first." },
  { id: "Q5", tier: "core", code: "Q5", label: "SSO via SAML 2.0", ask: "One fact from every product; must be complete." },
  { id: "Q6", tier: "core", code: "Q6", label: "P1 ticket SLA", ask: "Table lookup, separate per tier." },
  { id: "E1", tier: "core", code: "E1", label: "Follow-up, no product", ask: "“What about its SLA?” resolves from earlier messages." },
  { id: "E2", tier: "core", code: "E2", label: "Not in the docs", ask: "Says so plainly; makes nothing up." },
  { id: "E3", tier: "core", code: "E3", label: "Partly answerable", ask: "Answers that part; names what's missing." },
  { id: "E4", tier: "core", code: "E4", label: "Documents disagree", ask: "Shows the conflict and cites both." },
  { id: "E5", tier: "core", code: "E5", label: "Loose wording", ask: "“Single sign-on” still finds SAML." },
  { id: "E6", tier: "core", code: "E6", label: "One table cell", ask: "Right row, not the one next to it." },
  { id: "E8", tier: "core", code: "E8", label: "Fails mid-answer", ask: "Backup answers, labelled; never two models mixed." },
  { id: "E9", tier: "core", code: "E9", label: "Rate limited", ask: "A clear message with what to do; no frozen screen." },
  { id: "E10", tier: "core", code: "E10", label: "Blank message", ask: "Handled without calling any provider." },
  { id: "S-CTX", tier: "should", code: "E7", label: "Context warning", ask: "Amber at 75 %, red at 90 %, re-rated on model switch." },
  { id: "S-EXPORT", tier: "should", code: "R4+", label: "Usage export", ask: "Session usage as CSV or JSON." },
  { id: "D-REPO", tier: "deliverable", code: "Ship", label: "Repo runs from README", ask: "Cloned on a fresh machine, followed step by step." },
  { id: "D-LIVE", tier: "deliverable", code: "Ship", label: "Live link", ask: "Tested with the reviewers' own questions." },
];

export const REQUIRED_IDS = board.filter((item) => item.tier !== "should").map((item) => item.id);

export type EvalRun = {
  label: string;
  where: "local" | "production";
  /** "a": the original golden set; "b": the stricter set built after an independent review. */
  set: "a" | "b";
  pass: number;
  total: number;
  /** Cases passed / run, per brief id, summed over the models in the run. */
  items: Partial<Record<string, [number, number]>>;
};

const run = (label: string, pass: number, total: number, items: EvalRun["items"], set: EvalRun["set"] = "a", where: EvalRun["where"] = "local"): EvalRun =>
  ({ label, where, set, pass, total, items });

/** The committed live-eval runs used by the story, in order. */
export const runs = {
  first: run("12:25 · run 1", 42, 54, { Rule: [3, 3], Q1: [2, 3], Q2: [5, 6], Q3: [0, 3], Q4: [0, 3], Q5: [1, 3], Q6: [3, 3], E1: [3, 3], E2: [8, 9], E3: [3, 3], E4: [5, 6], E5: [3, 3], E6: [6, 6] }),
  second: run("12:28 · run 2", 48, 54, { Rule: [3, 3], Q1: [3, 3], Q2: [6, 6], Q3: [0, 3], Q4: [1, 3], Q5: [3, 3], Q6: [3, 3], E1: [3, 3], E2: [8, 9], E3: [3, 3], E4: [6, 6], E5: [3, 3], E6: [6, 6] }),
  third: run("12:31 · run 3", 51, 54, { Rule: [3, 3], Q1: [3, 3], Q2: [6, 6], Q3: [2, 3], Q4: [3, 3], Q5: [3, 3], Q6: [3, 3], E1: [3, 3], E2: [9, 9], E3: [1, 3], E4: [6, 6], E5: [3, 3], E6: [6, 6] }),
  graderFix: run("12:33 · re-run after grader fix", 6, 6, { E2: [3, 3], E3: [3, 3] }),
  afterCommit: run("12:38 · run after the commit", 48, 54, { Rule: [3, 3], Q1: [3, 3], Q2: [6, 6], Q3: [1, 3], Q4: [1, 3], Q5: [1, 3], Q6: [3, 3], E1: [3, 3], E2: [9, 9], E3: [3, 3], E4: [6, 6], E5: [3, 3], E6: [6, 6] }),
  shortcutNamed: run("12:43", 53, 54, { Rule: [3, 3], Q1: [3, 3], Q2: [6, 6], Q3: [3, 3], Q4: [3, 3], Q5: [3, 3], Q6: [3, 3], E1: [3, 3], E2: [9, 9], E3: [2, 3], E4: [6, 6], E5: [3, 3], E6: [6, 6] }),
  allGreen: run("12:45", 54, 54, { Rule: [3, 3], Q1: [3, 3], Q2: [6, 6], Q3: [3, 3], Q4: [3, 3], Q5: [3, 3], Q6: [3, 3], E1: [3, 3], E2: [9, 9], E3: [3, 3], E4: [6, 6], E5: [3, 3], E6: [6, 6] }),
  production: run("12:55 · production URL", 18, 18, { Rule: [1, 1], Q1: [1, 1], Q2: [2, 2], Q3: [1, 1], Q4: [1, 1], Q5: [1, 1], Q6: [1, 1], E1: [1, 1], E2: [3, 3], E3: [1, 1], E4: [2, 2], E5: [1, 1], E6: [2, 2] }, "a", "production"),
  stricter: run("13:32 · stricter set", 61, 75, { Rule: [3, 3], Q1: [3, 3], Q2: [12, 12], Q3: [3, 3], Q4: [2, 3], Q5: [2, 3], Q6: [3, 3], E1: [8, 9], E2: [6, 15], E3: [5, 6], E4: [5, 6], E5: [3, 3], E6: [6, 6] }, "b"),
  stricter2: run("13:35", 72, 75, { Rule: [3, 3], Q1: [3, 3], Q2: [11, 12], Q3: [3, 3], Q4: [2, 3], Q5: [3, 3], Q6: [3, 3], E1: [9, 9], E2: [15, 15], E3: [6, 6], E4: [6, 6], E5: [2, 3], E6: [6, 6] }, "b"),
  stricter3: run("13:38", 73, 75, { Rule: [3, 3], Q1: [3, 3], Q2: [11, 12], Q3: [3, 3], Q4: [3, 3], Q5: [3, 3], Q6: [3, 3], E1: [9, 9], E2: [15, 15], E3: [6, 6], E4: [6, 6], E5: [2, 3], E6: [6, 6] }, "b"),
  final: run("13:41", 75, 75, { Rule: [3, 3], Q1: [3, 3], Q2: [12, 12], Q3: [3, 3], Q4: [3, 3], Q5: [3, 3], Q6: [3, 3], E1: [9, 9], E2: [15, 15], E3: [6, 6], E4: [6, 6], E5: [3, 3], E6: [6, 6] }, "b"),
} satisfies Record<string, EvalRun>;

export type Effect = {
  /** Fraction of the chapter's playback at which it happens. */
  at: number;
  define?: string[];
  pass?: string[];
  run?: EvalRun;
  tests?: number;
  /** A short note on a tile, e.g. "in code". */
  note?: Record<string, string>;
};

export type ChapterKind = "spec" | "build" | "verify" | "ship" | "bonus";

export type Chapter = {
  id: string;
  hour: 1 | 2;
  kind: ChapterKind;
  /** Short label for the chapter bar. */
  short: string;
  title: string;
  /** Approximate real minutes. */
  minutes: number;
  /** Seconds of playback. */
  seconds: number;
  did: string;
  decision: string;
  why: string;
  artifact: { label: string; lines: string[] };
  /** Defects a gate stopped during this step (from the retrospective). */
  caught?: string[];
  effects: Effect[];
};

const CORE_TESTED = ["R1", "R2", "R3", "R4", "R5", "E8", "E9", "E10", "S-CTX", "S-EXPORT", "G-KEY"];

export const chapters: Chapter[] = [
  {
    id: "audit", hour: 1, kind: "spec", short: "Audit", minutes: 3, seconds: 6,
    title: "Read the brief. Audit the documents first.",
    did: "Read all ten knowledge-base files before any code: every product, date and table. Wrote down the correct answer to each brief question — the answer key — and found where documents disagree.",
    decision: "The answer key comes before the code.",
    why: "Without it nobody can tell a confident answer from a correct one. It became the eval that gated every later change.",
    artifact: { label: "00_KB_Discovery.md · conflicts", lines: [
      "C1  Vault SAML 2.0 tiers",
      "    security overview: “SAML 2.0 on Enterprise”",
      "    vault.md + 3.1 notes: Pro and Enterprise",
      "C2  Relay Pro price",
      "    relay.md: $49 · 4.2 notes: $59 from 2026-08-01",
    ] },
    caught: ["The three files carrying the conflicts were modified 4 minutes after the rest of the zip — noted, then tested."],
    effects: [{ at: 0.45, define: ["Rule", "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "E2", "E4"] }],
  },
  {
    id: "brd", hour: 1, kind: "spec", short: "BRD", minutes: 5, seconds: 5,
    title: "Business requirements",
    did: "Rewrote every brief item as a numbered requirement with a priority and the outcome each persona needs: Sarah in Sales, James in Support, Nina in Training.",
    decision: "Ambiguity gets a written assumption, not a silent guess.",
    why: "The brief leaves gaps on purpose. A1: a question with no product named is answered per product — Sarah is on a live call, and one round-trip beats a clarifying question.",
    artifact: { label: "01_BRD.md", lines: [
      "BR-01  P0  Every factual statement comes from the KB.",
      "BR-04  P1  Documents disagree → both values, both dates.",
      "BR-15  P0  Provider fails → backup answers, never mixed.",
      "BR-20  P0  API keys only ever on the server.",
      "A1     No product named → answer per product.",
    ] },
    effects: [{ at: 0.4, define: ["R1", "R2", "R3", "R4", "R5", "E1", "E3", "E5", "E6", "E8", "E9", "E10", "S-CTX", "S-EXPORT", "G-KEY", "G-DOCS"] }],
  },
  {
    id: "trd", hour: 1, kind: "spec", short: "TRD", minutes: 4, seconds: 5,
    title: "Technical requirements",
    did: "A contract per requirement: zod-typed stream events, the model catalog in a config file, the answer rules, and the fallback state machine — with the stack decisions and the alternatives I rejected.",
    decision: "A provider failing mid-answer throws the partial text away and restarts on the backup.",
    why: "The brief forbids showing two models' output mixed. Writing the state machine first turned that into a contract a test can check.",
    artifact: { label: "02_TRD.md · §4.4 fallback", lines: [
      "for model in [selected, ...fallbackOrder]:",
      "  error before first token → fallback; next",
      "  error after first token  → reset; fallback; next",
      "  finished → done{answeredBy, usage, cost}",
      "all failed → error{code, retryAfterSec}",
    ] },
    effects: [],
  },
  {
    id: "plan", hour: 1, kind: "spec", short: "Plan + matrix", minutes: 3, seconds: 5,
    title: "Plan and acceptance matrix",
    did: "Seven phases, each with a kickoff prompt for the AI agent; every build phase ends on a command that proves it's finished. Then 45 acceptance rows: brief id → requirement → expected result → the test layer that proves it.",
    decision: "“Done” is a row with evidence, never “the code looks right”.",
    why: "AI writes plausible code fast. The matrix is what stops plausible from shipping as correct.",
    artifact: { label: "04_Acceptance_Matrix.md", lines: [
      "NKA-GRD-006  E4   Relay Pro → $49 and $59, both cited",
      "NKA-RET-005  E6   Relay Ent P1 → 15 min, not 30",
      "NKA-MDL-005  E8   mid-stream failure → backup text only",
      "NKA-CHAT-005 E10  blank → 400, provider called 0 times",
    ] },
    effects: [{ at: 0.45, define: ["D-REPO", "D-LIVE"] }],
  },
  {
    id: "build", hour: 1, kind: "build", short: "Tests + code with AI agents", minutes: 28, seconds: 8,
    title: "Build with AI agents, tests first",
    did: "Agents implemented phase by phase against the docs. A phase ended only when its verification command passed: retrieval eval offline, fallback against a mock provider, E2E in a real browser with a mock LLM, a scan for keys in the bundle.",
    decision: "AI writes the code. Deterministic tests decide what ships.",
    why: "Agents are fast and confidently wrong. A mock LLM makes the browser tests free and repeatable, so they run on every change.",
    artifact: { label: "test suite at the first commit", lines: [
      "✓ retrieval    off-corpus question flagged as noMatch",
      "✓ NKA-MDL-005  mid-stream failure resets partial text",
      "✓ NKA-MDL-006  all providers rate-limited → one clear error",
      "✓ NKA-CHAT-004 blank message cannot be sent",
      "✓ scan:bundle  no key-shaped value in .next/static",
    ] },
    caught: [
      "“Weather in Paris” matched every document through a stray “s” token — retrieval eval",
      "“How much” wasn't a pricing word, so the $59 conflict was missed — retrieval eval",
      "The key scanner labelled an Anthropic key as OpenAI — scanner self-test",
    ],
    effects: [
      { at: 0.08, tests: 12 }, { at: 0.18, pass: ["R2"], tests: 24 }, { at: 0.3, pass: ["R3", "E8"], tests: 38 },
      { at: 0.45, pass: ["R4", "S-CTX", "S-EXPORT"], tests: 50 }, { at: 0.6, pass: ["R1", "E10"], tests: 61 },
      { at: 0.75, pass: ["R5", "E9"], tests: 70 }, { at: 0.88, pass: ["G-KEY"], tests: 76 },
    ],
  },
  {
    id: "eval", hour: 1, kind: "verify", short: "Live eval + debug", minutes: 12, seconds: 7,
    title: "Live eval on three vendors, then debug",
    did: "18 golden questions × Gemini, OpenAI and Claude, graded automatically against the answer key. Fix what failed, re-run everything.",
    decision: "Measure every model, every time.",
    why: "A prompt fix that helps one vendor can break another. And once the grader was wrong, not the bot: correct “not in the knowledge base” paraphrases were marked as failures.",
    artifact: { label: "evals/reports · live runs", lines: [
      "run 1    42 / 54   Q3, Q4 fail on every model",
      "run 2    48 / 54",
      "run 3    51 / 54   Q3, Q4 recover; E3 slips",
      "re-run    6 / 6    grader fixed, not the answers",
    ] },
    caught: [
      "Claude's answer was cut off: reasoning used the whole output budget — live eval",
      "An integration answer dropped “read-only” from a partner requirement — live eval",
    ],
    effects: [{ at: 0.05, run: runs.first }, { at: 0.38, run: runs.second }, { at: 0.66, run: runs.third }, { at: 0.86, run: runs.graderFix }],
  },
  {
    id: "ship", hour: 1, kind: "ship", short: "Ship", minutes: 5, seconds: 5,
    title: "Commit, deploy, report the honest number",
    did: "One commit with the product, the requirement docs, the tests and the eval reports: 78 files. Every core requirement lands with the test that proves it.",
    decision: "Report the real score, not the best one.",
    why: "The run right after the commit scored 48 / 54 — low-effort models took the literal-answer shortcut again. That number goes into the bonus hour, not under the rug.",
    artifact: { label: "git · first commit", lines: [
      "feat: product knowledge assistant",
      "78 files · 18,569 lines",
      "66 unit/integration · 10 Playwright E2E",
      "server-only keys · bundle scan · rate limit",
    ] },
    effects: [{ at: 0.45, run: runs.afterCommit }],
  },
  {
    id: "close", hour: 2, kind: "bonus", short: "Close gaps", minutes: 10, seconds: 5,
    title: "Close the gaps without lowering the bar",
    did: "Named the literal-answer shortcut in the prompt and forbade it. 54 / 54 on all three models, confirmed by a re-run. Clickable citation chips that open the source passage.",
    decision: "Reversed an earlier change that had relaxed “full checklist” after seeing model answers.",
    why: "Fitting the requirement to the output makes any score meaningless. The requirement stayed; the prompt had to rise to it.",
    artifact: { label: "01_BRD.md · A9 history", lines: [
      "v1.1  A9 relaxed to the literal question",
      "v1.2  A9 reversed: the full ordered checklist,",
      "      step 1 marked “check first” — v1.1 had",
      "      fitted the requirement to the results",
    ] },
    effects: [{ at: 0.2, run: runs.shortcutNamed }, { at: 0.6, run: runs.allGreen, tests: 80 }],
  },
  {
    id: "prove", hour: 2, kind: "bonus", short: "Prove", minutes: 5, seconds: 4,
    title: "Prove the deliverables the way reviewers will",
    did: "Ran CI on a clean checkout — it failed: generated route types existed only on my machine. Fixed, then re-ran the golden set against the production URL.",
    decision: "Test what the reviewer will do, not what I do.",
    why: "They clone on a fresh machine and hit the live link with their own questions. “Works locally” would have failed a deliverable.",
    artifact: { label: "CI · clean checkout", lines: [
      "✗ tsc: LayoutProps missing (.next/types)",
      "→ typecheck = next typegen && tsc --noEmit",
      "✓ npm run ci in a fresh clone",
      "✓ live eval vs production: 18 / 18",
    ] },
    effects: [{ at: 0.35, pass: ["D-REPO"] }, { at: 0.7, run: runs.production }],
  },
  {
    id: "observe", hour: 2, kind: "bonus", short: "Observe", minutes: 15, seconds: 4,
    title: "Monitoring with a privacy contract",
    did: "Error monitoring on server, edge and browser, with every channel that could carry a question, prompt, answer or key switched off. Provider failures the fallback hides from users become issues.",
    decision: "If the fallback hides an outage from users, the team still has to see it.",
    why: "Questions can contain customer details, so nothing that carries them leaves the server. A review caught provider errors echoing a partly masked key — now redacted first, with a test.",
    artifact: { label: "monitoring · privacy contract", lines: [
      "bodies · headers · cookies · query      → off",
      "AI inputs/outputs · stack variables     → off",
      "beforeSend / beforeSendSpan scrub       → on",
      "vendor error text → redactSecrets() first",
    ] },
    effects: [],
  },
  {
    id: "guards", hour: 2, kind: "bonus", short: "Review → guards", minutes: 18, seconds: 5,
    title: "Independent review → deterministic guards",
    did: "Had the build reviewed independently. Finding: grounding was prompt-only. Added an off-topic guard that answers without calling any model, a figure check on every answer, product nicknames and topic carry-over.",
    decision: "An auto-fail deserves code, not just instructions.",
    why: "A prompt is a request; a guard is a guarantee. “Answer not from the documents” fails the challenge, so it gets a layer that doesn't depend on the model behaving.",
    artifact: { label: "02_TRD.md · §4.6–4.7", lines: [
      "off-topic → “not in the KB”, no model call, $0",
      "every figure checked against the cited passages",
      "“the API gateway” → Relay",
      "“SAML 2.0” is a protocol, not a release",
    ] },
    effects: [{ at: 0.55, note: { "G-DOCS": "in code" } }],
  },
  {
    id: "raise", hour: 2, kind: "bonus", short: "Raise the bar", minutes: 12, seconds: 6,
    title: "Raise the bar on myself",
    did: "Rebuilt the golden set stricter: 25 cases instead of 18 — “hi”, “Who is the CEO?”, “And for Vault?”, integrations for every product. The score dropped to 61 / 75, on purpose, then climbed back.",
    decision: "A score is only worth the bar it's measured against.",
    why: "9 of the first 14 failures were the grader not yet knowing the new guard. The grader is code too, and gets fixed like code.",
    artifact: { label: "evals/reports · stricter set", lines: [
      "61 / 75   new cases expose the gaps",
      "72 / 75   grader learns the off-topic guard",
      "73 / 75",
      "75 / 75   three vendors, two hours after the brief",
    ] },
    effects: [{ at: 0.08, run: runs.stricter }, { at: 0.38, run: runs.stricter2 }, { at: 0.62, run: runs.stricter3 }, { at: 0.86, run: runs.final }],
  },
];

export const TOTAL_SECONDS = chapters.reduce((sum, chapter) => sum + chapter.seconds, 0);

/** Where each chapter starts on the playback clock. */
export const chapterStarts = chapters.reduce<number[]>((starts, chapter, i) => [...starts, i === 0 ? 0 : starts[i - 1] + chapters[i - 1].seconds], []);

export function locate(seconds: number): { index: number; progress: number } {
  const s = Math.max(0, Math.min(TOTAL_SECONDS, seconds));
  for (let i = chapters.length - 1; i >= 0; i -= 1) {
    if (s >= chapterStarts[i]) return { index: i, progress: Math.min(1, (s - chapterStarts[i]) / chapters[i].seconds) };
  }
  return { index: 0, progress: 0 };
}

export type TileStatus = "pending" | "defined" | "pass" | "partial" | "fail";
export type TileState = { status: TileStatus; score: [number, number] | null; note: string | null };

export type Snapshot = {
  index: number;
  progress: number;
  chapter: Chapter;
  tiles: Record<string, TileState>;
  /** Real minutes elapsed within the current hour, approximately. */
  minuteOfHour: number;
  defined: number;
  passing: number;
  tests: number;
  lastRun: EvalRun | null;
};

const scoreStatus = ([pass, total]: [number, number]): TileStatus => (pass === total ? "pass" : pass === 0 ? "fail" : "partial");

/** Everything on screen at a playback position. Pure, so the player can jump anywhere. */
export function snapshot(seconds: number): Snapshot {
  const { index, progress } = locate(seconds);
  const tiles: Record<string, TileState> = Object.fromEntries(board.map((item) => [item.id, { status: "pending", score: null, note: null }]));
  let tests = 0;
  let lastRun: EvalRun | null = null;

  chapters.slice(0, index + 1).forEach((chapter, i) => {
    for (const effect of chapter.effects) {
      if (i === index && effect.at > progress) continue;
      for (const id of effect.define ?? []) if (tiles[id].status === "pending") tiles[id] = { ...tiles[id], status: "defined" };
      for (const id of effect.pass ?? []) tiles[id] = { ...tiles[id], status: "pass" };
      for (const [id, note] of Object.entries(effect.note ?? {})) tiles[id] = { ...tiles[id], note };
      if (effect.tests !== undefined) tests = effect.tests;
      if (effect.run) {
        const runNow = effect.run;
        for (const [id, score] of Object.entries(runNow.items)) if (score) tiles[id] = { ...tiles[id], status: scoreStatus(score), score };
        if (tiles.Rule.score) tiles["G-DOCS"] = { ...tiles["G-DOCS"], status: tiles.Rule.status === "pass" && tiles.E2.status === "pass" ? "pass" : "partial" };
        if (runNow.where === "production") tiles["D-LIVE"] = { ...tiles["D-LIVE"], status: "pass", score: [runNow.pass, runNow.total] };
        if (runNow.total >= 54) lastRun = runNow;
      }
    }
  });

  const chapter = chapters[index];
  const before = chapters.slice(0, index).filter((item) => item.hour === chapter.hour).reduce((sum, item) => sum + item.minutes, 0);
  const statuses = Object.values(tiles);
  return {
    index,
    progress,
    chapter,
    tiles,
    minuteOfHour: Math.min(60, before + progress * chapter.minutes),
    defined: statuses.filter((tile) => tile.status !== "pending").length,
    passing: REQUIRED_IDS.filter((id) => tiles[id].status === "pass").length,
    tests,
    lastRun,
  };
}
