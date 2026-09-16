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
  status: "source verified" | "pilot";
  sourceRepository?: string;
  scenario: { title: string; description: string; action: string };
  checkpoints: { title: string; detail: string }[];
  challenge: { title: string; body: string };
  evidence: { label: string; type: string; detail: string }[];
};

export const projects: Project[] = [
  {
    id: "hoc-v2",
    number: "00",
    name: "House of Commons Citizen Companion",
    eyebrow: "Source project · civic product",
    summary: "A cross-platform civic information product that turns parliamentary data into plain-language, accessible decisions.",
    discipline: "Civic information",
    color: "#83b8ff",
    accent: "blue",
    originalPlatforms: ["iPhone", "iPad", "Android", "Web"],
    runtimeLabel: "Vite Web source · read-only portfolio preview",
    status: "source verified",
    sourceRepository: "https://github.com/Androkzn/hocv2",
    scenario: { title: "Follow a parliamentary decision", description: "Inspect a seeded civic-information flow from a question to a clear, accessible next action.", action: "Start civic flow" },
    checkpoints: [
      { title: "Plain-language context", detail: "Start with what the person needs to understand, not with a data source or feature list." },
      { title: "Evidence stays visible", detail: "Expose provenance and uncertainty beside the explanation so trust is part of the interface." },
      { title: "Accessible next action", detail: "End with a useful decision path that works across mobile and Web layouts." },
    ],
    challenge: { title: "Make public data usable without flattening it", body: "The source project combines live parliamentary data, accessibility requirements and multiple runtimes. The portfolio preview uses a deterministic local seed; it demonstrates the product boundary without calling live civic services." },
    evidence: [
      { label: "Source repository", type: "verified", detail: "Androkzn/hocv2 · public source project." },
      { label: "Platform matrix", type: "runtime", detail: "iPhone · iPad · Android · Web, based on native configuration and the Vite Web entrypoint." },
      { label: "Preview boundary", type: "boundary", detail: "Local seeded data only; no account, location, microphone or production write is used." },
    ],
  },
  {
    id: "symply-budget",
    number: "01",
    name: "Symply Budget",
    eyebrow: "Source project · local-first finance",
    summary: "A native-first budgeting product with local-first data, privacy-aware integrations and a Cloudflare Worker backend.",
    discipline: "Financial product",
    color: "#d4ff4f",
    accent: "lime",
    originalPlatforms: ["iPhone", "iPad", "Android"],
    runtimeLabel: "Native source · synthetic Web preview",
    status: "source verified",
    sourceRepository: "https://github.com/Androkzn/symply-budget",
    scenario: { title: "Review a household budget", description: "Walk through a seeded budgeting flow from context to a safe, inspectable decision.", action: "Start budget flow" },
    checkpoints: [
      { title: "Local-first state", detail: "Keep the core budgeting experience useful while making sync and recovery explicit system boundaries." },
      { title: "Financial intent", detail: "Separate an understandable household decision from integrations, permissions and provider failures." },
      { title: "Controlled handoff", detail: "Finish with a reviewable action; sensitive writes and credentials stay outside the public preview." },
    ],
    challenge: { title: "Design for trust when data is personal", body: "The source project combines a native app, local-first storage, platform integrations and a Worker backend. This public preview is synthetic and read-only; it does not expose accounts, financial records, credentials or production services." },
    evidence: [
      { label: "Source repository", type: "verified", detail: "Androkzn/symply-budget · public source project." },
      { label: "Native matrix", type: "runtime", detail: "iPhone · iPad · Android, with iPad support declared in the Expo configuration." },
      { label: "Preview boundary", type: "boundary", detail: "Synthetic local state only; no banking, payment, identity or backend write is available." },
    ],
  },
];

export const quickPrompts = [
  "What did you personally own?",
  "What was the hardest part?",
  "How did AI help, and what did you verify?",
  "Show me the core flow",
];

export const tourSteps = [
  { title: "Start with the product question", detail: "Pick the experience that best matches the kind of work you want to inspect." },
  { title: "Try the core interaction", detail: "The demo is seeded, local and resettable. It is separate from the guide." },
  { title: "Inspect the trade-off", detail: "Open a challenge card to see the boundary, alternatives and what still needs verification." },
];

export function projectById(id: string) {
  return projects.find((project) => project.id === id) ?? projects[0];
}
