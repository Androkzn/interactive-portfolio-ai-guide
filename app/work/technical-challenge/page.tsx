import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Ban, BookCheck, Bot, Github, Hourglass, Mail, Phone, Rocket } from "lucide-react";
import { PauseOffscreen } from "@/components/pause-offscreen";
import { ChallengeTimelapse } from "@/components/technical-challenge/challenge-timelapse";
import { afterwards, contrast, defects, extras, ladder, layout, LIVE_URL, moreExtras, stack, trace } from "@/lib/technical-challenge/content";
import { contactUrl, emailUrl, githubUrl, phoneUrl } from "@/lib/site-links";
import styles from "@/components/technical-challenge/challenge-page.module.css";

const title = "One hour to ship an AI product — Technical challenge";
const description =
  "How I approach an AI build under a hard clock: a one-hour technical challenge turned into requirements, an answer key and tests before code, then a bonus hour of hardening — step by step, with every decision and why.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/work/technical-challenge/" },
  openGraph: { type: "article", url: "/work/technical-challenge/", title, description },
};

const rules = [
  { icon: Hourglass, value: "60 min", label: "to build and ship it, with any tools, models and agents" },
  { icon: BookCheck, value: "1 rule", label: "every answer comes from the supplied documents — or says it can't" },
  { icon: Ban, value: "2 auto-fails", label: "an API key visible in the browser, or one answer not from the documents" },
];

const deliverables = [
  { icon: Rocket, text: "A live link, tested with the reviewers' own questions" },
  { icon: Github, text: "A public repo, cloned on a fresh machine and run from its README" },
  { icon: Bot, text: "Two AI providers working, to demo the automatic fallback" },
];

export default function Page() {
  return (
    <div className="case-page" id="top">
      <header className="case-page-header">
        <Link className="wordmark" href="/">
          <span className="wordmark-avatar">
            <img className="wordmark-photo" src="/images/andrei-tekhtelev-avatar-240.webp" alt="" aria-hidden="true" />
            <span className="wordmark-presence" />
          </span>
          <span className="wordmark-name">ANDREI<br /><b>TEKHTELEV</b></span>
        </Link>
        <nav className="header-contact" aria-label="Contact links">
          <a href={contactUrl} target="_blank" rel="noreferrer" aria-label="LinkedIn" title="LinkedIn"><img className="brand-logo brand-logo-linkedin" src="/images/brand/linkedin.svg" alt="" aria-hidden="true" /><span>LinkedIn</span></a>
          <a href={emailUrl} aria-label="Email Andrei" title="Email Andrei"><Mail size={20} strokeWidth={2.1} aria-hidden="true" /><span>Email</span></a>
          <a href={phoneUrl} aria-label="Call Andrei" title="Call Andrei"><Phone size={20} strokeWidth={2.1} aria-hidden="true" /><span>Call</span></a>
          <a href={githubUrl} target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub"><img className="brand-logo brand-logo-github" src="/images/brand/github.svg" alt="" aria-hidden="true" /><span>GitHub</span></a>
        </nav>
        <PauseOffscreen />
      </header>

      <main className={styles.main}>
        <Link className={styles.back} href="/#engineering-work"><ArrowLeft size={15} aria-hidden="true" /> Back to the portfolio</Link>

        <section className={styles.hero} aria-labelledby="challenge-title">
          <p className={styles.eyebrow}>Technical challenge · AI-native engineering</p>
          <h1 id="challenge-title">One hour to ship an AI product. <em>Then a bonus hour to prove it.</em></h1>
          <p className={styles.lede}>
            A client brief, a folder of product documents, and not enough time to do all of it. Anyone can paste a brief like
            this into an AI and get a demo. This page shows what I did instead — step by step, with roughly how long each step
            took, the decision I made at each one, and why.
          </p>
          <div className={styles.links}>
            <a className={styles.primary} href="#timelapse">Watch 2 hours in 1 minute <ArrowRight size={16} aria-hidden="true" /></a>
            <a className={styles.secondary} href={LIVE_URL} target="_blank" rel="noreferrer">Open the live app <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="rules-title">
          <p className={styles.eyebrow}>01 · The rules of the game</p>
          <h2 id="rules-title">Strict rules, a hard clock, and two ways to fail instantly.</h2>
          <ul className={styles.rules}>
            {rules.map(({ icon: Icon, value, label }) => (
              <li key={value}><Icon size={22} aria-hidden="true" /><b>{value}</b><span>{label}</span></li>
            ))}
          </ul>
          <div className={styles.mustShip}>
            <div>
              <h3>Must ship in the hour</h3>
              <ul className={styles.codes}>
                <li><b>R1–R5</b> streaming chat with memory · grounding with sources · Claude, OpenAI and Gemini with automatic fallback · tokens and cost per answer · keys only on the server</li>
                <li><b>Q1–Q6</b> six representative questions: tier comparison, integration version, release notes, a 403, SSO across every product, an SLA table lookup</li>
                <li><b>E1–E10</b> ten edge cases: follow-ups without a product name, not in the documents, conflicting documents, loose wording, one table cell, a provider failing mid-answer, rate limits, blank messages</li>
              </ul>
            </div>
            <div>
              <h3>What gets submitted</h3>
              <ul className={styles.deliverables}>
                {deliverables.map(({ icon: Icon, text }) => <li key={text}><Icon size={17} aria-hidden="true" />{text}</li>)}
              </ul>
              <p className={styles.fine}>No write-up, no slides: the work is explained on a follow-up call. In the brief's words: “You won&apos;t finish everything. Choose what to build first.”</p>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="contrast-title">
          <p className={styles.eyebrow}>02 · Same brief, same AI</p>
          <h2 id="contrast-title">The difference is the process, not the tools.</h2>
          <div className={styles.contrast} role="table" aria-label="Pasting the brief into AI compared with my approach">
            <div className={styles.contrastHead} role="row">
              <span role="columnheader" />
              <span role="columnheader" className={styles.pasteHead}>Paste the PDF: “implement all of this”</span>
              <span role="columnheader" className={styles.mineHead}>What I did</span>
            </div>
            {contrast.map((row) => (
              <div key={row.topic} className={styles.contrastRow} role="row">
                <span role="rowheader" className={styles.topic}>{row.topic}</span>
                <span role="cell" className={styles.paste}>{row.paste}</span>
                <span role="cell" className={styles.mine}>{row.mine}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} id="timelapse" aria-labelledby="timelapse-title">
          <p className={styles.eyebrow}>03 · The two hours, step by step</p>
          <h2 id="timelapse-title">Requirements first. Then tests. Then code. Then proof.</h2>
          <p className={styles.lede}>
            Hour one is the challenge: every required item, specified, built and tested. Hour two is optional work I chose to do,
            and each step says why. Scores and test names come from the repository; times inside each hour are approximate.
          </p>
          <ChallengeTimelapse />
        </section>

        <section className={styles.section} aria-labelledby="trace-title">
          <p className={styles.eyebrow}>04 · Traceability</p>
          <h2 id="trace-title">Follow one requirement from the brief to its proof.</h2>
          <p className={styles.lede}>Every requirement takes the same path. One id connects the brief, the documents, the test and the evidence, so nothing is “done” on someone&apos;s word.</p>
          <ol className={styles.trace}>
            {trace.map((step, i) => (
              <li key={step.where}>
                <span className={styles.traceIndex}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.traceWhere}>{step.where}</span>
                <b className={styles.traceCode}>{step.code}</b>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="stack-title">
          <p className={styles.eyebrow}>05 · Stack and structure</p>
          <h2 id="stack-title">Every choice written down, with what it beat and why.</h2>
          <div className={styles.split}>
            <div className={styles.adr} role="table" aria-label="Stack decisions">
              <div className={styles.adrHead} role="row"><span role="columnheader">Area</span><span role="columnheader">Chose · over</span><span role="columnheader">Why</span></div>
              {stack.map((row) => (
                <div key={row.area} className={styles.adrRow} role="row">
                  <span role="rowheader" className={styles.adrArea}>{row.area}</span>
                  <span role="cell"><b>{row.choice}</b><small>over {row.over}</small></span>
                  <span role="cell" className={styles.adrWhy}>{row.why}</span>
                </div>
              ))}
            </div>
            <figure className={styles.tree}>
              <figcaption>Project layout — the boundaries are the point</figcaption>
              <ul>
                {layout.map((row) => <li key={row.path}><code>{row.path}</code><span>{row.role}</span></li>)}
              </ul>
              <p>Keys and retrieval live only in <code>src/server/</code>; the browser talks to it through one typed contract in <code>src/shared/</code>. That boundary is what makes “no key in the browser” checkable.</p>
            </figure>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="quality-title">
          <p className={styles.eyebrow}>06 · How quality is proved</p>
          <h2 id="quality-title">Cheapest reliable check first. Real models last.</h2>
          <ol className={styles.ladder}>
            {ladder.map((rung, i) => (
              <li key={rung.step} style={{ ["--rung" as string]: i }}>
                <span className={styles.rungIndex}>{String(i + 1).padStart(2, "0")}</span>
                <b>{rung.step}</b>
                <span className={styles.rungProves}>{rung.proves}</span>
                <span className={styles.rungTime}>{rung.time}</span>
              </li>
            ))}
          </ol>
          <p className={styles.fine}>Timings from a recorded run of the readiness report. Deterministic gates run in seconds on every change; the live eval costs tokens and runs last.</p>

          <h3 className={styles.subhead}>What went wrong while building it — and the gate that caught each</h3>
          <div className={styles.defects} role="table" aria-label="Defects and the gate that caught each">
            <div className={styles.defectHead} role="row"><span role="columnheader">What went wrong</span><span role="columnheader">Would have meant</span><span role="columnheader">Caught by</span></div>
            {defects.map((row) => (
              <div key={row.what} className={styles.defectRow} role="row">
                <span role="cell">{row.what}</span>
                <span role="cell" className={styles.risk}>{row.risk}</span>
                <span role="cell" className={styles.gate}>{row.gate}</span>
              </div>
            ))}
          </div>
          <p className={styles.fine}>A selection from the project retrospective, which records 22 defects, each stopped before a reviewer saw it.</p>
          <blockquote className={styles.quote}>
            Every green result must answer “what requirement did this prove?” and every red result must answer “what decision should the team make next?”
            <cite>— from the project README</cite>
          </blockquote>
        </section>

        <section className={styles.section} aria-labelledby="extras-title">
          <p className={styles.eyebrow}>07 · Beyond the brief</p>
          <h2 id="extras-title">The brief said these were optional. I built them, and here&apos;s why.</h2>
          <p className={styles.lede}>
            “You can add any of them if you think it&apos;s worth it and can explain why.” These came after the two-hour sprint;
            the bonus-hour work is in the timelapse above.
          </p>
          <div className={styles.extras}>
            {extras.map((extra) => (
              <article key={extra.id} className={styles.extra}>
                <img src={extra.image} alt={extra.alt} loading="lazy" width={1200} height={extra.id === "readiness" ? 983 : 1073} />
                <div>
                  <h3>{extra.title}</h3>
                  <p>{extra.what}</p>
                  <p className={styles.extraWhy}><b>Why:</b> {extra.why}</p>
                </div>
              </article>
            ))}
          </div>
          <ul className={styles.moreExtras}>
            {moreExtras.map((extra) => <li key={extra.title}><h3>{extra.title}</h3><p><b>Why:</b> {extra.why}</p></li>)}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="after-title">
          <p className={styles.eyebrow}>08 · Where it ended up</p>
          <h2 id="after-title">Measured, not claimed.</h2>
          <ul className={styles.after}>
            {afterwards.map(({ value, label }) => <li key={label}><b>{value}</b><span>{label}</span></li>)}
          </ul>
          <div className={styles.links}>
            <a className={styles.primary} href={LIVE_URL} target="_blank" rel="noreferrer">Try the live app <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        </section>
      </main>
    </div>
  );
}
