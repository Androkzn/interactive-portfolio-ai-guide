export type Viewport = "phone" | "tablet" | "desktop";
export type DevicePreview = "iphone" | "ipad" | "android" | "desktop";
export type GuideMode = "explore" | "tour" | "interview";

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
};

export const projects: Project[] = [
  {
    id: "symply-house",
    number: "00",
    name: "Symply House",
    eyebrow: "Source project · home management",
    summary: "A cross-platform home-management product that turns household context into calm, actionable routines.",
    discipline: "Product platform",
    color: "#ff9d66",
    accent: "orange",
    originalPlatforms: ["iPhone", "iPad", "Android", "Web"],
    runtimeLabel: "Connected Expo Web build · authenticated guest household",
    webPreviewUrl: "https://symply-house-web.pages.dev/?portfolioDemo=1",
    status: "source verified",
    sourceRepository: "https://github.com/Androkzn/symply-house",
    scenario: { title: "Review a home task", description: "Open the live household flow from context to a clear next action.", action: "Start home flow" },
    checkpoints: [
      { title: "Context before chores", detail: "Make the next household action legible without turning the home surface into a noisy task list." },
      { title: "Shared responsibility", detail: "Represent ownership and timing as product state that can survive multiple people and platforms." },
      { title: "Authenticated completion", detail: "Sign in to the live app to inspect your household data and complete a real account-scoped action." },
    ],
    challenge: { title: "Keep a shared home calm and useful", body: "The portfolio opens the normal authenticated product with a dedicated guest household. Its address, home photo, floor plan, renovation projects, budgets and tasks are real account-scoped records created through the same production API used by the app." },
    evidence: [
      { label: "Source repository", type: "verified", detail: "Androkzn/symply-house · public source project." },
      { label: "Platform matrix", type: "runtime", detail: "iPhone · iPad · Android · Web, based on the connected Expo source." },
      { label: "Live boundary", type: "runtime", detail: "A dedicated guest account contains synthetic household content in real product records; it is isolated from personal users and shared production households." },
    ],
  },
  {
    id: "hoc-v2",
    number: "01",
    name: "House of Commons Citizen Companion",
    eyebrow: "Source project · civic product",
    summary: "A cross-platform civic information product that turns parliamentary data into plain-language, accessible decisions.",
    discipline: "Civic information",
    color: "#83b8ff",
    accent: "blue",
    originalPlatforms: ["iPhone", "iPad", "Android", "Web"],
    runtimeLabel: "Connected Vite Web build · production public API",
    webPreviewUrl: "https://hoc-v2-web.pages.dev/",
    status: "source verified",
    sourceRepository: "https://github.com/Androkzn/hocv2",
    scenario: { title: "Follow a parliamentary decision", description: "Inspect the live civic-information flow from a question to a clear, accessible next action.", action: "Start civic flow" },
    checkpoints: [
      { title: "Plain-language context", detail: "Start with what the person needs to understand, not with a data source or feature list." },
      { title: "Evidence stays visible", detail: "Expose provenance and uncertainty beside the explanation so trust is part of the interface." },
      { title: "Accessible next action", detail: "End with a useful decision path that works across mobile and Web layouts." },
    ],
    challenge: { title: "Make public data usable without flattening it", body: "The live Web build calls the deployed public API for parliamentary and location data. Optional account features use the deployed auth Worker; the public portfolio does not impersonate a user." },
    evidence: [
      { label: "Source repository", type: "verified", detail: "Androkzn/hocv2 · public source project." },
      { label: "Platform matrix", type: "runtime", detail: "iPhone · iPad · Android · Web, based on native configuration and the Vite Web entrypoint." },
      { label: "Live boundary", type: "runtime", detail: "Production public API; account and saved-preference actions remain user-initiated." },
    ],
  },
  {
    id: "symply-budget",
    number: "02",
    name: "Symply Budget",
    eyebrow: "Source project · local-first finance",
    summary: "A native-first budgeting product with local-first data, privacy-aware integrations and a Cloudflare Worker backend.",
    discipline: "Financial product",
    color: "#d4ff4f",
    accent: "lime",
    originalPlatforms: ["iPhone", "iPad", "Android", "Web"],
    runtimeLabel: "Connected Expo Web build · authenticated guest account",
    webPreviewUrl: "https://budget-v2.symply-budget-web.pages.dev/?portfolioDemo=1",
    status: "source verified",
    sourceRepository: "https://github.com/Androkzn/symply-budget",
    scenario: { title: "Review a household budget", description: "Open the live budgeting flow from context to a safe, inspectable decision.", action: "Start budget flow" },
    checkpoints: [
      { title: "Local-first state", detail: "Keep the core budgeting experience useful while making sync and recovery explicit system boundaries." },
      { title: "Financial intent", detail: "Separate an understandable household decision from integrations, permissions and provider failures." },
      { title: "Controlled handoff", detail: "Sign in to inspect account-scoped budget data; credentials and financial records are never embedded in the portfolio." },
    ],
    challenge: { title: "Design for trust when data is personal", body: "The Web build keeps the normal authenticated product flow. A dedicated guest account is used for the portfolio so the interface and navigation remain real while personal financial data stays out of scope." },
    evidence: [
      { label: "Source repository", type: "verified", detail: "Androkzn/symply-budget · public source project." },
      { label: "Native matrix", type: "runtime", detail: "iPhone · iPad · Android, with iPad support declared in the Expo configuration." },
      { label: "Live boundary", type: "runtime", detail: "The guest login is isolated to a dedicated account; the portfolio does not expose a personal financial identity or shared production records." },
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
  { title: "Try the core interaction", detail: "The app opens its real Web runtime. Sign in only when the app requires account-scoped data." },
  { title: "Inspect the trade-off", detail: "Open a challenge card to see the boundary, alternatives and what still needs verification." },
];

export function projectById(id: string) {
  return projects.find((project) => project.id === id) ?? projects[0];
}
