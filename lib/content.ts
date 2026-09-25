export type Viewport = "phone" | "tablet" | "desktop";
export type DevicePreview = "iphone" | "ipad" | "android" | "desktop";
export type GuideMode = "explore" | "tour" | "interview";

export type ScreenInsight = {
  id: string;
  route: string;
  match: string[];
  label: string;
  title: string;
  summary: string;
  challenge: { title: string; body: string };
  decision: { title: string; body: string };
  solution: { title: string; body: string };
  impact?: { title: string; body: string };
  implementation: string;
  stack: string[];
  sourceTrace: string;
};

export type Project = {
  id: string;
  number: string;
  name: string;
  eyebrow: string;
  summary: string;
  discipline: string;
  color: string;
  accent: string;
  originalPlatforms: string[];
  runtimeLabel: string;
  webPreviewUrl?: string;
  status: "source verified" | "pilot";
  sourceRepository?: string;
  scenario: { title: string; description: string; action: string };
  checkpoints: { title: string; detail: string }[];
  challenge: { title: string; body: string };
  evidence: { label: string; type: string; detail: string }[];
  screenInsights: ScreenInsight[];
};

export const projects: Project[] = [
  {
    id: "symply-house",
    number: "00",
    name: "Symply House",
    eyebrow: "Production app · home management",
    summary: "A home-management product that turns household context into calm, actionable routines.",
    discipline: "Product platform",
    color: "#ff9d66",
    accent: "orange",
    originalPlatforms: ["iPhone", "iPad", "Android", "Web"],
    runtimeLabel: "Connected Expo Web build · shared demo login · synthetic in-tab household",
    webPreviewUrl: "https://symply-house-web-portfolio.pages.dev/?portfolioDemo=1",
    status: "source verified",
    scenario: { title: "Review a home task", description: "Open the live household flow from context to a clear next action.", action: "Start home flow" },
    checkpoints: [
      { title: "Context before chores", detail: "Make the next household action legible without turning the home surface into a noisy task list." },
      { title: "Shared responsibility", detail: "Represent ownership and timing as product state that can survive multiple people and platforms." },
      { title: "Authenticated completion", detail: "The app pre-fills a shared demo login from a flag it reads off its own URL, and you submit it yourself — a real production authentication call. The account is public; the household behind it is synthetic, editable and lives only in this tab." },
    ],
    challenge: { title: "Keep a shared home calm and useful", body: "The portfolio opens the normal authenticated product. The app itself reads a demo flag off its own URL and pre-fills a shared demo login for the visitor to submit; the portfolio no longer carries those credentials, but the app's own public bundle does, so the account stays public. Sign-in is a real request against the production API, while the address, home photo, floor plan, renovation projects, budgets and tasks are synthetic, editable records that live only in that browser tab and are never persisted or synced." },
    evidence: [
      { label: "What you can inspect", type: "runtime", detail: "The running app itself, embedded on this page — the real build against its production API, explored from here." },
      { label: "Platform matrix", type: "runtime", detail: "iPhone · iPad · Android · Web, based on the connected Expo source." },
      { label: "Live boundary", type: "runtime", detail: "A shared demo account signs in against the production API. The portfolio ships no credentials: the app reads a demo flag off its own URL and pre-fills the login itself, and the same credentials sit in that app's public bundle, so the account remains public. The household content is synthetic, editable, confined to the visitor's browser tab and never persisted or synced, so no personal or production household is exposed." },
    ],
    screenInsights: [
      {
        id: "house-login", route: "/login", match: ["/login", "login"], label: "OFFLINE-FIRST / PRIVACY", title: "Keep the home useful offline",
        summary: "Household tasks, plans and notes stay useful when the connection drops. Local-first state lets people browse and update the home offline, then sync deliberately when the network returns.",
        challenge: { title: "Keep a shared home usable without a connection", body: "Wi-Fi is not guaranteed when someone is checking a task, opening a project or reviewing a floor plan. The app should keep the household workflow available offline while keeping private home data inside its account and device boundary." },
        decision: { title: "Make the device the first place data lives", body: "Read and write the working household state locally, queue changes when offline and make sync status explicit. For the portfolio, sign in with a shared public demo account — pre-filled by the app from a flag in its own URL, not by the portfolio — and keep the synthetic content in that browser tab alone, so no personal household records are exposed." },
        solution: { title: "Offline workflows with controlled sync", body: "The app stays navigable and actionable without a network, then reconciles account-scoped changes when connectivity returns. The backend supports sync and identity; it does not turn the public portfolio into a window onto private homes." },
        impact: { title: "The workflow survives the network", body: "People can check plans and update household work offline, then reconcile changes when connected. The result is a calmer, more private product boundary: local work first, controlled sync second." },
        implementation: "local household store + queued mutations + visible sync state + origin-checked guest bridge",
        stack: ["Expo Router", "React Native", "Local-first sync", "Worker auth"], sourceTrace: "src/screens/auth/LoginScreen.tsx · src/stores/ · app/_layout.tsx · src/services/portfolio-demo.ts (shared Symply brand monorepo)",
      },
      {
        id: "house-home", route: "/", match: ["/", "home"], label: "HOME / DASHBOARD", title: "Turn household context into the next useful action",
        summary: "Home compresses tasks, projects, budget signals and household status into a calm decision surface instead of a feature directory.",
        challenge: { title: "Coordinate many domains without creating noise", body: "A shared home can contain overdue tasks, active renovations, quotes, reminders and account state at the same time. The screen has to prioritize attention without losing context." },
        decision: { title: "Rank exceptions before inventory", body: "Lead with attention cards and the next action, then let deeper cards open the relevant workflow. The dashboard is a router for decisions, not a dump of every record." },
        solution: { title: "Compose domain cards around shared state", body: "Home-specific cards reuse typed task, project and budget data while keeping each destination independently navigable and testable." },
        implementation: "Dashboard hook + focused card components + household-scoped stores and sync status",
        stack: ["Expo Router", "React Query", "Zustand", "Local-first sync"], sourceTrace: "src/screens/main/HomeScreen.tsx · src/hooks/useHomeDashboard.ts · src/components/home/",
      },
      {
        id: "house-projects", route: "/projects", match: ["projects", "home-project"], label: "PROJECTS / PLAN", title: "Keep a renovation plan connected to reality",
        summary: "Projects turn an ambiguous home improvement idea into scope, materials, tasks, budget and an observable next step.",
        challenge: { title: "Prevent a project from becoming another disconnected list", body: "The useful unit is not a title and a due date. It is the relationship between a space, a phase, materials, spend and the people responsible for moving it forward." },
        decision: { title: "Model the relationships before styling the card", body: "Use shared contracts for projects, linked tasks, materials and access. That makes the UI readable because each card can explain where its state came from." },
        solution: { title: "A hub that exposes progressive detail", body: "The list stays scannable, while the project hub and its surfaces let a visitor move from overview to a concrete task without losing the original context." },
        implementation: "Typed domain contracts + nested project navigator + independently testable surfaces",
        stack: ["TypeScript contracts", "Expo Router", "React Native", "Shared API"], sourceTrace: "src/screens/home-projects/ · packages/contracts/src/home-project* · src/navigation/HomeProjectsNavigator.tsx",
      },
      {
        id: "house-tasks", route: "/tasks", match: ["tasks", "task"], label: "TASKS / EXECUTION", title: "Make shared responsibility operational",
        summary: "Tasks are where household context becomes an action someone can own, filter, update and complete.",
        challenge: { title: "Keep personal and shared work legible", body: "A task board must support ownership, due state, groups, search and completion while remaining usable on a phone, tablet and Web layout." },
        decision: { title: "Treat filters and views as product state", body: "List/board mode, mine/personal filters and hide-done behavior are explicit controls, not accidental query-string behavior. The same task entity drives each view." },
        solution: { title: "Fast scanning with a safe detail path", body: "The board handles the overview; task detail owns edits, subtasks, blockers, assignees and completion so destructive or consequential actions have room to be understood." },
        implementation: "Task store + filter controls + detail stack + calendar/notification boundaries",
        stack: ["Zustand", "React Native Gesture Handler", "Typed task contracts", "E2E flows"], sourceTrace: "src/screens/tasks/TasksScreen.tsx · src/components/tasks/ · src/stores/taskStore.ts",
      },
      {
        id: "house-floor-plan", route: "/floor-plans", match: ["floor-plan", "floor-plans", "my-home"], label: "FLOOR PLAN / SPACE", title: "Give spatial data a useful interaction model",
        summary: "The floor-plan flow makes the home a navigable surface, so a project or task can be understood in the room where it belongs.",
        challenge: { title: "Translate a spatial model into one shared surface", body: "A floor plan needs viewing, zone context and marker placement without assuming the interaction affordances of only one native platform." },
        decision: { title: "Separate the viewer from editing tools", body: "Keep read-heavy spatial browsing lightweight, then open focused placement and area-edit flows only when the member intends to change the model." },
        solution: { title: "Progressive spatial detail", body: "The picker, viewer and marker surfaces form one route, while local APIs and a shared model keep the same property context available to projects and tasks." },
        implementation: "Floor-plan navigator + canvas surfaces + local API boundary + responsive device shell",
        stack: ["Expo Router", "RoomPlan", "Canvas surface", "Local data"], sourceTrace: "src/screens/floor-plans/ · src/components/floor-plans/ · src/api/floor-plans.ts",
      },
    ],
  },
  {
    id: "hoc-v2",
    number: "01",
    name: "House of Commons Citizen Companion",
    eyebrow: "Production app · civic product",
    summary: "A civic information product that turns parliamentary data into plain-language, accessible decisions.",
    discipline: "Civic information",
    color: "#83b8ff",
    accent: "blue",
    originalPlatforms: ["iPhone", "iPad", "Android", "Web"],
    runtimeLabel: "Connected Vite Web build · production public API",
    webPreviewUrl: "https://hoc-v2-web.pages.dev/",
    status: "source verified",
    scenario: { title: "Follow a parliamentary decision", description: "Inspect the live civic-information flow from a question to a clear, accessible next action.", action: "Start civic flow" },
    checkpoints: [
      { title: "Plain-language context", detail: "Start with what the person needs to understand, not with a data source or feature list." },
      { title: "Evidence stays visible", detail: "Expose provenance and uncertainty beside the explanation so trust is part of the interface." },
      { title: "Accessible next action", detail: "End with a useful decision path that works across mobile and Web layouts." },
    ],
    challenge: { title: "Make public data usable without flattening it", body: "The live Web build calls the deployed public API for parliamentary and location data. Optional account features use the deployed auth Worker; the public portfolio does not impersonate a user." },
    evidence: [
      { label: "What you can inspect", type: "runtime", detail: "The running app itself, embedded on this page — the real build against its production API, explored from here." },
      { label: "Platform matrix", type: "runtime", detail: "iPhone · iPad · Android · Web, based on native configuration and the Vite Web entrypoint." },
      { label: "Live boundary", type: "runtime", detail: "Production public API; account and saved-preference actions remain user-initiated." },
    ],
    screenInsights: [
      {
        id: "civic-home", route: "/", match: ["/", "home"], label: "HOME / FIND MY MP", title: "Start with the citizen's question",
        summary: "The home screen treats a postal code as the primary entry point, then turns a location lookup into a legible representative and activity overview.",
        challenge: { title: "Make civic data approachable without making it shallow", body: "People should not need to understand parliamentary data models, API vocabulary or constituency boundaries before they can find a useful answer." },
        decision: { title: "Ask for the smallest meaningful input", body: "Postal-code search is the main action; auto-location stays secondary. The interface explains what is being looked up and keeps provenance close to the result." },
        solution: { title: "Progressive disclosure from place to person", body: "The home flow starts simple, then reveals representative cards, activity and optional detail. It preserves the user's question as the navigation context." },
        implementation: "Postal-code validation + location fallback + public API services + accessible result cards",
        stack: ["Vite", "React Native Web", "Cloudflare Worker API", "Accessibility tokens"], sourceTrace: "src/screens/HomeScreen.tsx · src/services/api/ · src/services/locationService.ts",
      },
      {
        id: "civic-parliament", route: "/parliament", match: ["parliament", "following"], label: "PARLIAMENT / FEED", title: "Keep evidence visible while the feed stays readable",
        summary: "The civic feed turns parliamentary activity into a plain-language scan without hiding the source data behind a black-box summary.",
        challenge: { title: "Balance density, uncertainty and attention", body: "Bills, debates and activity have different shapes and statuses. A feed that treats them as identical cards loses meaning; a raw data table loses people." },
        decision: { title: "Use plain language as a layer, not a replacement", body: "Keep the underlying activity type, date and official link available beside the explanation. The user can scan first and inspect the source when it matters." },
        solution: { title: "Structured cards with explicit next actions", body: "Activity cards, timeline components and report-inaccuracy affordances make interpretation visible and give the user a route to verify or act." },
        implementation: "Typed activity models + official URL helpers + localized a11y copy + loading/error states",
        stack: ["TypeScript", "Public Parliament APIs", "i18n", "Screen-reader strings"], sourceTrace: "src/screens/ParliamentScreen.tsx · src/components/plain-language/ · src/i18n/a11y/",
      },
      {
        id: "civic-mp-detail", route: "/mp/:id", match: ["mp/", "member", "representative"], label: "MP DETAIL / EVIDENCE", title: "Make performance data inspectable",
        summary: "The representative detail screen turns a single MP into a layered record: identity, activity, metrics, official links and a path to contact them.",
        challenge: { title: "Show a score without pretending it is the whole person", body: "Ratings can be useful orientation, but they need definitions, source activity and the ability to inspect the underlying evidence." },
        decision: { title: "Separate summary, metrics and raw activity", body: "The screen uses tabs and expandable metrics so a visitor can choose the depth they need instead of forcing every number into the first viewport." },
        solution: { title: "Explain the score at the point of use", body: "Accessible labels, contrast-checked score bands, refresh/error states and official contact actions keep the summary useful without hiding uncertainty." },
        implementation: "Metrics service + cached image path + refresh cooldown + focus and announcement helpers",
        stack: ["React Native", "Cloudflare API", "WCAG contrast checks", "Accessible tabs"], sourceTrace: "src/screens/MPDetailScreen.tsx · src/components/metrics/ · src/services/api/metricsService.ts",
      },
      {
        id: "civic-bills", route: "/bills", match: ["bill"], label: "BILLS / LIFECYCLE", title: "Turn a bill into a decision path",
        summary: "The bills surface gives a visitor a way to move from title and status to stages, sponsors, votes and the official record.",
        challenge: { title: "Respect a complex lifecycle in a small screen", body: "A bill can have multiple stages, chambers, votes, dates and missing fields. Flattening it into one status badge is fast but misleading." },
        decision: { title: "Make progression and provenance first-class", body: "Timeline and detail components show what is known, where it came from and which next action is available instead of inventing certainty." },
        solution: { title: "Layered detail with resilient API states", body: "The list is scannable, while BillDetail exposes the lifecycle, participation and official links with explicit loading and error paths." },
        implementation: "Bill API service + timeline model + defensive empty/error states + official URL helpers",
        stack: ["Vite", "Legisinfo JSON", "Typed bill models", "Responsive RN Web"], sourceTrace: "src/screens/BillsScreen.tsx · src/screens/BillDetailScreen.tsx · src/types/bill.ts",
      },
      {
        id: "civic-login", route: "/login", match: ["/login", "login"], label: "AUTH / ENTRY", title: "Keep public value independent from account pressure",
        summary: "The civic product can answer the public question first; account features are an explicit extension, not a gate in front of the core experience.",
        challenge: { title: "Support account features without blocking discovery", body: "Saved representatives and subscriptions need identity, but a visitor should be able to understand the product and public data before committing to an account." },
        decision: { title: "Separate public and account scopes", body: "The live portfolio opens the public civic flow without impersonating a user. Authenticated actions remain user-initiated and visibly distinct." },
        solution: { title: "A clear boundary around optional persistence", body: "Public data remains useful in an unauthenticated session while login, subscription and saved actions use the normal auth and account surfaces." },
        implementation: "Public API boundary + shared auth surface + explicit account-required modal paths",
        stack: ["Expo", "React Native Web", "Worker auth", "Account boundary"], sourceTrace: "src/screens/LoginScreen.tsx · src/components/AccountRequiredModal.tsx · src/context/AuthContext.tsx",
      },
    ],
  },
  {
    id: "symply-health",
    number: "02",
    name: "Symply Health",
    eyebrow: "Native app · privacy-first health tracking",
    summary: "A privacy-first health tracker built on a read-only HealthKit import and offline-safe edits.",
    discipline: "Health product",
    color: "#ff8a8a",
    accent: "coral",
    originalPlatforms: ["iPhone", "iPad", "Android", "Apple Watch"],
    runtimeLabel: "Native iOS and Android build · no Web target, so no embedded preview",
    status: "pilot",
    scenario: { title: "Trace a safety decision", description: "Follow one coach message from arrival to the deterministic check that runs before any model sees it.", action: "Read the teardown" },
    checkpoints: [
      { title: "Read-only at the source", detail: "The HealthKit module asks for read scopes and never for permission to share, so the app cannot write back into a person's health record." },
      { title: "One person, several devices", detail: "A household here is one user with several devices rather than a family, and the backend refuses a second account outright." },
      { title: "No embedded preview", detail: "This app has no Web build, so the portfolio does not frame one and does not mock one in its place." },
    ],
    challenge: { title: "Keep health data private while the device still does the work", body: "Health data is the most sensitive category the ecosystem touches. The app imports it read-only, keeps the working state on the device, and treats the safety-critical checks as something that must not depend on a model behaving well." },
    evidence: [
      { label: "What you can inspect", type: "verified", detail: "The teardown on this page. This app ships to iOS and Android only, so there is no Web build to embed and explore from here." },
      { label: "Platform matrix", type: "runtime", detail: "iPhone · iPad · Android · Apple Watch, plus an iOS home-screen widget. There is no Web build, which is why this project has no embedded preview." },
      { label: "Verification boundary", type: "verified", detail: "166 test files are authored under the health feature and 81 single-device Maestro flows exist; a generated matrix puts end-to-end element coverage at 48% and calls that figure a floor rather than a score. These are authored counts — I did not execute them for this write-up, so they are not a passing run. The 25 two-device sync flows have never been run at all." },
    ],
    screenInsights: [
      {
        id: "health-coach", route: "/coach", match: ["/coach", "/login"], label: "SAFETY / APPLIED AI", title: "A safety layer that only ran when the AI was switched off",
        summary: "The deterministic escalation check now runs first, on every message, before any token leaves the server — because in the version this was ported from it ran only on the fallback path.",
        challenge: { title: "The guardrail was dead exactly where it mattered", body: "The clinical-escalation matcher lived inside the fallback turn processor. The model tool-loop was tried first, so on every account that actually had AI configured the matcher was never reached. A person typing that they have chest pain and cannot breathe went straight to a model whose only guardrail was a prompt line asking it not to give medical advice." },
        decision: { title: "Check before the model, not instead of it", body: "Run the matcher on every turn ahead of entitlement resolution and ahead of any network call. A matched turn costs nothing, calls no model and returns escalation text. Keep it a pattern match rather than a prompt instruction: a prompt can be argued with, out-competed by a later instruction, or simply not followed on an unlucky sample." },
        solution: { title: "A gate that cannot be skipped or talked around", body: "Matching happens in the service rather than only in the router, so no future caller can route around it. Word boundaries were added during the port — the original matched bare substrings, so a food named after a drug overdose and the phrase “I want to die down the stairs less often” both tripped the emergency notice. Every escalation message states plainly that help has not been contacted." },
        impact: { title: "Verified by the absence of a call", body: "The pinning test asserts not just the escalation text but that the provider received zero calls and no health row was read. An age gate that could not be enforced — the platform stores no date of birth — was deliberately left unported and recorded as open rather than faked, because a gate that always fires is not a gate." },
        implementation: "Deterministic escalation matcher ahead of the model call, enforced in the service layer and pinned by a zero-provider-call test",
        stack: ["Cloudflare Worker", "Anthropic (bring-your-own-key)", "Deterministic matcher", "Vitest"], sourceTrace: "backend/src/services/health-ai/coach-safety.ts · backend/src/services/health-ai/__tests__/",
      },
      {
        id: "health-import", route: "/", match: ["/import", "/dashboard"], label: "NATIVE / HEALTHKIT", title: "Import health data without being able to change it",
        summary: "A custom native module imports a scoped set of health types in the background, and is built so the app has no capability to write anything back.",
        challenge: { title: "Background health import without a polling loop", body: "Health data arrives whenever the person moves, sleeps or syncs a device, not when the app is open. Polling would drain the battery and still be late, and a naive background task would re-read everything each time it woke." },
        decision: { title: "Observe, then read only what changed", body: "An observer query per scoped type enables immediate background delivery. On wake, an anchored query with a persisted anchor asks whether anything actually changed before any work happens." },
        solution: { title: "Read-only by construction, and scoped per brand", body: "Authorisation requests read types and passes an empty share set, so writing back is not a policy but an absent capability. Because several sibling apps share one native project, the health entitlement lives in its own entitlement pair — otherwise four unrelated apps would ask people for access to their health data." },
        implementation: "Custom Expo native module: observer queries, background delivery, anchored incremental reads with a persisted anchor",
        stack: ["Swift", "HealthKit", "Expo native module", "React Native"], sourceTrace: "modules/symply-healthkit/ios/ · src/features/health/healthKitBackgroundSync.ts",
      },
      {
        id: "health-outbox", route: "/sync", match: ["/sync", "/other-device"], label: "OFFLINE / DATA LOSS", title: "The offline promise was not true until the outbox existed",
        summary: "Every screen implied edits were safe offline while the push endpoint had no caller at all, so the first successful read replaced unsynced work with the server's older copy.",
        challenge: { title: "Silent loss, not a visible failure", body: "The push route had been deployed for a whole phase with nothing calling it. Nothing errored: a member edited offline, the app later read from the server, and the older copy won. The work disappeared without a message." },
        decision: { title: "Queue what the caller can describe", body: "Writes opt into the outbox per store rather than globally, because a write is an opaque closure and the repository cannot queue an operation it has not been told the shape of. Opting in is explicit, so an unqueued write is a visible omission rather than a silent assumption." },
        solution: { title: "Every verdict is final", body: "Applied, unchanged, stale, tombstoned, forbidden and invalid all remove the row from the outbox. Only a request that never reached the server keeps its rows, and the queue is capped, so a failing device cannot accumulate work forever." },
        implementation: "Read-through cache over a dedicated Worker, with an opt-in write outbox and terminal push verdicts",
        stack: ["React Native", "MMKV", "Cloudflare Worker", "D1"], sourceTrace: "src/features/health/healthRepository.ts",
      },
      {
        id: "health-reminders", route: "/reminders", match: ["/reminders", "/habits"], label: "PLATFORM LIMITS", title: "Sixty-four notification slots, allocated on purpose",
        summary: "iOS keeps only the soonest sixty-four pending notifications and silently drops the rest, so the reminder budget is written down as a named allocation instead of being discovered in production.",
        challenge: { title: "A limit that fails quietly", body: "Nothing errors when the limit is passed — the extra reminders simply never arrive. With daily reminders a slot is really a statement about how many days ahead a feature can promise, and two features each sizing themselves independently is exactly how the total slips past the cap unnoticed." },
        decision: { title: "Spend fewer than the platform allows", body: "Allocate fifty-six rather than sixty-four, holding the remainder for retries and for the modules that share the app. Give each feature a named allowance, and record reserved-but-unspent allocations so a future feature cannot quietly assume the headroom is free." },
        solution: { title: "A standalone table someone can read", body: "The allocation lives in its own small module rather than inside the reminder engine, so the next person can check their allowance without importing the scheduler or reverse-engineering the arithmetic." },
        implementation: "A named per-feature notification slot budget kept deliberately below the platform ceiling",
        stack: ["React Native", "Expo Notifications", "iOS"], sourceTrace: "src/features/health/local/reminders/slotBudget.ts",
      },
    ],
  },
  {
    id: "symply-budget",
    number: "03",
    name: "Symply Budget",
    eyebrow: "Production app · local-first finance",
    summary: "A native-first budgeting product with local-first data, privacy-aware integrations and a Cloudflare Worker backend.",
    discipline: "Financial product",
    color: "#d4ff4f",
    accent: "lime",
    originalPlatforms: ["iPhone", "iPad", "Android", "Web"],
    runtimeLabel: "Connected Expo Web build · shared demo login · synthetic in-tab ledger",
    webPreviewUrl: "https://symply-budget-web-portfolio.pages.dev/?portfolioDemo=1",
    status: "source verified",
    scenario: { title: "Review a household budget", description: "Open the live budgeting flow from context to a safe, inspectable decision.", action: "Start budget flow" },
    checkpoints: [
      { title: "Local-first state", detail: "Keep the core budgeting experience useful while making sync and recovery explicit system boundaries." },
      { title: "Financial intent", detail: "Separate an understandable household decision from integrations, permissions and provider failures." },
      { title: "Controlled handoff", detail: "The app pre-fills a shared demo login from a flag in its own URL; the portfolio ships no credentials, though the account is still public because the app's bundle carries them. You submit the sign-in against the production API, and the ledger you then browse is synthetic, editable and lives only in this tab." },
    ],
    challenge: { title: "Design for trust when data is personal", body: "The Web build keeps the normal authenticated product flow. The app pre-fills a shared demo login from a flag it reads off its own URL and the visitor submits it, so the interface, navigation and authentication remain real while every figure on screen is synthetic and editable, held in that browser tab, never synced, and personal financial data stays out of scope." },
    evidence: [
      { label: "What you can inspect", type: "runtime", detail: "The running app itself, embedded on this page — the real build against its production API, explored from here." },
      { label: "Native matrix", type: "runtime", detail: "iPhone · iPad · Android, with iPad support declared in the Expo configuration." },
      { label: "Live boundary", type: "runtime", detail: "The demo login is a real production account and still a public one, because its credentials sit in the app's own public bundle; the portfolio no longer ships them, and the app pre-fills the form from a flag it reads off its own URL. The budget data is synthetic, editable, confined to the visitor's browser tab and never persisted or synced, so no personal financial identity or production record is exposed." },
    ],
    screenInsights: [
      {
        id: "budget-login", route: "/login", match: ["/login", "login"], label: "LOCAL-FIRST / PRIVACY", title: "Local Device-First Strategy",
        summary: "Financial data stays on the device by default. The backend is intentionally small: authentication, encrypted sync and recovery are explicit boundaries—not the place where every budget decision happens.",
        challenge: { title: "Keep personal finance private by default", body: "Sending a full household ledger to a server increases exposure and makes privacy depend on every integration. The core budget should stay useful even when the network is unavailable." },
        decision: { title: "Keep the ledger local, sync only what is needed", body: "Use encrypted local storage as the source of truth. The backend handles identity, bounded deltas and recovery—not every read, edit or calculation." },
        solution: { title: "Minimal backend, explicit trust boundary", body: "The app calculates and reads the budget locally, then shares only the data needed for multi-device sync or backup. Fewer server responsibilities mean less data exposed and clearer recovery paths." },
        impact: { title: "Less data exposed, clearer recovery", body: "The device keeps the budget responsive offline while the backend carries only the narrow responsibilities needed for identity, sync and recovery. That reduces the privacy surface and makes failure modes easier to reason about." },
        implementation: "encrypted SQLite ledger + local projections + minimal Worker sync/auth/recovery boundary",
        stack: ["Expo SQLite", "AEAD encryption", "Local-first ledger", "Cloudflare Worker"], sourceTrace: "packages/local-first/src/ · src/features/budget/local/ · src/features/budget/local/sync/",
      },
      {
        id: "budget-overview", route: "/", match: ["/", "budget"], label: "BUDGET / OVERVIEW", title: "Explain the number before optimizing it",
        summary: "The overview puts month state, planned, actual, remaining and forecast signals next to the actions they support.",
        challenge: { title: "Make financial state scannable without making it simplistic", body: "A single total can hide whether money is planned, spent, projected, imported or shared. The dashboard needs density with provenance." },
        decision: { title: "Use one selected month and one source of truth", body: "Home, Planning and Spending share the selected period and render from coherent domain views. Every summary card can hand the member to the detail behind it." },
        solution: { title: "A decision dashboard, not a landing page", body: "The dashboard combines compact summaries, category ranking, trend views and explicit empty/error states while keeping manual actions visible beside AI insights." },
        implementation: "Parallel data loads + coherent money identities + chart guards + widget/watch snapshot publisher",
        stack: ["TypeScript", "React Native", "TanStack Query", "Generated brand tokens"], sourceTrace: "src/screens/budget/BudgetDashboardView.tsx · src/stores/budgetStore.ts · src/features/budget/budgetSnapshot.ts",
      },
      {
        id: "budget-planning", route: "/planning", match: ["planning", "planned"], label: "PLANNING / INTENT", title: "Keep planned intent distinct from actual spend",
        summary: "Planning is where a household decides what money should do before the month turns those intentions into actual records.",
        challenge: { title: "Avoid mixing promises with facts", body: "Planned items, target dates, categories and recurring rules need to remain editable without making the member wonder whether a number has already left the account." },
        decision: { title: "Give intent its own workflow and filters", body: "Planning has its own navigator, range and sort controls, while the same category and month contracts keep it coherent with the overview." },
        solution: { title: "Scan, edit and review in place", body: "The list supports compact review and direct edits, with manual entry kept as the obvious path even when AI-assisted creation is available." },
        implementation: "BudgetNavigator section root + typed planning utilities + local ledger projection boundary",
        stack: ["Expo Router", "Zustand", "Local-first ledger", "Shared month header"], sourceTrace: "src/screens/budget/BudgetAllPlanningScreen.tsx · src/navigation/BudgetNavigator.tsx · src/features/budget/local/",
      },
      {
        id: "budget-spending", route: "/spending", match: ["spending", "expenses", "transactions"], label: "SPENDING / RECORD", title: "Make correction safer than silent certainty",
        summary: "Spending keeps fast entry close to category, date and provenance so a household can review what happened and fix it without losing the trail.",
        challenge: { title: "Support speed without turning the ledger into a black box", body: "Imported, task-linked and manually entered expenses can look similar while carrying different confidence and correction needs." },
        decision: { title: "Expose provenance beside the amount", body: "Category, source and period are part of the editing surface. The same selected month feeds dashboard totals so a correction has an observable consequence." },
        solution: { title: "Fast list, deliberate detail", body: "The spending surface makes the common action quick, but keeps review, correction and the manual path visible when an integration or extraction is uncertain." },
        implementation: "Month-scoped local API + canonical money formatting + category aggregation + focused edit form",
        stack: ["SQLite local store", "TypeScript", "Money in minor units", "Responsive lists"], sourceTrace: "src/screens/budget/BudgetSpendingsView.tsx · src/features/budget/local/savings/localSavingsApi.ts · src/utils/money.ts",
      },
      {
        id: "budget-savings", route: "/savings", match: ["savings", "projection", "goals"], label: "SAVINGS / FORECAST", title: "Treat a forecast as a model, not a promise",
        summary: "Savings makes goals, recurring commitments and year-end projection inspectable, with the method and correction path close to the estimate.",
        challenge: { title: "Make long-term numbers useful without overstating certainty", body: "Income, spending, recurring payments and projection methods can all change. The UI must distinguish current facts from scenario output." },
        decision: { title: "Keep the method and assumptions visible", body: "Projection scenarios, goals and monthly views are separate sub-tabs, while the dashboard reuses the same savings overview instead of calculating a competing number." },
        solution: { title: "Clear scenarios with manual control", body: "The member can inspect the forecast, change the underlying record and return to a coherent overview. AI can assist, but it is not the source of truth." },
        implementation: "Shared savings store + scenario projection + coherent dashboard headroom + local-first fallback",
        stack: ["Savings store", "Projection model", "Charts", "Local-first sync"], sourceTrace: "src/screens/budget/savings/ · src/features/budget/local/savings/ · src/stores/savingsStore.ts",
      },
      {
        id: "budget-settings", route: "/settings", match: ["settings", "sync", "backup", "profile"], label: "SETTINGS / TRUST", title: "Make the data boundary operable",
        summary: "Settings is where privacy, device sync, backup and account choices become understandable controls instead of hidden infrastructure.",
        challenge: { title: "Give sensitive local-first behavior a recoverable edge", body: "Offline data, device membership, sync retries, backups and provider access all fail differently. A single generic error or toggle would mislead the member." },
        decision: { title: "Separate local state, control plane and recovery", body: "The app keeps the ledger local, uses explicit sync boundaries and surfaces backup or conflict states as actions the member can inspect and resolve." },
        solution: { title: "Trust through explicit status", body: "Settings names what is on the device, what is shared, what is waiting and how to recover. That gives the financial model a safe operational boundary." },
        implementation: "Encrypted SQLite ledger + delta projection + mailbox sync + bounded conflict/retry paths",
        stack: ["Expo SQLite", "AEAD encryption", "HLC/LWW projection", "Cloudflare Worker"], sourceTrace: "packages/local-first/src/ · src/features/budget/local/sync/ · src/screens/settings/",
      },
    ],
  },
];

export const DEFAULT_PROJECT_ID = "symply-house";

export const quickPrompts = [
  "What did you personally own?",
  "What was the hardest part?",
  "How did AI help, and what did you verify?",
  "Show me the core flow",
];

export const tourSteps = [
  { title: "Start with the product question", detail: "Pick the experience that best matches the kind of work you want to inspect." },
  { title: "Try the core interaction", detail: "The app opens its real Web runtime. Where it requires a sign-in, the app itself pre-fills a shared public demo login from a flag in its own URL and you submit it yourself." },
  { title: "Inspect the trade-off", detail: "Open a challenge card to see the boundary, alternatives and what still needs verification." },
];

export function projectById(id: string) {
  return projects.find((project) => project.id === id) ?? projects[0];
}

export function screenInsightFor(project: Project, pathname: string): ScreenInsight {
  const path = pathname.toLowerCase();
  return project.screenInsights.find((insight) => insight.match.some((pattern) =>
    pattern === "/" ? path === "/" : path.includes(pattern),
  )) ?? project.screenInsights[0];
}
