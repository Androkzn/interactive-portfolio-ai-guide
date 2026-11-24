"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, CircleX, Gauge, Microscope, Table2 } from "lucide-react";
import type { LaneId, LaneMetrics, RaceProfile, WaterfallEntry } from "@/packages/contracts/src/site-race";
import type { LaneState, RaceState } from "@/lib/site-race/use-race";
import { band, performanceScore, type ScoreBand, type ScoreMetric } from "@/lib/site-race/lighthouse-score";
import { progressFromFrames, speedIndex, visuallyComplete, type ProgressPoint } from "@/lib/site-race/visual-progress";
import { kb, lcpOrCap, ms, tbtCensored } from "@/lib/site-race/scoring";
import { toneClass, usePrefersReducedMotion, type LaneIdentity } from "./race-shared";
import styles from "./race-insights.module.css";

const LANES: LaneId[] = ["a", "b"];

export type LaneProgress = { points: ProgressPoint[]; si: number | null; complete: number | null; capped: boolean };

/** Visual progress per lane, computed from the screencast once the race is over. */
export function useVisualProgress(state: RaceState): Record<LaneId, LaneProgress> | null {
  const [result, setResult] = useState<Record<LaneId, LaneProgress> | null>(null);
  const framesA = state.lanes.a.frames;
  const framesB = state.lanes.b.frames;
  const finished = state.status === "finished";
  useEffect(() => {
    if (!finished) { setResult(null); return; }
    let cancelled = false;
    void (async () => {
      const out = {} as Record<LaneId, LaneProgress>;
      for (const [id, frames, lane] of [["a", framesA, state.lanes.a], ["b", framesB, state.lanes.b]] as const) {
        const points = await progressFromFrames(frames);
        out[id] = { points, si: speedIndex(points), complete: visuallyComplete(points), capped: !!lane.metrics?.capped };
      }
      if (!cancelled) setResult(out);
    })().catch(() => { if (!cancelled) setResult(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, framesA, framesB]);
  return result;
}

const BAND_LABEL: Record<ScoreBand, string> = { good: "Good", average: "Needs improvement", poor: "Poor" };
const BAND_ICON: Record<ScoreBand, typeof CheckCircle2> = { good: CheckCircle2, average: CircleAlert, poor: CircleX };
const METRIC_LABEL: Record<ScoreMetric, string> = { fcp: "First Contentful Paint", si: "Speed Index", lcp: "Largest Contentful Paint", tbt: "Total Blocking Time", cls: "Cumulative Layout Shift" };

function useCountUp(target: number | null, reduced: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === null) return;
    if (reduced) { setValue(target); return; }
    let frame = 0;
    const started = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - started) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced, duration]);
  return value;
}

export function RaceScorecard({ state, progress, identity }: { state: RaceState; progress: Record<LaneId, LaneProgress> | null; identity: (id: LaneId) => LaneIdentity }) {
  return (
    <section className={styles.panel} aria-labelledby="scorecard-title">
      <header className={styles.panelHead}>
        <h3 id="scorecard-title"><Gauge size={18} aria-hidden="true" /> Scorecard</h3>
        <p>Lighthouse-style estimate: Lighthouse 10&apos;s weights and scoring curves applied to this race&apos;s numbers. Speed Index comes from the screencast frames. Not an official Lighthouse report.</p>
      </header>
      <div className={styles.scoreGrid}>
        {LANES.map((id) => {
          const metrics = state.lanes[id].metrics;
          return metrics ? <ScoreRing key={id} metrics={metrics} profile={state.profile} si={progress?.[id].si ?? null} who={identity(id)} pending={!progress} /> : null;
        })}
        <ProgressChart progress={progress} state={state} identity={identity} />
      </div>
    </section>
  );
}

function ScoreRing({ metrics, profile, si, who, pending }: { metrics: LaneMetrics; profile: RaceProfile; si: number | null; who: LaneIdentity; pending: boolean }) {
  const reduced = usePrefersReducedMotion();
  const lcp = lcpOrCap(metrics);
  const result = performanceScore({ fcp: metrics.timing.fcp, si, lcp: lcp.value, tbt: metrics.timing.tbt, cls: metrics.timing.cls }, profile);
  const shown = useCountUp(result.score, reduced);
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const level = result.score === null ? null : band(result.score);
  const Icon = level ? BAND_ICON[level] : Gauge;
  return (
    <article className={`${styles.scoreCard} ${toneClass(who.kind)}`} aria-label={`${who.label}: performance score ${result.score ?? "pending"}`}>
      <p className={styles.scoreWho}><i className={styles.key} aria-hidden="true" />{who.role} · {who.label}</p>
      <div className={styles.ring} data-band={level ?? "none"}>
        <svg viewBox="0 0 128 128" aria-hidden="true">
          <circle className={styles.ringTrack} cx="64" cy="64" r={r} />
          <circle className={styles.ringFill} cx="64" cy="64" r={r} strokeDasharray={circumference}
            strokeDashoffset={result.score === null ? circumference : circumference * (1 - shown / 100)} />
        </svg>
        <b>{result.score === null ? (pending ? "…" : "–") : shown}</b>
      </div>
      <p className={styles.band} data-band={level ?? "none"}><Icon size={15} aria-hidden="true" /> {level ? BAND_LABEL[level] : pending ? "Measuring Speed Index…" : "Not enough data"}</p>
      <ul className={styles.parts}>
        {result.parts.map((part) => (
          <li key={part.metric}>
            <span>{METRIC_LABEL[part.metric]}</span>
            <b>{part.value === null ? "–" : part.metric === "cls" ? part.value.toFixed(3) : `${part.metric === "lcp" && lcp.censored ? "> " : part.metric === "tbt" && tbtCensored(metrics) ? "≥ " : ""}${ms(part.value)}`}</b>
            <span className={styles.partBar} data-band={part.score === null ? "none" : band(Math.round(part.score * 100))}><i style={{ width: `${Math.round((part.score ?? 0) * 100)}%` }} /></span>
            <small>{part.score === null ? "" : Math.round(part.score * 100)}</small>
          </li>
        ))}
      </ul>
    </article>
  );
}

/** The element's width in CSS px, so an SVG can draw at 1:1 and keep its text legible. */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Visual completeness over time, both lanes on one axis. */
function ProgressChart({ progress, state, identity }: { progress: Record<LaneId, LaneProgress> | null; state: RaceState; identity: (id: LaneId) => LaneIdentity }) {
  const [hoverT, setHoverT] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [plotRef, plotWidth] = useWidth<HTMLDivElement>(560);
  const titleId = useId();
  const W = Math.max(280, Math.min(760, plotWidth)), H = 230, L = 40, R = 16, T = 18, B = 30;
  const maxT = useMemo(() => {
    const ends = LANES.flatMap((id) => (progress?.[id].points ?? []).map((p) => p.t));
    return Math.max(2000, ...ends);
  }, [progress]);
  const x = (t: number) => L + (t / maxT) * (W - L - R);
  const y = (p: number) => T + (1 - p) * (H - T - B);
  // About one tick per 70 px, on whole seconds.
  const step = [1000, 2000, 5000, 10_000].find((s) => (maxT / s) * 70 <= W - L - R) ?? 10_000;
  const ticks = Array.from({ length: Math.floor(maxT / step) + 1 }, (_, i) => i * step);
  const at = (points: ProgressPoint[], t: number) => {
    let value = 0;
    for (const point of points) { if (point.t > t) break; value = point.progress; }
    return value;
  };
  const path = (points: ProgressPoint[]) => {
    let d = `M${x(0)},${y(0)}`;
    let last = 0;
    for (const point of points) { d += ` H${x(point.t)} V${y(point.progress)}`; last = point.progress; }
    return d + ` H${x(maxT)} V${y(last)}`;
  };
  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const t = ((event.clientX - box.left) / box.width * W - L) / (W - L - R) * maxT;
    setHoverT(Math.max(0, Math.min(maxT, t)));
  };
  const onKey = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = (event.key === "ArrowRight" ? 1 : -1) * maxT / 40;
    setHoverT((t) => Math.max(0, Math.min(maxT, (t ?? 0) + delta)));
  };
  if (!progress) return <div className={styles.chartCard}><p className={styles.chartPending}>Comparing every frame with the finished screen…</p></div>;
  const rows = Array.from({ length: Math.min(31, Math.floor(maxT / 1000) + 1) }, (_, i) => i * Math.max(1000, Math.ceil(maxT / 30 / 1000) * 1000)).filter((t) => t <= maxT);
  return (
    <figure className={styles.chartCard} aria-labelledby={titleId}>
      <figcaption id={titleId}>
        <b>How much of the screen is painted</b>
        <span>Visual progress per frame, the way Speed Index is computed: the smaller the area above a line, the faster the page looks.</span>
      </figcaption>
      <ul className={styles.legend}>
        {LANES.map((id) => {
          const who = identity(id);
          const lane = progress[id];
          return (
            <li key={id} className={toneClass(who.kind)}>
              <i className={styles.lineKey} aria-hidden="true" />{who.role} · {who.label}
              <span>Speed Index {lane.si === null ? "–" : `${lane.capped ? "≥ " : ""}${ms(lane.si)}`}{lane.complete !== null && !lane.capped ? ` · complete at ${ms(lane.complete)}` : lane.capped ? " · never complete" : ""}</span>
            </li>
          );
        })}
      </ul>
      {table ? (
        <table className={styles.dataTable}>
          <caption className="sr-only">Visual progress by time</caption>
          <thead><tr><th scope="col">Time</th>{LANES.map((id) => <th key={id} scope="col">{identity(id).role}</th>)}</tr></thead>
          <tbody>
            {rows.map((t) => <tr key={t}><th scope="row">{(t / 1000).toFixed(0)} s</th>{LANES.map((id) => <td key={id}>{Math.round(at(progress[id].points, t) * 100)}%</td>)}</tr>)}
          </tbody>
        </table>
      ) : (
        <div className={styles.plot} ref={plotRef}>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Visual progress over time for both lanes. Use the arrow keys to move the readout." tabIndex={0}
            onPointerMove={onMove} onPointerLeave={() => setHoverT(null)} onKeyDown={onKey} onBlur={() => setHoverT(null)}>
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <g key={p}>
                <line className={styles.grid} x1={L} x2={W - R} y1={y(p)} y2={y(p)} />
                <text className={styles.axis} x={L - 6} y={y(p) + 3} textAnchor="end">{p * 100}%</text>
              </g>
            ))}
            {ticks.map((t) => <text key={t} className={styles.axis} x={x(t)} y={H - 10} textAnchor="middle">{t / 1000} s</text>)}
            {LANES.map((id) => (
              <g key={id} className={toneClass(identity(id).kind)}>
                <path className={styles.area} d={`${path(progress[id].points)} V${y(0)} Z`} />
                <path className={styles.line} d={path(progress[id].points)} />
                {progress[id].complete !== null && !progress[id].capped && (
                  <circle className={styles.dot} cx={x(progress[id].complete!)} cy={y(1)} r={4.5} />
                )}
              </g>
            ))}
            {hoverT !== null && <line className={styles.crosshair} x1={x(hoverT)} x2={x(hoverT)} y1={T} y2={H - B} />}
          </svg>
          {hoverT !== null && (
            <div className={styles.tooltip} style={{ left: `${(x(hoverT) / W) * 100}%` }} role="status">
              <span className={styles.tipTime}>{(hoverT / 1000).toFixed(2)} s</span>
              {LANES.map((id) => (
                <span key={id} className={`${styles.tipRow} ${toneClass(identity(id).kind)}`}>
                  <i className={styles.lineKey} aria-hidden="true" /><b>{Math.round(at(progress[id].points, hoverT) * 100)}%</b> {identity(id).role}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <button type="button" className={styles.tableToggle} onClick={() => setTable((value) => !value)} aria-pressed={table}>
        <Table2 size={14} aria-hidden="true" /> {table ? "Show chart" : "Show as table"}
      </button>
    </figure>
  );
}

type Tab = "lcp" | "images" | "waterfall" | "journey";

export function UnderTheHood({ state, identity }: { state: RaceState; identity: (id: LaneId) => LaneIdentity }) {
  const [tab, setTab] = useState<Tab>("lcp");
  const tabs: { id: Tab; label: string }[] = [
    { id: "lcp", label: "LCP element" },
    { id: "images", label: "Image bytes" },
    { id: "waterfall", label: "Waterfall" },
    ...(state.lanes.a.metrics?.navigation !== undefined || state.lanes.b.metrics?.navigation !== undefined ? [{ id: "journey" as Tab, label: "Tap & repeat visit" }] : []),
  ];
  const a = state.lanes.a.metrics;
  const b = state.lanes.b.metrics;
  if (!a || !b) return null;
  return (
    <section className={styles.panel} aria-labelledby="hood-title">
      <header className={styles.panelHead}>
        <h3 id="hood-title"><Microscope size={18} aria-hidden="true" /> Under the hood</h3>
        <p>What actually changed between the two builds — read from the same browsers that ran the race.</p>
      </header>
      <div className={styles.tabs} role="tablist" aria-label="Race details">
        {tabs.map((item) => (
          <button key={item.id} type="button" role="tab" id={`hood-tab-${item.id}`} aria-controls={`hood-panel-${item.id}`} aria-selected={tab === item.id}
            className={tab === item.id ? styles.tabOn : ""} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </div>
      <div role="tabpanel" id={`hood-panel-${tab}`} aria-labelledby={`hood-tab-${tab}`} className={styles.tabPanel}>
        {tab === "lcp" && <LcpSpotlight state={state} identity={identity} />}
        {tab === "images" && <ImageBytes state={state} identity={identity} />}
        {tab === "waterfall" && <Waterfall state={state} identity={identity} />}
        {tab === "journey" && <JourneyDetail state={state} identity={identity} />}
      </div>
    </section>
  );
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <li className={ok ? styles.checkOk : styles.checkNo}>{ok ? <CheckCircle2 size={14} aria-label="yes" /> : <CircleX size={14} aria-label="no" />} {children}</li>;
}

function LcpSpotlight({ state, identity }: { state: RaceState; identity: (id: LaneId) => LaneIdentity }) {
  return (
    <div className={styles.spotGrid}>
      {LANES.map((id) => {
        const lane: LaneState = state.lanes[id];
        const m = lane.metrics!;
        const who = identity(id);
        const detail = m.lcpDetail;
        const frame = lane.frames.at(-1);
        const rect = detail?.rect && detail.viewport.width > 0 ? {
          left: (detail.rect.x / detail.viewport.width) * 100,
          top: (detail.rect.y / detail.viewport.height) * 100,
          width: (detail.rect.width / detail.viewport.width) * 100,
          height: (detail.rect.height / detail.viewport.height) * 100,
        } : null;
        const isImage = !!detail?.path;
        const modern = detail?.format === "avif" || detail?.format === "webp";
        const pendingImages = (m.waterfall ?? []).filter((entry) => entry.inFlight && entry.type === "image").sort((x, y) => y.kb - x.kb);
        const censored = m.capped && m.timing.lcp === null;
        return (
          <article key={id} className={`${styles.spotCard} ${toneClass(who.kind)}`}>
            <p className={styles.scoreWho}><i className={styles.key} aria-hidden="true" />{who.role} · {who.label}</p>
            <div className={`${styles.spotFrame} ${state.profile === "desktop" ? styles.spotDesktop : ""}`}>
              {frame && <img src={frame.src} alt={`${who.label}: the last frame, with the LCP element outlined`} />}
              {rect && (
                <span className={styles.spotBox} style={{ left: `${rect.left}%`, top: `${rect.top}%`, width: `${rect.width}%`, height: `${rect.height}%` }}>
                  <em>{censored ? "largest so far" : "LCP"}</em>
                </span>
              )}
            </div>
            {censored ? (
              <div className={styles.spotText}>
                <p><b>Never reached its LCP.</b> After {((m.capMs ?? 30_000) / 1000).toFixed(0)} s the browser was still downloading; the largest thing painted so far was {detail?.element ? <code>{detail.element}</code> : "nothing"}{isImage ? "" : " text"}.</p>
                {pendingImages.length > 0 && (
                  <>
                    <p className={styles.spotSub}>Still downloading when the lane stopped:</p>
                    <ul className={styles.fileList}>
                      {pendingImages.slice(0, 5).map((entry) => <li key={entry.path}><code>{entry.path}</code><b>{kb(entry.kb)} so far</b></li>)}
                    </ul>
                  </>
                )}
              </div>
            ) : detail ? (
              <div className={styles.spotText}>
                <p><b>{m.timing.lcp === null ? "LCP" : `LCP at ${ms(m.timing.lcp)}`}:</b> {detail.element ? <code>{detail.element}</code> : "an element"}{isImage ? <> · <code>{detail.path}</code></> : " (text)"}</p>
                {m.capped && <p className={styles.spotSub}>The LCP was final, but the page was still downloading {pendingImages.length ? `${pendingImages.length} more image${pendingImages.length === 1 ? "" : "s"}` : "more files"} below it at the {((m.capMs ?? 30_000) / 1000).toFixed(0)} s cap.</p>}
                {isImage && (
                  <>
                    <p className={styles.spotSub}>{detail.kb === null ? "size unknown" : kb(detail.kb)}{detail.format ? ` · ${detail.format.toUpperCase()}` : ""}{detail.displayed ? ` · shown at ${detail.displayed.width}×${detail.displayed.height}` : ""}</p>
                    <ul className={styles.checks}>
                      <Check ok={modern}>Modern format (AVIF/WebP)</Check>
                      <Check ok={detail.responsive}>Responsive: srcset or &lt;picture&gt;</Check>
                      <Check ok={detail.preloaded}>Preloaded from &lt;head&gt;</Check>
                      <Check ok={detail.fetchPriority === "high"}>fetchpriority=&quot;high&quot;</Check>
                      <Check ok={detail.loading !== "lazy"}>Not lazy-loaded</Check>
                    </ul>
                  </>
                )}
              </div>
            ) : <p className={styles.spotText}>No LCP entry was recorded for this lane.</p>}
          </article>
        );
      })}
    </div>
  );
}

const FORMAT_LABEL: Record<string, string> = { png: "PNG", jpeg: "JPEG", webp: "WebP", avif: "AVIF", svg: "SVG", gif: "GIF", ico: "ICO", other: "Other" };

function ImageBytes({ state, identity }: { state: RaceState; identity: (id: LaneId) => LaneIdentity }) {
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const formats = useMemo(() => {
    const keys = new Set<string>();
    for (const id of LANES) for (const [format, bucket] of Object.entries(state.lanes[id].metrics?.images?.byFormat ?? {})) if (bucket.kb >= 0.5) keys.add(format);
    const size = (format: string) => Math.max(...LANES.map((id) => state.lanes[id].metrics?.images?.byFormat[format]?.kb ?? 0));
    return [...keys].sort((x, y) => size(y) - size(x));
  }, [state.lanes]);
  const max = Math.max(1, ...formats.flatMap((format) => LANES.map((id) => state.lanes[id].metrics?.images?.byFormat[format]?.kb ?? 0)));
  const total = (id: LaneId) => Object.values(state.lanes[id].metrics?.images?.byFormat ?? {}).reduce((sum, bucket) => sum + bucket.kb, 0);
  if (!formats.length) return <p className={styles.empty}>No image data was recorded for this race.</p>;
  return (
    <div className={styles.imageGrid}>
      <figure className={styles.chartCard}>
        <figcaption>
          <b>Image bytes by format</b>
          <span>{LANES.map((id) => `${identity(id).role}: ${kb(total(id))}`).join(" · ")} of images on the wire during the race.</span>
        </figcaption>
        <ul className={styles.legend}>
          {LANES.map((id) => <li key={id} className={toneClass(identity(id).kind)}><i className={styles.rectKey} aria-hidden="true" />{identity(id).role} · {identity(id).label}</li>)}
        </ul>
        {table ? (
          <table className={styles.dataTable}>
            <caption className="sr-only">Image bytes by format</caption>
            <thead><tr><th scope="col">Format</th>{LANES.map((id) => <th key={id} scope="col">{identity(id).role}</th>)}</tr></thead>
            <tbody>
              {formats.map((format) => (
                <tr key={format}><th scope="row">{FORMAT_LABEL[format] ?? format.toUpperCase()}</th>
                  {LANES.map((id) => { const bucket = state.lanes[id].metrics?.images?.byFormat[format]; return <td key={id}>{bucket ? `${kb(bucket.kb)} · ${bucket.count} file${bucket.count === 1 ? "" : "s"}` : "–"}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.bars} role="list">
            {formats.map((format) => (
              <div key={format} className={styles.barGroup} role="listitem">
                <span className={styles.barLabel}>{FORMAT_LABEL[format] ?? format.toUpperCase()}</span>
                <div className={styles.barStack}>
                  {LANES.map((id) => {
                    const bucket = state.lanes[id].metrics?.images?.byFormat[format];
                    const value = bucket?.kb ?? 0;
                    const key = `${format}-${id}`;
                    return (
                      <div key={id} className={`${styles.barRow} ${toneClass(identity(id).kind)} ${hover === key ? styles.barHover : ""}`}
                        tabIndex={0} aria-label={`${FORMAT_LABEL[format] ?? format}, ${identity(id).role}: ${kb(value)}${bucket ? ` in ${bucket.count} files` : ""}`}
                        onPointerEnter={() => setHover(key)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(key)} onBlur={() => setHover(null)}>
                        {value > 0 ? <i style={{ width: `${Math.max(0.6, (value / max) * 100)}%` }} /> : <i className={styles.zero} />}
                        <b>{value > 0 ? kb(value) : "none"}</b>
                        {hover === key && bucket && <span className={styles.barTip}>{bucket.count} file{bucket.count === 1 ? "" : "s"} · {identity(id).role}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <button type="button" className={styles.tableToggle} onClick={() => setTable((value) => !value)} aria-pressed={table}>
          <Table2 size={14} aria-hidden="true" /> {table ? "Show chart" : "Show as table"}
        </button>
      </figure>
      <div className={styles.heaviest}>
        {LANES.map((id) => {
          const list = state.lanes[id].metrics?.images?.heaviest ?? [];
          return (
            <div key={id} className={toneClass(identity(id).kind)}>
              <p className={styles.scoreWho}><i className={styles.key} aria-hidden="true" />Heaviest downloads · {identity(id).role}</p>
              <ol className={styles.fileList}>
                {list.map((item) => <li key={item.path}><code>{item.path}</code><b>{kb(item.kb)}{item.format ? ` ${item.format.toUpperCase()}` : ` ${item.type}`}</b></li>)}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TYPE_TAG: Record<WaterfallEntry["type"], string> = { document: "HTML", script: "JS", stylesheet: "CSS", image: "IMG", font: "FONT", other: "…" };
/** Keep the end of a long path — the file name is the useful part. */
const tail = (path: string, max = 42) => (path.length > max ? `…${path.slice(-(max - 1))}` : path);

function Waterfall({ state, identity }: { state: RaceState; identity: (id: LaneId) => LaneIdentity }) {
  const [hover, setHover] = useState<string | null>(null);
  const LIMIT = 22;
  const lanes = LANES.map((id) => {
    const m = state.lanes[id].metrics!;
    const entries = [...(m.waterfall ?? [])].sort((x, y) => x.start - y.start).slice(0, LIMIT);
    return { id, m, entries, total: m.waterfall?.length ?? 0 };
  });
  const maxT = Math.max(1000, ...lanes.flatMap((lane) => [...lane.entries.map((entry) => entry.end), lcpOrCap(lane.m).value ?? 0]));
  const pct = (t: number) => `${Math.min(100, (t / maxT) * 100)}%`;
  const step = maxT > 20_000 ? 5000 : maxT > 8000 ? 2000 : maxT > 3000 ? 1000 : 500;
  const ticks = Array.from({ length: Math.floor(maxT / step) + 1 }, (_, i) => i * step);
  return (
    <div className={styles.waterfalls}>
      <p className={styles.waterNote}>The first {LIMIT} requests of each page on one time axis. Hatched bars were still downloading when the lane stopped; <b>blocking</b> marks render-blocking requests. The dashed line is the lane&apos;s LCP.</p>
      {lanes.map(({ id, m, entries, total }) => {
        const who = identity(id);
        const lcp = lcpOrCap(m);
        return (
          <div key={id} className={`${styles.waterLane} ${toneClass(who.kind)}`}>
            <p className={styles.scoreWho}><i className={styles.key} aria-hidden="true" />{who.role} · {who.label} <span>{total} requests{total > LIMIT ? `, first ${LIMIT} shown` : ""}</span></p>
            <div className={styles.waterRows}>
              {lcp.value !== null && (
                <span className={`${styles.lcpLine} ${lcp.value / maxT > 0.72 ? styles.lcpLineEnd : ""}`} style={{ left: `calc(var(--label-w) + (100% - var(--label-w)) * ${Math.min(1, lcp.value / maxT)})` }}>
                  <em>{lcp.censored ? "LCP > " : "LCP "}{ms(lcp.value)}</em>
                </span>
              )}
              {entries.map((entry, index) => {
                const key = `${id}-${index}`;
                return (
                  <div key={key} className={`${styles.waterRow} ${hover === key ? styles.waterHover : ""}`} tabIndex={0}
                    aria-label={`${TYPE_TAG[entry.type]} ${entry.path}: ${ms(entry.start)} to ${ms(entry.end)}, ${kb(entry.kb)}${entry.inFlight ? ", still downloading" : ""}${entry.blocking ? ", render-blocking" : ""}`}
                    onPointerEnter={() => setHover(key)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(key)} onBlur={() => setHover(null)}>
                    <span className={styles.waterLabel}><em data-type={entry.type}>{TYPE_TAG[entry.type]}</em>{entry.blocking && <strong>blocking</strong>}<code title={entry.path}>{tail(entry.path)}</code></span>
                    <span className={styles.waterTrack}>
                      <i className={entry.inFlight ? styles.inFlight : ""} style={{ left: pct(entry.start), width: `max(2px, ${Math.min(100, ((entry.end - entry.start) / maxT) * 100)}%)` }} />
                    </span>
                    {hover === key && <span className={styles.waterTip}><b>{kb(entry.kb)}</b> · {ms(entry.start)} → {ms(entry.end)}{entry.inFlight ? " · still downloading" : ""}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className={styles.waterScale} aria-hidden="true">{ticks.map((t) => <span key={t} style={{ left: `calc(var(--label-w) + (100% - var(--label-w)) * ${t / maxT})` }}>{t / 1000} s</span>)}</div>
    </div>
  );
}

/** What happened after the first page: the tap to the second page, and the repeat visit with the cache on. */
function JourneyDetail({ state, identity }: { state: RaceState; identity: (id: LaneId) => LaneIdentity }) {
  const t = (value: number | null | undefined, cap: number) => (value == null ? `> ${ms(cap)}` : ms(value));
  return (
    <div className={styles.spotGrid}>
      {LANES.map((id) => {
        const m = state.lanes[id].metrics!;
        const who = identity(id);
        const nav = m.navigation;
        const rep = m.repeat;
        return (
          <article key={id} className={`${styles.spotCard} ${toneClass(who.kind)}`}>
            <p className={styles.scoreWho}><i className={styles.key} aria-hidden="true" />{who.role} · {who.label}</p>
            <div className={styles.spotText}>
              <p><b>The tap.</b> {nav?.skipped ? nav.skipped : nav ? <>Once home had painted its LCP{m.tappedAt !== undefined ? ` (tapped at ${ms(m.tappedAt)})` : ""}, the visitor {nav.input === "touch" ? `touched the link for ${nav.dwellMs} ms` : `rested the pointer ${nav.dwellMs} ms on the link`} and {nav.input === "touch" ? "lifted" : "clicked"}: <code>{nav.link}</code>. {nav.soft === null ? "" : nav.soft ? "The site swapped the page in with JavaScript (no new document)." : "The browser loaded a new document."}</> : "Not measured."}</p>
              {nav && !nav.skipped && (
                <ul className={styles.fileList}>
                  <li><span>URL changed</span><b>{t(nav.commit, nav.capMs)}</b></li>
                  <li><span>Heading on screen</span><b>{t(nav.content, nav.capMs)}</b></li>
                  <li><span>Main image painted{nav.imagePath ? <> · <code>{nav.imagePath}</code></> : ""}</span><b>{t(nav.image, nav.capMs)}</b></li>
                  <li><span>Downloaded from the first touch on</span><b>{kb(nav.net.kb)} · {nav.net.network} requests</b></li>
                </ul>
              )}
              <p className={styles.spotSub}><b>Repeat visit.</b> {rep?.skipped ? rep.skipped : rep ? "Home loaded again in the same browser with the HTTP cache on, right away. Both sites mark their HTML must-revalidate and their scripts immutable; the gap that matters most (how long images stay cached) shows only after hours or a deploy, which one run cannot simulate." : "Not measured."}</p>
              {rep && !rep.skipped && (
                <ul className={styles.fileList}>
                  <li><span>LCP</span><b>{t(rep.lcp, rep.capMs)}</b></li>
                  <li><span>Fully loaded</span><b>{t(rep.load, rep.capMs)}</b></li>
                  <li><span>Over the network</span><b>{kb(rep.net.kb)} · {rep.net.network} requests{rep.net.revalidated ? ` (${rep.net.revalidated} × 304)` : ""}</b></li>
                  <li><span>From cache</span><b>{rep.net.cached} requests</b></li>
                  {rep.html && <li><span>HTML</span><b>{rep.html.cached ? "from cache" : `${rep.html.status ?? "?"} · ${kb(rep.html.kb)}`}</b></li>}
                </ul>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
