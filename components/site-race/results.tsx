import type { CSSProperties } from "react";
import { Gauge, ImageDown, TimerReset, Zap } from "lucide-react";
import resultsData from "@/lib/site-race/results-data.json";
import styles from "./results.module.css";

// Before → after in one glance: home page, mobile profile (390 px, slow 4G, 4× CPU), medians of
// the races in lib/site-race/results-data.json (scripts/site-race/build-results.mjs).
const cell = resultsData.cells["home/mobile"];
const ratio = (before: number, after: number) => before / Math.max(after, 1e-9);
const times = (r: number) => `${r >= 9.5 ? Math.round(r) : r.toFixed(1)}×`;
const sec = (ms: number) => Number((ms / 1000).toFixed(2));
const lcp = { before: sec(cell.before.lcp ?? 0), after: sec(cell.after.lcp ?? 0) };
const load = { before: sec(cell.before.load ?? 0), after: sec(cell.after.load ?? 0) };
const weight = { before: Number(((cell.before.totalKb ?? 0) / 1024).toFixed(1)), after: Number(((cell.after.totalKb ?? 0) / 1024).toFixed(2)) };
const tbt = { before: Math.round(cell.before.tbt ?? 0), after: Math.round(cell.after.tbt ?? 0) };
const RESULTS: { icon: typeof Zap; label: string; sub: string; before: number; after: number; unit: string; capped?: boolean; gain: string; gainWord: string }[] = [
  { icon: Zap, label: "Main content on screen", sub: "Largest contentful paint", ...lcp, unit: "s", gain: times(ratio(lcp.before, lcp.after)), gainWord: "faster" },
  { icon: TimerReset, label: "Page fully loaded", sub: "Load event", ...load, unit: "s", capped: cell.beforeCapped, gain: times(ratio(load.before, load.after)), gainWord: "faster" },
  { icon: ImageDown, label: "Data downloaded", sub: "Page weight", ...weight, unit: "MB", gain: times(ratio(weight.before, weight.after)), gainWord: "lighter" },
  { icon: Gauge, label: "Page frozen while loading", sub: "Total blocking time", ...tbt, unit: "ms", gain: `−${Math.round((1 - tbt.after / Math.max(tbt.before, 1)) * 100)}%`, gainWord: "blocking" },
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
        Home page on a phone over slow 4G, median of {cell.races} races. “&gt; 30 s”: the original was still loading when the race stopped it.
        <b> Don&apos;t take our word for it: race it yourself below ↓</b>
      </p>
    </section>
  );
}
