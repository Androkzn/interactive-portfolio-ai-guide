import styles from "./results.module.css";

// Before → after in one glance. Medians of 5 races of the home page on the
// mobile profile (390 px, slow 4G, 4× CPU), original d0d11b6f vs Next.js
// 8ba6e89f, run through the same race Worker on 2026-11-24.
const RESULTS = [
  { label: "Main content on screen", sub: "Largest contentful paint", before: "4.4 s", after: "2.1 s", gain: "2× faster" },
  { label: "Page fully loaded", sub: "Load event", before: "> 30 s", after: "2.4 s", gain: "12× faster" },
  { label: "Data downloaded", sub: "Page weight", before: "5.9 MB", after: "0.86 MB", gain: "7× less" },
  { label: "Page frozen while loading", sub: "Total blocking time", before: "455 ms", after: "227 ms", gain: "2× less" },
];

export function RaceResults() {
  return (
    <section className={styles.results} aria-labelledby="race-results-title">
      <p className={styles.kicker}>The result</p>
      <h2 id="race-results-title" className={styles.title}>Same site, same content. Twice as fast on a phone.</h2>
      <p className={styles.lede}>
        Before: the original site, never tuned. After: rebuilt in Next.js, with images resized and compressed, the main photo
        loaded first, and less JavaScript running at start.
      </p>
      <div className={styles.grid}>
        {RESULTS.map((r) => (
          <div key={r.label} className={styles.tile}>
            <span className={styles.label}>{r.label}</span>
            <span className={styles.sub}>{r.sub}</span>
            <span className={styles.values}><s>{r.before}</s> → <b>{r.after}</b></span>
            <span className={styles.gain}>{r.gain}</span>
          </div>
        ))}
      </div>
      <p className={styles.note}>Home page on a phone over slow 4G, median of 5 races. Don&apos;t take our word for it: race it yourself below.</p>
    </section>
  );
}
