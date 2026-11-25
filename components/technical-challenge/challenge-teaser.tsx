import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight, Check, FlaskConical, Hourglass, Play, ShieldCheck, Timer } from "lucide-react";
import { board } from "@/lib/technical-challenge/story";
import styles from "./challenge-teaser.module.css";

const PHASES = ["Audit", "BRD", "TRD", "Plan", "Matrix", "Build", "Eval", "Ship"];

/**
 * The homepage block after the performance lab: the technical challenge in one card. The board on
 * the right loops through what the timelapse shows in full — every brief item specified first
 * (violet), then proved (green), then the 27 / 27 stamp. CSS only; reduced motion shows the end.
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
          <Link className={styles.cta} href="/work/technical-challenge/#timelapse"><Play size={17} aria-hidden="true" />Watch the two hours <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>

        <div className={styles.visual} aria-hidden="true">
          <div className={styles.visualHead}><span><i />Requirement board · replay</span><span className={styles.clock}>60:00</span></div>
          <ol className={styles.phases}>
            {PHASES.map((phase, i) => <li key={phase} style={{ "--i": i } as CSSProperties}>{phase}</li>)}
          </ol>
          <ol className={styles.board}>
            {board.map((item, i) => (
              <li key={item.id} data-tier={item.tier} style={{ "--i": i } as CSSProperties}>
                <span>{item.tier === "rule" ? "Rule" : item.tier === "guard" ? "Fail" : item.code === "Ship" ? (item.id === "D-LIVE" ? "Live" : "Repo") : item.code}</span>
              </li>
            ))}
          </ol>
          <div className={styles.legend}><span data-k="spec" />specified <span data-k="pass" />proved by a test or an eval</div>
          <div className={styles.stamp}><Check size={18} strokeWidth={3} />27 / 27 green</div>
        </div>
      </div>
    </section>
  );
}
