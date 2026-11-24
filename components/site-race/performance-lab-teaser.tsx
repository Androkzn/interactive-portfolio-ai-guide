import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Gauge, Image as ImageIcon, TimerReset, Zap } from "lucide-react";
import styles from "./performance-lab-teaser.module.css";

function NextMark() {
  return <svg viewBox="0 0 48 48" role="img" aria-label="Next.js logo"><circle cx="24" cy="24" r="23" fill="#fff" /><path d="M14 14v20M15 14l20 28M28 14h6v20" fill="none" stroke="#111" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

const seconds = (value: number | null | undefined) => value == null ? "—" : `${(value / 1000).toFixed(1)}s`;
const megabytes = (value: number | null | undefined) => value == null ? "—" : `${(value / 1024).toFixed(1)}MB`;
const reduction = (before: number | null | undefined, after: number | null | undefined) => before && after ? Math.max(0, Math.round((1 - after / before) * 100)) : null;

export function PerformanceLabTeaser() {
  // Same numbers as the lab's result block (components/site-race/results.tsx): home page,
  // mobile slow 4G, median of 5 races, the live original vs the live Next.js build.
  const before = { lcp: 4400, pageKb: 5905 };
  const after = { lcp: 2060, pageKb: 811 };
  const lcpGain = reduction(before?.lcp, after?.lcp);
  const weightGain = reduction(before?.pageKb, after?.pageKb);

  return (
    <section className={styles.section} id="performance-lab" aria-labelledby="performance-lab-title">
      <div className={styles.card}>
        <div className={styles.copy}>
          <div className={styles.kicker}><Gauge size={15} />Live performance lab <span>Next.js 16</span></div>
          <div className={styles.nextIdentity}><span className={styles.nextLogo}><NextMark /></span><span><small>Performance rebuild</small><strong>Built and optimized with Next.js</strong></span></div>
          <h2 id="performance-lab-title">Original site.<br /><span>Next.js optimized.</span><br /><em>Race them live.</em></h2>
          <p>Same pages. Same content. One live race through a real visit: open the home page, tap a pump model, see its page.</p>
          <div className={styles.proof} aria-label="Measured mobile improvements">
            <span><TimerReset size={16} /><b>{lcpGain == null ? "Faster" : `${lcpGain}%`}</b><small>lower median LCP</small></span>
            <span><ImageIcon size={16} /><b>{weightGain == null ? "Lighter" : `${weightGain}%`}</b><small>less page weight</small></span>
          </div>
          <Link className={styles.cta} href="/lab/site-race/">See the result · race it live <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>

        <div className={styles.visual} aria-label="Animated comparison of the original site and the Next.js optimized site">
          <div className={styles.visualHead}><span><i />Home page · phone on slow 4G · median of 5 races</span><span className={styles.nextChip}><NextMark /> Next.js</span></div>
          <div className={styles.scoreboard}>
            <div className={styles.scoreOriginal}><span>Original site</span><strong>{seconds(before?.lcp)}</strong><small>main content on screen</small></div>
            <div className={styles.racePulse} aria-hidden="true"><Zap size={18} fill="currentColor" /></div>
            <div className={styles.scoreNext}><span>Next.js optimized</span><strong>{seconds(after?.lcp)}</strong><small>main content on screen</small></div>
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
              <div className={styles.chartTitle}><span>Page weight</span><b>{weightGain == null ? "Reduced" : `−${weightGain}%`}</b></div>
              <div className={styles.weightRow}><span>Original</span><div><i className={styles.weightBefore} /></div><b>{megabytes(before?.pageKb)}</b></div>
              <div className={styles.weightRow}><span>Next.js</span><div><i className={styles.weightAfter} /></div><b>{megabytes(after?.pageKb)}</b></div>
              <div className={styles.optimizations}><span>AVIF</span><span>LCP priority</span><span>Less JS</span><span>Prefetch</span></div>
            </div>
          </div>
          <div className={styles.timeline} aria-hidden="true">
            {["Open home", "Tap a model", "Model page"].map((step, index) => <span key={step} className={index === 2 ? styles.timelineDone : ""}><i />{step}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}
