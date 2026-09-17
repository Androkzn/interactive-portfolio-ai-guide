import type { DevicePreview } from "./content";

export const deviceWidths: Record<DevicePreview, number> = { iphone: 538, ipad: 768, android: 515, desktop: 1280 };

export type PortfolioDemoCredentialsMessage = {
  type: "portfolio:demo-credentials";
  projectId: "hoc-v2" | "symply-house" | "symply-budget";
  email: string;
  password: string;
};

export type PortfolioPreviewMessage =
  | { type: "portfolio:theme-ready" }
  | { type: "portfolio:theme-applied"; theme: "light" | "dark" }
  | { type: "portfolio:demo-ready"; projectId: string }
  | { type: "portfolio:navigation"; projectId: string; pathname: string };

const demoCredentials: Record<PortfolioDemoCredentialsMessage["projectId"], Omit<PortfolioDemoCredentialsMessage, "type" | "projectId">> = {
  "hoc-v2": { email: "guest@commons.com", password: "Guest123!" },
  "symply-house": { email: "guest@house.com", password: "Guest123!" },
  "symply-budget": { email: "guest@budget.com", password: "Guest123!" },
};

export function portfolioDemoMessageFor(projectId: string): PortfolioDemoCredentialsMessage | null {
  if (projectId !== "hoc-v2" && projectId !== "symply-house" && projectId !== "symply-budget") return null;
  return { type: "portfolio:demo-credentials", projectId, ...demoCredentials[projectId] };
}

export function acceptsPreviewMessage(event: Pick<MessageEvent, "source" | "origin" | "data">, frameWindow: Window | null | undefined, origin: string): boolean {
  return !!frameWindow && event.source === frameWindow && event.origin === origin && !!event.data && typeof event.data === "object" && ["portfolio:theme-ready", "portfolio:theme-applied", "portfolio:demo-ready", "portfolio:navigation"].includes(event.data.type);
}
