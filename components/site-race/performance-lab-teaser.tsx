import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Gauge, Image as ImageIcon, TimerReset, Zap } from "lucide-react";
import resultsData from "@/lib/site-race/results-data.json";
import styles from "./performance-lab-teaser.module.css";
import { F1Car, Hatchback } from "./race-cars";
import { SyncAnimations } from "./sync-animations";

function NextMark() {
  return <svg viewBox="0 0 48 48" role="img" aria-label="Next.js logo"><circle cx="24" cy="24" r="23" fill="#fff" /><path d="M14 14v20M15 14l20 28M28 14h6v20" fill="none" stroke="#111" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/**
 * The chequered flag as a marshal holds it: the gloved hand at the pivot, a stick, and a cloth
 * built from six columns of chequers so a ripple can run from the stick to the free edge.
 */
function CheckeredFlag() {
  const columns = Array.from({ length: 6 }, (_, x) => (
    <g key={x} className={styles.flagCol} style={{ "--i": x } as CSSProperties}>
      <rect x={6 + x * 7} y="5" width="7" height="26" fill="#f5f4ee" />
      {[0, 1, 2, 3].filter((y) => (x + y) % 2 === 0).map((y) => <rect key={y} x={6 + x * 7} y={5 + y * 6.5} width="7" height="6.5" fill="#111" />)}
    </g>
  ));
  return (
    <svg viewBox="0 0 52 62" className={styles.flagSvg}>
      <rect x="3" y="2" width="2.6" height="57" rx="1.3" fill="#e3e5dc" />
      <g className={styles.flagCloth}>{columns}</g>
      <circle cx="4.3" cy="57.5" r="4.4" fill="#ff8a2e" stroke="#151714" strokeWidth="1.1" />
    </svg>
  );
}

/** One chequered flag on its stick, drawn upright with the foot of the stick at the origin. */
function RaceFlag() {
  return (
    <g className={styles.ctaFlag}>
      <rect x="-.9" y="-25" width="1.8" height="25" rx=".9" fill="#111" />
      <circle cy="-25.6" r="1.5" fill="#111" />
      <rect x="1" y="-24" width="12" height="9" fill="#fff" />
      {[0, 1, 2, 3].flatMap((c) => [0, 1, 2].filter((r) => (c + r) % 2 === 0).map((r) => <rect key={`${c}-${r}`} x={1 + c * 3} y={-24 + r * 3} width="3" height="3" fill="#111" />))}
      <rect x="1" y="-24" width="12" height="9" fill="none" stroke="#111" strokeWidth=".8" />
    </g>
  );
}

/** Two chequered flags crossed on their sticks: the second is the first, mirrored. */
function CrossedFlags() {
  return (
    <svg viewBox="0 0 33 28" className={styles.ctaFlags} aria-hidden="true">
      <g transform="translate(33 0) scale(-1 1)"><g transform="translate(10 27) rotate(24)"><RaceFlag /></g></g>
      <g transform="translate(10 27) rotate(24)"><RaceFlag /></g>
    </svg>
  );
}

const seconds = (value: number | null | undefined) => value == null ? "—" : `${(value / 1000).toFixed(1)}s`;
const megabytes = (value: number | null | undefined) => value == null ? "—" : `${(value / 1024).toFixed(1)}MB`;
/** Where the races behind these medians stopped a lane (results-data capMs; older files: 30 s). */
const capSeconds = Math.round(((resultsData as { capMs?: number }).capMs ?? 30000) / 100) / 10;
const reduction = (before: number | null | undefined, after: number | null | undefined) => before && after ? Math.max(0, Math.round((1 - after / before) * 100)) : null;

export function PerformanceLabTeaser() {
  // Same medians as the lab's result block (lib/site-race/results-data.json): phone on slow 4G.
  const cells = resultsData.cells as Record<string, { races: number; beforeCapped: boolean; before: Record<string, number | null>; after: Record<string, number | null> }>;
  const product = cells["model/mobile"];
  const homeCell = cells["home/mobile"];
  // The weight card shows the product page, like the scoreboard above it.
  const before = { lcp: homeCell.before.lcp ?? 0, pageKb: product.before.totalKb ?? 0 };
  const after = { lcp: homeCell.after.lcp ?? 0, pageKb: product.after.totalKb ?? 0 };
  const ratio = (a: number | null | undefined, b: number | null | undefined) => {
    if (!a || !b) return null;
    const r = a / b;
    return r >= 9.5 ? `${Math.round(r)}×` : `${r.toFixed(1)}×`;
  };
  const productLcpX = ratio(product.before.lcp, product.after.lcp);
  const homeLcpX = ratio(homeCell.before.lcp, homeCell.after.lcp);
  const productWeightX = ratio(product.before.totalKb, product.after.totalKb);
  const productAfter = product.after.lcp ?? 0;
  const lcpGain = reduction(before?.lcp, after?.lcp);
  // The weight bars to scale: the original is the full track.
  const weightShare = before.pageKb ? `${Math.max(2, (after.pageKb / before.pageKb) * 100).toFixed(1)}%` : "10%";
  const weightGain = reduction(before?.pageKb, after?.pageKb);

  return (
    <section className={styles.section} id="performance-lab" aria-labelledby="my-work-heading">
      <div className={`workspace-section-heading ${styles.sectionHeading}`}>
        <div className="section-eyebrow"><Gauge size={14} aria-hidden="true" />My work</div>
        <h2 id="my-work-heading">Make a slow site <em>fast.</em></h2>
        <p className="workspace-heading-note">A real business website rebuilt in Next.js 16 and optimized, then raced live against the original.</p>
      </div>
      <div className={styles.card}>
        <div className={styles.copy}>
          <div className={styles.kicker}><Gauge size={15} />Live performance lab <span>Next.js 16</span></div>
          <div className={styles.nextIdentity}><span className={styles.nextLogo}><NextMark /></span><span><small>Performance rebuild</small><strong>Built and optimized with Next.js</strong></span></div>
          <h2 id="performance-lab-title">Original site.<br /><span>Next.js optimized.</span><br /><em>Race them live.</em></h2>
          <p>Same pages. Same content. On a phone, a product page whose photo {product.beforeCapped ? `did not appear within ${capSeconds} seconds` : `took ${seconds(product.before.lcp)} to appear`} now shows it in {seconds(productAfter)}.</p>
          <div className={styles.proof} aria-label="Measured mobile improvements">
            <span><TimerReset size={16} /><b>{productLcpX ? `${product.beforeCapped ? "> " : ""}${productLcpX}` : "Faster"}</b><small>faster product page</small></span>
            <span><TimerReset size={16} /><b>{homeLcpX ?? "Faster"}</b><small>faster home page</small></span>
            <span><ImageIcon size={16} /><b>{productWeightX ?? "Lighter"}</b><small>less data</small></span>
          </div>
          <Link className={styles.cta} href="/lab/site-race/"><CrossedFlags />See the result · race it live <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>

        <div className={styles.visual} aria-label="Animated comparison of the original site and the Next.js optimized site">
          <SyncAnimations />
          <div className={styles.visualHead}><span><i />Product page · phone on slow 4G · median of {product.races} races</span><span className={styles.nextChip}><NextMark /> Next.js</span></div>
          <div className={styles.scoreboard}>
            <div className={styles.scoreOriginal}><span>Original site</span><strong>{product.beforeCapped ? `> ${capSeconds}s` : seconds(product.before.lcp)}</strong><small>product photo on screen</small></div>
            <div className={styles.racePulse} aria-hidden="true"><Zap size={18} fill="currentColor" /></div>
            <div className={styles.scoreNext}><span>Next.js optimized</span><strong>{seconds(productAfter)}</strong><small>product photo on screen</small></div>
          </div>
          <div className={styles.chartGrid}>
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}><span>Loading progress</span><b><ArrowDownRight size={14} /> LCP</b></div>
              {/* Loading progress on the race's clock. x is time: both lines are drawn at the same pace
                  (202 units over 12–58% of the cycle = 360 units over 12–94%). The Next.js line ends at
                  the dot, so the dot lights exactly as the F1 car crosses the line (58%); the original
                  keeps crawling and stays under half, because its photo never arrives in the race. */}
              <svg className={styles.sparkline} viewBox="0 0 360 112" preserveAspectRatio="none" aria-hidden="true">
                <path className={styles.gridLine} d="M0 24H360M0 56H360M0 88H360" />
                <path className={styles.originalLine} pathLength="1" d="M0 100 C60 99 110 95 160 88 S270 70 360 60" />
                <path className={styles.optimizedLine} pathLength="1" d="M0 100 C46 98 78 86 110 62 S170 18 202 14" />
                <circle className={styles.chartDot} cx="202" cy="14" r="5" />
              </svg>
              <div className={styles.legend}><span><i className={styles.orange} />Original</span><span><i className={styles.purple} />Next.js</span></div>
            </div>
            <div className={styles.weightCard}>
              <div className={styles.chartTitle}><span>Product page weight</span><b>{weightGain == null ? "Reduced" : `−${weightGain}%`}</b></div>
              <div className={styles.weightRow}><span>Original</span><div><i className={styles.weightBefore} /></div><b>{megabytes(before?.pageKb)}</b></div>
              <div className={styles.weightRow}><span>Next.js</span><div><i className={styles.weightAfter} style={{ "--finish": weightShare } as CSSProperties} /></div><b>{megabytes(after?.pageKb)}</b></div>
              <div className={styles.optimizations}><span>Images sized</span><span>Photo first</span><span>Less JS</span><span>Next page early</span></div>
            </div>
          </div>
          <div className={styles.race} aria-hidden="true">
            <div className={styles.finishGlow} />
            {/* The line is painted across the track; the flag is a marshal's, above the track beyond it. */}
            <div className={styles.finishLine} />
            <div className={styles.flag}><CheckeredFlag /></div>
            <span className={styles.finishChip}>Finish · {seconds(productAfter)}</span>
            <div className={`${styles.lane} ${styles.laneNext}`}>
              <div className={`${styles.runner} ${styles.runnerNext}`}><div className={styles.speedLines}><i /><i /><i /></div><div className={styles.carNext}><F1Car /></div></div>
            </div>
            <div className={`${styles.lane} ${styles.laneOriginal}`}>
              <div className={`${styles.runner} ${styles.runnerOriginal}`}><div className={styles.carOriginal}><Hatchback /></div></div>
            </div>
          </div>
          <div className={styles.timeline} aria-hidden="true">
            <div className={styles.rail}><i className={styles.railFill} /><i className={styles.railHead} /></div>
            {/* What the track shows: the product page opening cold, from the request to its photo on screen. */}
            <span className={`${styles.checkpoint} ${styles.checkpoint0}`}><i />Page requested</span>
            <span className={`${styles.checkpoint} ${styles.checkpoint2}`}><i />Photo on screen · {seconds(productAfter)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
