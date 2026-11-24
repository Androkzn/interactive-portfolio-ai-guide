import type { CSSProperties } from "react";
import { Gauge, ImageDown, PackageOpen, TimerReset, Zap } from "lucide-react";
import resultsData from "@/lib/site-race/results-data.json";
import styles from "./results.module.css";

// Before → after across the site, mobile profile (390 px, slow 4G, 4× CPU): medians of the races
// in lib/site-race/results-data.json (scripts/site-race/build-results.mjs). A median that hit its
// cap is shown as "> cap"; a gap within single-run noise (the race's own draw rule) is shown as
// "≈ same", never as a win. Where the original stays close is said in words below the tiles.
type Side = Record<string, number | null>;
type Cell = { races: number; beforeCapped: boolean; before: Side; after: Side; censored?: { before?: Record<string, boolean>; after?: Record<string, boolean> } };
const cells = resultsData.cells as unknown as Record<string, Cell>;
const home = cells["home/mobile"];
const model = cells["model/mobile"];
const desktopModel = cells["model/desktop"];

const sec = (ms: number | null) => Number(((ms ?? 0) / 1000).toFixed(2));
const mb = (kb: number | null) => Number(((kb ?? 0) / 1024).toFixed(2));

type Unit = "s" | "ms" | "MB";
type Tile = { icon: typeof Zap; label: string; sub: string; before: number; after: number; unit: Unit; capped?: boolean; afterCapped?: boolean; gain: string; gainWord: string; hero?: boolean; same?: boolean };
type Spec = { key: string; icon: typeof Zap; label: string; sub: string; unit: Unit; word: string; hero?: boolean; pct?: boolean };

/** The race's draw thresholds (lib/site-race/scoring.ts NOISE): timings, blocking time, bytes. */
const noiseFor = (key: string) => (key === "tbt" ? { abs: 300, rel: 0.4 } : /kb|Kb/.test(key) ? { abs: 10, rel: 0.02 } : { abs: 250, rel: 0.1 });

function tile(cell: Cell | undefined, spec: Spec): Tile | null {
  const b = cell?.before[spec.key], a = cell?.after[spec.key];
  if (b == null || a == null || !cell) return null;
  const bc = !!cell.censored?.before?.[spec.key], ac = !!cell.censored?.after?.[spec.key];
  const value = (v: number) => (spec.unit === "s" ? sec(v) : spec.unit === "MB" ? mb(v) : Math.round(v));
  const noise = noiseFor(spec.key);
  const within = Math.abs(b - a) <= Math.max(noise.abs, Math.max(b, a) * noise.rel);
  // A lower bound on the original's side that is already worse is a real win; anything else within noise is a draw.
  const same = ac || (within && !(bc && b > a));
  const r = b / Math.max(a, 1e-9);
  const gain = same ? "≈" : spec.pct ? `−${Math.round((1 - a / Math.max(b, 1)) * 100)}%` : `${bc ? "> " : ""}${r >= 9.5 ? Math.round(r) : r.toFixed(1)}×`;
  return { icon: spec.icon, label: spec.label, sub: spec.sub, before: value(b), after: value(a), unit: spec.unit, capped: bc, afterCapped: ac, gain, gainWord: same ? "about the same" : spec.word, hero: spec.hero, same };
}

const firstLoad = (cell: Cell | undefined, product: boolean): Spec[] => ([
  { key: "lcp", icon: Zap, label: product ? "Product photo on screen" : "Main content on screen", sub: "Largest contentful paint", unit: "s", word: "faster", hero: true },
  { key: "load", icon: TimerReset, label: "Page fully loaded", sub: "Load event", unit: "s", word: "faster" },
  { key: "totalKb", icon: ImageDown, label: "Data downloaded", sub: "Page weight", unit: "MB", word: "lighter" },
  ...(product ? [] : [{ key: "tbt", icon: Gauge, label: "Page frozen while loading", sub: "Total blocking time", unit: "ms", word: "blocking", pct: true }]),
] as Spec[]).filter(() => !!cell);

const GROUPS = [
  { id: "product", title: "Product page", note: "A pump model's page, opened cold: its large product render is the main content.", items: firstLoad(model, true).map((s) => tile(model, s)) },
  { id: "home", title: "Home page", note: "The first page a visitor opens, cold.", items: firstLoad(home, false).map((s) => tile(home, s)) },
  { id: "journey", title: "Then the visitor taps on", note: "From the catalogue, a tap on the HR40-5RZ card: scroll to it, tap, wait for the page.", items: [
    tile(home, { key: "tap:hr40-5rz:content", icon: Zap, label: "Tap → product page", sub: "Its heading on screen", unit: "s", word: "faster", hero: true }),
    tile(home, { key: "tap:hr40-5rz:image", icon: ImageDown, label: "Tap → product photo", sub: "Loaded, decoded, painted", unit: "s", word: "faster" }),
    tile(home, { key: "tap:hr40-5rz:kb", icon: PackageOpen, label: "Downloaded for it", sub: "From scrolling to the card on", unit: "MB", word: "less" }),
  ] },
  { id: "return", title: "And comes back", note: "The home page again in the same browser, cache on.", items: [
    tile(home, { key: "repeatLcp", icon: TimerReset, label: "Main content again", sub: "Largest contentful paint", unit: "s", word: "faster" }),
    tile(home, { key: "repeatKb", icon: ImageDown, label: "Downloaded again", sub: "What the cache did not cover", unit: "MB", word: "less" }),
  ] },
].map((group) => ({ ...group, items: group.items.filter((item): item is Tile => item !== null) })).filter((group) => group.items.length > 0);

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
                <article key={r.label} className={`${styles.tile} ${r.hero ? styles.tileHero : ""} ${r.same ? styles.tileSame : ""}`} style={{ "--delay": `${index * 110}ms`, "--after": ratio } as CSSProperties}>
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
                      <span className={styles.valueAfter}>{r.afterCapped ? `> ${show(r.after, r.unit)}` : show(r.after, r.unit)}</span>
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
