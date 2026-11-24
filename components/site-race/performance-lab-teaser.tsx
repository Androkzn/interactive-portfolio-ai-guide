import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Gauge, Image as ImageIcon, TimerReset, Zap } from "lucide-react";
import resultsData from "@/lib/site-race/results-data.json";
import styles from "./performance-lab-teaser.module.css";
import { F1Car, Hatchback } from "./race-cars";

function NextMark() {
  return <svg viewBox="0 0 48 48" role="img" aria-label="Next.js logo"><circle cx="24" cy="24" r="23" fill="#fff" /><path d="M14 14v20M15 14l20 28M28 14h6v20" fill="none" stroke="#111" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CheckeredFlag() {
  const cells = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) if ((x + y) % 2 === 0) cells.push(<rect key={`${x}-${y}`} x={x * 5} y={y * 5} width="5" height="5" />);
  return (
    <svg viewBox="0 0 34 52" className={styles.flagSvg}>
      <rect x="1" y="0" width="2" height="52" rx="1" fill="#c9ccc3" />
      <g className={styles.flagCloth}><rect x="3" y="1" width="30" height="20" fill="#f5f4ee" /><g fill="#111" transform="translate(3 1)">{cells}</g></g>
    </svg>
  );
}

const seconds = (value: number | null | undefined) => value == null ? "—" : `${(value / 1000).toFixed(1)}s`;
const megabytes = (value: number | null | undefined) => value == null ? "—" : `${(value / 1024).toFixed(1)}MB`;
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
          <p>Same pages. Same content. On a phone, a product page whose photo did not appear within 30 seconds now shows it in {seconds(productAfter)}.</p>
          <div className={styles.proof} aria-label="Measured mobile improvements">
            <span><TimerReset size={16} /><b>{productLcpX ? `${product.beforeCapped ? "> " : ""}${productLcpX}` : "Faster"}</b><small>faster product page</small></span>
            <span><TimerReset size={16} /><b>{homeLcpX ?? "Faster"}</b><small>faster home page</small></span>
            <span><ImageIcon size={16} /><b>{productWeightX ?? "Lighter"}</b><small>less data</small></span>
          </div>
          <Link className={styles.cta} href="/lab/site-race/">See the result · race it live <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>

        <div className={styles.visual} aria-label="Animated comparison of the original site and the Next.js optimized site">
          <div className={styles.visualHead}><span><i />Product page · phone on slow 4G · median of {product.races} races</span><span className={styles.nextChip}><NextMark /> Next.js</span></div>
          <div className={styles.scoreboard}>
            <div className={styles.scoreOriginal}><span>Original site</span><strong>{product.beforeCapped ? "> 30s" : seconds(product.before.lcp)}</strong><small>product photo on screen</small></div>
            <div className={styles.racePulse} aria-hidden="true"><Zap size={18} fill="currentColor" /></div>
            <div className={styles.scoreNext}><span>Next.js optimized</span><strong>{seconds(productAfter)}</strong><small>product photo on screen</small></div>
          </div>
          <div className={styles.chartGrid}>
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}><span>Loading progress</span><b><ArrowDownRight size={14} /> LCP</b></div>
              <svg className={styles.sparkline} viewBox="0 0 360 112" preserveAspectRatio="none" aria-hidden="true">
                <path className={styles.gridLine} d="M0 24H360M0 56H360M0 88H360" />
                <path className={styles.originalLine} pathLength="1" d="M0 100 C45 98 72 94 105 90 S155 76 185 72 S242 54 275 45 S330 25 360 16" />
                <path className={styles.optimizedLine} pathLength="1" d="M0 100 C28 91 45 66 72 52 S116 30 145 22 S215 16 360 14" />
                <circle className={styles.chartDot} cx="145" cy="22" r="5" />
              </svg>
              <div className={styles.legend}><span><i className={styles.orange} />Original</span><span><i className={styles.purple} />Next.js</span></div>
            </div>
            <div className={styles.weightCard}>
              <div className={styles.chartTitle}><span>Product page weight</span><b>{weightGain == null ? "Reduced" : `−${weightGain}%`}</b></div>
              <div className={styles.weightRow}><span>Original</span><div><i className={styles.weightBefore} /></div><b>{megabytes(before?.pageKb)}</b></div>
              <div className={styles.weightRow}><span>Next.js</span><div><i className={styles.weightAfter} /></div><b>{megabytes(after?.pageKb)}</b></div>
              <div className={styles.optimizations}><span>Images sized</span><span>Photo first</span><span>Less JS</span><span>Next page early</span></div>
            </div>
          </div>
          <div className={styles.race} aria-hidden="true">
            <div className={styles.finishGlow} />
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
            {["Home page", "Product page", "Race it live"].map((step, index) => (
              <span key={step} className={`${styles.checkpoint} ${styles[`checkpoint${index}`]}`}><i />{step}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
