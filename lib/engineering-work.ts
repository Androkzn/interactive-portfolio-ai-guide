// Editorial source of truth for the "Selected engineering work" section and the
// three case-study pages.
//
// Two rules govern this file:
// 1. A claim that carries a number, a measurement or a strong technical
//    assertion must have a matching entry in `claimRegistry`, with its own
//    measurement definition, verification status and limitations.
// 2. `verificationStatus` describes how well the claim is checked;
//    `publicationApproval` describes whether it may be published. They are
//    separate fields on purpose: reading a document is not running a test, and
//    permission to publish is not evidence.
//
// lib/engineering-work.test.ts enforces both rules.

export type CaseStudyId = "step-social-platform" | "step-ai-coach" | "ai-assisted-plan-review";

/** How well a claim is actually checked. Never widened silently. */
export type VerificationStatus =
  /** Described by me from my own experience; no artifact inspected for this write-up. */
  | "author-reported"
  /** A source document, repository or dashboard was inspected for this write-up. */
  | "source-inspected"
  /** A test or measurement was executed and its output recorded. */
  | "runtime-verified"
  /** A goal or SLA, not a measured result. */
  | "target-planned";

/** Whether the claim may appear on the public site. Independent of verification. */
export type PublicationApproval = "approved" | "pending-owner-approval" | "withheld";

/** Whether the claim is used in public copy or kept only as editorial history. */
export type PublicUse = "published" | "registry-only";

export type SourceType =
  | "owner-document"
  | "owner-account"
  | "repository"
  | "test-run"
  | "dashboard"
  | "app-store"
  | "portfolio-code";

export type Claim = {
  id: string;
  project: "step" | "engineering-tooling" | "portfolio";
  claim: string;
  sourceRef: string;
  sourceType: SourceType;
  /** ISO date of the source, or "unknown" when the source itself is undated. */
  sourceDate: string;
  environment: "production" | "staging" | "local" | "not-applicable" | "unknown";
  /** What exactly is counted or measured. Required, and never a restatement of the claim. */
  measurementDefinition: string;
  verificationStatus: VerificationStatus;
  /** What the number does not prove. Required. */
  limitations: string;
  /** A link or artifact a reader could inspect, or null when none is publishable. */
  publicArtifact: string | null;
  publicationApproval: PublicationApproval;
  publicUse: PublicUse;
};

/**
 * Every number and strong technical claim behind the three case studies, plus
 * the older portfolio figures kept for editorial reference so they are not lost
 * when a section is rewritten.
 */
export const claimRegistry: Claim[] = [
  {
    id: "step-social-xray-cases",
    project: "step",
    claim:
      "195 acceptance test cases for Circles V2 were generated from the requirement documents and imported into the test-management tool.",
    sourceRef: "Step Experience Master Document §1.5 / §3.I / Appendix A6",
    sourceType: "owner-document",
    sourceDate: "2026-09-11",
    environment: "not-applicable",
    measurementDefinition:
      "A count of acceptance-matrix cases produced from the Circles V2 requirement documents by a generator script and imported into Xray. Scoped to Circles V2 — not the Movement Feed, and not the whole test platform. Generated and imported, not hand-authored, and separate from the app's UI and unit test suites.",
    verificationStatus: "source-inspected",
    limitations:
      "195 imported cases is not 195 passing automated tests. No execution report for this set is presented here.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "published",
  },
  {
    id: "step-social-coverage-audit",
    project: "step",
    claim:
      "A static audit of Circles V2 compared the acceptance matrix against the code: 108 of 155 checks satisfied, 47 gaps recorded.",
    sourceRef: "Circles V2 code-vs-matrix audit, 2026-07-30, cited in the Step Experience Master Document Appendix F4 / §7",
    sourceType: "owner-document",
    sourceDate: "2026-07-30",
    environment: "not-applicable",
    measurementDefinition:
      "A static comparison of the acceptance matrix against the code as it stood on that date: 108 checks satisfied, 47 not, 155 total (~70% implemented at audit time). The 47 gaps fed a fix backlog. This is a code audit, not a test execution, and the 155 checks are a different artifact from the 195 imported cases.",
    verificationStatus: "source-inspected",
    limitations:
      "A point-in-time audit. Nothing here claims the 47 gaps were all subsequently closed, and no audit result for a later date is presented.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "published",
  },
  {
    id: "step-feed-modify-insert",
    project: "step",
    claim:
      "Workouts imported from Apple Health were confirmed through a MODIFY event while the feed rule only fired on INSERT, so they never produced feed cards. The rule was widened and a scheduled reconciliation job with idempotent backfill was added.",
    sourceRef: "Step Experience Master Document §4 (story 6) / Appendix C2",
    sourceType: "owner-document",
    sourceDate: "2026-09-11",
    environment: "production",
    measurementDefinition:
      "A described defect in event handling: the event type that carried the confirmation was outside the set the feed rule matched on. The fix widened the matched set and added a reconciliation job that backfills missed cards idempotently.",
    verificationStatus: "source-inspected",
    limitations:
      "The document's stated outcome — that the missed-card class was eliminated and the reconciliation job reports nothing left to backfill in steady state — appears in one place and is the one claim in this story with no source reference behind it. Treat it as my report, not as a measurement. The fix covers this confirmation path; it is not a platform-wide exactly-once guarantee.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "published",
  },
  {
    id: "step-feed-aggregator-volume",
    project: "step",
    claim: "The feed aggregator handles roughly 34,000 invocations per day.",
    sourceRef: "Step Experience Master Document §3.E / Appendix A (per-function volumes)",
    sourceType: "owner-document",
    sourceDate: "2026-09-11",
    environment: "production",
    measurementDefinition:
      "Daily invocation count of the function that aggregates feed cards. Feature-scoped, unlike a backend-wide total.",
    verificationStatus: "source-inspected",
    limitations:
      "Load context only. It describes how often the aggregator runs, not how many people used the feed, and not whether the feature succeeded. No specific source row backs this figure in the document; it is covered only by the general production snapshot.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "published",
  },
  {
    id: "step-backend-invocations-24h",
    project: "step",
    claim:
      "In one 24-hour production window the backend served 969,821 Lambda invocations with 4 Lambda errors and 0 throttles.",
    sourceRef: "Lambda health report, production, 2026-09-04, 24h window (CloudWatch, us-east-2)",
    sourceType: "dashboard",
    sourceDate: "2026-09-04",
    environment: "production",
    measurementDefinition:
      "Lambda invocation count and the CloudWatch Errors metric across 147 production functions, of which 70 were invoked in the window. Roughly 857,000 of the 969,821 invocations belong to a single video resolver, so the distribution is dominated by one read path.",
    verificationStatus: "source-inspected",
    limitations:
      "Three reasons not to publish this as a reliability result: the source report is marked in review; the Errors metric counts metric-level errors and misses exceptions the code caught, which that same report demonstrates; and there is no SLO or error budget to compare it against. Held to the editorial registry rather than used on a page.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "registry-only",
  },
  {
    id: "step-retrieval-overhead-removed",
    project: "step",
    claim:
      "Making retrieval a tool instead of an unconditional step took roughly 300–500 ms of retrieval overhead off about 90% of coach messages.",
    sourceRef: "Step Experience Master Document §1.5 / §3.B; §7 attributes the figure to the on-demand-retrieval design decision record",
    sourceType: "owner-document",
    sourceDate: "2026-09-11",
    environment: "production",
    measurementDefinition:
      "The cost of the retrieval step itself on messages that no longer trigger it, with ~90% being the reported share of messages that do not need retrieval. It is not total response latency and not time-to-first-token.",
    verificationStatus: "source-inspected",
    limitations:
      "This is a design estimate, not a measurement. The document's own source for it is a design-decision record rather than a benchmark or a monitoring query, unlike neighbouring figures that cite staging-verified measurements. A faster path is also not evidence that answer quality held.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "published",
  },
  {
    id: "step-retrieval-quality-harness",
    project: "step",
    claim:
      "A scenario-based retrieval-quality harness exists — four scenarios, twenty queries, keyword-relevance scoring with per-scenario retrieval depth.",
    sourceRef: "Retrieval-quality script in the Step app repository (inspected 2026-09-24); Step Experience Master Document §3.K / Appendix G8",
    sourceType: "repository",
    sourceDate: "2026-09-24",
    environment: "local",
    measurementDefinition:
      "A script that runs a fixed set of queries per scenario and scores whether retrieved content contains the expected keywords. Existence and size only — no result is being reported.",
    verificationStatus: "source-inspected",
    limitations:
      "No result of running it exists anywhere: the script only prints to standard output and has no code path that writes a report, it is not wired into CI, and neither the repository history nor the source document records a single run. So the question it was built to answer — is retrieval ever skipped when it was needed — is open, not answered.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "published",
  },
  {
    id: "agent-eval-case-count",
    project: "engineering-tooling",
    claim:
      "The review skills are regression-tested against 11 cases built from real plans that had needed between 9 and 18 review iterations.",
    sourceRef: "Step Experience Master Document Appendix G4",
    sourceType: "owner-document",
    sourceDate: "2026-09-11",
    environment: "local",
    measurementDefinition:
      "The number of cases in the evaluation set. Each case holds the earliest version of a real plan, the findings a reviewer must raise with a minimum severity for each, and the properties the review output must have.",
    verificationStatus: "source-inspected",
    limitations: "The size of a set. It says nothing on its own about how many of them pass.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "published",
  },
  {
    id: "agent-eval-run-2026-05-28",
    project: "engineering-tooling",
    claim:
      "The recorded run on 2026-05-28 returned 6 pass, 2 fail, 2 partial and 1 fixture defect across the 11 cases, followed by patches to two of the reviewer roles and a fix to the broken case.",
    sourceRef: "Step Experience Master Document Appendix G4 (run log for 2026-05-28)",
    sourceType: "test-run",
    sourceDate: "2026-05-28",
    environment: "local",
    measurementDefinition:
      "Per-case outcomes from one execution of the eval set on that date, judged against each case's expected findings. 'Partial' means the reviewer raised the issue but missed part of the expected finding; 'fixture defect' means the case itself was mis-specified, so its result said nothing about the reviewer.",
    verificationStatus: "source-inspected",
    limitations:
      "A single historical run, and not 11 passing checks. The run was followed by fixes under a 'fail before the fix, pass after' policy, but no post-fix re-run is recorded anywhere in the source — so the outcome of those fixes is not established and the failing cases should be treated as open.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "published",
  },
  {
    id: "agent-review-roles",
    project: "engineering-tooling",
    claim:
      "The review protocol uses five reviewer roles — Codebase Validator, Architecture & Risk Reviewer, Modern Practices Research, Premise Adversarial Validator and Execution Validator — of which the Premise Adversarial Validator runs on a different model as a cross-model check.",
    sourceRef: "Step Experience Master Document Appendix G5",
    sourceType: "owner-document",
    sourceDate: "2026-09-11",
    environment: "local",
    measurementDefinition:
      "A description of an engineering process: five review passes, each with its own question, run for up to five cycles and treated as finished only when a fresh pass returns no warnings.",
    verificationStatus: "source-inspected",
    limitations:
      "A process, not an autonomous runtime. The source states that one role runs on a different model as a cross-model check but gives no measured reason why that role in particular benefits, so no such rationale is claimed here. Five passes agreeing is not proof that a plan is correct.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "published",
  },
  {
    id: "step-crash-free-apr-may-2026",
    project: "step",
    claim: "A 99.91% crash-free rate, with 3 crashes across the user base and 2 affected users.",
    sourceRef: "Crash-reporting analysis for Apr–May 2026, cited in the Step Experience Master Document §1.5",
    sourceType: "dashboard",
    sourceDate: "2026-05-31",
    environment: "production",
    measurementDefinition:
      "A crash-free rate over the Apr–May 2026 window only. The source says 'crash-free rate' without stating whether it is per user or per session, so the denominator is unsettled.",
    verificationStatus: "source-inspected",
    limitations:
      "App-wide, limited to a two-month window, with an unstated denominator. Not a reliability claim for any later period and not specific to any one feature.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "registry-only",
  },
  {
    id: "step-staging-invite-latency",
    project: "step",
    claim: "An invite-acceptance path went from 24,285 ms to 468–492 ms on staging.",
    sourceRef: "Staging-verified fix plan cited in the Step Experience Master Document §1.5 / §7",
    sourceType: "owner-document",
    sourceDate: "2026-09-11",
    environment: "staging",
    measurementDefinition:
      "Before/after timings of the same flow on staging, from a field-scoped mutation plus deferred fan-out. The source does not state a percentile.",
    verificationStatus: "source-inspected",
    limitations:
      "Staging, not production. Without a stated percentile these timings cannot be lined up against production numbers.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "registry-only",
  },
  {
    id: "step-ui-test-suite-growth",
    project: "step",
    claim: "The UI test suite grew from 17 to 629 tests over six months.",
    sourceRef: "Step Experience Master Document §3.I",
    sourceType: "owner-document",
    sourceDate: "2026-09-11",
    environment: "not-applicable",
    measurementDefinition: "Count of UI tests in the suite at two points in time, six months apart.",
    verificationStatus: "source-inspected",
    limitations:
      "Suite size, not coverage and not quality. It must not be restated as a multiple of quality or coverage.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "registry-only",
  },
  {
    id: "step-commit-volume-growth",
    project: "step",
    claim: "My own non-merge commits per month went from 179 to 583 between the stated windows.",
    sourceRef: "Repository history (per-author monthly commit counts) cited in the Step Experience Master Document §1.5 / §7",
    sourceType: "owner-document",
    sourceDate: "2026-09-11",
    environment: "not-applicable",
    measurementDefinition:
      "Non-merge commits attributed to one author per month, in two named windows. A per-person count, not a team measure.",
    verificationStatus: "source-inspected",
    limitations:
      "Commit volume by one author. It is not a productivity multiple, it is not team throughput even though it has been described that way, and it does not establish that AI caused the change.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "registry-only",
  },
  {
    id: "step-coach-latency-targets",
    project: "step",
    claim: "Targets of p99 under 50 ms and time-to-first-token under 200 ms.",
    sourceRef: "Step Experience Master Document, §4.4",
    sourceType: "owner-document",
    sourceDate: "unknown",
    environment: "unknown",
    measurementDefinition: "Stated service targets for the coach path.",
    verificationStatus: "target-planned",
    limitations: "Targets only. No measurement was found, so they must not be presented as achieved.",
    publicArtifact: null,
    publicationApproval: "approved",
    publicUse: "registry-only",
  },
  {
    id: "step-aggregate-performance-cost",
    project: "step",
    claim: "Aggregate figures of 90% performance improvement and 30% cost reduction.",
    sourceRef: "Earlier résumé copy; no measurement located",
    sourceType: "owner-document",
    sourceDate: "unknown",
    environment: "unknown",
    measurementDefinition: "Not defined in any source available for this write-up.",
    verificationStatus: "author-reported",
    limitations:
      "No definition, window or method. Not published anywhere on this site, and not to be carried over from older copy.",
    publicArtifact: null,
    publicationApproval: "withheld",
    publicUse: "registry-only",
  },
  {
    id: "step-release-and-pr-counts",
    project: "step",
    claim: "17 App Store releases and 854 pull-request merges.",
    sourceRef: "Step Experience Master Document, Appendix C",
    sourceType: "owner-document",
    sourceDate: "unknown",
    environment: "not-applicable",
    measurementDefinition:
      "Not settled: the release count needs shipped versions confirmed against dates, and the merge count needs 'unique pull requests' separated from 'merge events' before it can be published.",
    verificationStatus: "author-reported",
    limitations:
      "Two competing denominators appear in the source. Held back until the counting basis is agreed.",
    publicArtifact: null,
    publicationApproval: "pending-owner-approval",
    publicUse: "registry-only",
  },
];

export function claimById(id: string): Claim | undefined {
  return claimRegistry.find((claim) => claim.id === id);
}

export type EngineeringWorkCard = {
  id: CaseStudyId;
  /** URL path. Trailing slash matches next.config.ts `trailingSlash: true`. */
  href: string;
  category: string;
  title: string;
  description: string;
  contribution: string;
  decision: string;
  /**
   * One relevant indicator, or the kind of material available. The label
   * carries the status so a number can never read as a verified benchmark.
   */
  signal: { label: string; value: string };
  cta: string;
};

export type RoleKind = "implemented" | "led" | "team";

export type FlowStep = { id: string; title: string; detail: string };

export type CheckStatus = "automated" | "documented" | "historical-run" | "not-run" | "open-question";

export type VerificationCheck = {
  status: CheckStatus;
  title: string;
  detail: string;
  claimId?: string;
};

export type SourceItem = {
  kind: "source-code" | "test-run" | "technical-write-up" | "owner-account";
  availability: "public" | "private" | "on-request";
  label: string;
  note: string;
  href?: string;
};

export type Disclosure = { summary: string; body: string[] };

export type CaseStudy = {
  id: CaseStudyId;
  href: string;
  category: string;
  title: string;
  lede: string;
  /** Page <title> and meta description for the static export. */
  metaTitle: string;
  metaDescription: string;
  context: { label: string; value: string }[];
  problem: { title: string; body: string[] };
  role: { title: string; intro: string; items: { kind: RoleKind; text: string }[] };
  decision: { title: string; body: string[]; tradeOff?: { title: string; body: string[] } };
  howItWorks: {
    title: string;
    intro: string;
    flow: FlowStep[];
    flowCaption: string;
    narrative: string[];
    disclosures?: Disclosure[];
  };
  verification: { title: string; intro: string; checks: VerificationCheck[] };
  outcome: { title: string; results: string[]; limitations: string[] };
  sources: { title: string; intro: string; items: SourceItem[]; claimIds: string[] };
};

/** The three homepage cards, in the order they appear on the page and on mobile. */
export const engineeringWorkCards: EngineeringWorkCard[] = [
  {
    id: "step-social-platform",
    href: "/work/step-social-platform/",
    category: "PRODUCT ENGINEERING · STEP",
    title: "Building the social layer at Step.",
    description:
      "I helped build Circles and the Movement Feed, connecting mobile experiences with an event-driven backend for memberships, invitations, posts, comments, and reactions.",
    contribution: "Product implementation across iOS and backend, with shared contracts and release planning.",
    decision:
      "Keep access rules on the backend and make feed updates resilient to duplicate or missed events.",
    signal: {
      label: "In this case study",
      value: "One correctness bug, traced from a missed event type to reconciliation and backfill",
    },
    cta: "Read case study",
  },
  {
    id: "step-ai-coach",
    href: "/work/step-ai-coach/",
    category: "APPLIED AI · STEP",
    title: "AI coaching in production.",
    description:
      "I built AI coaching features with contextual retrieval, streaming responses, and tool use. One key change was moving retrieval out of conversations that did not need it.",
    contribution: "AI integration, backend and client delivery, output validation, and performance investigation.",
    decision: "Use retrieval as a tool instead of an unconditional step on every message.",
    signal: {
      label: "Author-reported, not an independent benchmark",
      value: "~300–500 ms of retrieval overhead removed from about 90% of messages",
    },
    cta: "Read case study",
  },
  {
    id: "ai-assisted-plan-review",
    href: "/work/ai-assisted-plan-review/",
    category: "ENGINEERING TOOLING · STEP",
    title: "Testing the agents that review engineering plans.",
    description:
      "I built a structured review workflow and regression cases from real failures in AI-assisted planning. The goal was to check what the reviewers actually catch—not just whether they produce convincing feedback.",
    contribution: "Review protocol, reusable skills, evaluation cases, and verification rules.",
    decision: "Turn recurring review failures into regression cases instead of adding untested prompt rules.",
    signal: {
      label: "Recorded run · 2026-05-28",
      value: "11 regression cases: 6 pass, 2 fail, 2 partial, 1 fixture defect",
    },
    cta: "Read case study",
  },
];

const sharedContextNote = {
  label: "Material status",
  value:
    "Written from my own account of the work. Each number below is listed with its source and limits at the end of the page. Job title and employment dates are not published here.",
};

export const caseStudies: CaseStudy[] = [
  {
    id: "step-social-platform",
    href: "/work/step-social-platform/",
    category: "PRODUCT ENGINEERING · STEP",
    title: "Building the social layer at Step.",
    lede:
      "Circles let people form a small group around shared activity. The Movement Feed is what that group actually sees. Making the two agree — who is a member, who may see what, and which activity becomes a feed card — was the engineering problem.",
    metaTitle: "Building the social layer at Step · Andrei Tekhtelev",
    metaDescription:
      "Product engineering case study: Circles, the Movement Feed, and keeping membership, visibility and feed events in agreement between an iOS client and an event-driven backend.",
    context: [
      { label: "Context", value: "Step · consumer fitness product, iOS app with an event-driven AWS backend" },
      {
        label: "My role",
        value:
          "Product implementation across iOS and backend, shared contracts, release planning — working with a small team of two to three engineers plus the founder and QA.",
      },
      sharedContextNote,
    ],
    problem: {
      title: "Problem",
      body: [
        "In plain terms: a user creates a circle, invites a few people, and from then on the group is supposed to see each other's activity. Members post, comment and react. When someone finishes a workout, that should turn up in the feed of the people who are allowed to see it — and nobody else.",
        "That sentence hides the actual work. Membership changes over time: invitations are pending, accepted or declined, people leave, and a circle can be private. Visibility follows membership, so the answer to \"who should see this card\" is different every time it is asked. And the activity that produces a card does not arrive as a tidy request from the app — it arrives as events from the backend, which can be duplicated, delayed, or of a type nobody planned for.",
        "So the central question for this work was not \"how do I render a feed\". It was: how do membership, visibility and feed events stay in agreement between a mobile client and an event-driven backend, when each of the three can change independently?",
      ],
    },
    role: {
      title: "My role",
      intro:
        "Step's social features were built by a team. This is the part I can speak for, split by what I actually did rather than by what the feature list looks like.",
      items: [
        {
          kind: "implemented",
          text: "Implemented social product surfaces in the iOS app and the backend handlers behind them — memberships, invitations, posts, comments and reactions.",
        },
        {
          kind: "implemented",
          text: "Implemented the change that made feed generation react to the full set of confirmation events rather than one event type, together with reconciliation for activity that had already been missed.",
        },
        {
          kind: "led",
          text: "Proposed and drove the contract between client and backend: which fields the client may trust, what the backend decides on its own, and what a client is never allowed to assert.",
        },
        {
          kind: "led",
          text: "Wrote the test scenarios for membership and visibility edge cases, and argued for keeping access decisions on the server when it would have been quicker to filter on the client.",
        },
        { kind: "team", text: "Design, product scope, release approval and the wider platform were shared team work — I did not own them alone." },
      ],
    },
    decision: {
      title: "Key decision",
      body: [
        "Keep access rules on the backend, and make feed updates resilient to duplicate or missed events.",
        "The tempting shortcut is to let the client decide what to show. The client already knows which circle the user opened and which members it just fetched, so filtering there is fast and easy. It is also wrong the moment the two disagree: a stale membership list on a device becomes a visibility bug, and the same rule then has to be re-implemented on every platform.",
        "So the client asks and renders; the backend decides. The cost is real — an extra round trip in places where local filtering would have been instant, and more backend work per request. The benefit is that visibility has exactly one implementation, and a device holding old data can be wrong about what it shows but not about what it is allowed to see.",
        "The second half of the decision is about events. If a feed card is produced by an event, then the interesting cases are the event that arrives twice and the event that never arrives at all. Both were treated as normal operating conditions rather than as faults: writes that produce cards are keyed so a repeat does not create a second card, and there is a path to reconcile activity that should have produced a card and did not.",
      ],
    },
    howItWorks: {
      title: "How it works",
      intro:
        "The path below is the one that matters for this case study: a confirmed workout becoming a card in the right people's feeds. It is drawn at the level of responsibility, because that is the level I can state accurately — the exact internal routing for this particular flow is not something I am publishing here.",
      flow: [
        { id: "01", title: "Activity is confirmed", detail: "A workout is recorded or imported, and the backend receives the event that confirms it." },
        { id: "02", title: "The event is classified", detail: "The handler decides whether this event represents a confirmed activity worth publishing — across every event type that can carry that confirmation, not just the expected one." },
        { id: "03", title: "The audience is resolved", detail: "Membership and circle visibility are read on the backend to determine who is allowed to see this activity, at this moment." },
        { id: "04", title: "The card is written once", detail: "Feed entries are written so that a repeated event resolves to the same card instead of a duplicate." },
        { id: "05", title: "Clients read the feed", detail: "The iOS app requests the feed it is entitled to and renders it; it does not compute entitlement." },
      ],
      flowCaption:
        "Five responsibilities, not five services: confirmation, classification, audience resolution, idempotent write, client read. Each step names who decides — the backend decides steps 2 to 4.",
      narrative: [
        "Reading it as prose: the backend learns that an activity is confirmed, decides whether that confirmation is the kind that belongs in a feed, works out who may see it, writes the card in a way that survives the same event arriving again, and then the app simply asks for what it is allowed to read. The client's job is deliberately small.",
        "The one step that turned out to be interesting in production was step 2 — classification. It is also the step that produced the bug worth telling you about.",
      ],
      disclosures: [
        {
          summary: "The bug: a confirmation that the feed rule did not recognise",
          body: [
            "A workout imported from HealthKit was not confirmed the way a workout recorded in the app was. The import path produced its confirmation as a MODIFY event — the record already existed, and confirmation changed it. The feed rule matched on INSERT.",
            "The result was not an error. Nothing crashed, nothing logged a failure, and every test that created a workout the ordinary way passed. The activity was simply never considered for the feed, so for the people whose workouts came from HealthKit the feed was quietly incomplete.",
            "The fix had three parts. First, handling was widened so that a confirmation is a confirmation regardless of which event type carries it — the rule now matches on what the event means, not on the one shape it happened to have first. Second, because activity had already been missed, there was a reconciliation path to find confirmed activity with no corresponding card and produce the missing ones. Third, that backfill had to be safe to run: it can revisit the same activity without producing a second card, because the write is keyed on the activity rather than on the event that triggered it.",
            "What this is not: it is not an exactly-once guarantee for the platform. It is one class of event handled correctly, with duplicate-safe writes on that path. Other paths have their own assumptions, and I am not claiming they were all audited.",
          ],
        },
        {
          summary: "Why duplicate suppression lives in the write, not in a filter",
          body: [
            "Deduplicating when reading the feed would have been easier to ship: fetch, group, drop repeats. It also means the duplicate exists in storage, so every future reader has to know about it, and any process that counts or notifies sees two things where there was one.",
            "Keying the write on the activity instead pushes the constraint to the moment the card is created, which is the only place that can enforce it once for everyone. The trade-off is that the key has to be chosen correctly up front — a key that is too narrow lets duplicates through, and a key that is too broad collapses activity that should have produced separate cards.",
          ],
        },
      ],
    },
    verification: {
      title: "Verification",
      intro:
        "What is actually checked, and how. The statuses below are deliberately different from each other — a written test case, a point-in-time audit and an executed run are not the same evidence, and this section does not present them as if they were.",
      checks: [
        {
          status: "documented",
          title: "195 test cases authored in Xray for the social features",
          detail:
            "These are cases written and stored in the test-management tool, covering membership, invitation and feed scenarios. It is a count of authored cases — not of executions, and not of passes. No execution report for this set is published here.",
          claimId: "step-social-xray-cases",
        },
        {
          status: "historical-run",
          title: "A coverage audit: 108 of 155 reviewed scenarios mapped to tests, 47 gaps recorded",
          detail:
            "A point-in-time comparison of documented scenarios against existing tests. It is a historical artifact that shows where coverage was thin at that moment. It is not the output of a full test run, and this page does not claim the 47 gaps were all subsequently closed.",
          claimId: "step-social-coverage-audit",
        },
        {
          status: "documented",
          title: "The MODIFY/INSERT defect and its fix",
          detail:
            "Described from my own account of the work: the missed event type, the widened handling, the reconciliation pass and the duplicate-safe backfill. No repository, log or test output for it is published on this site.",
          claimId: "step-feed-modify-insert",
        },
        {
          status: "not-run",
          title: "A current automated run of the social suite",
          detail:
            "Not presented. I do not have a published run of that suite to point at for this write-up, so there is no pass/fail figure for it here.",
        },
      ],
    },
    outcome: {
      title: "Outcome & limitations",
      results: [
        "Circles and the Movement Feed shipped: people can create a circle, invite members, post, comment and react, and see each other's confirmed activity.",
        "Visibility has one implementation, on the backend. A client with stale membership data can render an out-of-date list, but it cannot grant itself access it does not have.",
        "Activity confirmed through an event type the feed rule had not covered now reaches the feed, and the backfill that repaired the already-missed activity could be run without creating duplicate cards.",
        "Load context for the backend this feature runs on: 969,821 Lambda invocations with 4 Lambda errors in one measured 24-hour production window (2026-09-04). That describes the traffic the system carried, not the success of the feature.",
      ],
      limitations: [
        "No engagement, retention or revenue effect is claimed. I do not have those numbers, and a feed shipping is not evidence that it changed behaviour.",
        "The invocation figure is a single 24-hour snapshot of the whole backend, not a feed-specific metric and not measured against a defined SLO.",
        "The event fix covers the confirmation path described above. It is not a platform-wide exactly-once guarantee.",
        "This was team work. The parts I list under \"My role\" are mine; design, product scope and release approval were not.",
      ],
    },
    sources: {
      title: "Sources & available artifacts",
      intro:
        "What each item below actually is: my own account, a document, a dashboard snapshot, or an executed test. Step's code and internal tooling are not public, so most of this is my description of work you cannot open — which is exactly why it is labelled that way.",
      items: [
        {
          kind: "owner-account",
          availability: "private",
          label: "My account of the implementation and the event-handling fix",
          note: "Not independently verifiable from this site. The underlying repository and event handlers are Step's private code.",
        },
        {
          kind: "technical-write-up",
          availability: "private",
          label: "Step Experience Master Document (§3.A, §3.C, §3.E, §4.6, Appendix C)",
          note: "An internal write-up of the work, held by me. Not published: it contains internal paths and operational detail.",
        },
        {
          kind: "test-run",
          availability: "private",
          label: "Xray test cases and the coverage audit",
          note: "Counts of authored cases and a point-in-time audit, quoted above. The tool and its reports are internal.",
        },
      ],
      claimIds: [
        "step-social-xray-cases",
        "step-social-coverage-audit",
        "step-feed-modify-insert",
        "step-backend-invocations-24h",
      ],
    },
  },
  {
    id: "step-ai-coach",
    href: "/work/step-ai-coach/",
    category: "APPLIED AI · STEP",
    title: "AI coaching in production.",
    lede:
      "People wanted useful answers about their own training inside the product, not a chat window bolted onto it. The model is one component of that system. The decision worth writing down is when the system should go and look something up — and when it should not.",
    metaTitle: "AI coaching in production · Andrei Tekhtelev",
    metaDescription:
      "Applied AI case study: contextual retrieval, streaming and tool use in a production coaching feature, and the decision to make retrieval a tool instead of an unconditional step on every message.",
    context: [
      { label: "Context", value: "Step · AI coaching inside a consumer fitness product" },
      {
        label: "My role",
        value: "AI integration, backend and client delivery, output validation, performance investigation. Part of a team.",
      },
      sharedContextNote,
    ],
    problem: {
      title: "Problem",
      body: [
        "A user asks the coach something. Sometimes it is about them — what their week looked like, whether a plan is realistic given what they actually did. Sometimes it is general. Sometimes it is not really a question at all: \"thanks\", \"got it\", a follow-up that only refers to the previous message.",
        "All of those arrive through the same input. The product needs the first kind to be grounded in real stored knowledge, and the last kind to just answer, quickly. The first version treated every message the same way: fetch context, then generate. That is the safe default, and it is what most integrations start with.",
        "It is also where the cost is. Retrieval is work — it happens before generation, so the user waits for it whether or not it contributed anything. On a short acknowledgement it contributes nothing and costs the same. The problem was not that retrieval was slow; it was that retrieval was unconditional.",
      ],
    },
    role: {
      title: "My role",
      intro: "The coaching features were a team effort. Split by what I did:",
      items: [
        {
          kind: "implemented",
          text: "Implemented the AI integration end to end for these features — the backend handler, the client surface, streaming of responses, and tool calling.",
        },
        {
          kind: "implemented",
          text: "Implemented validation of model output, so that what reaches the product is checked against an expected shape instead of being trusted because it reads well.",
        },
        {
          kind: "led",
          text: "Investigated where the time in a coach response actually went, and proposed moving retrieval from an unconditional step to a tool the model can call.",
        },
        { kind: "led", text: "Argued for keeping the boundary explicit: the model may request retrieval, but it does not decide what the application is allowed to do with the result." },
        { kind: "team", text: "Product direction, the coaching content itself and the surrounding platform were team work." },
      ],
    },
    decision: {
      title: "Key decision",
      body: [
        "Use retrieval as a tool the model can call, instead of a step that runs on every message.",
        "Always-on retrieval is easy to reason about: every generation sees context, so nothing is ever missing. The price is paid on every message — including the ones where no stored knowledge is relevant. And it hides a design question rather than answering it, because nobody has to decide which questions actually depend on retrieved knowledge.",
        "As a tool, the shape inverts. The default path is answer directly; retrieval happens when the model requests it, and the request is a tool call the application handles explicitly. That makes retrieval visible and auditable — there is a call, with arguments, that either happened or did not — and it means the cost lands on the conversations that need it.",
        "The boundaries I kept fixed: the model may ask for retrieval, but the application decides what a retrieval call is permitted to fetch, validates the arguments coming in, and validates the output going back before it becomes part of a response. A tool call is a request, not an instruction to obey.",
      ],
      tradeOff: {
        title: "Trade-off",
        body: [
          "Removing work from the critical path made responses faster on most messages. That is a latency result, and a latency result is not a quality result. Faster is not evidence that answers stayed as good.",
          "The failure mode this decision introduces is specific and worth naming: retrieval that should have happened and did not. Always-on retrieval cannot make that mistake — it wastes time instead. On-demand retrieval can, and when it does the answer is not an error message, it is a confident answer built on less than it should have been. That is harder to notice than a slow reply.",
          "What checks it: a retrieval-quality harness exists for exactly this question — does the answer hold up on inputs whose answers depend on stored knowledge. I do not have its results to show here, so I am not claiming the question is settled. It is the open item on this case study, stated rather than answered.",
        ],
      },
    },
    howItWorks: {
      title: "How it works",
      intro:
        "A simplified request path. It is drawn to show where the boundaries are — which component may decide what — rather than to document the internal wiring, which I am not publishing.",
      flow: [
        { id: "01", title: "Client sends the message", detail: "The app sends the user's message and the conversation it belongs to." },
        { id: "02", title: "Backend handler prepares the request", detail: "The handler assembles the request for the model and declares which tools are available on this call." },
        { id: "03", title: "Retrieval, only if requested", detail: "If the model calls the retrieval tool, the application executes it with validated arguments and returns the result. On most messages this step does not happen." },
        { id: "04", title: "Output is validated", detail: "The response is checked against the shape the product expects before any of it is used." },
        { id: "05", title: "Response streams back", detail: "Validated output streams to the client so reading can start before generation finishes." },
      ],
      flowCaption:
        "The conditional step is 03. Everything before it is the same on every message; everything after it is the same whether or not retrieval ran. That is what makes retrieval removable without redesigning the path.",
      narrative: [
        "In prose: the client sends a message, the backend decides what the model is allowed to reach for, the model answers — pausing to call retrieval only when it needs stored knowledge — and the result is validated and streamed back.",
        "Two things are deliberately not in that description. I am not claiming a set of routing rules that classify messages before the model sees them; the decision is made through the tool call, not by a classifier I am describing here. And I am not stating the exact internal services — this is the boundary view, which is the part I can state accurately.",
      ],
      disclosures: [
        {
          summary: "Adjacent work on the same feature, in one paragraph",
          body: [
            "Three other pieces of work sat next to this one and are not the subject of this page: precomputing coach intelligence so some context is ready before a conversation starts, routing by intent, and a video pipeline. Each would need its own explanation and its own evidence to be worth publishing.",
            "They are mentioned here only so the picture is not misleading — the coaching feature was more than this one decision. But one decision explained properly is more useful than five listed, so this page stays on retrieval.",
          ],
        },
      ],
    },
    verification: {
      title: "Verification",
      intro: "What is checked, what is reported, and what is still open.",
      checks: [
        {
          status: "automated",
          title: "Output validation on the response path",
          detail:
            "Model output is validated against the expected shape before the product uses it, so a malformed or unexpected response fails a check instead of reaching the UI. This runs on every response, by construction.",
        },
        {
          status: "documented",
          title: "~300–500 ms of retrieval overhead removed from about 90% of messages",
          detail:
            "This is my own reported figure for the retrieval step's own cost on messages that no longer trigger it. It is not total response latency and not time-to-first-token, and it is not an independently reproduced benchmark. The ~90% is the reported share of messages that do not need retrieval.",
          claimId: "step-retrieval-overhead-removed",
        },
        {
          status: "open-question",
          title: "Is retrieval ever skipped when it was needed?",
          detail:
            "This is the risk the decision introduces, and it is the check that matters most. A retrieval-quality harness exists for it; its results were not available for this write-up. Stated as open rather than answered.",
          claimId: "step-retrieval-quality-harness",
        },
        {
          status: "not-run",
          title: "Published latency or quality benchmark",
          detail:
            "None. No measurement of this change is published on this site, so nothing here should be read as a verified performance result.",
        },
      ],
    },
    outcome: {
      title: "Outcome & limitations",
      results: [
        "Coaching shipped as part of the product, with retrieval, streaming responses and tool use working together inside an explicit application contract.",
        "Retrieval became conditional and visible: it is a call that either happened or did not, on the conversations that need it.",
        "Model output is validated before it is used, so the product's behaviour does not depend on the model being well-behaved.",
        "Reported effect: roughly 300–500 ms of retrieval overhead removed from about 90% of messages — author-reported, defined above, and not independently benchmarked.",
      ],
      limitations: [
        "The latency figure is mine, not a measurement you can inspect here. It describes the retrieval step's overhead, not end-to-end response time or time-to-first-token.",
        "Answer quality after the change is not demonstrated on this page. The harness that would demonstrate it exists; its results are not presented.",
        "The internal routing is described at the boundary level only. I am not publishing the exact services or rules.",
        "Targets that existed for this path (p99 under 50 ms, time-to-first-token under 200 ms) are targets. No measurement against them is presented, so they are not published as results.",
      ],
    },
    sources: {
      title: "Sources & available artifacts",
      intro: "Step's AI code and evaluation tooling are internal. What follows is what each claim rests on.",
      items: [
        {
          kind: "owner-account",
          availability: "private",
          label: "My account of the integration and the retrieval decision",
          note: "The handler, tools and validation live in Step's private codebase.",
        },
        {
          kind: "technical-write-up",
          availability: "private",
          label: "Step Experience Master Document (§3.B, §4.4, Appendix A8, G8)",
          note: "Internal write-up including the reported latency figure and the retrieval-quality harness.",
        },
        {
          kind: "test-run",
          availability: "private",
          label: "Retrieval-quality harness results",
          note: "Not available for this write-up. This is the missing artifact behind the open question above.",
        },
      ],
      claimIds: ["step-retrieval-overhead-removed", "step-retrieval-quality-harness", "step-coach-latency-targets"],
    },
  },
  {
    id: "ai-assisted-plan-review",
    href: "/work/ai-assisted-plan-review/",
    category: "ENGINEERING TOOLING · STEP",
    title: "Testing the agents that review engineering plans.",
    lede:
      "An AI reviewer that writes convincing feedback is easy to get. One that catches the specific thing wrong with a plan is not. This is about testing the difference — turning review failures into cases that fail until the reviewer actually improves.",
    metaTitle: "Testing the agents that review engineering plans · Andrei Tekhtelev",
    metaDescription:
      "Engineering tooling case study: a structured review protocol for AI-assisted plans, regression cases built from real review failures, and what a recorded eval run actually returned.",
    context: [
      { label: "Context", value: "Engineering tooling I built for my own AI-assisted development work at Step" },
      { label: "My role", value: "Review protocol, reusable skills, evaluation cases and verification rules. Individual work." },
      sharedContextNote,
    ],
    problem: {
      title: "Problem",
      body: [
        "When a plan is written with AI help, the fastest way to check it is to have AI review it. The reviews come back fluent, organised and confident. That is the problem: fluency is not the same as catching what is wrong, and a confident review of a flawed plan is worse than no review, because it ends the conversation.",
        "The failures were specific and they repeated. A review would accept a git object that did not exist. It would accept a stated cause with nothing establishing it. It would pass a plan whose steps contradicted each other. It would report a step as done when nothing had confirmed it.",
        "Each time, the tempting fix is to add a line to the prompt — \"verify that referenced commits exist\". That produces an untested rule, and a set of untested rules that nobody can tell apart from prompt decoration. What was missing was not more instruction. It was a way to know whether a reviewer catches a given class of mistake, and to notice when it stops catching it.",
      ],
    },
    role: {
      title: "My role",
      intro: "This was my own tooling for my own workflow, so the split is between building and judging.",
      items: [
        { kind: "implemented", text: "Built the review protocol: the passes a plan goes through, and what each pass is expected to produce." },
        { kind: "implemented", text: "Built the reusable skills that carry those passes, so a review is repeatable instead of improvised per plan." },
        { kind: "implemented", text: "Built the evaluation cases from real review failures, each pairing a plan with the finding a reviewer is supposed to raise." },
        { kind: "led", text: "Defined expected behaviour case by case — deciding what counts as catching the issue, which is the judgement the harness cannot make for me." },
        { kind: "led", text: "Reviewed and accepted or rejected each change to a skill, and kept the rule that a change is not done until the case that motivated it is re-run." },
      ],
    },
    decision: {
      title: "Key decision",
      body: [
        "Turn recurring review failures into regression cases instead of adding untested prompt rules.",
        "A prompt rule is cheap to write and impossible to evaluate. Once there are a dozen, nobody knows which ones still matter, which ones conflict, and which were never doing anything. Worse, the rule usually gets added right after the failure it was written for — so it looks effective precisely because nobody tests it.",
        "A case is more expensive. It needs a plan, an expected finding, and a judgement about what counts as catching it. In exchange it can fail. When a skill changes, the cases say whether the thing that was broken is now caught, and whether something that used to be caught no longer is.",
        "The operating rule that comes with it: if a plan needs more than two review cycles to converge, that is a signal to add a case. It is a rule about when to invest in a case — not a claim that plans now converge in two cycles.",
      ],
    },
    howItWorks: {
      title: "How it works",
      intro:
        "The loop below is the one that turns a failure into a case. The example in it is a real recurring failure class from my own reviews — a reviewer accepting a reference to a git object that does not exist — not a fabricated production incident.",
      flow: [
        { id: "01", title: "A plan with a known defect", detail: "A plan that references a specific commit as the basis for a change." },
        { id: "02", title: "Expected flag", detail: "The reviewer should report that the reference cannot be confirmed — the object is not there to check against." },
        { id: "03", title: "Actual reviewer response", detail: "The review accepted the reference and assessed the rest of the plan on top of it, which read as a clean review." },
        { id: "04", title: "The gap, named", detail: "The reviewer had no step that required confirming a referenced object against the repository before reasoning from it." },
        { id: "05", title: "Skill change", detail: "The validation pass was changed to require that referenced objects be confirmed, and to report an unconfirmable reference as a finding." },
        { id: "06", title: "Re-check", detail: "The case is run again. It only counts as fixed when the expected finding is raised — and the other cases are run to see what the change cost." },
      ],
      flowCaption:
        "Plan → expected flag → actual response → named gap → skill change → re-check. The human steps are 02 and 04: deciding what should have been caught, and naming why it was not. The harness cannot do those.",
      narrative: [
        "The point of writing the expected flag before looking at the response is that it is the only order in which the test means anything. Reading the review first and then deciding whether it was good enough is not a check — it is agreement.",
        "Step 06 is the one that makes it a regression case rather than a bug fix. A change that fixes one case and breaks two is a common outcome with prompt-driven tooling, and the only way to see it is to re-run the rest.",
      ],
      disclosures: [
        {
          summary: "The five reviewer roles, and what each one has to produce",
          body: [
            "Codebase Validator — asks whether the plan's claims about the code are true. Input: the plan plus the repository. Expected confirmation: every referenced file, symbol and object either confirmed against the codebase or reported as unconfirmable.",
            "Architecture & Risk Reviewer — asks what this design costs and where it breaks. Input: the plan plus the surrounding system. Expected confirmation: named risks and affected boundaries, not a general approval.",
            "Modern Practices Researcher — asks whether the approach is current for the libraries and platform in use. Input: the plan plus the actual dependency versions. Expected confirmation: a practice cited against the version in use, not from memory.",
            "Premise Adversarial Validator — asks whether the stated reason for the work is established. Input: the plan's premises and whatever is offered as support. Expected confirmation: each premise marked as supported or unsupported, with the unsupported ones named.",
            "Execution Validator — asks whether what was reported as done is actually done. Input: the plan's status claims plus the evidence for them. Expected confirmation: each completed step tied to something that shows it, or flagged as unconfirmed.",
            "Five passes, each with a different question, so that a plan is not reviewed five times from the same angle. This is a description of a process I run, not an autonomous system that runs itself.",
          ],
        },
        {
          summary: "Cross-model review, and what it does not give you",
          body: [
            "Running a review through a different model is an additional source of criticism. Different training and different habits mean it sometimes objects where the first reviewer did not, which is useful.",
            "What it does not do is guarantee independence. Models trained on overlapping data share blind spots, so two reviewers can miss the same thing for the same reason and produce agreement that looks like confirmation. Agreement between agents is not evidence of correctness — it is the absence of one kind of disagreement. The cases exist precisely because agreement cannot be trusted as a verdict.",
          ],
        },
      ],
    },
    verification: {
      title: "Verification",
      intro:
        "The eval set is 11 cases. The run below is the recorded result I have, reported as it came out — not as a pass rate.",
      checks: [
        {
          status: "documented",
          title: "11 regression cases built from real review failures",
          detail:
            "The size of the set. Each case pairs a plan with the finding a reviewer is expected to raise. A set of 11 cases is not 11 passing checks.",
          claimId: "agent-eval-case-count",
        },
        {
          status: "historical-run",
          title: "Recorded run, 2026-05-28: 6 pass, 2 fail, 2 partial, 1 fixture defect",
          detail:
            "The outcomes of one execution of the set on that date. 'Partial' means the reviewer raised the issue but missed part of the expected finding. 'Fixture defect' means the case itself was wrong — the expected behaviour was mis-specified, so the result said nothing about the reviewer.",
          claimId: "agent-eval-run-2026-05-28",
        },
        {
          status: "not-run",
          title: "A later full run of the eval set",
          detail:
            "Not presented. I am not showing a subsequent run with a skill version, model and report attached, so the 2026-05-28 result stands as the last one published here. The failing and partial cases should be assumed still open.",
        },
        {
          status: "documented",
          title: "Operating rule: more than two review cycles means add a case",
          detail:
            "A rule about when to invest in a new case. It is not evidence that plans now converge within two cycles, and no cycle-count measurement is published here.",
        },
      ],
    },
    outcome: {
      title: "Outcome & limitations",
      results: [
        "Review became a defined protocol with five passes, each with its own question and its own expected form of confirmation, instead of one general request for feedback.",
        "Recurring failures became cases that can fail, so a change to a skill can be checked rather than believed.",
        "One concrete example is documented end to end above: a reviewer accepting an unconfirmable git reference, the missing validation step, the skill change and the re-check.",
        "The recorded run is published as it came out — 6 pass, 2 fail, 2 partial, 1 fixture defect — including the case that was wrong itself.",
      ],
      limitations: [
        "This is an engineering process I run, not an autonomous review runtime. The judgement about what should have been caught is mine, case by case.",
        "The last run I can point at is from 2026-05-28 and it was not all green. No later full run is presented, so the open cases stay open here.",
        "Cross-model review adds criticism, not independence. Agreement between reviewers is not proof that a plan is sound.",
        "The skills, cases and run logs are my own working files and are not published on this site, so the run result is my report of it rather than an artifact you can open.",
      ],
    },
    sources: {
      title: "Sources & available artifacts",
      intro: "This tooling is my own working setup. What each claim rests on:",
      items: [
        {
          kind: "owner-account",
          availability: "private",
          label: "The review skills and their revision history",
          note: "My own working files. Not published here; they contain project-specific paths and operational detail.",
        },
        {
          kind: "test-run",
          availability: "private",
          label: "Eval run log, 2026-05-28",
          note: "The source of the 6 / 2 / 2 / 1 breakdown. Reported here, not published as a file.",
        },
        {
          kind: "technical-write-up",
          availability: "private",
          label: "Step Experience Master Document (§3.K, §4.9, Appendix G2–G5)",
          note: "Internal write-up of the protocol, the five roles and the eval set.",
        },
        {
          kind: "source-code",
          availability: "public",
          label: "This portfolio's own evidence tooling",
          note: "The same idea, at a smaller scale and in the open: this site validates its approved content and runs grounding evals in its own checks.",
          href: "https://github.com/Androkzn/interactive-portfolio-ai-guide",
        },
      ],
      claimIds: ["agent-eval-case-count", "agent-eval-run-2026-05-28", "agent-review-roles"],
    },
  },
];

export function caseStudyById(id: CaseStudyId): CaseStudy {
  const study = caseStudies.find((item) => item.id === id);
  if (!study) throw new Error(`Unknown case study: ${id}`);
  return study;
}

/** Human-readable labels. Status is never communicated by colour alone. */
export const checkStatusLabels: Record<CheckStatus, string> = {
  automated: "Automated check",
  documented: "Documented",
  "historical-run": "Historical run",
  "not-run": "Not presented",
  "open-question": "Open question",
};

export const roleKindLabels: Record<RoleKind, string> = {
  implemented: "I implemented",
  led: "I proposed / led",
  team: "We shipped",
};

export const sourceKindLabels: Record<SourceItem["kind"], string> = {
  "source-code": "Source code",
  "test-run": "Test run",
  "technical-write-up": "Technical write-up",
  "owner-account": "My own account",
};

export const sourceAvailabilityLabels: Record<SourceItem["availability"], string> = {
  public: "Public",
  private: "Not public",
  "on-request": "On request",
};

export const verificationStatusLabels: Record<VerificationStatus, string> = {
  "author-reported": "Author-reported",
  "source-inspected": "Source-inspected",
  "runtime-verified": "Runtime-verified",
  "target-planned": "Target / planned",
};
