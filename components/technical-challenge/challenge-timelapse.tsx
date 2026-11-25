"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Check, ChevronLeft, ChevronRight, Clock3, FileCheck2, FlaskConical, Library, Lightbulb, Lock, MessageSquare, MousePointer2,
  Pause, Play, RotateCcw, ShieldAlert, ShieldCheck, TriangleAlert, X,
} from "lucide-react";
import { board, chapterStarts, chapters, REQUIRED_IDS, screens, snapshot, TOTAL_SECONDS } from "@/lib/technical-challenge/story";
import type { BoardItem, BrowserTab, ItemTier, Screen, TileState, TileStatus } from "@/lib/technical-challenge/story";
import styles from "./challenge-timelapse.module.css";

const GROUPS: { tiers: ItemTier[]; title: string }[] = [
  { tiers: ["rule", "guard"], title: "The rule and the two auto-fails" },
  { tiers: ["core"], title: "Must ship in the hour · R1–R5 · Q1–Q6 · E1–E10" },
  { tiers: ["should", "deliverable"], title: "Optional (SHOULD) and the deliverables" },
];

const STATUS: Record<TileStatus, { icon: LucideIcon; label: string }> = {
  pending: { icon: Clock3, label: "Not started" },
  defined: { icon: FileCheck2, label: "Specified and testable" },
  pass: { icon: Check, label: "Passing" },
  partial: { icon: TriangleAlert, label: "Partly passing" },
  fail: { icon: X, label: "Failing" },
};

const KIND_LABEL = { spec: "Spec", build: "Build", verify: "Verify", ship: "Ship", bonus: "Bonus", after: "After" } as const;
const HOURS = [
  { hour: 1 as const, title: "One-hour core challenge", note: "60 min" },
  { hour: 2 as const, title: "Bonus hour, by choice", note: "60 min" },
  { hour: 3 as const, title: "After the sprint", note: "later" },
];
const TABS: { id: BrowserTab; label: string; icon: LucideIcon }[] = [
  { id: "app", label: "Product assistant", icon: MessageSquare },
  { id: "eval", label: "Live answer eval", icon: FlaskConical },
  { id: "readiness", label: "Readiness", icon: ShieldCheck },
  { id: "portal", label: "Knowledge base", icon: Library },
];
/** Board order, so the celebration ripples through the tiles in reading order. */
const ORDER = new Map(GROUPS.flatMap((group) => board.filter((item) => group.tiers.includes(item.tier))).map((item, i) => [item.id, i]));
const PARTICLES = Array.from({ length: 24 }, (_, i) => i);

function tileText(tile: TileState): string | null {
  if (tile.score) return `${tile.score[0]}/${tile.score[1]}`;
  if (tile.note) return tile.note;
  if (tile.status === "pass") return "tested";
  if (tile.status === "defined") return "spec'd";
  return null;
}

function Tile({ item, tile }: { item: BoardItem; tile: TileState }) {
  const { icon: Icon, label } = STATUS[tile.status];
  const text = tileText(tile);
  return (
    <li className={styles.tile} data-status={tile.status} data-tier={item.tier} title={item.ask} style={{ "--i": ORDER.get(item.id) ?? 0 } as CSSProperties}>
      <span className={styles.tileTop}>
        <span className={styles.tileCode}>{item.code}</span>
        {/* Keyed by status so every change replays the pop. */}
        <span key={tile.status} className={styles.tileBadge}><Icon size={12} strokeWidth={2.8} aria-hidden="true" /></span>
      </span>
      <span className={styles.tileLabel}>{item.label}</span>
      <span className={styles.tileText}>{text}<span className="sr-only"> — {label}</span></span>
    </li>
  );
}

/** The moment everything is green: the tiles ripple and fold away under a stamp. */
function Celebration() {
  return (
    <div className={styles.celebration} aria-hidden="true">
      <div className={styles.burst}>
        {PARTICLES.map((i) => <i key={i} style={{ "--a": `${(i * 360) / PARTICLES.length + (i % 2) * 7}deg`, "--d": `${120 + (i % 4) * 46}px`, "--delay": `${(i % 6) * 35}ms` } as CSSProperties} />)}
      </div>
      <div className={styles.stamp}>
        <span className={styles.stampIcon}><Check size={30} strokeWidth={3.2} /></span>
        <b>27 / 27</b>
        <span>Everything the brief asked for — green</span>
        <small>12:55 · 54 / 54 on three vendors · production 18 / 18</small>
      </div>
    </div>
  );
}

function MiniBoard({ tiles, passing }: { tiles: Record<string, TileState>; passing: number }) {
  return (
    <div className={styles.mini}>
      <ol aria-hidden="true">{board.map((item) => <li key={item.id} data-status={tiles[item.id].status} />)}</ol>
      <span><b>{passing}</b>/{REQUIRED_IDS.length} required passing</span>
    </div>
  );
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** A browser window showing a real capture, scrolled and annotated in step with the player. */
function Browser({ screen, progress }: { screen: Screen; progress: number }) {
  const [from, to] = screen.scroll ?? [0, 0];
  const scroll = from + (to - from) * ease(progress);
  const shown = (screen.highlights ?? []).filter((box) => box.at <= progress);
  const focus = shown.at(-1);
  return (
    <figure className={styles.browser}>
      <div className={styles.chrome}>
        <span className={styles.lights} aria-hidden="true"><i /><i /><i /></span>
        <ol className={styles.tabs} aria-label="Tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <li key={id} data-on={id === screen.tab || undefined}><Icon size={12} aria-hidden="true" /><span>{label}</span></li>
          ))}
        </ol>
      </div>
      <div className={styles.address}>
        <Lock size={12} aria-hidden="true" />
        <span key={screen.id} className={styles.url}>{screen.url}</span>
        <span className={styles.provenance} data-live={screen.live || undefined}>{screen.provenance}</span>
      </div>
      <div className={styles.viewport} style={{ "--ar": screen.width / screen.height } as CSSProperties}>
        <div key={screen.id} className={styles.page} style={{ "--p": scroll } as CSSProperties}>
          <img src={screen.image} width={screen.width} height={screen.height} alt={screen.caption} />
          {shown.map((box) => (
            <span
              key={box.label}
              className={styles.highlight}
              data-focus={box === focus || undefined}
              data-below={box.top < 12 || undefined}
              data-right={box.left + box.width / 2 > 55 || undefined}
              style={{ top: `${box.top}%`, left: `${box.left}%`, width: `${box.width}%`, height: `${box.height}%` }}
            >
              <b>{box.label}</b>
            </span>
          ))}
          {focus && (
            <span className={styles.cursor} style={{ top: `${focus.top + focus.height * 0.62}%`, left: `${focus.left + focus.width * 0.86}%` }} aria-hidden="true">
              <MousePointer2 size={22} />
            </span>
          )}
        </div>
        {/* Phones: the focused label as one chip over the window, clear of the box it describes. */}
        {focus && <p key={focus.label} className={styles.callout} data-bottom={focus.top < 20 || undefined}>{focus.label}</p>}
      </div>
      <figcaption className={styles.caption}>{screen.caption}</figcaption>
    </figure>
  );
}

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
const minutesToClock = (minutes: number) => `${pad(minutes)}:${pad((minutes % 1) * 60)}`;

export function ChallengeTimelapse() {
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const position = useRef(0);
  const touched = useRef(false);
  const preloaded = useRef(false);

  const seek = useCallback((next: number) => {
    position.current = Math.max(0, Math.min(TOTAL_SECONDS, next));
    setSeconds(position.current);
  }, []);

  // The browser pages are only needed once the player runs: fetch them then, not with the page.
  const preload = useCallback(() => {
    if (preloaded.current) return;
    preloaded.current = true;
    for (const screen of Object.values(screens)) { const image = new Image(); image.src = screen.image; }
  }, []);

  useEffect(() => {
    if (!playing) return;
    preload();
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const next = position.current + (now - last) / 1000;
      last = now;
      seek(next);
      if (next >= TOTAL_SECONDS) { setPlaying(false); return; }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, seek, preload]);

  // ?at=<chapter>[:fraction] opens paused there (the chapter's end by default), so a link can
  // point at one decision or one moment of it.
  useEffect(() => {
    const [id, fraction] = (new URLSearchParams(window.location.search).get("at") ?? "").split(":");
    const index = chapters.findIndex((chapter) => chapter.id === id);
    if (index < 0) return;
    const share = Number(fraction);
    touched.current = true;
    preload();
    seek(chapterStarts[index] + chapters[index].seconds * (fraction && share >= 0 && share <= 1 ? share : 0.999));
  }, [seek, preload]);

  // Plays once, the first time most of it is on screen — unless the visitor prefers less motion.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      preload();
      if (!touched.current && !reduced) { touched.current = true; setPlaying(true); }
      observer.disconnect();
    }, { threshold: 0.4 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [preload]);

  const snap = snapshot(seconds);
  const { chapter, index } = snap;
  const ended = seconds >= TOTAL_SECONDS;
  const inHour = chapters.filter((item) => item.hour === chapter.hour);
  const step = inHour.indexOf(chapter) + 1;

  const jump = (target: number) => { touched.current = true; preload(); setPlaying(false); seek(chapterStarts[Math.max(0, Math.min(chapters.length - 1, target))]); };
  const toggle = () => {
    touched.current = true;
    if (!playing && ended) seek(0);
    setPlaying((value) => !value);
  };

  const clock = chapter.hour === 1 ? minutesToClock(60 - snap.minuteOfHour) : chapter.hour === 2 ? `+${minutesToClock(snap.minuteOfHour)}` : "Later";
  const clockNote = chapter.hour === 1 ? "left in the challenge hour · times approximate" : chapter.hour === 2 ? "of bonus work · times approximate" : "what the project grew into after the two hours";

  return (
    <section ref={rootRef} className={styles.stage} data-hour={chapter.hour} aria-label="The two hours, step by step">
      <header className={styles.top}>
        <div>
          <p className={styles.kicker}><span className={styles.rec} data-on={playing || undefined} aria-hidden="true" />Timelapse · two hours in about a minute</p>
          <div className={styles.clockRow}>
            <span className={styles.clock}>{clock}</span>
            <span className={styles.hourChip}>{chapter.hour === 1 ? "One-hour core challenge" : chapter.hour === 2 ? "Bonus hour" : "After the sprint"}</span>
          </div>
          <p className={styles.clockNote}>{clockNote}</p>
        </div>
        <dl className={styles.stats}>
          <div><dt>Specified</dt><dd><b>{snap.defined}</b>/{board.length}</dd></div>
          <div><dt>Required passing</dt><dd><b>{snap.passing}</b>/{REQUIRED_IDS.length}</dd></div>
          <div><dt>Tests</dt><dd><b>{snap.tests}</b></dd></div>
          <div><dt>Live eval{snap.lastRun?.set === "b" ? " · stricter" : ""}</dt><dd>{snap.lastRun ? <><b>{snap.lastRun.pass}</b>/{snap.lastRun.total}</> : <b>—</b>}</dd></div>
        </dl>
      </header>

      <div className={styles.body}>
        <article key={chapter.id} className={styles.card} data-kind={chapter.kind}>
          <p className={styles.cardMeta}>
            <span className={styles.kind}>{KIND_LABEL[chapter.kind]}</span>
            {chapter.hour === 3 ? <>After the sprint · {step} of {inHour.length}</> : <>{chapter.hour === 1 ? "Core challenge" : "Bonus hour"} · step {step} of {inHour.length} · <b>≈ {chapter.minutes} min</b></>}
          </p>
          <h3 className={styles.cardTitle}>{chapter.title}</h3>
          <p className={styles.did}>{chapter.did}</p>
          <div className={styles.decision}>
            <Lightbulb size={18} aria-hidden="true" />
            <div>
              <p className={styles.decisionLabel}>Decision</p>
              <p className={styles.decisionText}>{chapter.decision}</p>
              <p className={styles.why}><b>Why:</b> {chapter.why}</p>
            </div>
          </div>
          <figure className={styles.artifact}>
            <figcaption>{chapter.artifact.label}</figcaption>
            <pre>{chapter.artifact.lines.join("\n")}</pre>
          </figure>
          {chapter.caught && (
            <div className={styles.caught}>
              <p><ShieldAlert size={15} aria-hidden="true" />Caught by a gate in this step</p>
              <ul>{chapter.caught.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
        </article>

        {snap.mode === "browser" && snap.screen ? (
          <div className={styles.browserWrap}>
            <MiniBoard tiles={snap.tiles} passing={snap.passing} />
            <Browser screen={snap.screen.def} progress={snap.screen.progress} />
          </div>
        ) : (
          <div className={styles.board} data-celebrate={snap.mode === "celebrate" || undefined} aria-label="What the brief demands, and its state">
            {GROUPS.map((group) => (
              <div key={group.title} className={styles.group}>
                <p className={styles.groupTitle}>{group.title}</p>
                <ul className={styles.tiles}>
                  {board.filter((item) => group.tiers.includes(item.tier)).map((item) => <Tile key={item.id} item={item} tile={snap.tiles[item.id]} />)}
                </ul>
              </div>
            ))}
            <ul className={styles.legend} aria-label="Legend">
              {(["defined", "pass", "partial", "fail"] as const).map((status) => {
                const { icon: Icon, label } = STATUS[status];
                return <li key={status} data-status={status}><span><Icon size={11} strokeWidth={2.8} aria-hidden="true" /></span>{label}</li>;
              })}
            </ul>
            {snap.mode === "celebrate" && <Celebration />}
          </div>
        )}
      </div>

      <nav className={styles.chapters} aria-label="Chapters">
        {HOURS.map(({ hour, title, note }) => (
          <div key={hour} className={styles.hourTrack} data-hour={hour}>
            <p className={styles.hourTitle}>{title} <span>{note}</span></p>
            <ol className={styles.segments}>
              {chapters.map((item, i) => item.hour !== hour ? null : (
                <li key={item.id} style={{ "--grow": item.minutes || 1 } as CSSProperties}>
                  <button
                    type="button"
                    className={styles.segment}
                    data-kind={item.kind}
                    data-state={i < index ? "done" : i === index ? "now" : "next"}
                    aria-current={i === index ? "step" : undefined}
                    aria-label={item.minutes ? `${item.title}, about ${item.minutes} minutes` : item.title}
                    title={item.minutes ? `${item.short} · ≈ ${item.minutes} min` : item.short}
                    onClick={() => jump(i)}
                  >
                    <span className={styles.segmentFill} style={{ width: `${i < index ? 100 : i === index ? snap.progress * 100 : 0}%` }} />
                    <span className={styles.segmentLabel}>{item.short}<small>{item.minutes ? `≈${item.minutes}m` : "later"}</small></span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </nav>

      <div className={styles.controls}>
        <button type="button" className={styles.play} onClick={toggle}>
          {playing ? <Pause size={17} aria-hidden="true" /> : ended ? <RotateCcw size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
          {playing ? "Pause" : ended ? "Replay" : seconds > 0 ? "Resume" : "Play the two hours"}
        </button>
        <button type="button" className={styles.ghost} onClick={() => jump(index - 1)} disabled={index === 0}><ChevronLeft size={16} aria-hidden="true" />Previous step</button>
        <button type="button" className={styles.ghost} onClick={() => jump(index + 1)} disabled={index === chapters.length - 1}>Next step<ChevronRight size={16} aria-hidden="true" /></button>
      </div>
      <p className="sr-only" aria-live="polite">
        Step: {chapter.title}. Decision: {chapter.decision}{snap.mode === "celebrate" ? " All 27 requirements green." : ""}{snap.screen ? ` Showing: ${snap.screen.def.caption}` : ""}
      </p>
    </section>
  );
}
