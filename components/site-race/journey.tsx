"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Flag, GitCommitHorizontal, Route, Table2 } from "lucide-react";
import type { RacePageId, RaceProfile } from "@/packages/contracts/src/site-race";
import { RACE_PAGES } from "@/packages/contracts/src/site-race";
import { journey, originalStage, runFor, stageMetrics, stages, type PageMetrics, type StageId } from "@/lib/site-race/journey";
import { kb, ms } from "@/lib/site-race/scoring";
import styles from "./journey.module.css";

type JourneyPage = RacePageId | "all";
const PAGE_TABS: { id: JourneyPage; label: string }[] = [
  ...(Object.keys(RACE_PAGES) as RacePageId[]).map((id) => ({ id, label: RACE_PAGES[id].label })),
  { id: "all", label: "All 7 pages · median" },
];
const pathOf = (page: JourneyPage) => (page === "all" ? "*" : RACE_PAGES[page].path);

type MetricKey = "lcp" | "pageKb" | "imgKb" | "jsKb";
type Kind = "time" | "bytes";
const METRICS: { key: MetricKey; label: string; format: (v: number) => string; hint: string; kind: Kind }[] = [
  { key: "lcp", label: "Largest contentful paint", format: ms, hint: "When the main content is on screen", kind: "time" },
  { key: "pageKb", label: "Page weight", format: kb, hint: "Everything downloaded for one cold visit", kind: "bytes" },
  { key: "imgKb", label: "Image bytes", format: kb, hint: "Photos and product renders", kind: "bytes" },
  { key: "jsKb", label: "JavaScript", format: kb, hint: "Script bytes on the wire", kind: "bytes" },
];
const WORDS: Record<Kind, { better: string; worse: string }> = { time: { better: "faster", worse: "slower" }, bytes: { better: "smaller", worse: "larger" } };

function value(metrics: PageMetrics | null, key: MetricKey): number | null {
  if (!metrics) return null;
  const v = metrics[key];
  return typeof v === "number" ? v : null;
}

function Delta({ from, to, format, kind }: { from: number | null; to: number | null; format: (v: number) => string; kind: Kind }) {
  if (from === null || to === null || from === 0) return <span className={styles.deltaNone}>–</span>;
  const diff = to - from;
  if (Math.abs(diff) / from < 0.03) return <span className={styles.deltaFlat}>≈ same</span>;
  const better = diff < 0;
  const ratio = better ? from / to : to / from;
  return (
    <span className={better ? styles.deltaGood : styles.deltaBad}>
      {better ? <ArrowDownRight size={13} aria-hidden="true" /> : <ArrowUpRight size={13} aria-hidden="true" />}
      {better ? "−" : "+"}{format(Math.abs(diff))}
      <small>{` · ${ratio >= 1.95 ? `${ratio.toFixed(ratio >= 10 ? 0 : 1)}×` : `${Math.round((Math.abs(diff) / from) * 100)}%`} ${better ? WORDS[kind].better : WORDS[kind].worse}`}</small>
    </span>
  );
}

export function Journey({ page, profile, stage, onPage, onStage, onRace }: {
  page: RacePageId;
  profile: RaceProfile;
  stage: StageId;
  onPage: (page: RacePageId) => void;
  onStage: (stage: StageId) => void;
  onRace: (stage: StageId) => void;
}) {
  const [view, setView] = useState<JourneyPage>(page);
  const [selected, setSelected] = useState<StageId>(stage);
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const path = pathOf(view);
  // Follow the race's controls: picking a page or stage up there moves the journey too.
  useEffect(() => { setView((current) => (current === "all" ? current : page)); }, [page]);
  useEffect(() => { setSelected(stage); }, [stage]);

  const rows = useMemo(() => stages.map((item) => ({ stage: item, metrics: stageMetrics(item.id, path, profile), run: runFor(item.id) })), [path, profile]);
  const measured = rows.filter((row) => row.metrics);
  const first = rows[0];
  const last = measured[measured.length - 1];
  const index = stages.findIndex((item) => item.id === selected);
  const current = rows[index];
  const previous = rows.slice(0, index).reverse().find((row) => row.metrics) ?? null;

  const choosePage = (next: JourneyPage) => {
    setView(next);
    if (next !== "all") onPage(next);
  };
  const chooseStage = (next: StageId) => {
    setSelected(next);
    if (next !== "original") onStage(next);
  };

  const headline = first.metrics && last?.metrics && first.metrics.lcp !== null && last.metrics.lcp !== null
    ? { from: first.metrics.lcp, to: last.metrics.lcp } : null;

  return (
    <section className={styles.journey} id="journey" aria-labelledby="journey-title">
      <header className={styles.head}>
        <p className={styles.kicker}><Route size={14} aria-hidden="true" /> The optimization journey</p>
        <h2 id="journey-title">
          {headline ? <>{view === "all" ? "Median page" : RACE_PAGES[view as RacePageId].label}: <span className={styles.before}>{ms(headline.from)}</span> → <span className={styles.after}>{ms(headline.to)}</span></> : "One commit at a time."}
        </h2>
        <p className={styles.lede}>
          Every stage is a real deployment that is still online, so each one can race the original live. The numbers below come from the project&apos;s
          own performance report — real Chrome, cold cache, {profile === "mobile" ? "mobile on slow 4G with 4× CPU slowdown" : "desktop without throttling"}, one load per page.
        </p>
      </header>

      <div className={styles.filters}>
        <div className={styles.tabs} role="radiogroup" aria-label="Page">
          {PAGE_TABS.map((tab) => (
            <button key={tab.id} type="button" role="radio" aria-checked={view === tab.id} className={view === tab.id ? styles.tabOn : ""} onClick={() => choosePage(tab.id)}>{tab.label}</button>
          ))}
        </div>
      </div>

      {first.metrics && last?.metrics && (
        <div className={styles.tiles}>
          {METRICS.map((metric) => {
            const from = value(first.metrics, metric.key);
            const to = value(last.metrics, metric.key);
            return (
              <div key={metric.key} className={styles.tile}>
                <span className={styles.tileLabel}>{metric.label}</span>
                <span className={styles.tileValue}>{from === null ? "–" : metric.format(from)} <i aria-hidden="true">→</i> <b>{to === null ? "–" : metric.format(to)}</b></span>
                <Delta from={from} to={to} format={metric.format} kind={metric.kind} />
                <span className={styles.tileNote}>Original → {last.stage.short} stage</span>
              </div>
            );
          })}
        </div>
      )}

      <ol className={styles.stepper}>
        {rows.map((row, i) => {
          const lcp = value(row.metrics, "lcp");
          return (
            <li key={row.stage.id}>
              <button type="button" className={`${styles.step} ${row.stage.id === selected ? styles.stepOn : ""} ${row.stage.build === "astro" ? styles.stepBefore : styles.stepAfter}`}
                aria-pressed={row.stage.id === selected} onClick={() => chooseStage(row.stage.id)}>
                <span className={styles.stepNo}>{i === 0 ? "0" : i}</span>
                <span className={styles.stepName}>{row.stage.short}</span>
                <span className={styles.stepValue}>{lcp === null ? (row.stage.showsIn ? "on navigation" : "not measured") : ms(lcp)}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className={styles.detail}>
        <article className={styles.stageCard}>
          <p className={styles.stageMeta}>
            <span className={current.stage.build === "astro" ? styles.badgeBefore : styles.badgeAfter}>{current.stage.build === "astro" ? "Original site" : "Next.js optimized site"}</span>
            <GitCommitHorizontal size={14} aria-hidden="true" /> <code>{current.stage.commit}</code>
            {current.run && <span> · report {current.run.run.replace("_", " ")}</span>}
          </p>
          <h3>{current.stage.title}</h3>
          <p className={styles.summary}>{current.stage.summary}</p>
          <ul className={styles.changes}>{current.stage.changes.map((change) => <li key={change}>{change}</li>)}</ul>
          {current.stage.showsIn && <p className={styles.showsIn}>Pays off on {current.stage.showsIn}.</p>}
          {current.stage.id !== "original" && (
            <button type="button" className={styles.raceButton} onClick={() => onRace(current.stage.id)}>
              <Flag size={16} aria-hidden="true" /> Race “{current.stage.short}” against the original — live
            </button>
          )}
        </article>
        <div className={styles.deltas}>
          <table className={styles.deltaTable}>
            <caption>{current.stage.short}{current.metrics ? "" : " — no report run for this page yet"}</caption>
            <thead>
              <tr><th scope="col">Metric</th><th scope="col">This stage</th>{previous && <th scope="col">vs {previous.stage.short}</th>}{current.stage.id !== "original" && <th scope="col">vs Original</th>}</tr>
            </thead>
            <tbody>
              {METRICS.map((metric) => {
                const now = value(current.metrics, metric.key);
                return (
                  <tr key={metric.key}>
                    <th scope="row">{metric.label}</th>
                    <td>{now === null ? "–" : metric.format(now)}</td>
                    {previous && <td><Delta from={value(previous.metrics, metric.key)} to={now} format={metric.format} kind={metric.kind} /></td>}
                    {current.stage.id !== "original" && <td><Delta from={value(first.metrics, metric.key)} to={now} format={metric.format} kind={metric.kind} /></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <figure className={styles.charts}>
        <figcaption>
          <b>Each stage, measured</b>
          <span>
            <i className={styles.keyBefore} aria-hidden="true" /> Original
            <i className={styles.keyAfter} aria-hidden="true" /> Selected stage
            <i className={styles.keyOther} aria-hidden="true" /> Other stages
          </span>
        </figcaption>
        {table ? (
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <caption className="sr-only">Every stage and metric for the chosen page</caption>
              <thead><tr><th scope="col">Stage</th>{METRICS.map((metric) => <th key={metric.key} scope="col">{metric.label}</th>)}</tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.stage.id}><th scope="row">{row.stage.short}</th>{METRICS.map((metric) => { const v = value(row.metrics, metric.key); return <td key={metric.key}>{v === null ? "–" : metric.format(v)}</td>; })}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.multiples}>
            {METRICS.map((metric) => {
              const max = Math.max(1, ...rows.map((row) => value(row.metrics, metric.key) ?? 0));
              return (
                <div key={metric.key} className={styles.multiple}>
                  <p className={styles.multipleTitle}><b>{metric.label}</b><span>{metric.hint}</span></p>
                  <div className={styles.columns} role="list">
                    {rows.map((row) => {
                      const v = value(row.metrics, metric.key);
                      const key = `${metric.key}-${row.stage.id}`;
                      const role = row.stage.id === "original" ? styles.colBefore : row.stage.id === selected ? styles.colAfter : styles.colOther;
                      const labelled = row.stage.id === "original" || row.stage.id === selected;
                      return (
                        <div key={row.stage.id} className={`${styles.column} ${role} ${hover === key ? styles.columnHover : ""}`} role="listitem" tabIndex={0}
                          aria-label={`${row.stage.short}: ${v === null ? "not measured" : metric.format(v)}`}
                          onPointerEnter={() => setHover(key)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(key)} onBlur={() => setHover(null)}
                          onClick={() => chooseStage(row.stage.id)}>
                          <div className={styles.colPlot}>
                            {(labelled || hover === key) && v !== null && <span className={styles.colValue}>{metric.format(v)}</span>}
                            {v === null ? <span className={styles.colMissing}>n/m</span> : <i style={{ height: `${Math.max(1.5, (v / max) * 100)}%` }} />}
                          </div>
                          <span className={styles.colName}><b>{stages.indexOf(row.stage)}</b><span>{row.stage.short}</span></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button type="button" className={styles.tableToggle} onClick={() => setTable((v) => !v)} aria-pressed={table}>
          <Table2 size={14} aria-hidden="true" /> {table ? "Show charts" : "Show as table"}
        </button>
        <p className={styles.source}>
          Source: {journey.source}. Synced {new Date(journey.syncedAt).toLocaleDateString("en-CA", { dateStyle: "medium" })}. Single runs vary by a few hundred milliseconds; the big moves are well outside that.
          {" "}n/m = not measured by a report run (the Prefetch stage changes navigation, not the first load).
        </p>
      </figure>
      <p className={styles.originalNote}>
        The original stays online and untouched — every comparison on this page is measured against the same baseline.
      </p>
    </section>
  );
}
