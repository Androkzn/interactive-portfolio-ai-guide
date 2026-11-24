"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Flag, Gauge, Play, RotateCcw, Smartphone, Monitor, Swords, Timer } from "lucide-react";
import type { LaneId, MarkName, RaceProfile } from "@/packages/contracts/src/site-race";
import { RACE_PRESETS } from "@/packages/contracts/src/site-race";
import { frameAt, useRace, type LaneState, type RaceState } from "@/lib/site-race/use-race";
import { kb, ms, scoreRace, type Round, type Verdict } from "@/lib/site-race/scoring";
import styles from "./site-race.module.css";

const RECORDING = "/lab/site-race/recorded-mobile.ndjson";
const LANES: LaneId[] = ["a", "b"];
const MARKS: { name: MarkName; label: string }[] = [
  { name: "ttfb", label: "TTFB" },
  { name: "fcp", label: "FCP" },
  { name: "lcp", label: "LCP" },
  { name: "dcl", label: "DCL" },
];
const PHASE_LABEL: Record<LaneState["phase"], string> = {
  queued: "On the grid",
  launching: "Starting Chrome on Cloudflare…",
  loading: "Loading",
  settling: "Waiting for the page to settle",
  inspecting: "Inspecting HTML, headers and SEO",
  done: "Finished",
  failed: "Did not finish",
};

function laneTone(lane: LaneState, id?: LaneId): string {
  const preset = lane.info ? lane.info.preset : id === "a" ? "astro" : id === "b" ? "next" : null;
  if (preset === "astro") return styles.toneAstro;
  if (preset === "next") return styles.toneNext;
  return styles.toneChallenger;
}

function useClock(active: boolean) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const tick = () => { setNow(performance.now()); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return now;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = () => setReduced(query.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}

/** Display copy comes from this build's presets, so older recordings pick up current wording. */
function laneDisplay(lane: LaneState, id: LaneId) {
  const preset = lane.info ? lane.info.preset : id === "a" ? "astro" : "next";
  if (preset) return { role: RACE_PRESETS[preset].role, label: RACE_PRESETS[preset].label, stack: RACE_PRESETS[preset].stack };
  return { role: "Challenger", label: lane.info?.label ?? "Your site", stack: "Visitor's site · as served today" };
}

/** Lane clock in ms since its navigation start: live while loading, frozen at its finish line. */
function laneClock(lane: LaneState, now: number): number | null {
  if (lane.startedAt === null) return null;
  const frozen = lane.metrics || ["settling", "inspecting", "done", "failed"].includes(lane.phase);
  if (frozen) return Math.max(lane.marks.lcp ?? 0, lane.marks.dcl ?? 0, lane.marks.fcp ?? 0, lane.phase === "failed" ? lane.frames.at(-1)?.t ?? 0 : 0);
  return Math.max(0, now - lane.startedAt);
}

export function SiteRace() {
  const { state, runLive, runReplay, stop } = useRace();
  const reduced = usePrefersReducedMotion();
  const [profile, setProfile] = useState<RaceProfile>("mobile");
  const [lights, setLights] = useState(0);
  const [challenge, setChallenge] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(0);
  const autoplayed = useRef(false);
  const [replaying, setReplaying] = useState(false);

  const racing = state.status === "connecting" || state.status === "racing";
  const now = useClock(racing || replaying);
  const verdict: Verdict | null = useMemo(
    () => (state.lanes.a.metrics && state.lanes.b.metrics ? scoreRace(state.lanes.a.metrics, state.lanes.b.metrics) : null),
    [state.lanes.a.metrics, state.lanes.b.metrics],
  );
  const winnerLane = verdict && verdict.winner !== "tie" ? verdict.winner : null;

  // Start lights: five reds while Chrome boots on Cloudflare, lights out on the first frame.
  const firstFrame = state.lanes.a.frames.length > 0 || state.lanes.b.frames.length > 0;
  useEffect(() => {
    if (state.status !== "connecting" && state.status !== "racing") return;
    if (firstFrame) { setLights(6); return; }
    setLights(0);
    const timer = setInterval(() => setLights((value) => Math.min(5, value + 1)), reduced ? 50 : 420);
    return () => clearInterval(timer);
  }, [state.status, state.source, firstFrame, reduced]);

  // Reveal the scoreboard one round at a time, then run the photo-finish replay once.
  useEffect(() => {
    if (state.status !== "finished" || !verdict) { setRevealed(0); return; }
    if (reduced) { setRevealed(verdict.rounds.length + 1); return; }
    setRevealed(0);
    let step = 0;
    const timer = setInterval(() => { step += 1; setRevealed(step); if (step > verdict.rounds.length) clearInterval(timer); }, 850);
    return () => clearInterval(timer);
  }, [state.status, verdict, reduced]);

  const maxT = useMemo(() => {
    const ends = LANES.flatMap((id) => [state.lanes[id].frames.at(-1)?.t ?? 0, ...Object.values(state.lanes[id].marks)]);
    return Math.max(4000, ...ends);
  }, [state.lanes]);

  // Photo finish: after the result, replay both filmstrips on one shared clock, once.
  const replayStart = useRef(0);
  useEffect(() => {
    if (state.status !== "finished") { setScrub(null); setReplaying(false); autoplayed.current = false; return; }
    if (autoplayed.current || reduced) return;
    autoplayed.current = true;
    replayStart.current = performance.now();
    setScrub(0);
    setReplaying(true);
  }, [state.status, reduced]);
  useEffect(() => {
    if (!replaying) return;
    const t = (now - replayStart.current) * 0.6;
    if (t >= maxT) { setReplaying(false); setScrub(maxT); return; }
    setScrub(t);
  }, [now, maxT, replaying]);

  const start = async (a: string, b: string) => {
    setNotice(null);
    setScrub(null);
    const result = await runLive({ a, b, profile });
    if (!result.ok && (result.status === 429 || result.status === 0 || result.status >= 500) && a in RACE_PRESETS && b in RACE_PRESETS) {
      setNotice(result.status === 429
        ? "The live browsers are busy cooling down, so here is the last recorded race instead."
        : "The live race service is unreachable right now, so here is the last recorded race instead.");
      await runReplay(RECORDING);
    }
  };

  const startChallenge = (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge.trim()) return;
    void start("next", challenge.trim());
  };

  const tLabel = scrub === null ? null : `${(scrub / 1000).toFixed(2)} s`;

  return (
    <section className={styles.race} aria-labelledby="site-race-title">
      <div className={styles.head}>
        <div>
          <p className={styles.kicker}><Gauge size={14} aria-hidden="true" /> Live performance lab · real Chrome on Cloudflare&apos;s edge</p>
          <h2 id="site-race-title" className={styles.title}>
            <span className={styles.toneAstro}>Before</span> <span className={styles.vs}>vs</span> <span className={styles.toneNext}>After</span>
          </h2>
          <p className={styles.lede}>
            Before: a real concrete-pump website as it was first built in Astro — nobody ever tuned it. After: the same site rebuilt in
            Next.js 16 specifically to be fast. Press start and two Chrome browsers launch on Cloudflare at the same moment, load both
            over the same throttled connection, and stream what they see back to you.
          </p>
        </div>
        <div className={styles.controls}>
          <div className={styles.segmented} role="radiogroup" aria-label="Device profile">
            <button type="button" role="radio" aria-checked={profile === "mobile"} className={profile === "mobile" ? styles.segOn : ""} onClick={() => setProfile("mobile")} disabled={racing}><Smartphone size={15} aria-hidden="true" /> Mobile · slow 4G</button>
            <button type="button" role="radio" aria-checked={profile === "desktop"} className={profile === "desktop" ? styles.segOn : ""} onClick={() => setProfile("desktop")} disabled={racing}><Monitor size={15} aria-hidden="true" /> Desktop</button>
          </div>
          {racing ? (
            <button type="button" className={styles.startButton} onClick={stop}>Stop race</button>
          ) : (
            <button type="button" className={styles.startButton} onClick={() => void start("astro", "next")}>
              <Play size={18} aria-hidden="true" /> {state.status === "idle" ? "Start the race" : "Race again"}
            </button>
          )}
          <button type="button" className={styles.ghostButton} onClick={() => { setNotice(null); void runReplay(RECORDING); }} disabled={racing}>
            <RotateCcw size={15} aria-hidden="true" /> Watch a recorded race
          </button>
        </div>
      </div>

      <div className={styles.lights} aria-hidden="true" data-state={lights === 6 ? "go" : racing ? "armed" : "idle"}>
        {[1, 2, 3, 4, 5].map((n) => <span key={n} className={lights >= n && lights < 6 ? styles.lightOn : ""} />)}
        <strong>{lights === 6 && racing ? "GO" : racing ? "Starting Chrome…" : state.status === "finished" ? "Finish" : "Ready"}</strong>
      </div>

      <p className={styles.status} role="status" aria-live="polite">
        {notice ?? (state.status === "failed" ? state.error
          : state.source === "replay" && state.recordedAt ? `Recorded race from ${new Date(state.recordedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })} · ${state.profileLabel}`
          : state.profileLabel || "Mobile profile matches the projects' own performance reports: 390 px, slow 4G, 4× CPU slowdown.")}
      </p>

      <div className={styles.arena}>
        {LANES.map((id) => (
          <LaneView key={id} id={id} lane={state.lanes[id]} now={now} scrub={scrub} profile={state.profile}
            winner={revealed > (verdict?.rounds.length ?? 99) && winnerLane === id} />
        ))}
      </div>

      <Track state={state} now={now} maxT={maxT} scrub={scrub} />

      {state.status === "finished" && verdict && (
        <>
          <div className={styles.scrubber}>
            <label htmlFor="photo-finish"><Timer size={15} aria-hidden="true" /> Photo finish {tLabel && <b>{tLabel}</b>}</label>
            <input id="photo-finish" type="range" min={0} max={Math.round(maxT)} step={10} value={Math.round(scrub ?? maxT)}
              onChange={(event) => { setReplaying(false); setScrub(Number(event.target.value)); }} />
            <span>Drag to compare both screens at the same moment</span>
          </div>
          <Scoreboard verdict={verdict} state={state} revealed={revealed} reduced={reduced} />
        </>
      )}

      <form className={styles.challenge} onSubmit={startChallenge}>
        <div>
          <p className={styles.kicker}><Swords size={14} aria-hidden="true" /> Challenger round</p>
          <h3>Think your site is faster?</h3>
          <p>Enter any public website. It races the optimized <b className={styles.toneNext}>Next.js</b> build under the same conditions — same browser, same throttling, same scoring.</p>
        </div>
        <div className={styles.challengeRow}>
          <input value={challenge} onChange={(event) => setChallenge(event.target.value)} placeholder="your-site.com" inputMode="url" autoComplete="url" aria-label="Website to race" maxLength={300} disabled={racing} />
          <button type="submit" className={styles.startButton} disabled={racing || !challenge.trim()}><Flag size={16} aria-hidden="true" /> Challenge</button>
        </div>
      </form>
    </section>
  );
}

function LaneView({ id, lane, now, scrub, profile, winner }: { id: LaneId; lane: LaneState; now: number; scrub: number | null; profile: RaceProfile; winner: boolean }) {
  const clock = laneClock(lane, now);
  const frame = scrub !== null ? frameAt(lane.frames, scrub) : lane.frames.at(-1) ?? null;
  const { role, label, stack } = laneDisplay(lane, id);
  const shownT = scrub ?? clock;
  return (
    <article className={`${styles.lane} ${laneTone(lane, id)} ${winner ? styles.laneWinner : ""}`} aria-label={`${label} lane`}>
      <header className={styles.laneHead}>
        <div>
          <span className={styles.role}>{role}</span>
          <h3>{winner && <Crown size={18} aria-label="Winner" />} {label}</h3>
          <span>{stack}</span>
        </div>
        <output className={styles.stopwatch} aria-label={`${label} time`}>{shownT === null ? "0.00" : (shownT / 1000).toFixed(2)}<small>s</small></output>
      </header>
      <div className={`${styles.device} ${profile === "desktop" ? styles.deviceDesktop : ""}`}>
        {frame ? <img src={frame.src} alt={`${label} as the test browser saw it`} /> : <div className={styles.blank}>{lane.phase === "queued" ? "Waiting for the start" : "No pixels yet"}</div>}
        <span className={styles.phase} data-phase={lane.phase}>{PHASE_LABEL[lane.phase]}</span>
      </div>
      <ul className={styles.marks}>
        {MARKS.map(({ name, label: markLabel }) => {
          const t = lane.marks[name];
          const passed = t !== undefined && (scrub === null || scrub >= t);
          return <li key={name} className={passed ? styles.markOn : ""}><span>{markLabel}</span><b>{t === undefined ? "—" : ms(t)}</b></li>;
        })}
      </ul>
      <p className={styles.counters}><span><b>{lane.net.requests}</b> requests</span><span><b>{kb(lane.net.kb)}</b> transferred</span></p>
      {lane.error && <p className={styles.laneError}>{lane.error}</p>}
    </article>
  );
}

function Track({ state, now, maxT, scrub }: { state: RaceState; now: number; maxT: number; scrub: number | null }) {
  return (
    <div className={styles.track} aria-hidden="true">
      {LANES.map((id) => {
        const lane = state.lanes[id];
        const clock = scrub ?? laneClock(lane, now) ?? 0;
        return (
          <div key={id} className={`${styles.trackLane} ${laneTone(lane, id)}`}>
            <span className={styles.trackName}>{laneDisplay(lane, id).role}</span>
            <div className={styles.trackBar}>
              <div className={styles.trackFill} style={{ width: `${Math.min(100, (clock / maxT) * 100)}%` }} />
              {MARKS.map(({ name, label }, index) => {
                const t = lane.marks[name];
                if (t === undefined) return null;
                return <span key={name} className={`${styles.flag} ${index % 2 ? styles.flagLow : ""}`} style={{ left: `${Math.min(100, (t / maxT) * 100)}%` }}><i />{label}</span>;
              })}
            </div>
          </div>
        );
      })}
      <div className={styles.trackScale}>{Array.from({ length: 5 }, (_, i) => <span key={i}>{((maxT / 4) * i / 1000).toFixed(1)} s</span>)}</div>
    </div>
  );
}

function Scoreboard({ verdict, state, revealed, reduced }: { verdict: Verdict; state: RaceState; revealed: number; reduced: boolean }) {
  const name = (id: LaneId) => { const d = laneDisplay(state.lanes[id], id); return d.role === "Challenger" ? d.label : `${d.label} (${d.role.toLowerCase()})`; };
  const tone = (id: LaneId) => laneTone(state.lanes[id], id);
  const done = revealed > verdict.rounds.length;
  return (
    <div className={styles.scoreboard}>
      <div className={styles.tally} aria-live="polite">
        {LANES.map((id) => (
          <div key={id} className={`${styles.tallySide} ${tone(id)}`}>
            <span>{name(id)}</span>
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
          {!reduced && verdict.winner !== "tie" && <Confetti tone={tone(verdict.winner)} />}
          {verdict.winner === "tie" ? (
            <h3>Dead heat.</h3>
          ) : (
            <h3><Crown size={28} aria-hidden="true" /> <span className={tone(verdict.winner)}>{name(verdict.winner)}</span> wins {verdict.roundsWon[verdict.winner]}–{verdict.roundsWon[verdict.winner === "a" ? "b" : "a"]}</h3>
          )}
          <p>{verdict.metricWins.a + verdict.metricWins.b} decisive metrics: {name("a")} took {verdict.metricWins.a}, {name("b")} took {verdict.metricWins.b}. Gaps within single-run noise count as a draw.</p>
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
        <strong className={round.winner === "tie" ? styles.roundTie : tone(round.winner)}>{round.winner === "tie" ? "Draw" : `${name(round.winner)} +1`}</strong>
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
                      <b>{value === null ? "n/a" : row.format(value)}</b>
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
