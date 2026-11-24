import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Gauge, Image as ImageIcon, TimerReset, Zap } from "lucide-react";
import resultsData from "@/lib/site-race/results-data.json";
import styles from "./performance-lab-teaser.module.css";

function NextMark() {
  return <svg viewBox="0 0 48 48" role="img" aria-label="Next.js logo"><circle cx="24" cy="24" r="23" fill="#fff" /><path d="M14 14v20M15 14l20 28M28 14h6v20" fill="none" stroke="#111" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/*
 * Race-lane art: both cars and the flag are original inline SVG drawn for this site
 * (no third-party assets, no logos, liveries or badges), so no licence applies beyond the repo's own.
 * Shading is done with gradients only; motion uses CSS transform/opacity (see the .module.css).
 */
function RaceCar() {
  return (
    <svg viewBox="0 0 220 64" className={styles.carSvg}>
      <defs>
        <linearGradient id="f1Body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d6ceff" /><stop offset=".35" stopColor="#9085e9" /><stop offset=".75" stopColor="#5546b8" /><stop offset="1" stopColor="#2b2266" /></linearGradient>
        <linearGradient id="f1Carbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a3d44" /><stop offset="1" stopColor="#0c0d10" /></linearGradient>
        <radialGradient id="tyre" cx=".45" cy=".4" r=".6"><stop offset=".6" stopColor="#2a2b2e" /><stop offset=".9" stopColor="#111" /><stop offset="1" stopColor="#050505" /></radialGradient>
        <radialGradient id="rim" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#f4f4f6" /><stop offset=".55" stopColor="#8d8f97" /><stop offset="1" stopColor="#3b3d44" /></radialGradient>
        <radialGradient id="carShadow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#000" stopOpacity=".75" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="110" cy="60" rx="104" ry="5" fill="url(#carShadow)" />
      <g className={styles.carBody}>
        {/* rear wing */}
        <path d="M10 10h26l-2 6H12z" fill="url(#f1Carbon)" /><path d="M12 9h24" stroke="#b9aeff" strokeWidth="1.4" />
        <path d="M14 16h5l9 24h-6z" fill="#17181c" />
        {/* floor + sidepod */}
        <path d="M24 46h168l10 4H30z" fill="#0d0e11" />
        <path d="M30 44c4-14 22-20 44-21l40-1c12 0 18 4 26 9l38 8c10 2 18 3 24 6v4H34z" fill="url(#f1Body)" />
        <path d="M58 36c20-3 60-4 96 1" stroke="#ffffff" strokeOpacity=".55" strokeWidth="1.3" fill="none" />
        <path d="M120 41l66 3" stroke="#d4ff76" strokeWidth="2" strokeLinecap="round" />
        {/* engine cover / airbox */}
        <path d="M48 26c6-9 18-12 30-12 8 0 12 3 14 8l-4 8H52z" fill="url(#f1Body)" />
        <path d="M80 14c3 0 6 2 7 6" stroke="#fff" strokeOpacity=".6" strokeWidth="1.2" fill="none" />
        {/* cockpit, helmet, halo */}
        <path d="M92 24h32l6 8H90z" fill="#08090b" />
        <circle cx="104" cy="22" r="7" fill="#efeff2" /><path d="M99 21h11v3H99z" fill="#2b2266" /><path d="M100 19c2-3 6-3 8-1" stroke="#fff" strokeWidth="1" fill="none" />
        <path d="M90 26c8-9 26-10 38-1" stroke="#1a1b20" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* nose + front wing */}
        <path d="M170 46l38 2v4h-40z" fill="url(#f1Carbon)" /><path d="M196 42h16l2 10h-18z" fill="#17181c" /><path d="M198 42h14" stroke="#b9aeff" strokeWidth="1.2" />
        {/* suspension arms */}
        <path d="M40 40l14-2M160 40l-12-2M176 44l-14-6" stroke="#2c2e34" strokeWidth="1.6" />
      </g>
      <Wheel cx={42} cy={44} r={16} />
      <Wheel cx={168} cy={45} r={15} />
    </svg>
  );
}

function CityCar() {
  return (
    <svg viewBox="0 0 120 72" className={styles.carSvg}>
      <defs>
        <linearGradient id="hatchBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffc09a" /><stop offset=".3" stopColor="#ff8a4c" /><stop offset=".8" stopColor="#d95926" /><stop offset="1" stopColor="#8a3412" /></linearGradient>
        <linearGradient id="hatchGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c6dcea" /><stop offset=".5" stopColor="#4b6272" /><stop offset="1" stopColor="#1d2a33" /></linearGradient>
      </defs>
      <ellipse cx="60" cy="67" rx="56" ry="4.5" fill="url(#carShadow)" />
      <g className={styles.carBody}>
        <path d="M8 52V38c0-6 3-9 8-11l14-3 10-14c3-3 6-4 10-4h28c6 0 9 3 12 7l12 14c8 1 14 4 15 10l1 15z" fill="url(#hatchBody)" />
        <path d="M37 24l9-12c2-2 4-3 7-3h10v15zM67 9h10c4 0 6 2 8 4l9 11H67z" fill="url(#hatchGlass)" />
        <path d="M65 9v40" stroke="#8a3412" strokeWidth="1.4" />
        <path d="M14 30c30-4 70-4 96 0" stroke="#fff" strokeOpacity=".5" strokeWidth="1.3" fill="none" />
        <path d="M71 31h7" stroke="#5c2208" strokeWidth="2" strokeLinecap="round" />
        <rect x="104" y="33" width="9" height="6" rx="2" fill="#fff6d8" /><rect x="7" y="32" width="5" height="7" rx="1.5" fill="#c22a15" />
        <path d="M6 50h108v4H6z" fill="#2a1c16" />
      </g>
      <Wheel cx={28} cy={55} r={11} small />
      <Wheel cx={92} cy={55} r={11} small />
    </svg>
  );
}

function Wheel({ cx, cy, r, small }: { cx: number; cy: number; r: number; small?: boolean }) {
  const spokes = small ? 4 : 5;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="url(#tyre)" />
      <g className={small ? styles.wheelSlow : styles.wheelFast}>
        <circle cx={cx} cy={cy} r={r * .62} fill="url(#rim)" />
        {Array.from({ length: spokes }, (_, i) => <path key={i} d={`M${cx} ${cy}L${cx} ${cy - r * .58}`} stroke="#2a2c31" strokeWidth={r * .14} strokeLinecap="round" transform={`rotate(${(360 / spokes) * i} ${cx} ${cy})`} />)}
        <circle cx={cx} cy={cy} r={r * .16} fill="#d4ff76" />
      </g>
    </g>
  );
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
              <div className={`${styles.runner} ${styles.runnerNext}`}><div className={styles.speedLines}><i /><i /><i /></div><div className={styles.carNext}><RaceCar /></div></div>
            </div>
            <div className={`${styles.lane} ${styles.laneOriginal}`}>
              <div className={`${styles.runner} ${styles.runnerOriginal}`}><div className={styles.carOriginal}><CityCar /></div></div>
            </div>
          </div>
          <div className={styles.timeline} aria-hidden="true">
            {["Home page", "Product page", "Race it live"].map((step, index) => <span key={step} className={index === 2 ? styles.timelineDone : ""}><i />{step}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}
