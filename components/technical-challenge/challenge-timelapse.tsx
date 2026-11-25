"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronLeft, ChevronRight, Clock3, FileCheck2, Lightbulb, Pause, Play, RotateCcw, ShieldAlert, TriangleAlert, X } from "lucide-react";
import { board, chapterStarts, chapters, REQUIRED_IDS, snapshot, TOTAL_SECONDS } from "@/lib/technical-challenge/story";
import type { BoardItem, ItemTier, TileState, TileStatus } from "@/lib/technical-challenge/story";
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

const KIND_LABEL = { spec: "Spec", build: "Build", verify: "Verify", ship: "Ship", bonus: "Bonus" } as const;
const HOURS = [
  { hour: 1 as const, title: "Hour 1 · core requirements" },
  { hour: 2 as const, title: "Hour 2 · bonus, by choice" },
];

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
    <li className={styles.tile} data-status={tile.status} data-tier={item.tier} title={item.ask}>
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

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
const minutesToClock = (minutes: number) => `${pad(minutes)}:${pad((minutes % 1) * 60)}`;

export function ChallengeTimelapse() {
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const position = useRef(0);
  const touched = useRef(false);

  const seek = useCallback((next: number) => {
    position.current = Math.max(0, Math.min(TOTAL_SECONDS, next));
    setSeconds(position.current);
  }, []);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const next = position.current + (now - last) / 1000;
      last = now;
      seek(next);
      if (next >= TOTAL_SECONDS) { setPlaying(false); return; }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, seek]);

  // ?at=<chapter> opens paused at the end of that chapter, so a link can point at one decision.
  useEffect(() => {
    const at = new URLSearchParams(window.location.search).get("at");
    const index = chapters.findIndex((chapter) => chapter.id === at);
    if (index < 0) return;
    touched.current = true;
    seek(chapterStarts[index] + chapters[index].seconds * 0.999);
  }, [seek]);

  // Plays once, the first time most of it is on screen — unless the visitor prefers less motion.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !touched.current) { touched.current = true; setPlaying(true); observer.disconnect(); }
    }, { threshold: 0.4 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const snap = snapshot(seconds);
  const { chapter, index } = snap;
  const ended = seconds >= TOTAL_SECONDS;
  const inHour = chapters.filter((item) => item.hour === chapter.hour);
  const step = inHour.indexOf(chapter) + 1;

  const jump = (target: number) => { touched.current = true; setPlaying(false); seek(chapterStarts[Math.max(0, Math.min(chapters.length - 1, target))]); };
  const toggle = () => {
    touched.current = true;
    if (!playing && ended) seek(0);
    setPlaying((value) => !value);
  };

  return (
    <section ref={rootRef} className={styles.stage} data-hour={chapter.hour} aria-label="The two hours, step by step">
      <header className={styles.top}>
        <div>
          <p className={styles.kicker}><span className={styles.rec} data-on={playing || undefined} aria-hidden="true" />Timelapse · two hours in about a minute</p>
          <div className={styles.clockRow}>
            <span className={styles.clock}>{chapter.hour === 1 ? minutesToClock(60 - snap.minuteOfHour) : `+${minutesToClock(snap.minuteOfHour)}`}</span>
            <span className={styles.hourChip}>{chapter.hour === 1 ? "Hour 1 · core" : "Hour 2 · bonus"}</span>
          </div>
          <p className={styles.clockNote}>{chapter.hour === 1 ? "left in the challenge hour" : "of bonus work"} · times approximate</p>
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
            Hour {chapter.hour} · step {step} of {inHour.length} · <b>≈ {chapter.minutes} min</b>
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

        <div className={styles.board} aria-label="What the brief demands, and its state">
          {GROUPS.map((group) => (
            <div key={group.title}>
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
        </div>
      </div>

      <nav className={styles.chapters} aria-label="Chapters">
        {HOURS.map(({ hour, title }) => (
          <div key={hour} className={styles.hourTrack} data-hour={hour}>
            <p className={styles.hourTitle}>{title} <span>60 min</span></p>
            <ol className={styles.segments}>
              {chapters.map((item, i) => item.hour !== hour ? null : (
                <li key={item.id} style={{ flexGrow: item.minutes } as CSSProperties}>
                  <button
                    type="button"
                    className={styles.segment}
                    data-kind={item.kind}
                    data-state={i < index ? "done" : i === index ? "now" : "next"}
                    aria-current={i === index ? "step" : undefined}
                    aria-label={`${item.title}, about ${item.minutes} minutes`}
                    title={`${item.short} · ≈ ${item.minutes} min`}
                    onClick={() => jump(i)}
                  >
                    <span className={styles.segmentFill} style={{ width: `${i < index ? 100 : i === index ? snap.progress * 100 : 0}%` }} />
                    <span className={styles.segmentLabel}>{item.short}<small>≈{item.minutes}m</small></span>
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
      <p className="sr-only" aria-live="polite">Step: {chapter.title}. Decision: {chapter.decision}</p>
    </section>
  );
}
