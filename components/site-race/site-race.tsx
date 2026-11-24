"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Flag, Gauge, Link2, Monitor, Pause, Play, Smartphone, Swords, Timer } from "lucide-react";
import type { LaneId, MarkName, RacePageId, RaceProfile } from "@/packages/contracts/src/site-race";
import { RACE_PAGES } from "@/packages/contracts/src/site-race";
import { frameAt, idleRace, useRace, type LaneState, type RaceState } from "@/lib/site-race/use-race";
import { REPORT_ID, reportLink, setupKey, setupOf } from "@/lib/site-race/reports";
import { formatValue, kb, ms, scoreRace, weightCensored, type Round, type Verdict } from "@/lib/site-race/scoring";
import { featuredStage, raceUrl, stageForUrl, stages, type StageId } from "@/lib/site-race/journey";
import { RaceScorecard, UnderTheHood, useVisualProgress } from "./race-insights";
import { finishTime, isCapped, laneClock, laneIdentity, toneClass, useClock, usePrefersReducedMotion, type LaneIdentity } from "./race-shared";
import styles from "./site-race.module.css";

const LANES: LaneId[] = ["a", "b"];
const MARKS: { name: MarkName; label: string }[] = [
  { name: "ttfb", label: "TTFB" },
  { name: "fcp", label: "FCP" },
  { name: "lcp", label: "LCP" },
  // DOMContentLoaded is not shown: async scripts (Next.js) do not delay it while module
  // scripts (Astro) do, so it would compare two different things. The load event does not have that bias.
  { name: "load", label: "Loaded" },
];
const PHASE_LABEL: Record<LaneState["phase"], string> = {
  queued: "On the grid",
  launching: "Starting Chrome on Cloudflare…",
  loading: "Home · loading",
  settling: "Loaded · waiting for 5 s of quiet (TTI)",
  inspecting: "Inspecting HTML, headers and SEO",
  revisiting: "Repeat visit · home again, cache on",
  navigating: "Tapping through · catalogue → HR40-5RZ",
  done: "Done",
  failed: "Did not finish",
};
const PROFILE_NOTE: Record<RaceProfile, string> = {
  mobile: "Mobile matches the projects' own performance reports: 390 px wide, slow 4G (1.6 Mbps, 150 ms), 4× CPU slowdown.",
  desktop: "Desktop: 1440 px wide, no network or CPU throttling — a fast connection hides heavy images, so rendering and JavaScript decide.",
};
const FAIRNESS_NOTE = "Before the clock starts, both sites are visited once at full speed in a discarded session (home, catalogue, model page), so both CDN caches are warmed identically; the timed load then starts with a cold browser (no cache, no open connections). The home page is watched until it is fully loaded and has been quiet for 5 s, or 30 s at most. Then each lane, in the same order: the home page again with the cache on, a tap to the catalogue, a tap to a model page. Before each step the previous page may finish downloading, so every step measures itself.";
/** Pages with a recorded race to fall back on when the live browsers are unavailable. */
const RECORDED_PAGES: RacePageId[] = ["model", "home"];
const recordingFor = (page: RacePageId, profile: RaceProfile) => `/lab/site-race/recorded-${profile}-${RECORDED_PAGES.includes(page) ? page : "model"}.ndjson`;
const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
/** Once the arena moves on from a race opened by link, a reload should not bring that race back. */
function dropReportParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("report")) return;
  url.searchParams.delete("report");
  window.history.replaceState(null, "", url);
}

export type SiteRaceProps = {
  page: RacePageId;
  stage: StageId;
  profile: RaceProfile;
  onPage: (page: RacePageId) => void;
  onStage: (stage: StageId) => void;
  onProfile: (profile: RaceProfile) => void;
  /** Increments when another part of the page asks for a race (the journey's "Race this stage"). */
  startSignal: number;
};

export function SiteRace({ page, stage, profile, onPage, onStage, onProfile, startSignal }: SiteRaceProps) {
  const { state, runLive, runReplay, openReport, show, stop } = useRace();
  const reduced = usePrefersReducedMotion();
  const [lights, setLights] = useState(0);
  const [challenge, setChallenge] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [revealed, setRevealed] = useState(0);
  /** "copied" after a copy, or the link itself when the clipboard refused. */
  const [copied, setCopied] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const stateRef = useRef(state);
  /** The scoreboard reveals round by round only for a race that just finished in front of the visitor. */
  const animateReveal = useRef(false);

  const racing = state.status === "connecting" || state.status === "racing";
  const now = useClock(racing || replaying);
  const verdict: Verdict | null = useMemo(
    () => (state.lanes.a.metrics && state.lanes.b.metrics ? scoreRace(state.lanes.a.metrics, state.lanes.b.metrics) : null),
    [state.lanes.a.metrics, state.lanes.b.metrics],
  );
  const winnerLane = verdict && verdict.winner !== "tie" ? verdict.winner : null;
  const identity = (id: LaneId) => laneIdentity(state.lanes[id], id, stage);
  const progress = useVisualProgress(state);

  useEffect(() => { stateRef.current = state; }, [state]);

  // Start lights: five reds while Chrome boots on Cloudflare, lights out on the first frame.
  const firstFrame = state.lanes.a.frames.length > 0 || state.lanes.b.frames.length > 0;
  useEffect(() => {
    if (state.status !== "connecting" && state.status !== "racing") return;
    if (firstFrame) { setLights(6); return; }
    setLights(0);
    const timer = setInterval(() => setLights((value) => Math.min(5, value + 1)), reduced ? 50 : 420);
    return () => clearInterval(timer);
  }, [state.status, state.source, firstFrame, reduced]);

  // Reveal the scoreboard one round at a time after a race; a reopened race shows it whole.
  useEffect(() => {
    if (state.status !== "finished" || !verdict) { setRevealed(0); return; }
    if (reduced || !animateReveal.current) { setRevealed(verdict.rounds.length + 1); return; }
    animateReveal.current = false;
    setRevealed(0);
    let step = 0;
    const timer = setInterval(() => { step += 1; setRevealed(step); if (step > verdict.rounds.length) clearInterval(timer); }, 850);
    return () => clearInterval(timer);
  }, [state.status, verdict, reduced]);

  const maxT = useMemo(() => {
    const ends = LANES.flatMap((id) => [state.lanes[id].frames.at(-1)?.t ?? 0, ...Object.values(state.lanes[id].marks)]);
    return Math.max(4000, ...ends);
  }, [state.lanes]);

  // Photo finish: both filmstrips on one shared clock, played only when asked for —
  // a clock that restarts by itself after the race looks like the race is still on.
  // Long races replay faster, so a 30-second loser does not hold the screen for 30 seconds.
  const speed = Math.max(0.6, maxT / 8000);
  const replayStart = useRef(0);
  useEffect(() => {
    if (state.status !== "finished") { setScrub(null); setReplaying(false); }
  }, [state.status]);
  useEffect(() => {
    if (!replaying) return;
    const t = Math.max(0, (now - replayStart.current) * speed);
    if (t >= maxT) { setReplaying(false); setScrub(null); return; }
    setScrub(t);
  }, [now, maxT, replaying, speed]);
  const toggleReplay = () => {
    if (replaying) { setReplaying(false); return; }
    const from = scrub !== null && scrub < maxT - 50 ? scrub : 0;
    replayStart.current = performance.now() - from / speed;
    setScrub(from);
    setReplaying(true);
  };

  // The arena shows only the race for the selected page, stage and device. Changing any of
  // them clears a finished race back to an empty grid; a running race is never replaced.
  useEffect(() => {
    const current = stateRef.current;
    if (current.status === "idle" || current.status === "connecting" || current.status === "racing") return;
    const shown = setupOf(current);
    if (shown && setupKey(shown) === setupKey({ page, stage, profile })) return;
    setScrub(null);
    setReplaying(false);
    setNotice(null);
    dropReportParam();
    show(idleRace(profile));
  }, [page, stage, profile, show]);

  // Every finished race is saved by the Worker; a ?report=<id> link opens that one race.
  const openSaved = useCallback(async (id: string) => {
    const opened = await openReport(id);
    const setup = opened ? setupOf(opened) : null;
    if (!setup) return;
    onPage(setup.page);
    onStage(setup.stage);
    onProfile(setup.profile);
  }, [openReport, onPage, onStage, onProfile]);
  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get("report");
    if (id && REPORT_ID.test(id)) void openSaved(id);
    // Runs once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async (a: string, b: string) => {
    setNotice(null);
    setScrub(null);
    setReplaying(false);
    dropReportParam();
    animateReveal.current = true;
    const result = await runLive({ a, b, profile, page });
    const ours = !a.includes(".") || stageForUrl(a) !== null;
    const theirs = !b.includes(".") || stageForUrl(b) !== null;
    if (!result.ok && (result.status === 429 || result.status === 0 || result.status >= 500) && ours && theirs) {
      setNotice(result.status === 429
        ? "The live browsers are busy cooling down, so here is a recorded race instead."
        : "The live race service is unreachable right now, so here is a recorded race instead.");
      await runReplay(recordingFor(page, profile));
    }
  };
  const startDuel = () => void start("astro", raceUrl(stage));

  // The journey below can ask for a race of a particular stage.
  const lastSignal = useRef(startSignal);
  useEffect(() => {
    if (startSignal === lastSignal.current) return;
    lastSignal.current = startSignal;
    sectionRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    if (!racing) startDuel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  const startChallenge = (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge.trim()) return;
    void start(raceUrl(featuredStage.id), challenge.trim());
  };

  const copyLink = async () => {
    if (!state.reportId) return;
    const link = reportLink(state.reportId, window.location.href);
    try {
      await navigator.clipboard.writeText(link);
      setCopied("copied");
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // No clipboard (permissions, insecure origin): show the link to copy by hand.
      setCopied(link);
    }
  };

  const tLabel = scrub === null ? null : `${(scrub / 1000).toFixed(2)} s`;
  const afterStages = stages.filter((item) => item.id !== "original");
  const bothFinished = finishTime(state.lanes.a) !== null && finishTime(state.lanes.b) !== null;
  const lightsState = replaying ? "replay" : racing ? (lights === 6 ? (bothFinished ? "scoring" : "go") : "armed") : state.status === "finished" ? "over" : "idle";
  const lightsLabel = {
    replay: "Replay",
    go: "GO",
    scoring: "Scoring",
    armed: "Starting Chrome…",
    over: state.source === "report" ? "Saved race" : "Race over",
    idle: state.status === "failed" ? "Stopped" : "Ready",
  }[lightsState];

  return (
    <section ref={sectionRef} className={styles.race} aria-labelledby="site-race-title" id="race">
      {/* The measured numbers live in the result block above (results.tsx); this head only says what the race does. */}
      <div className={styles.head}>
        <p className={styles.kicker}><Gauge size={14} aria-hidden="true" /> Live race · real Chrome on Cloudflare&apos;s edge</p>
        <h2 id="site-race-title" className={styles.title}>
          Race it <span className={styles.toneNext}>yourself.</span>
        </h2>
        <p className={styles.lede}>
          Two identical Chrome sessions open the original and the Next.js site at the same moment, on the same connection,
          and you watch both screens live.
        </p>
      </div>

      <div className={styles.controls}>
          {racing ? (
            <button type="button" className={styles.startButton} onClick={stop}>Stop race</button>
          ) : (
            <button type="button" className={styles.startButton} onClick={startDuel}>
              <Play size={18} aria-hidden="true" /> {state.status === "idle" ? "Prove it in a live race" : "Race again"}
            </button>
          )}
          {/* The one choice before the start, next to it: switching swaps the devices in the arena at once. */}
          <div className={styles.segmented} role="radiogroup" aria-label="Device to race on">
            <button type="button" role="radio" aria-checked={profile === "mobile"} className={profile === "mobile" ? styles.segOn : ""} onClick={() => onProfile("mobile")} disabled={racing}><Smartphone size={16} aria-hidden="true" /> Mobile <small>slow 4G</small></button>
            <button type="button" role="radio" aria-checked={profile === "desktop"} className={profile === "desktop" ? styles.segOn : ""} onClick={() => onProfile("desktop")} disabled={racing}><Monitor size={16} aria-hidden="true" /> Desktop</button>
          </div>
      </div>

      <details className={styles.settings}>
        <summary>How the race stays fair</summary>
        <p className={styles.fairNote}>{FAIRNESS_NOTE}</p>
      </details>

      <div className={styles.lights} aria-hidden="true" data-state={lightsState}>
        {[1, 2, 3, 4, 5].map((n) => <span key={n} className={lights >= n && lights < 6 && racing ? styles.lightOn : ""} />)}
        <strong key={lightsState}>{lightsLabel}</strong>
      </div>

      <p className={styles.status} role="status" aria-live="polite">
        {notice ?? (state.status === "failed" ? state.error
          : state.source === "report" && state.recordedAt ? `Saved race from ${when(state.recordedAt)} · ${RACE_PAGES[state.page ?? "home"].label} · ${state.profileLabel}`
          : state.source === "replay" && state.recordedAt ? `Recorded race from ${when(state.recordedAt)} · ${RACE_PAGES[state.page ?? "home"].label} · ${state.profileLabel}`
          : state.profileLabel ? `${RACE_PAGES[state.page ?? page].label} · ${state.profileLabel}`
          : PROFILE_NOTE[profile])}
      </p>
      {state.status === "finished" && state.reportId && state.source === "live" && (
        <p className={styles.savedNote}>
          <Check size={14} aria-hidden="true" /> Report saved
          {copied && copied !== "copied"
            ? <a href={copied}>{copied}</a>
            : <button type="button" onClick={() => void copyLink()}><Link2 size={14} aria-hidden="true" /> {copied ? "Link copied" : "Copy link"}</button>}
        </p>
      )}

      <div className={styles.arena}>
        {LANES.map((id) => (
          <LaneView key={id} lane={state.lanes[id]} rival={state.lanes[id === "a" ? "b" : "a"]} identity={identity(id)} now={now} scrub={scrub} profile={state.status === "idle" ? profile : state.profile}
            winner={revealed > (verdict?.rounds.length ?? 99) && winnerLane === id} />
        ))}
      </div>

      <Track state={state} now={now} maxT={maxT} scrub={scrub} identity={identity} />

      {state.status === "finished" && verdict && (
        <>
          <div className={styles.scrubber}>
            <button type="button" className={styles.replayButton} onClick={toggleReplay} aria-pressed={replaying}>
              {replaying ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />} {replaying ? "Pause" : "Replay side by side"}
            </button>
            <input type="range" min={0} max={Math.round(maxT)} step={10} value={Math.round(scrub ?? maxT)} aria-label="Photo finish: moment to show on both screens"
              onChange={(event) => { setReplaying(false); const value = Number(event.target.value); setScrub(value >= maxT ? null : value); }} />
            <span>{tLabel ? <><Timer size={14} aria-hidden="true" /> Both screens at <b>{tLabel}</b></> : "Drag to compare both screens at the same moment"}</span>
          </div>
          <RaceScorecard state={state} progress={progress} identity={identity} />
          <Scoreboard verdict={verdict} identity={identity} revealed={revealed} reduced={reduced} />
          <UnderTheHood state={state} identity={identity} />
        </>
      )}

      <form className={styles.challenge} onSubmit={startChallenge}>
        <div>
          <p className={styles.kicker}><Swords size={14} aria-hidden="true" /> Challenger round</p>
          <h3>Think your site is faster?</h3>
          <p>Enter any public website. It races the optimized Next.js site ({RACE_PAGES[page].label.toLowerCase()}) under the same conditions — same browser, same throttling, same scoring.</p>
        </div>
        <div className={styles.challengeRow}>
          <input value={challenge} onChange={(event) => setChallenge(event.target.value)} placeholder="your-site.com" inputMode="url" autoComplete="url" aria-label="Website to race" maxLength={300} disabled={racing} />
          <button type="submit" className={styles.startButton} disabled={racing || !challenge.trim()}><Flag size={16} aria-hidden="true" /> Challenge</button>
        </div>
      </form>
    </section>
  );
}

function LaneView({ lane, rival, identity, now, scrub, profile, winner }: { lane: LaneState; rival: LaneState; identity: LaneIdentity; now: number; scrub: number | null; profile: RaceProfile; winner: boolean }) {
  const clock = laneClock(lane, now);
  const frame = scrub !== null ? frameAt(lane.frames, scrub) : lane.frames.at(-1) ?? null;
  const { role, label, stack } = identity;
  const mine = finishTime(lane);
  const theirs = finishTime(rival);
  const failed = lane.phase === "failed";
  // In the photo finish both lanes share one clock and each stopwatch stops at its own finish line.
  const t = scrub ?? clock;
  const shownT = scrub !== null && mine !== null ? Math.min(scrub, mine) : t;
  const finishedNow = mine !== null && (scrub === null || scrub >= mine);
  const capped = isCapped(lane);
  const capS = ((lane.metrics?.capMs ?? 30_000) / 1000).toFixed(0);
  const hasLcp = lane.marks.lcp !== undefined;
  const seconds = (value: number) => `${(value / 1000).toFixed(2)} s`;
  // Once the rival has crossed the line, count how long this lane has been going since.
  // Live, a lane learns its own LCP only when it settles, so it reads "still loading";
  // in the photo finish both finish lines are known, so the gap is a real "behind".
  const trailing = !finishedNow && !failed && theirs !== null && t !== null && t > theirs && (scrub === null || scrub >= theirs) ? t - theirs : null;
  // The stopwatch stops at LCP, the Speed round's headline metric. A lane stopped at the cap
  // without a final LCP shows the cap as a lower bound, exactly as the scoreboard does.
  const censoredClock = finishedNow && !hasLcp && capped;
  const clockNote = shownT === null ? null : finishedNow ? (hasLcp ? "to LCP" : capped ? "no final LCP" : "to first paint") : "elapsed";
  return (
    <article className={`${styles.lane} ${toneClass(identity.kind)} ${winner ? styles.laneWinner : ""}`} aria-label={`${label} lane`}>
      <header className={styles.laneHead}>
        <div>
          <span className={styles.role}>{role}</span>
          <h3>{label}</h3>
          {stack && <span className={styles.stack}>{stack}</span>}
        </div>
        <div className={styles.clock}>
          <output className={styles.stopwatch} aria-label={`${label} time`}>{censoredClock ? "> " : ""}{shownT === null ? "0.00" : (Math.max(0, shownT) / 1000).toFixed(2)}<small>s</small></output>
          {clockNote && <span className={styles.clockNote}>{clockNote}</span>}
        </div>
      </header>
      <div className={`${styles.device} ${profile === "desktop" ? styles.deviceDesktop : ""}`}>
        {frame ? <img src={frame.src} alt={`${label} as the test browser saw it`} /> : <div className={styles.blank}>{lane.phase === "queued" ? "Waiting for the start" : "No pixels yet"}</div>}
        {finishedNow && !capped && !failed && <span className={styles.finishBadge}>Finished · {hasLcp ? "LCP " : ""}{seconds(mine)}</span>}
        {finishedNow && capped && (
          <span className={`${styles.finishBadge} ${styles.finishCapped}`}>{hasLcp ? `LCP ${seconds(lane.marks.lcp!)} · ` : ""}still loading at {capS} s</span>
        )}
        {trailing !== null && (
          <span className={styles.behindBadge}>{scrub !== null ? `+${(trailing / 1000).toFixed(1)} s behind` : `Still loading · +${(trailing / 1000).toFixed(1)} s`}</span>
        )}
        {scrub !== null
          ? <span className={styles.phase} data-phase="replay">Replay</span>
          : lane.phase !== "done" && <span className={styles.phase} data-phase={lane.phase}>{lane.phaseDetail ?? PHASE_LABEL[lane.phase]}</span>}
      </div>
      <ul className={styles.marks}>
        {MARKS.map(({ name, label: markLabel }) => {
          const at = lane.marks[name];
          const passed = at !== undefined && (scrub === null || scrub >= at);
          const text = at !== undefined ? ms(at) : name === "lcp" && capped ? `> ${capS} s` : "—";
          return <li key={name} className={passed ? styles.markOn : ""}><span>{markLabel}</span><b>{text}</b></li>;
        })}
      </ul>
      {lane.metrics ? (
        // After the first page: its own numbers (what the Weight round scores); the visit's later steps are listed below.
        <p className={styles.counters}><span><b>{weightCensored(lane.metrics) ? "> " : ""}{lane.metrics.network.requests}</b> requests</span><span><b>{weightCensored(lane.metrics) ? "> " : ""}{kb(lane.metrics.network.totalKb)}</b> home page</span></p>
      ) : (
        <p className={styles.counters}><span><b>{lane.net.requests}</b> requests</span><span><b>{kb(lane.net.kb)}</b> downloaded</span></p>
      )}
      {lane.metrics?.navigation && <JourneyLine metrics={lane.metrics} />}
      {lane.error && <p className={styles.laneError}>{lane.error}</p>}
    </article>
  );
}

/** Minimum gap, % of the track, between two labels in the same row before the later one is dropped. */
const FLAG_GAP = 9;

/**
 * Milestone flags for one lane. A fast lane's milestones bunch up within a second on a
 * 30-second track, so labels alternate above and below the bar, the finish line (LCP)
 * always keeps its label, and any other label too close to one already placed is
 * dropped — its line stays, and the value is in the milestone tiles above.
 */
function trackFlags(lane: LaneState, maxT: number) {
  const flags = MARKS.flatMap(({ name, label }, index) => {
    const t = lane.marks[name];
    return t === undefined ? [] : [{ name, label, low: index % 2 === 1, x: Math.min(100, (t / maxT) * 100) }];
  });
  const placed: Record<"top" | "low", number[]> = { top: [], low: [] };
  const labelled = new Set<MarkName>();
  for (const flag of [...flags].sort((p, q) => Number(q.name === "lcp") - Number(p.name === "lcp"))) {
    const row = placed[flag.low ? "low" : "top"];
    if (row.every((x) => Math.abs(x - flag.x) >= FLAG_GAP)) { row.push(flag.x); labelled.add(flag.name); }
  }
  return flags.map((flag) => ({ ...flag, labelled: labelled.has(flag.name) }));
}

function Track({ state, now, maxT, scrub, identity }: { state: RaceState; now: number; maxT: number; scrub: number | null; identity: (id: LaneId) => LaneIdentity }) {
  return (
    <div className={styles.track} aria-hidden="true">
      {LANES.map((id) => {
        const lane = state.lanes[id];
        const clock = scrub ?? laneClock(lane, now) ?? 0;
        const who = identity(id);
        return (
          <div key={id} className={`${styles.trackLane} ${toneClass(who.kind)}`}>
            <span className={styles.trackName}>{who.role}</span>
            <div className={styles.trackBar}>
              <div className={styles.trackFill} style={{ width: `${Math.min(100, (clock / maxT) * 100)}%` }} />
              {trackFlags(lane, maxT).map((flag) => (
                <span key={flag.name} className={`${styles.flag} ${flag.low ? styles.flagLow : ""}`} style={{ left: `${flag.x}%` }}><i />{flag.labelled ? flag.label : null}</span>
              ))}
            </div>
          </div>
        );
      })}
      <div className={styles.trackScale}>{Array.from({ length: 5 }, (_, i) => <span key={i}>{((maxT / 4) * i / 1000).toFixed(1)} s</span>)}</div>
    </div>
  );
}

function Scoreboard({ verdict, identity, revealed, reduced }: { verdict: Verdict; identity: (id: LaneId) => LaneIdentity; revealed: number; reduced: boolean }) {
  const name = (id: LaneId) => { const d = identity(id); return d.kind === "challenger" ? d.label : `${d.label} (${d.role.toLowerCase()})`; };
  const tone = (id: LaneId) => toneClass(identity(id).kind);
  const done = revealed > verdict.rounds.length;
  const winner = verdict.winner === "tie" ? null : verdict.winner;
  const loser: LaneId | null = winner === "a" ? "b" : winner === "b" ? "a" : null;
  const byRounds = verdict.roundsWon.a !== verdict.roundsWon.b;
  return (
    <div className={styles.scoreboard}>
      <div className={styles.tally} aria-live="polite">
        {LANES.map((id) => (
          <div key={id} className={`${styles.tallySide} ${tone(id)}`}>
            <span><i className={styles.key} aria-hidden="true" />{name(id)}</span>
            <b>{verdict.rounds.slice(0, revealed).filter((round) => round.winner === id).length}</b>
          </div>
        ))}
        <p>rounds</p>
      </div>
      <ol className={styles.rounds}>
        {verdict.rounds.map((round, index) => (
          <RoundCard key={round.id} round={round} index={index} visible={index < revealed} name={name} tone={tone} />
        ))}
      </ol>
      {done && (
        <div className={styles.verdict} role="status">
          {!reduced && winner && <Confetti tone={tone(winner)} />}
          {winner && loser ? (
            <h3>
              <span className={tone(winner)}>{name(winner)}</span> {byRounds
                ? `wins ${verdict.roundsWon[winner]}–${verdict.roundsWon[loser]} on rounds`
                : `edges it ${verdict.metricWins[winner]}–${verdict.metricWins[loser]} on metrics`}
            </h3>
          ) : (
            <h3>Dead heat.</h3>
          )}
          <p>
            {!byRounds && winner ? `Rounds tied ${verdict.roundsWon.a}–${verdict.roundsWon.b}, so the decisive metrics settle it. ` : ""}
            {verdict.metricWins.a + verdict.metricWins.b} decisive metrics: {name("a")} took {verdict.metricWins.a}, {name("b")} took {verdict.metricWins.b}.
            This is one race, one sample: a gap smaller than two runs of the same site differ by (measured, per metric) counts as a draw,
            and a value capped at 30 s is a lower bound that cannot win.
          </p>
        </div>
      )}
    </div>
  );
}

function RoundCard({ round, index, visible, name, tone }: { round: Round; index: number; visible: boolean; name: (id: LaneId) => string; tone: (id: LaneId) => string }) {
  return (
    <li className={`${styles.round} ${visible ? styles.roundVisible : ""}`} aria-hidden={!visible}>
      <header>
        <span className={styles.roundNo}>Round {index + 1}</span>
        <h4>{round.title}</h4>
        <p>{round.subtitle}</p>
        <strong className={round.winner === "tie" ? styles.roundTie : tone(round.winner)}>
          {round.winner === "tie" ? "Draw" : <><i className={styles.key} aria-hidden="true" />{name(round.winner)} +1</>}
        </strong>
      </header>
      <table>
        <caption className="sr-only">{round.title}: {name("a")} versus {name("b")}</caption>
        <tbody>
          {round.rows.map((row) => {
            const max = Math.max(row.a ?? 0, row.b ?? 0) || 1;
            return (
              <tr key={row.id}>
                <th scope="row"><b>{row.label}</b><span>{row.hint}</span></th>
                {(["a", "b"] as LaneId[]).map((id) => {
                  const value = row[id];
                  return (
                    <td key={id} className={`${tone(id)} ${row.winner === id ? styles.cellWin : ""}`}>
                      <span className={styles.bar}><i style={{ width: visible && value !== null ? `${Math.max(4, (value / max) * 100)}%` : 0 }} /></span>
                      <b>{formatValue(row, id)}{row.winner === id && <span className={styles.star} aria-label="better"> ★</span>}</b>
                      {row.note?.[id] && <small className={styles.cellNote}>{row.note[id]}</small>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </li>
  );
}

function Confetti({ tone }: { tone: string }) {
  const pieces = useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    left: (i * 37) % 100, delay: (i % 9) * 0.07, drift: ((i * 53) % 120) - 60, spin: (i * 77) % 720, hue: i % 3,
  })), []);
  return (
    <div className={`${styles.confetti} ${tone}`} aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} data-hue={p.hue} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, ["--drift" as string]: `${p.drift}px`, ["--spin" as string]: `${p.spin}deg` }} />
      ))}
    </div>
  );
}

const STEP_NAME: Record<string, string> = { "/pumps/": "Catalogue", "/boom-pumps/hr40-5rz/": "HR40-5RZ page", "/boom-pumps/hr21-4zr/": "HR21-4ZR page" };
export const stepName = (to: string) => STEP_NAME[to] ?? to;

/** The journey race at a glance, in the order it runs: the home load, the return visit, then each tap. */
function JourneyLine({ metrics }: { metrics: NonNullable<LaneState["metrics"]> }) {
  const steps = metrics.navigationSteps ?? (metrics.navigation ? [metrics.navigation] : []);
  const after = (value: number | null, cap: number) => (value === null ? `> ${(cap / 1000).toFixed(0)} s` : `+${(value / 1000).toFixed(2)} s`);
  return (
    <p className={styles.journeyLine}>
      <span>Home: <b>{metrics.timing.lcp === null ? "no final LCP" : `LCP ${ms(metrics.timing.lcp)}`}</b></span>
      {metrics.repeat && (metrics.repeat.skipped ? <span>Return visit: <b>skipped</b></span> : <span>Return visit: <b>{metrics.repeat.lcp === null ? `> ${(metrics.repeat.capMs / 1000).toFixed(0)} s` : `LCP ${ms(metrics.repeat.lcp)}`}</b> · {kb(metrics.repeat.net.kb)}</span>)}
      {steps.map((step) => (
        <span key={step.to}>{stepName(step.to)}: {step.skipped ? <b>not reached</b> : <><b>{after(step.content, step.capMs)}</b> after tap · image <b>{after(step.image, step.capMs)}</b></>}</span>
      ))}
    </p>
  );
}
