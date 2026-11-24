import type { CSSProperties } from "react";
import { Gauge, ImageDown, PackageOpen, TimerReset, Zap } from "lucide-react";
import resultsData from "@/lib/site-race/results-data.json";
import styles from "./results.module.css";

// Before → after across the site, mobile profile (390 px, slow 4G, 4× CPU): medians of
// the races in lib/site-race/results-data.json (scripts/site-race/build-results.mjs).
// Ordered by what a visitor feels first; where the original stays close is said in words.
type Cell = { races: number; beforeCapped: boolean; before: Record<string, number | null>; after: Record<string, number | null> };
const cells = resultsData.cells as Record<string, Cell>;
const home = cells["home/mobile"];
const model = cells["model/mobile"];
const desktopModel = cells["model/desktop"];

const sec = (ms: number | null) => Number(((ms ?? 0) / 1000).toFixed(2));
const mb = (kb: number | null) => Number(((kb ?? 0) / 1024).toFixed(2));
const times = (before: number, after: number, capped?: boolean) => {
  const r = before / Math.max(after, 1e-9);
  return `${capped ? "> " : ""}${r >= 9.5 ? Math.round(r) : r.toFixed(1)}×`;
};

type Tile = { icon: typeof Zap; label: string; sub: string; before: number; after: number; unit: string; capped?: boolean; gain: string; gainWord: string; hero?: boolean };

function tiles(cell: Cell, product: boolean): Tile[] {
  const lcp = { before: sec(cell.before.lcp), after: sec(cell.after.lcp) };
  const load = { before: sec(cell.before.load), after: sec(cell.after.load) };
  const weight = { before: mb(cell.before.totalKb), after: mb(cell.after.totalKb) };
  const capped = cell.beforeCapped;
  const lcpCapped = product && capped;
  const list: Tile[] = [
    { icon: Zap, label: product ? "Product photo on screen" : "Main content on screen", sub: "Largest contentful paint", ...lcp, unit: "s", capped: lcpCapped, gain: times(lcp.before, lcp.after, lcpCapped), gainWord: "faster", hero: true },
    { icon: TimerReset, label: "Page fully loaded", sub: "Load event", ...load, unit: "s", capped, gain: times(load.before, load.after, capped), gainWord: "faster" },
    { icon: ImageDown, label: "Data downloaded", sub: "Page weight", ...weight, unit: "MB", gain: times(weight.before, weight.after), gainWord: "lighter" },
  ];
  if (!product) {
    const tbt = { before: Math.round(cell.before.tbt ?? 0), after: Math.round(cell.after.tbt ?? 0) };
    list.push({ icon: Gauge, label: "Page frozen while loading", sub: "Total blocking time", ...tbt, unit: "ms", gain: `−${Math.round((1 - tbt.after / Math.max(tbt.before, 1)) * 100)}%`, gainWord: "blocking" });
  }
  return list;
}

const GROUPS = [
  { id: "product", title: "Product page", note: "A pump model's page: its large product render is the main content.", items: tiles(model, true) },
  { id: "home", title: "Home page", note: "The first page a visitor opens.", items: tiles(home, false) },
];

const show = (v: number, unit: string) => `${v} ${unit}`;

export function RaceResults() {
  return (
    <section className={styles.results} aria-labelledby="race-results-title">
      <div className={styles.glow} aria-hidden="true" />
      <p className={styles.kicker}><i aria-hidden="true" />The result · phone on slow 4G</p>
      <h2 id="race-results-title" className={styles.title}>
        Same site, same content.<br /><span>The product page: from over 30 s to {Number(((model.after.lcp ?? 0) / 1000).toFixed(1))} s.</span>
      </h2>
      <p className={styles.lede}>
        Before: the original site, never tuned. After: rebuilt in Next.js, with images sized for the screen, the main photo loaded
        first, less work at start, and the next page fetched while the visitor&apos;s finger is still on the link.
      </p>
      {GROUPS.map((group) => (
        <div key={group.id} className={styles.group}>
          <h3 className={styles.groupTitle}>{group.title}<small>{group.note}</small></h3>
          <div className={styles.grid}>
            {group.items.map((r, index) => {
              const Icon = r.icon;
              const ratio = Math.max(0.03, r.after / r.before);
              return (
                <article key={r.label} className={`${styles.tile} ${r.hero ? styles.tileHero : ""}`} style={{ "--delay": `${index * 110}ms`, "--after": ratio } as CSSProperties}>
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
        </div>
      ))}
      <ul className={styles.facts}>
        <li><PackageOpen size={15} aria-hidden="true" /><span>On a desktop, the product page downloads <b>{mb(desktopModel.before.totalKb)} MB</b> on the original and <b>{mb(desktopModel.after.totalKb)} MB</b> here.</span></li>
        <li><Gauge size={15} aria-hidden="true" /><span>Where the original stays close: it runs a little less JavaScript, so on pages without heavy images its blocking time can be lower. That is React&apos;s start-up cost, and the race shows it.</span></li>
      </ul>
      <p className={styles.note}>
        Medians of {Math.min(home.races, model.races)} races per page in the same cloud Chrome as the race below. “&gt; 30 s”: the original was still loading when the race stopped it.
        <b> Don&apos;t take our word for it: race it yourself below ↓</b>
      </p>
    </section>
  );
}
