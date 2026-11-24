"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Check, Flag, Gauge, Link2, Monitor, Pause, Play, Smartphone, Swords, Timer, X } from "lucide-react";
import type { LaneId, MarkName, RaceCaps, RaceLink, RacePageId, RaceProfile } from "@/packages/contracts/src/site-race";
import { RACE_PAGES } from "@/packages/contracts/src/site-race";
import { firstPagesIn, frameAt, idleRace, pendingLanes, useRace, verdictFinal, verdictOf, type LaneState, type RaceState } from "@/lib/site-race/use-race";
import { REPORT_ID, reportLink, setupKey, setupOf } from "@/lib/site-race/reports";
import { formatValue, kb, ms, weightCensored, type Round, type Verdict } from "@/lib/site-race/scoring";
import { featuredStage, stageById, stageForUrl, stages, type StageId } from "@/lib/site-race/journey";
import { RaceScorecard, UnderTheHood, useVisualProgress } from "./race-insights";
import { capSeconds, FullPageLine, PatienceWhy } from "./patience";
import { finishTime, isCapped, laneClock, laneIdentity, stoppedLoading, toneClass, useClock, usePrefersReducedMotion, type LaneIdentity } from "./race-shared";
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
  navigating: "Tapping through the site",
  done: "Done",
  failed: "Did not finish",
};
const PROFILE_NOTE: Record<RaceProfile, string> = {
  mobile: "Mobile matches the projects' own performance reports: 390 px wide, slow 4G (1.6 Mbps, 150 ms), 4× CPU slowdown.",
  desktop: "Desktop: 1440 px wide, no network or CPU throttling — a fast connection hides heavy images, so rendering and JavaScript decide.",
};
/** The fine print, with the caps the race shown ran under (the current ones before any race). */
const fairnessNote = (caps: RaceCaps) => `Before the clock starts, both sites are visited once at full speed in a discarded session (every page of the visit), so both CDN caches are warmed identically; that load also weighs each first page in full. The timed load then starts with a cold browser (no cache, no open connections). The home page is watched until it is fully loaded and has been quiet for 5 s. One still loading at ${capSeconds(caps.firstPageMs)}, a visitor's patience, is stopped there; one that loaded in time may take those 5 s to show it is quiet. Its rounds are scored the moment both home pages are done. Then each lane, in the same order: the home page again with the cache on (${capSeconds(caps.repeatMs)} at most), then two taps through the site (${capSeconds(caps.tapMs)} each); their rounds fill in as they finish. Before each step the previous page may finish downloading, so every step measures itself.`;
/**
 * The race's plan as the visitor sees it: one step per stage of the visit. A step is done when
 * both lanes have moved past it, so the bar always shows the slower lane's progress. The first
 * page's scores arrive after the second step; the last step is the visit's rounds coming in.
 * Challenger races (a visitor's site) stop after the first page.
 */
type ProgressStep = { id: string; label: string; phases: LaneState["phase"][] };
const PROGRESS_STEPS: ProgressStep[] = [
  { id: "start", label: "Starting two Chromes", phases: ["queued", "launching"] },
  { id: "home", label: "Home page, cold", phases: ["loading", "settling", "inspecting"] },
  { id: "repeat", label: "Return visit", phases: ["revisiting"] },
  { id: "taps", label: "Taps through the site", phases: ["navigating"] },
  { id: "score", label: "Final score", phases: ["done", "failed"] },
];
/** Index of the step a lane is on. */
const stepOf = (lane: LaneState, steps: ProgressStep[]) => Math.max(0, steps.findIndex((step) => step.phases.includes(lane.phase)));
/** `revealed` when the whole scoreboard shows at once (a reopened race, reduced motion). */
const REVEAL_ALL = Number.POSITIVE_INFINITY;
const clockText = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
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
  const [challenge, setChallenge] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [revealed, setRevealed] = useState(0);
  /** "copied" after a copy, or the link itself when the clipboard refused. */
  const [copied, setCopied] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const stateRef = useRef(state);
  /** The scoreboard reveals round by round only for a race that is being watched as it happens. */
  const animateReveal = useRef(false);
  /** A race the visitor started brings its scoreboard into view once, the moment it appears. */
  const scrollToScores = useRef(false);

  const racing = state.status === "connecting" || state.status === "racing";
  const now = useClock(racing || replaying);
  // The scoreboard arrives with both first pages, while the visit still runs; its rounds fill in after.
  const ready = firstPagesIn(state);
  const pending = pendingLanes(state);
  const final = verdictFinal(state);
  const verdict: Verdict | null = useMemo(
    () => verdictOf(state),
    // verdictOf reads only the lanes' metrics and which lanes are still on their visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.lanes.a.metrics, state.lanes.b.metrics, pending.a, pending.b],
  );
  const firstRounds = verdict?.rounds.filter((round) => round.part === "first-page").length ?? 0;
  const firstRoundsRef = useRef(firstRounds);
  firstRoundsRef.current = firstRounds;
  const winnerLane = verdict && verdict.winner !== "tie" ? verdict.winner : null;
  const identity = (id: LaneId) => laneIdentity(state.lanes[id], id, stage);
  const progress = useVisualProgress(state);

  useEffect(() => { stateRef.current = state; }, [state]);

  // Elapsed time on the progress bar: from the press of the button (Chrome takes a few seconds to start).
  const raceStart = useRef<number | null>(null);
  useEffect(() => {
    if (state.status === "connecting") raceStart.current = performance.now();
  }, [state.status]);

  // Reveal the first page's rounds one at a time the moment both first pages are in; the visit's
  // rounds then join as they finish, without running the reveal again. A reopened race shows it whole.
  useEffect(() => {
    if (!ready) { setRevealed(0); return; }
    if (reduced || !animateReveal.current) { setRevealed(REVEAL_ALL); return; }
    setRevealed(0);
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setRevealed(step);
      if (step > firstRoundsRef.current) { clearInterval(timer); animateReveal.current = false; }
    }, 850);
    return () => clearInterval(timer);
  }, [ready, reduced]);

  // The verdict lands below the lanes, out of sight on most screens: bring the scoreboard's top
  // into view once, for a race the visitor started (never for a reopened or recorded one). Focus
  // stays where it is; the tally's aria-live region announces the scores as before.
  useEffect(() => {
    if (!ready || !scrollToScores.current) return;
    scrollToScores.current = false;
    const board = document.getElementById("race-scoreboard");
    if (!board) return;
    const box = board.getBoundingClientRect();
    const fullyVisible = box.top >= 0 && box.bottom <= window.innerHeight;
    // Its top already on screen: the visitor is looking at it (or followed the "first scores" link).
    const topInView = box.top >= 0 && box.top < window.innerHeight / 2;
    if (fullyVisible || topInView) return;
    board.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [ready, reduced]);

  const maxT = useMemo(() => {
    const ends = LANES.flatMap((id) => [state.lanes[id].frames.at(-1)?.t ?? 0, ...Object.values(state.lanes[id].marks)]);
    return Math.max(4000, ...ends);
  }, [state.lanes]);

  // Photo finish: both filmstrips on one shared clock, played only when asked for —
  // a clock that restarts by itself after the race looks like the race is still on.
  // Long races replay faster: the whole visit, however long it ran, plays back in about 8 s.
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
    animateReveal.current = false;
    scrollToScores.current = false;
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
    scrollToScores.current = true;
    const result = await runLive({ a, b, profile, page });
    const ours = !a.includes(".") || stageForUrl(a) !== null;
    const theirs = !b.includes(".") || stageForUrl(b) !== null;
    if (!result.ok && !("aborted" in result) && (result.status === 429 || result.status === 0 || result.status >= 500) && ours && theirs) {
      setNotice(result.status === 429
        ? "The live browsers are busy cooling down, so here is a recorded race instead."
        : "The live race service is unreachable right now, so here is a recorded race instead.");
      await runReplay(recordingFor(page, profile));
    }
  };
  const startDuel = () => void start("astro", stageById(stage).url);

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
    void start(featuredStage.url, challenge.trim());
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
  // Progress: the slower lane's step; a race between this project's builds has the whole visit.
  const journey = LANES.every((id) => state.lanes[id].info?.own !== false);
  const steps = journey ? PROGRESS_STEPS : PROGRESS_STEPS.filter((step) => step.id !== "repeat" && step.id !== "taps");
  const finished = state.status === "finished";
  const stopped = state.status === "failed";
  const current = finished ? steps.length : Math.min(...LANES.map((id) => stepOf(state.lanes[id], steps)));
  const elapsed = racing && state.source === "live" && raceStart.current !== null ? clockText(Math.max(0, now - raceStart.current)) : null;

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
        <p className={styles.fairNote}>{fairnessNote(state.caps)}</p>
      </details>

      {state.status !== "idle" && (
        <div className={styles.progress} data-state={finished ? "done" : stopped ? "stopped" : "running"}>
          <ol aria-label="Race progress">
            {steps.map((step, index) => {
              const status = index < current ? "done" : index === current ? (stopped ? "stopped" : "active") : "next";
              return (
                <li key={step.id} data-status={status} aria-current={status === "active" ? "step" : undefined}>
                  <span className={styles.progressDot} aria-hidden="true">{status === "done" ? <Check size={13} /> : status === "stopped" ? <X size={13} /> : index + 1}</span>
                  <span className={styles.progressLabel}>{step.label}</span>
                </li>
              );
            })}
          </ol>
          <p className={styles.progressMeta}>
            {finished ? (state.source === "live" ? "Race complete" : state.source === "report" ? "Saved race" : "Recorded race") : stopped ? "Stopped" : replaying ? "Replay" : `Step ${Math.min(current + 1, steps.length)} of ${steps.length}`}
            {elapsed && <> · <b>{elapsed}</b></>}
          </p>
          {racing && ready && (
            // The scores sit below the lanes, out of sight on a phone: say they are in, and where.
            <p className={styles.progressScores}><a href="#race-scoreboard">First scores are in <ArrowDown size={13} aria-hidden="true" /></a> the visit&apos;s rounds join as it goes</p>
          )}
        </div>
      )}

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
        {/* The winner glows once the verdict is final, not while the visit can still change it. */}
        {LANES.map((id) => (
          <LaneView key={id} lane={state.lanes[id]} rival={state.lanes[id === "a" ? "b" : "a"]} identity={identity(id)} now={now} scrub={scrub} profile={state.status === "idle" ? profile : state.profile}
            link={state.link} running={racing && !state.lanes[id].complete} winner={final && revealed > firstRounds && winnerLane === id} />
        ))}
      </div>
      {/* Phones: two lanes side by side leave no room for a note, so it reads across both, right under them. */}
      {LANES.filter((id) => stoppedLoading(state.lanes[id])).map((id) => (
        <CapNote key={id} lane={state.lanes[id]} profile={state.profile} link={state.link} className={styles.capNoteWide} label={identity(id).label} />
      ))}

      <Track state={state} now={now} maxT={maxT} scrub={scrub} identity={identity} />

      {verdict && (
        <>
          {/* The photo finish needs every frame, so it waits for the race to end. */}
          {state.status === "finished" && (
            <div className={styles.scrubber}>
              <button type="button" className={styles.replayButton} onClick={toggleReplay} aria-pressed={replaying}>
                {replaying ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />} {replaying ? "Pause" : "Replay side by side"}
              </button>
              <input type="range" min={0} max={Math.round(maxT)} step={10} value={Math.round(scrub ?? maxT)} aria-label="Photo finish: moment to show on both screens"
                onChange={(event) => { setReplaying(false); const value = Number(event.target.value); setScrub(value >= maxT ? null : value); }} />
              <span>{tLabel ? <><Timer size={14} aria-hidden="true" /> Both screens at <b>{tLabel}</b></> : "Drag to compare both screens at the same moment"}</span>
            </div>
          )}
          <RaceScorecard state={state} progress={progress} identity={identity} />
          <Scoreboard verdict={verdict} identity={identity} revealed={revealed} reduced={reduced} final={final} stopped={stopped} caps={state.caps} />
          <UnderTheHood state={state} identity={identity} pending={pending} />
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

function LaneView({ lane, rival, identity, now, scrub, profile, link, running, winner }: { lane: LaneState; rival: LaneState; identity: LaneIdentity; now: number; scrub: number | null; profile: RaceProfile; link: RaceLink | null; running: boolean; winner: boolean }) {
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
  // Still downloading at the cap: the visitor was left waiting. A lane that loaded but never went
  // quiet for TTI was capped too, but its page was there: it finishes like any other.
  const leftWaiting = stoppedLoading(lane);
  const capS = capSeconds(lane.capMs);
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
        {finishedNow && !leftWaiting && !failed && <span className={styles.finishBadge}>Finished · {hasLcp ? "LCP " : ""}{seconds(mine)}</span>}
        {finishedNow && leftWaiting && (
          <span className={`${styles.finishBadge} ${styles.finishCapped}`}>{hasLcp ? `LCP ${seconds(lane.marks.lcp!)} · ` : ""}still loading at {capS}</span>
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
          const text = at !== undefined ? ms(at) : (name === "lcp" || name === "load") && leftWaiting ? `> ${capS}` : "—";
          return <li key={name} className={passed ? styles.markOn : ""}><span>{markLabel}</span><b>{text}</b></li>;
        })}
      </ul>
      {lane.metrics ? (
        // After the first page: its own numbers (what the Weight round scores); the visit's later steps are listed below.
        <p className={styles.counters}><span><b>{weightCensored(lane.metrics) ? "> " : ""}{lane.metrics.network.requests}</b> requests</span><span><b>{weightCensored(lane.metrics) ? "> " : ""}{kb(lane.metrics.network.totalKb)}</b> home page</span></p>
      ) : (
        <p className={styles.counters}><span><b>{lane.net.requests}</b> requests</span><span><b>{kb(lane.net.kb)}</b> downloaded</span></p>
      )}
      {lane.metrics && (hasVisit(lane.metrics) || running) && <JourneyLine metrics={lane.metrics} running={running} />}
      {/* Below the lane's numbers, never over its screen (on a phone it spans both lanes, under them). */}
      {leftWaiting && <CapNote lane={lane} profile={profile} link={link} className={styles.capNoteInLane} />}
      {lane.error && <p className={styles.laneError}>{lane.error}</p>}
    </article>
  );
}

/**
 * A lane stopped at the cap while still downloading: what it still had ahead (the warm-up's full
 * count; on a throttled link the least time that takes), and why the race stopped waiting.
 */
function CapNote({ lane, profile, link, className, label }: { lane: LaneState; profile: RaceProfile; link: RaceLink | null; className: string; label?: string }) {
  return (
    <p className={`${styles.capNote} ${className}`} role="note">
      <span className={styles.capFact}>
        {label && <>{label} · </>}
        <FullPageLine fullPage={lane.fullPage} link={profile === "mobile" ? link : null} capMs={lane.capMs}
          received={lane.metrics?.network.totalKb ?? lane.net.kb} inFlight={lane.metrics ? (lane.metrics.waterfall ?? []).filter((entry) => entry.inFlight).length : null} />
      </span>
      <span className={styles.capWhy}><PatienceWhy capMs={lane.capMs} /></span>
    </p>
  );
}

/** The lane has numbers from after its first page: a repeat visit or a tap. */
const hasVisit = (m: NonNullable<LaneState["metrics"]>) => !!m.repeat || !!m.navigation || (m.navigationSteps?.length ?? 0) > 0;

/** Minimum gap, % of the track, between two labels in the same row before the later one is dropped. */
const FLAG_GAP = 9;

/**
 * Milestone flags for one lane. A fast lane's milestones bunch up within a second on a
 * track as long as the slower lane's run, so labels alternate above and below the bar, the finish line (LCP)
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

/** A lane's name without its role, for short labels: "Original site". */
const identityShort = (full: string) => full.replace(/ \((?:before|after)\)$/, "");
/** "the 10 s cap", or "its step's cap" when the steps of an older race had different ones. */
const capPhrase = (caps: RaceCaps) => (caps.firstPageMs === caps.repeatMs && caps.firstPageMs === caps.tapMs ? `the ${capSeconds(caps.firstPageMs)} cap` : "its step's cap");

/**
 * The rounds and the verdict. While the visit runs the verdict is provisional: the first page's
 * rounds are decided, the visit's rounds wait for their lanes, and the headline says "so far".
 * It becomes the race's verdict (with the confetti) once no lane has anything left to send.
 */
function Scoreboard({ verdict, identity, revealed, reduced, final, stopped, caps }: { verdict: Verdict; identity: (id: LaneId) => LaneIdentity; revealed: number; reduced: boolean; final: boolean; stopped: boolean; caps: RaceCaps }) {
  const name = (id: LaneId) => { const d = identity(id); return d.kind === "challenger" ? d.label : `${d.label} (${d.role.toLowerCase()})`; };
  const tone = (id: LaneId) => toneClass(identity(id).kind);
  const firstRounds = verdict.rounds.filter((round) => round.part === "first-page").length;
  const done = revealed > firstRounds;
  // The first page's rounds reveal one by one; the visit's join once that is over, as they arrive.
  const visible = (index: number) => index < revealed || done;
  const winner = verdict.winner === "tie" ? null : verdict.winner;
  const loser: LaneId | null = winner === "a" ? "b" : winner === "b" ? "a" : null;
  const byRounds = verdict.roundsWon.a !== verdict.roundsWon.b;
  const settled = final && verdict.pending === 0;
  const toCome = verdict.pending;
  return (
    <div className={styles.scoreboard} id="race-scoreboard">
      <div className={styles.tally} aria-live="polite">
        {LANES.map((id) => (
          <div key={id} className={`${styles.tallySide} ${tone(id)}`}>
            <span><i className={styles.key} aria-hidden="true" />{name(id)}</span>
            <b>{verdict.rounds.filter((round, index) => visible(index) && !round.pending && round.winner === id).length}</b>
          </div>
        ))}
        <p>rounds{settled ? "" : " so far"}</p>
      </div>
      <ol className={styles.rounds}>
        {verdict.rounds.map((round, index) => (
          <RoundCard key={round.id} round={round} index={index} visible={visible(index)} name={name} tone={tone} />
        ))}
      </ol>
      {done && (
        <div className={`${styles.verdict} ${settled ? "" : styles.verdictSoFar}`} role="status">
          {settled && !reduced && winner && <Confetti tone={tone(winner)} />}
          {winner && loser ? (
            <h3>
              <span className={tone(winner)}>{name(winner)}</span> {settled
                ? byRounds ? `wins ${verdict.roundsWon[winner]}–${verdict.roundsWon[loser]} on rounds` : `edges it ${verdict.metricWins[winner]}–${verdict.metricWins[loser]} on metrics`
                : byRounds ? `leads ${verdict.roundsWon[winner]}–${verdict.roundsWon[loser]} so far` : `is ahead ${verdict.metricWins[winner]}–${verdict.metricWins[loser]} on metrics so far`}
            </h3>
          ) : (
            <h3>{settled ? "Dead heat." : "Level so far."}</h3>
          )}
          <p>
            {!settled && (stopped
              ? "The race stopped before the visit was over, so only what was measured counts. "
              : `The visit is still running: ${toCome} more round${toCome === 1 ? "" : "s"} to come as each step finishes. `)}
            {!byRounds && winner ? `Rounds tied ${verdict.roundsWon.a}–${verdict.roundsWon.b}, so the decisive metrics settle it. ` : ""}
            {verdict.metricWins.a + verdict.metricWins.b} decisive metrics: {name("a")} took {verdict.metricWins.a}, {name("b")} took {verdict.metricWins.b}.
            This is one race, one sample: a gap smaller than two runs of the same site differ by (measured, per metric) counts as a draw,
            and a value stopped at {capPhrase(caps)} is a lower bound that cannot win.
          </p>
        </div>
      )}
    </div>
  );
}

function RoundCard({ round, index, visible, name, tone }: { round: Round; index: number; visible: boolean; name: (id: LaneId) => string; tone: (id: LaneId) => string }) {
  const waitingFor = LANES.filter((id) => round.rows.some((row) => row.pending?.[id]));
  return (
    <li className={`${styles.round} ${visible ? styles.roundVisible : ""} ${round.pending ? styles.roundPending : ""}`} aria-hidden={!visible}>
      <header>
        <span className={styles.roundNo}>Round {index + 1}</span>
        <h4>{round.title}</h4>
        <p>{round.subtitle}</p>
        <strong className={round.pending ? styles.roundTie : round.winner === "tie" ? styles.roundTie : tone(round.winner)}>
          {round.pending
            ? waitingFor.length === 1 ? `Waiting for ${identityShort(name(waitingFor[0]))}` : "Still running"
            : round.winner === "tie" ? "Draw" : <><i className={styles.key} aria-hidden="true" />{name(round.winner)} +1</>}
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
                  const waiting = !!row.pending?.[id];
                  return (
                    <td key={id} className={`${tone(id)} ${row.winner === id ? styles.cellWin : ""}`}>
                      <span className={`${styles.bar} ${waiting ? styles.barWaiting : ""}`}><i style={{ width: visible && value !== null ? `${Math.max(4, (value / max) * 100)}%` : 0 }} /></span>
                      <b className={waiting ? styles.pendingValue : undefined} aria-label={waiting ? "still running" : undefined}>{formatValue(row, id)}{row.winner === id && <span className={styles.star} aria-label="better"> ★</span>}</b>
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

const STEP_NAME: Record<string, string> = { "/pumps/": "List page", "/boom-pumps/hr40-5rz/": "Product page", "/boom-pumps/hr21-4zr/": "Product page" };
export const stepName = (to: string) => STEP_NAME[to] ?? to;

/**
 * The journey race at a glance, in the order it runs: the home load, the return visit, then each
 * tap. It fills in step by step while the lane's visit runs; "…" marks the step under way.
 */
function JourneyLine({ metrics, running }: { metrics: NonNullable<LaneState["metrics"]>; running: boolean }) {
  const steps = metrics.navigationSteps ?? (metrics.navigation ? [metrics.navigation] : []);
  const after = (value: number | null, cap: number) => (value === null ? `> ${capSeconds(cap)}` : `+${(value / 1000).toFixed(2)} s`);
  return (
    <p className={styles.journeyLine}>
      <span>Home: <b>{metrics.timing.lcp === null ? "no final LCP" : `LCP ${ms(metrics.timing.lcp)}`}</b></span>
      {metrics.repeat && (metrics.repeat.skipped ? <span>Return visit: <b>skipped</b></span> : <span>Return visit: <b>{metrics.repeat.lcp === null ? `> ${capSeconds(metrics.repeat.capMs)}` : `LCP ${ms(metrics.repeat.lcp)}`}</b> · {kb(metrics.repeat.net.kb)}</span>)}
      {steps.map((step) => (
        <span key={step.to}>{stepName(step.to)}: {step.skipped ? <b>not reached</b> : <><b>{after(step.content, step.capMs)}</b> after tap · image <b>{after(step.image, step.capMs)}</b></>}</span>
      ))}
      {running && <span className={styles.journeyNext} aria-label="next step under way">{metrics.repeat ? "Next tap" : "Return visit"}: <b>…</b></span>}
    </p>
  );
}
