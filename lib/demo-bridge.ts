export const SYMPLY_HOUSE_WEB_ORIGIN = "https://symply-house-web.pages.dev";

export type DemoScreen = "home" | "tasks" | "spaces";

export type DemoMessage =
  | { source: "symply-house"; version: 1; type: "ready"; payload: { screen: DemoScreen; mode: "public-preview" } }
  | { source: "symply-house"; version: 1; type: "screen"; payload: { screen: DemoScreen } }
  | { source: "symply-house"; version: 1; type: "stepComplete"; payload: { step: "task.complete"; itemId: string } }
  | { source: "symply-house"; version: 1; type: "error"; payload: { code: string; message: string } };

export type HostMessage = {
  source: "portfolio";
  version: 1;
  type: "hostReady" | "ack";
  payload: { for?: DemoMessage["type"] };
};

const screens = new Set<DemoScreen>(["home", "tasks", "spaces"]);
const childTypes = new Set<DemoMessage["type"]>(["ready", "screen", "stepComplete", "error"]);

export function parseDemoMessage(value: unknown): DemoMessage | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Partial<DemoMessage> & { payload?: unknown };
  if (message.source !== "symply-house" || message.version !== 1 || !childTypes.has(message.type as DemoMessage["type"])) return null;
  if (!message.payload || typeof message.payload !== "object") return null;
  const payload = message.payload as Record<string, unknown>;
  if (message.type === "ready" && (!screens.has(payload.screen as DemoScreen) || payload.mode !== "public-preview")) return null;
  if (message.type === "screen" && !screens.has(payload.screen as DemoScreen)) return null;
  if (message.type === "stepComplete" && (payload.step !== "task.complete" || typeof payload.itemId !== "string")) return null;
  if (message.type === "error" && (typeof payload.code !== "string" || typeof payload.message !== "string")) return null;
  return message as DemoMessage;
}

export function hostReadyMessage(): HostMessage {
  return { source: "portfolio", version: 1, type: "hostReady", payload: {} };
}

export function ackMessage(forType: DemoMessage["type"]): HostMessage {
  return { source: "portfolio", version: 1, type: "ack", payload: { for: forType } };
}
