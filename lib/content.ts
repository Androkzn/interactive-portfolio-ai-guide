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
  status: "manifest draft" | "pilot" | "verified build";
  sourceRepository?: string;
  scenario: { title: string; description: string; action: string };
  challenge: { title: string; body: string };
  evidence: { label: string; type: string; detail: string }[];
};

export const projects: Project[] = [
  {
    id: "symply-house",
    number: "00",
    name: "Symply House",
    eyebrow: "Featured project · connected source",
    summary: "An independent home-management product with a shared Expo surface and native platform builds.",
    discipline: "Product platform",
    color: "#d4ff4f",
    accent: "lime",
    originalPlatforms: ["iPhone", "iPad", "Android", "Web"],
    runtimeLabel: "Expo Web build · connected source",
    status: "verified build",
    sourceRepository: "https://github.com/Androkzn/symply-house",
    scenario: { title: "Review a home task", description: "Walk through a seeded household task from context to a clear next action.", action: "Start task flow" },
    challenge: { title: "One product, four honest runtimes", body: "Symply House is the first connected source in this portfolio. Its source project supports iPhone, iPad, Android and Web. The in-site Device Lab runs the connected Web build inside platform-sized shells; native support remains linked as source/build evidence rather than being misrepresented as a native runtime in the browser." },
    evidence: [
      { label: "Source repository", type: "verified", detail: "Androkzn/symply-house · connected project source." },
      { label: "Platform matrix", type: "runtime", detail: "iPhone · iPad · Android · Web." },
      { label: "Safe demo", type: "boundary", detail: "This preview uses synthetic local state and does not touch production services." },
    ],
  },
  {
    id: "swiper",
    number: "01",
    name: "Swiper",
    eyebrow: "Candidate manifest · mobile experience",
    summary: "A focused interaction model for moving through a queue of decisions without losing context.",
    discipline: "Product interface",
    color: "#d4ff4f",
    accent: "lime",
    originalPlatforms: ["unknown"],
    runtimeLabel: "Reconstruction · Web preview",
    status: "manifest draft",
    scenario: { title: "Review a decision queue", description: "Swipe through seeded cards and keep the ones worth a closer look.", action: "Start queue" },
    challenge: { title: "Verification is part of the product", body: "The original source, ownership and exact implementation are pending review. This demo isolates an interaction pattern with synthetic data instead of presenting a reconstruction as the original app." },
    evidence: [
      { label: "Manifest", type: "status", detail: "Permission and source build pending owner review." },
      { label: "Core flow", type: "screen", detail: "Synthetic queue with deterministic reset." },
    ],
  },
  {
    id: "brij",
    number: "02",
    name: "Brij",
    eyebrow: "Candidate manifest · connected workflow",
    summary: "A simple bridge between a request, its constraints and the next responsible action.",
    discipline: "Workflow systems",
    color: "#ff9d66",
    accent: "orange",
    originalPlatforms: ["unknown"],
    runtimeLabel: "Reconstruction · Web preview",
    status: "manifest draft",
    scenario: { title: "Triage a request", description: "Move a seeded request from intake to a clearly owned next step.", action: "Open intake" },
    challenge: { title: "Do not confuse a demo with an integration", body: "Production endpoints, real contacts and outbound actions are intentionally unavailable. The flow demonstrates the state model and handoff, not a live service connection." },
    evidence: [
      { label: "Boundary", type: "note", detail: "No real messages, contacts or production writes." },
      { label: "State model", type: "screen", detail: "Intake → clarified → owned, with reset." },
    ],
  },
  {
    id: "wifi-map",
    number: "03",
    name: "WiFi Map",
    eyebrow: "Candidate manifest · location utility",
    summary: "A map-first utility where the quality of the next action depends on clear, local context.",
    discipline: "Mobile utility",
    color: "#83b8ff",
    accent: "blue",
    originalPlatforms: ["unknown"],
    runtimeLabel: "Reconstruction · Web preview",
    status: "pilot",
    scenario: { title: "Find a nearby network", description: "Explore seeded locations, inspect a result and save it to your shortlist.", action: "Open map" },
    challenge: { title: "Useful context beats visual noise", body: "The pilot explores how a map result can expose confidence, access notes and the next action without requiring a live location service." },
    evidence: [
      { label: "Pilot screen", type: "interactive", detail: "Seeded map results with a safe, local shortlist." },
      { label: "Known limit", type: "note", detail: "No device location, network scan or external API." },
    ],
  },
  {
    id: "one-dialer",
    number: "04",
    name: "One Dialer",
    eyebrow: "Candidate manifest · communication surface",
    summary: "A calm calling surface designed to keep intent and contact context visible at the moment of action.",
    discipline: "Communication",
    color: "#d1a8ff",
    accent: "violet",
    originalPlatforms: ["unknown"],
    runtimeLabel: "Reconstruction · Web preview",
    status: "manifest draft",
    scenario: { title: "Prepare a safe call", description: "Select a synthetic contact, review the context and confirm a simulated call.", action: "Open dialer" },
    challenge: { title: "Never make a real call from a portfolio demo", body: "The core interaction ends at a simulated confirmation. Contacts are synthetic and no device permission, phone number or outbound call is requested." },
    evidence: [
      { label: "Safety adapter", type: "boundary", detail: "Call action is local and simulated." },
      { label: "Scenario", type: "screen", detail: "Contact → review → simulated confirmation." },
    ],
  },
  {
    id: "pixalere",
    number: "05",
    name: "Pixalere",
    eyebrow: "Candidate manifest · clinical workflow",
    summary: "A high-trust workflow concept where clarity, permissions and auditability matter more than decorative UI.",
    discipline: "Care workflow",
    color: "#ff77a8",
    accent: "pink",
    originalPlatforms: ["unknown"],
    runtimeLabel: "Reconstruction · Web preview",
    status: "manifest draft",
    scenario: { title: "Review a synthetic case", description: "Step through a fictional care record and surface the next documented action.", action: "Open case" },
    challenge: { title: "Synthetic means synthetic", body: "No patient information, clinical decision or production record is used. This experience is a deliberately fictional workflow placeholder until permission and source materials are verified." },
    evidence: [
      { label: "Privacy boundary", type: "policy", detail: "No real patient data or clinical advice." },
      { label: "Review path", type: "screen", detail: "Fictional case with deterministic checkpoints." },
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
  return projects.find((project) => project.id === id) ?? projects[2];
}
