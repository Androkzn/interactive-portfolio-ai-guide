"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowDown } from "lucide-react";
import resultsData from "@/lib/site-race/results-data.json";
import { PauseOffscreen } from "@/components/pause-offscreen";
import styles from "./results.module.css";

// Before → after across the site, mobile profile (390 px, slow 4G, 4× CPU): medians of the races
// in lib/site-race/results-data.json (scripts/site-race/build-results.mjs). A median that hit its
// cap is shown as "> cap"; a gap within single-run noise (the race's own draw rule) is shown as
// "≈ same", never as a win. Where the original stays close is said in words below the rows.
type Side = Record<string, number | null>;
type Cell = { races: number; beforeCapped: boolean; before: Side; after: Side; censored?: { before?: Record<string, boolean>; after?: Record<string, boolean> } };
const cells = resultsData.cells as unknown as Record<string, Cell>;
const home = cells["home/mobile"];
const model = cells["model/mobile"];
const desktopModel = cells["model/desktop"];

/** Where the races behind these medians stopped a lane (build-results.mjs records it; older files: 30 s). */
const CAP_MS = (resultsData as { capMs?: number }).capMs ?? 30000;
const CAP_S = Math.round(CAP_MS / 100) / 10;
const sec = (ms: number | null) => Number(((ms ?? 0) / 1000).toFixed(2));
const mb = (kb: number | null) => Number(((kb ?? 0) / 1024).toFixed(2));

type Unit = "s" | "ms" | "MB";
type Row = {
  label: string; sub: string; unit: Unit; before: number; after: number; capped: boolean; afterCapped: boolean;
  /** Bar lengths on the row's own scale: the longer side is the full track. */
  wBefore: number; wAfter: number;
  gain: string; atLeast: boolean; gainWord: string; hero?: boolean; same: boolean;
};
type Spec = { key: string; label: string; sub: string; unit: Unit; word: string; hero?: boolean; pct?: boolean };

/** The race's draw thresholds (lib/site-race/scoring.ts NOISE): timings, blocking time, bytes. */
const noiseFor = (key: string) => (key === "tbt" ? { abs: 300, rel: 0.4 } : /kb|Kb/.test(key) ? { abs: 10, rel: 0.02 } : { abs: 250, rel: 0.1 });

/** Older results files carry only `beforeCapped` (the load event hit the cap), not per-metric flags. */
const beforeCensored = (cell: Cell, key: string, value: number) =>
  cell.censored ? !!cell.censored.before?.[key] : (key === "load" && cell.beforeCapped) || (key === "lcp" && value >= CAP_MS);

function row(cell: Cell | undefined, spec: Spec): Row | null {
  const b = cell?.before[spec.key], a = cell?.after[spec.key];
  if (b == null || a == null || !cell) return null;
  const bc = beforeCensored(cell, spec.key, b), ac = !!cell.censored?.after?.[spec.key];
  const value = (v: number) => (spec.unit === "s" ? sec(v) : spec.unit === "MB" ? mb(v) : Math.round(v));
  const noise = noiseFor(spec.key);
  const within = Math.abs(b - a) <= Math.max(noise.abs, Math.max(b, a) * noise.rel);
  // A lower bound on the original's side that is already worse is a real win; anything else within noise is a draw.
  const same = ac || (within && !(bc && b > a));
  const r = b / Math.max(a, 1e-9);
  const gain = same ? "≈" : spec.pct ? `${Math.round((1 - a / Math.max(b, 1)) * 100)}%` : `${r >= 9.5 ? Math.round(r) : r.toFixed(1)}×`;
  const top = Math.max(a, b, 1e-9);
  return {
    label: spec.label, sub: spec.sub, unit: spec.unit, before: value(b), after: value(a), capped: bc, afterCapped: ac,
    wBefore: Math.max(0.02, b / top), wAfter: Math.max(0.02, a / top),
    gain, atLeast: bc && !same && !spec.pct, gainWord: same ? "about the same" : spec.word, hero: spec.hero, same,
  };
}

const firstLoad = (product: boolean): Spec[] => [
  { key: "lcp", label: product ? "Product photo on screen" : "Main content on screen", sub: "Largest contentful paint", unit: "s", word: "faster", hero: true },
  { key: "load", label: "Page fully loaded", sub: "Load event", unit: "s", word: "faster" },
  { key: "totalKb", label: "Data downloaded", sub: "Page weight", unit: "MB", word: "lighter" },
  ...(product ? [] : [{ key: "tbt", label: "Page frozen while loading", sub: "Total blocking time", unit: "ms", word: "less blocking", pct: true } as Spec]),
];

const GROUPS = [
  { id: "product", title: "Product page", note: "A pump model's page, opened cold: its large product render is the main content.", rows: firstLoad(true).map((s) => row(model, s)) },
  { id: "home", title: "Home page", note: "The first page a visitor opens, cold.", rows: firstLoad(false).map((s) => row(home, s)) },
  { id: "journey", title: "Then the visitor taps on", note: "From the catalogue, a tap on the HR40-5RZ card: scroll to it, tap, wait for the page.", rows: [
    row(home, { key: "tap:hr40-5rz:content", label: "Tap → product page", sub: "Its heading on screen", unit: "s", word: "faster", hero: true }),
    row(home, { key: "tap:hr40-5rz:image", label: "Tap → product photo", sub: "Loaded, decoded, painted", unit: "s", word: "faster" }),
    row(home, { key: "tap:hr40-5rz:kb", label: "Downloaded for it", sub: "From scrolling to the card on", unit: "MB", word: "less" }),
  ] },
  { id: "return", title: "And comes back", note: "The home page again in the same browser, cache on.", rows: [
    row(home, { key: "repeatLcp", label: "Main content again", sub: "Largest contentful paint", unit: "s", word: "faster" }),
    row(home, { key: "repeatKb", label: "Downloaded again", sub: "What the cache did not cover", unit: "MB", word: "less" }),
  ] },
].map((group) => ({ ...group, rows: group.rows.filter((item): item is Row => item !== null) })).filter((group) => group.rows.length > 0);

const anyCapped = GROUPS.some((group) => group.rows.some((r) => r.capped));
/** The headline's "before": "over <cap>" when the original's product photo never painted in time. */
const productBefore = model.before.lcp ?? CAP_MS;
const productBeforeText = beforeCensored(model, "lcp", productBefore) ? `over ${CAP_S} s` : `${Number((productBefore / 1000).toFixed(1))} s`;
const show = (v: number, unit: string, capped?: boolean) => `${capped ? "> " : ""}${v} ${unit}`;
const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

export function RaceResults() {
  return (
    <section className={styles.results} aria-labelledby="race-results-title">
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.top}>
        <div>
        <p className={styles.kicker}><i aria-hidden="true" />The result · phone on slow 4G</p>
        <h2 id="race-results-title" className={styles.title}>
          Same site, same content.<br /><span>The product page: from {productBeforeText} to {Number(((model.after.lcp ?? 0) / 1000).toFixed(1))}&nbsp;s.</span>
        </h2>
        <p className={styles.lede}>
          Before: the original site, never tuned. After: rebuilt in Next.js, with images sized for the screen, the main photo loaded
          first, less work at start, and the next page fetched while the visitor&apos;s finger is still on the link.
        </p>
        </div>
        {/* The one action on this block, up where the eye lands first. */}
        <p className={styles.ctaWrap}>
          <span>Don&apos;t take our word for it.</span>
          <a className={styles.cta} href="#race"><span className={styles.ctaGlow} aria-hidden="true" /><span className={styles.ctaLift} aria-hidden="true" /><span className={styles.ctaRing} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></span><span className={styles.ctaFace} aria-hidden="true" />Race it yourself <ArrowDown size={18} aria-hidden="true" /></a>
        </p>
        <PauseOffscreen />
      </div>

      <div className={styles.board}>
        <div className={styles.head}>
          <span className={styles.colLabel}>Metric</span>
          <p className={styles.legend}>
            <span><i className={styles.keyBefore} aria-hidden="true" />Before · original site</span>
            <span><i className={styles.keyAfter} aria-hidden="true" />After · Next.js</span>
            {anyCapped && <span><i className={styles.keyCapped} aria-hidden="true" />Still loading at the {CAP_S}&nbsp;s cut-off</span>}
          </p>
          <span className={cx(styles.colLabel, styles.colGain)}>Gain</span>
        </div>
        {GROUPS.map((group) => <Group key={group.id} {...group} />)}
      </div>

      <footer className={styles.foot}>
        <ul className={styles.facts}>
          <li>Medians of {Math.min(home.races, model.races)} races per page, in the same cloud Chrome as the race below.</li>
          <li>On a desktop, the product page downloads <b>{mb(desktopModel.before.totalKb)}&nbsp;MB</b> on the original and <b>{mb(desktopModel.after.totalKb)}&nbsp;MB</b> here.</li>
          <li>Where the original stays close: it runs a little less JavaScript, so on pages without heavy images its blocking time can be lower. That is React&apos;s start-up cost, and the race shows it.</li>
        </ul>
      </footer>
    </section>
  );
}

/** One page's rows. They replay the race once the group scrolls into view: both bars grow at the
 *  same speed, so the after bar stops early and the gain lands when the original finishes. */
function Group({ id, title, note, rows }: { id: string; title: string; note: string; rows: Row[] }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Set on the element directly: the CSS waits for it, and nothing needs a re-render.
    const play = () => { el.dataset.play = ""; };
    if (typeof IntersectionObserver === "undefined") return play();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { play(); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className={styles.group} aria-labelledby={`race-results-${id}`}>
      <h3 id={`race-results-${id}`} className={styles.groupTitle}>{title}<small>{note}</small></h3>
      <ol className={styles.rows}>
        {rows.map((r, index) => (
          <li key={r.label} className={cx(styles.row, r.hero && styles.rowHero, r.same && styles.rowSame)} style={{ "--i": index, "--wb": r.wBefore, "--wa": r.wAfter } as CSSProperties}>
            <div className={styles.metric}><b>{r.label}</b><small>{r.sub}</small></div>
            <div className={styles.bars}>
              <div className={cx(styles.bar, styles.barBefore, r.capped && styles.capped)}>
                <i aria-hidden="true" /><span className={styles.value}><span className={styles.sr}>Before: </span>{show(r.before, r.unit, r.capped)}</span>
              </div>
              <div className={cx(styles.bar, styles.barAfter)}>
                <i aria-hidden="true" /><span className={styles.value}><span className={styles.sr}>After: </span>{show(r.after, r.unit, r.afterCapped)}</span>
              </div>
            </div>
            <p className={styles.gain}>
              <strong>{r.atLeast && <><span className={styles.sr}>over </span><span className={styles.gt} aria-hidden="true">&gt;</span></>}{r.gain}</strong>
              <small>{r.gainWord}</small>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
