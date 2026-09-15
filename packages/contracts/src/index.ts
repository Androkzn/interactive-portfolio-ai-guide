export const GUIDE_PROTOCOL = "portfolio-guide/1" as const;

export type GuideMode = "explore" | "tour" | "interview";
export type GuideLanguage = "en" | "ru";
export type GuideViewport = "phone" | "tablet" | "desktop";

export type GuideTurnRequest = {
  protocol: typeof GUIDE_PROTOCOL;
  sessionId: string;
  projectId: string;
  mode: GuideMode;
  language: GuideLanguage;
  viewport: GuideViewport;
  question: string;
  history: Array<{ role: "guide" | "visitor"; text: string }>;
  challengeToken?: string;
};

export type GuideAction =
  | { type: "openProject"; projectId: string }
  | { type: "selectViewport"; viewport: GuideViewport }
  | { type: "showEvidence"; projectId: string; evidenceId: string };

export type GuideTurnResponse = {
  protocol: typeof GUIDE_PROTOCOL;
  requestId: string;
  mode: "curated" | "generated";
  answer: string;
  sourceIds: string[];
  action?: GuideAction;
  next: "try-demo" | "inspect-evidence" | "continue-tour" | "ask-follow-up";
};

export function isGuideMode(value: unknown): value is GuideMode {
  return value === "explore" || value === "tour" || value === "interview";
}

export function isGuideLanguage(value: unknown): value is GuideLanguage {
  return value === "en" || value === "ru";
}

export function isGuideViewport(value: unknown): value is GuideViewport {
  return value === "phone" || value === "tablet" || value === "desktop";
}

export function isGuideTurnRequest(value: unknown): value is GuideTurnRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GuideTurnRequest>;
  return candidate.protocol === GUIDE_PROTOCOL
    && typeof candidate.sessionId === "string" && candidate.sessionId.length >= 8 && candidate.sessionId.length <= 100
    && typeof candidate.projectId === "string" && candidate.projectId.length >= 2 && candidate.projectId.length <= 80
    && isGuideMode(candidate.mode) && isGuideLanguage(candidate.language) && isGuideViewport(candidate.viewport)
    && typeof candidate.question === "string" && candidate.question.trim().length > 0 && candidate.question.length <= 1200
    && Array.isArray(candidate.history) && candidate.history.length <= 8
    && candidate.history.every((item) => item && (item.role === "guide" || item.role === "visitor") && typeof item.text === "string" && item.text.length <= 1200);
}
