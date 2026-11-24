import type { CSSProperties } from "react";
import { Gauge, ImageDown, TimerReset, Zap } from "lucide-react";
import styles from "./results.module.css";

// Before → after in one glance. Medians of 5 races of the home page on the
// mobile profile (390 px, slow 4G, 4× CPU), original d0d11b6f vs Next.js
// 56ce28ef, run through the same race Worker on 2026-11-24.
const RESULTS = [
  { icon: Zap, label: "Main content on screen", sub: "Largest contentful paint", before: 4.4, after: 2.06, unit: "s", gain: "2.1×", gainWord: "faster" },
  { icon: TimerReset, label: "Page fully loaded", sub: "Load event", before: 30, after: 2.4, unit: "s", capped: true, gain: "12×", gainWord: "faster" },
  { icon: ImageDown, label: "Data downloaded", sub: "Page weight", before: 5.9, after: 0.81, unit: "MB", gain: "7×", gainWord: "lighter" },
  { icon: Gauge, label: "Page frozen while loading", sub: "Total blocking time", before: 640, after: 385, unit: "ms", gain: "−40%", gainWord: "blocking" },
];

const show = (v: number, unit: string) => `${v} ${unit}`;

export function RaceResults() {
  return (
    <section className={styles.results} aria-labelledby="race-results-title">
      <div className={styles.glow} aria-hidden="true" />
      <p className={styles.kicker}><i aria-hidden="true" />The result</p>
      <h2 id="race-results-title" className={styles.title}>
        Same site, same content.<br /><span>Twice as fast on a phone.</span>
      </h2>
      <p className={styles.lede}>
        Before: the original site, never tuned. After: rebuilt in Next.js, with images resized and compressed, the main photo
        loaded first, and less JavaScript running at start.
      </p>
      <div className={styles.grid}>
        {RESULTS.map((r, index) => {
          const Icon = r.icon;
          const ratio = Math.max(0.04, r.after / r.before);
          return (
            <article key={r.label} className={styles.tile} style={{ "--delay": `${index * 120}ms`, "--after": ratio } as CSSProperties}>
              <header className={styles.tileHead}>
                <span className={styles.icon}><Icon size={18} aria-hidden="true" /></span>
                <span><b>{r.label}</b><small>{r.sub}</small></span>
              </header>
              <p className={styles.gain}><strong>{r.gain}</strong> {r.gainWord}</p>
              <div className={styles.bars}>
                <div className={styles.barRow}>
                  <span className={styles.barLabel}>Before</span>
                  <div className={styles.track}><i className={`${styles.barBefore} ${r.capped ? styles.capped : ""}`} /></div>
                  <span className={styles.valueBefore}>{r.capped ? `> ${show(r.before, r.unit)}` : show(r.before, r.unit)}</span>
                </div>
                <div className={styles.barRow}>
                  <span className={styles.barLabel}>After</span>
                  <div className={styles.track}><i className={styles.barAfter} /></div>
                  <span className={styles.valueAfter}>{show(r.after, r.unit)}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className={styles.note}>
        Home page on a phone over slow 4G, median of 5 races. “&gt; 30 s”: the original was still loading when the race stopped it.
        <b> Don&apos;t take our word for it: race it yourself below ↓</b>
      </p>
    </section>
  );
}
