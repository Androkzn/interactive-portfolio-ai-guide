"use client";

import { useEffect, useRef, useState } from "react";
import type { AnimationEvent, ComponentType, CSSProperties } from "react";
import { ArrowRight, Check } from "lucide-react";
import { projects } from "@/lib/content";
import type { Project } from "@/lib/content";
import { CaseFileIcon, GaugeIcon, PhoneIcon, StopwatchIcon } from "./hero-explore-art";
import styles from "./hero-explore.module.css";

/** Rows in the order the spotlight visits them: race, challenge, projects, engineering work. */
const ROWS = 4;
const PROJECTS_ROW = 2;

const vars = (values: Record<string, number>) => values as CSSProperties;

type Props = {
  /** Scrolls to the live projects, opening one of them when given its id. */
  onExplore: (id?: Project["id"]) => void;
  /** The page's own project logo, so the hero and the project rail show the same files. */
  Logo: ComponentType<{ id: Project["id"] }>;
};

/**
 * The hero's "Explore my work" column. Each link's icon plays a short scene about what is behind
 * it; one row plays at a time, in order, and the spotlight moves on when that row's clock (a CSS
 * animation, `--skit` long) completes a lap. The row under the pointer or keyboard focus plays at
 * once and keeps playing until it is left. Scenes run only while the column is on screen and the
 * tab is visible, and never under reduced motion; every scene ends on the row's resting look.
 * The markup is the same on the server and the client: state only switches data attributes.
 */
export function HeroExplore({ onExplore, Logo }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const held = useRef<number | null>(null);
  const motionOk = useRef(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [paused, setPaused] = useState(true);
  const [app, setApp] = useState<number | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = false;
    let started = false;
    let timer = 0;
    const sync = () => {
      motionOk.current = !reduce.matches;
      const run = onScreen && !reduce.matches && document.visibilityState === "visible";
      setPaused(!run);
      if (reduce.matches) {
        started = false;
        window.clearTimeout(timer);
        setPlaying(null);
      } else if (run && !started) {
        // The tour starts a beat after the column first shows, once the headline has been seen.
        started = true;
        timer = window.setTimeout(() => setPlaying((current) => current ?? 0), 900);
      }
    };
    const observer = new IntersectionObserver(([entry]) => { onScreen = Boolean(entry?.isIntersecting); sync(); }, { threshold: 0.2 });
    observer.observe(root);
    document.addEventListener("visibilitychange", sync);
    reduce.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduce.removeEventListener("change", sync);
      window.clearTimeout(timer);
    };
  }, []);

  const onLap = (event: AnimationEvent<HTMLDivElement>) => {
    const clock = (event.target as HTMLElement).dataset.clock;
    if (clock === undefined) return;
    const row = Number(clock);
    if (row !== playing || held.current === row) return;
    setPlaying((row + 1) % ROWS);
  };
  const hold = (row: number) => {
    held.current = row;
    if (motionOk.current) setPlaying(row);
  };
  const release = (row: number) => {
    if (held.current === row) held.current = null;
  };
  const row = (index: number) => ({
    "data-playing": playing === index ? "" : undefined,
    onPointerEnter: () => hold(index),
    onPointerLeave: () => release(index),
    onFocus: () => hold(index),
    onBlur: () => release(index),
  });
  const clock = (index: number) => <i className={styles.clock} data-clock={index} aria-hidden="true" />;

  return (
    <div ref={rootRef} className={`hero-stats ${styles.root}`} data-paused={paused ? "" : undefined} onAnimationIteration={onLap}>
      <span className="section-eyebrow"><ArrowRight size={15} aria-hidden="true" />Explore my work</span>
      <a href="#performance-lab" className={styles.race} {...row(0)}>
        <span className={`stat-symbol ${styles.symbol}`} aria-hidden="true"><GaugeIcon /></span>
        <span><strong>Watch a slow site get fast</strong><small>A real business site vs. my rebuild, racing side by side, live in your browser.</small></span>
        {clock(0)}
      </a>
      <a href="/work/technical-challenge/" className={styles.challenge} {...row(1)}>
        <span className={`stat-symbol ${styles.symbol}`} aria-hidden="true"><StopwatchIcon /><span className={styles.done}><Check size={10} strokeWidth={3.6} /></span></span>
        <span><strong>Ship an AI product in one hour</strong><small>A timed technical challenge, step by step: requirements, tests, code, proof — and every decision.</small></span>
        {clock(1)}
      </a>
      <button className={styles.projects} onClick={() => onExplore()} data-app={app ?? undefined} {...row(PROJECTS_ROW)}>
        <span className={`stat-symbol ${styles.symbol}`} aria-hidden="true">
          <span className={styles.phone}>
            <PhoneIcon />
            <span className={styles.screen}>{projects.map((item, i) => <span key={item.id} className={styles.app} data-shown={app === i ? "" : undefined} style={vars({ "--n": i })}><Logo id={item.id} /></span>)}</span>
          </span>
        </span>
        <span><strong>Explore my personal projects</strong><small>See the products and engineering decisions behind them.</small></span>
        {clock(PROJECTS_ROW)}
      </button>
      <nav className={`hero-app-logos ${styles.logos}`} aria-label="Open a project directly" data-playing={playing === PROJECTS_ROW && app === null ? "" : undefined} onPointerEnter={() => hold(PROJECTS_ROW)} onPointerLeave={() => release(PROJECTS_ROW)}>
        {projects.map((item, i) => (
          <button key={item.id} className="hero-app-logo" title={item.name} aria-label={`Open ${item.name}`} style={vars({ "--n": i })} onClick={() => onExplore(item.id)}
            onPointerEnter={() => setApp(i)} onPointerLeave={() => setApp(null)} onFocus={() => { setApp(i); hold(PROJECTS_ROW); }} onBlur={() => { setApp(null); release(PROJECTS_ROW); }}>
            <Logo id={item.id} />
          </button>
        ))}
      </nav>
      <a href="#engineering-work" className={styles.engineering} {...row(3)}>
        <span className={`stat-symbol ${styles.symbol}`} aria-hidden="true"><CaseFileIcon /></span>
        <span><strong>Explore engineering work</strong><small>Product, AI, and engineering-tooling case studies.</small></span>
        {clock(3)}
      </a>
    </div>
  );
}
