import type { DevicePreview } from "./content";

export const deviceWidths: Record<DevicePreview, number> = { iphone: 538, ipad: 768, android: 515, desktop: 1280 };

export type PortfolioDemoCredentialsMessage = {
  type: "portfolio:demo-credentials";
  projectId: "symply-house" | "symply-budget";
  email: string;
  password: string;
};

/** A fresh id is attached to every portfolio page visit. The embedded apps use
 * it to discard the previous visitor's local-first ledger before bootstrapping. */
export type PortfolioDemoSessionId = string;

export type PortfolioPreviewMessage =
  | { type: "portfolio:theme-ready" }
  | { type: "portfolio:theme-applied"; theme: "light" | "dark" }
  | { type: "portfolio:demo-ready"; projectId: string }
  | { type: "portfolio:navigation"; projectId: string; pathname: string };

const demoCredentials: Record<PortfolioDemoCredentialsMessage["projectId"], Omit<PortfolioDemoCredentialsMessage, "type" | "projectId">> = {
  "symply-house": { email: "guest@house.com", password: "Guest123!" },
  "symply-budget": { email: "guest@budget.com", password: "Guest123!" },
};

export function portfolioDemoMessageFor(projectId: string): PortfolioDemoCredentialsMessage | null {
  // Citizen Companion is a public, unauthenticated flow. Do not add the
  // portfolioDemo query to it: its own Web entry treats that flag as a request
  // for the login screen, which would contradict the public-data experience.
  if (projectId !== "symply-house" && projectId !== "symply-budget") return null;
  return { type: "portfolio:demo-credentials", projectId, ...demoCredentials[projectId] };
}

export function createPortfolioSessionId(): PortfolioDemoSessionId {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `portfolio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function acceptsPreviewMessage(event: Pick<MessageEvent, "source" | "origin" | "data">, frameWindow: Window | null | undefined, origin: string): boolean {
  return !!frameWindow && event.source === frameWindow && event.origin === origin && !!event.data && typeof event.data === "object" && ["portfolio:theme-ready", "portfolio:theme-applied", "portfolio:demo-ready", "portfolio:navigation"].includes(event.data.type);
}
