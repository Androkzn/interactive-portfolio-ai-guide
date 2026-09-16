import type { DevicePreview } from "./content";

export const deviceWidths: Record<DevicePreview, number> = { iphone: 390, ipad: 768, android: 412, desktop: 1280 };

export function acceptsPreviewMessage(event: Pick<MessageEvent, "source" | "origin" | "data">, frameWindow: Window | null | undefined, origin: string): boolean {
  return !!frameWindow && event.source === frameWindow && event.origin === origin && !!event.data && typeof event.data === "object" && ["portfolio:theme-ready", "portfolio:theme-applied"].includes(event.data.type);
}
