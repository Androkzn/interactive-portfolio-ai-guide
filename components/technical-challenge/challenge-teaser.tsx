import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight, Check, FlaskConical, Hourglass, Lock, MessageSquare, Play, ShieldCheck, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PauseOffscreen } from "@/components/pause-offscreen";
import { board } from "@/lib/technical-challenge/story";
import styles from "./challenge-teaser.module.css";

const PHASES = ["Audit", "BRD", "TRD", "Plan", "Matrix", "Build", "Eval", "Ship"];

/**
 * Three real frames from inside the project, cycled in a browser window: each is the exact 16:10
 * area the timelapse spotlights, cut from the captures in public/images/technical-challenge, with
 * the highlight box in % of the frame.
 */
const FRAMES: { tab: string; icon: LucideIcon; url: string; badge: string; live?: boolean; image: string; alt: string; label: string; box: { top: number; left: number; width: number; height: number } }[] = [
  {
    tab: "Product assistant", icon: MessageSquare, url: "nimbus-assistant-production.vercel.app", badge: "Live app", live: true,
    image: "/images/technical-challenge/teaser-app.webp", alt: "The live app answering which products support SAML 2.0, with citations, a documents-disagree note and the backup model's label.",
    label: "Selected model failed → the backup answered, labelled", box: { top: 73.2, left: 25.6, width: 33.4, height: 4.8 },
  },
  {
    tab: "Live answer eval", icon: FlaskConical, url: "evals/reports · 7 Oct, 13:41", badge: "Recorded run",
    image: "/images/technical-challenge/teaser-eval.webp", alt: "Eval report rows for off-topic questions, each answered in a few milliseconds for $0.00000 on three models.",
    label: "Off-topic: 3–8 ms, $0 — no model was called", box: { top: 77.3, left: 2, width: 96, height: 19.7 },
  },
  {
    tab: "Readiness", icon: ShieldCheck, url: "nimbus-assistant-dev.vercel.app/readiness", badge: "Recorded run",
    image: "/images/technical-challenge/teaser-readiness.webp", alt: "Readiness report: READY, 39 of 39 requirements verified, 424 tests.",
    label: "READY — 39 / 39 requirements verified", box: { top: 9.6, left: 2.5, width: 95, height: 35.2 },
  },
];

/**
 * The homepage block after the performance lab: the technical challenge in one card. The board
 * loops through what the timelapse shows in full — every brief item specified first (violet), then
 * proved (green) — and a browser below it cycles through real frames from inside the project.
 * CSS only; reduced motion shows the finished board and the first frame.
 */
export function ChallengeTeaser() {
  return (
    <section className={styles.section} id="technical-challenge" aria-labelledby="challenge-heading">
      <div className={`workspace-section-heading ${styles.sectionHeading}`}>
        <div className="section-eyebrow"><Timer size={14} aria-hidden="true" />Technical challenge</div>
        <h2 id="challenge-heading">Ship an AI product in <em>one hour.</em></h2>
        <p className="workspace-heading-note">A timed challenge with strict rules. Requirements first, then tests, then code — every step and every decision, replayed in about a minute.</p>
      </div>
      <div className={styles.card}>
        <div className={styles.copy}>
          <div className={styles.kicker}><Hourglass size={15} aria-hidden="true" />60 minutes <span>+ a bonus hour</span></div>
          <h3>Spec first.<br /><span>Tests before code.</span><br /><em>Proof, not promises.</em></h3>
          <p>
            A knowledge chatbot from a client brief: answers only from the client&apos;s documents, three AI vendors with
            automatic fallback, the cost of every answer on screen — and two ways to fail instantly.
          </p>
          <div className={styles.proof} aria-label="Results">
            <span><Check size={16} aria-hidden="true" /><b>27 / 27</b><small>brief requirements green</small></span>
            <span><FlaskConical size={16} aria-hidden="true" /><b>75 / 75</b><small>stricter eval, 3 vendors</small></span>
            <span><ShieldCheck size={16} aria-hidden="true" /><b>22</b><small>defects stopped by gates</small></span>
          </div>
          <Link className={styles.cta} href="/work/technical-challenge/#timelapse"><Play size={17} aria-hidden="true" />Watch 2 hours in 1 minute <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>

        <div className={styles.stack}>
          <div className={styles.visual} aria-hidden="true">
            <div className={styles.visualHead}><span><i />Requirement board · replay</span><span className={styles.clock}>60:00</span></div>
            {/* Each chip and tile changes state by fading whole layers in and out (opacity only, on
                the compositor) instead of animating colours: the same keyframes and easing, so every
                frame matches a colour transition. See challenge-teaser.module.css. */}
            <ol className={styles.phases}>
              {PHASES.map((phase, i) => <li key={phase} style={{ "--i": i } as CSSProperties}><span><span>{phase}</span><span>{phase}</span></span></li>)}
            </ol>
            <ol className={styles.board}>
              {board.map((item, i) => (
                <li key={item.id} data-tier={item.tier} style={{ "--i": i } as CSSProperties}>
                  <i className={styles.tileIdle} /><i className={styles.tileSpec} /><i className={styles.tileFlash} /><i className={styles.tileProved} />
                  <span>{item.tier === "rule" ? "Rule" : item.tier === "guard" ? "Fail" : item.code === "Ship" ? (item.id === "D-LIVE" ? "Live" : "Repo") : item.code}</span>
                </li>
              ))}
            </ol>
            <div className={styles.legend}><span data-k="spec" />specified <span data-k="pass" />proved by a test or an eval</div>
            <div className={styles.stamp}><Check size={18} strokeWidth={3} />27 / 27 green</div>
          </div>

          {/* Real frames from inside: the whole window opens the replay. */}
          <Link className={styles.browser} href="/work/technical-challenge/#timelapse" aria-label="Open the replay: the live app, the eval reports and the readiness console">
            <span className={styles.chrome} aria-hidden="true">
              <span className={styles.lights}><i /><i /><i /></span>
              <span className={styles.tabs}>
                {FRAMES.map(({ tab, icon: Icon }, i) => <span key={tab} style={{ "--f": i } as CSSProperties}><Icon size={11} />{tab}<span className={styles.tabActive}><Icon size={11} />{tab}</span></span>)}
              </span>
            </span>
            <span className={styles.address} aria-hidden="true">
              <Lock size={11} />
              <span className={styles.urls}>
                {FRAMES.map(({ url, badge, live }, i) => (
                  <span key={url} style={{ "--f": i } as CSSProperties}><b>{url}</b><em data-live={live || undefined}>{badge}</em></span>
                ))}
              </span>
            </span>
            <span className={styles.viewport}>
              {FRAMES.map(({ image, alt, label, box }, i) => (
                <span key={image} className={styles.frame} style={{ "--f": i } as CSSProperties}>
                  <img src={image} alt={alt} width={800} height={500} loading="lazy" decoding="async" />
                  <span className={styles.spot} data-below={box.top < 20 || undefined} style={{ top: `${box.top}%`, left: `${box.left}%`, width: `${box.width}%`, height: `${box.height}%`, "--l": box.left } as CSSProperties}><b>{label}</b></span>
                </span>
              ))}
            </span>
            <span className={styles.status}>
              <span>Inside: the live app, every eval run, the readiness console</span>
              <span className={styles.open}><Play size={13} aria-hidden="true" />Open the replay</span>
            </span>
          </Link>
          <PauseOffscreen />
        </div>
      </div>
    </section>
  );
}
