import type { DevicePreview } from "./content";

export const deviceWidths: Record<DevicePreview, number> = { iphone: 538, ipad: 768, android: 515, desktop: 1280 };

export type PortfolioDemoProjectId = "symply-house" | "symply-budget";

/**
 * Announces that this frame is the portfolio's embedded demo. It deliberately
 * carries NO credentials.
 *
 * The portfolio used to hardcode the demo email and password and post them into
 * the frame, which meant shipping them in this site's public JavaScript. That
 * was unnecessary: the embedded apps derive the pre-fill themselves from the
 * `portfolioDemo=1` query parameter on their own URL, before they even register
 * a message listener. Verified against the deployed builds on 2026-09-24 — with
 * the flag both login fields are pre-filled, without it they are empty — so the
 * portfolio no longer needs to know, or ship, any credential.
 *
 * The consequence to keep in mind: the pre-fill depends on the `portfolioDemo`
 * query parameter staying on the iframe URL. Remove that and the demo stops
 * pre-filling.
 */
export type PortfolioDemoMessage = {
  type: "portfolio:demo";
  projectId: PortfolioDemoProjectId;
};

/** A fresh id is attached to every portfolio page visit, so one visitor's demo
 * browsing cannot be confused with another's. Note: the currently deployed app
 * builds do not read it — it is sent for the host's own bookkeeping only. */
export type PortfolioDemoSessionId = string;

export type PortfolioPreviewMessage =
  | { type: "portfolio:theme-ready" }
  | { type: "portfolio:theme-applied"; theme: "light" | "dark" }
  | { type: "portfolio:demo-ready"; projectId: string }
  | { type: "portfolio:navigation"; projectId: string; pathname: string };

export function portfolioDemoMessageFor(projectId: string): PortfolioDemoMessage | null {
  // Citizen Companion is a public, unauthenticated flow. Do not add the
  // portfolioDemo query to it: its own Web entry treats that flag as a request
  // for the login screen, which would contradict the public-data experience.
  if (projectId !== "symply-house" && projectId !== "symply-budget") return null;
  return { type: "portfolio:demo", projectId };
}

export function createPortfolioSessionId(): PortfolioDemoSessionId {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `portfolio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function acceptsPreviewMessage(event: Pick<MessageEvent, "source" | "origin" | "data">, frameWindow: Window | null | undefined, origin: string): boolean {
  return !!frameWindow && event.source === frameWindow && event.origin === origin && !!event.data && typeof event.data === "object" && ["portfolio:theme-ready", "portfolio:theme-applied", "portfolio:demo-ready", "portfolio:navigation"].includes(event.data.type);
}
