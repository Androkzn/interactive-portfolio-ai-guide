// A Lighthouse-style performance score for one race lane: Lighthouse 10's metric
// weights and log-normal scoring curves, applied to the numbers this race
// measured. It is labelled as an estimate everywhere it is shown — the inputs
// come from one throttled cloud browser, Speed Index from screencast frames, and
// TBT over Lighthouse's window (FCP to TTI). A lane stopped at the cap has lower bounds for
// LCP, TBT and Speed Index, so its score is shown as an upper bound ("≤").

import type { RaceProfile } from "@/packages/contracts/src/site-race";

export type ScoreMetric = "fcp" | "si" | "lcp" | "tbt" | "cls";

/** Lighthouse 10 weights (performance-scoring docs). */
export const WEIGHTS: Record<ScoreMetric, number> = { fcp: 0.1, si: 0.1, lcp: 0.25, tbt: 0.3, cls: 0.25 };

/** Control points of each log-normal curve: p10 scores 0.9, the median scores 0.5. */
export const CURVES: Record<RaceProfile, Record<ScoreMetric, { p10: number; median: number }>> = {
  mobile: {
    fcp: { p10: 1800, median: 3000 },
    si: { p10: 3387, median: 5800 },
    lcp: { p10: 2500, median: 4000 },
    tbt: { p10: 200, median: 600 },
    cls: { p10: 0.1, median: 0.25 },
  },
  desktop: {
    fcp: { p10: 934, median: 1600 },
    si: { p10: 1311, median: 2300 },
    lcp: { p10: 1200, median: 2400 },
    tbt: { p10: 150, median: 350 },
    cls: { p10: 0.1, median: 0.25 },
  },
};

function erf(x: number): number {
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return sign * (1 - y * Math.exp(-ax * ax));
}

/** Lighthouse's getLogNormalScore: 1 at zero, 0.9 at p10, 0.5 at the median, toward 0 beyond. */
export function logNormalScore({ p10, median }: { p10: number; median: number }, value: number): number {
  if (value <= 0) return 1;
  const INVERSE_ERFC_ONE_FIFTH = 0.9061938024368232;
  const xLogRatio = Math.log(value / median);
  const p10LogRatio = -Math.log(p10 / median);
  const standardizedX = (xLogRatio * INVERSE_ERFC_ONE_FIFTH) / p10LogRatio;
  const complementaryPercentile = (1 - erf(standardizedX)) / 2;
  if (value <= p10) return Math.max(0.9, Math.min(1, complementaryPercentile));
  if (value <= median) return Math.max(0.5, Math.min(0.8999999999, complementaryPercentile));
  return Math.max(0, Math.min(0.4999999999, complementaryPercentile));
}

export type ScoreInput = Record<ScoreMetric, number | null>;

export type ScoreResult = {
  /** 0–100, or null when a metric is missing entirely. */
  score: number | null;
  parts: { metric: ScoreMetric; value: number | null; score: number | null; weight: number }[];
};

export function performanceScore(input: ScoreInput, profile: RaceProfile): ScoreResult {
  const curves = CURVES[profile];
  const parts = (Object.keys(WEIGHTS) as ScoreMetric[]).map((metric) => {
    const value = input[metric];
    return { metric, value, score: value === null ? null : logNormalScore(curves[metric], value), weight: WEIGHTS[metric] };
  });
  if (parts.some((part) => part.score === null)) return { score: null, parts };
  const total = parts.reduce((sum, part) => sum + (part.score ?? 0) * part.weight, 0);
  return { score: Math.round(total * 100), parts };
}

export type ScoreBand = "good" | "average" | "poor";

/** Lighthouse's bands: 90–100 good, 50–89 needs improvement, 0–49 poor. */
export function band(score: number): ScoreBand {
  if (score >= 90) return "good";
  if (score >= 50) return "average";
  return "poor";
}
