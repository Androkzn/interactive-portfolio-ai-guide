import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CheckCircle2, CircleDashed, FlaskConical } from "lucide-react";
import { SiteRace } from "@/components/site-race/site-race";
import { playbook, skillMap } from "@/lib/site-race/playbook";
import { contactUrl, emailUrl } from "@/lib/site-links";
import styles from "@/components/site-race/lab-page.module.css";

const title = "From slow to fast: a live before/after performance race · Andrei Tekhtelev";
const description =
  "An unoptimized Astro website rebuilt in Next.js 16 to be fast, and both raced live in real Chrome on Cloudflare's edge: paint timings, JavaScript, edge cache headers and SEO, scored round by round. Race your own site against the optimized build.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/lab/site-race/" },
  openGraph: { type: "article", url: "/lab/site-race/", title, description },
};

export default function Page() {
  return (
    <div className="case-page" id="top">
      <header className="case-page-header">
        <Link className="wordmark" href="/">
          <span className="wordmark-avatar">
            <img className="wordmark-photo" src="/images/andrei-tekhtelev-avatar.png" alt="" aria-hidden="true" />
          </span>
          <span className="wordmark-name">ANDREI<br /><b>TEKHTELEV</b></span>
        </Link>
        <nav className="case-page-contact" aria-label="Contact links">
          <a href={contactUrl} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={13} aria-hidden="true" /></a>
          <a href={emailUrl}>Email <ArrowUpRight size={13} aria-hidden="true" /></a>
        </nav>
      </header>

      <main className={styles.main}>
        <Link className={styles.back} href="/#performance-lab"><ArrowLeft size={15} aria-hidden="true" /> Back to the portfolio</Link>

        <SiteRace />

        <section className={styles.section} aria-labelledby="lab-why">
          <p className={styles.eyebrow}><FlaskConical size={14} aria-hidden="true" /> Why this exists</p>
          <h2 id="lab-why">Take a slow website. Make it fast. Prove it live.</h2>
          <div className={styles.columns}>
            <p>
              HR Concrete Pumps is a real product catalogue: boom pumps, specifications, three languages and a lot of photography.
              The <b>before</b> is the site as it was first built in Astro — shipped as-is, never tuned, heavy images and all. The <b>after</b> is
              the same site, same content and routes, rebuilt in Next.js 16 specifically for performance on Cloudflare. The point is the
              transformation, not the framework: Astro can be fast too — this particular build simply never was optimized.
            </p>
            <p>
              Nothing on this page is a stored number dressed up as live. When you press start, a Worker launches two Chrome sessions
              on Cloudflare Browser Run, applies the same mobile throttling the projects&apos; own performance reports use, and streams
              the screencast, the paint milestones, the network log and the response headers straight to your screen.
            </p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="lab-skills">
          <h2 id="lab-skills">What the rebuild demonstrates.</h2>
          <ul className={styles.skillMap}>
            {skillMap.map((item) => (
              <li key={item.ask}><b>{item.ask}</b><span>{item.where}</span></li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="lab-playbook">
          <h2 id="lab-playbook">The optimization playbook.</h2>
          <p className={styles.intro}>
            <span className={styles.inPlace}><CheckCircle2 size={14} aria-hidden="true" /> In place</span> items are in the Next.js build today and visible in the race.{" "}
            <span className={styles.nextUp}><CircleDashed size={14} aria-hidden="true" /> Next</span> items are being worked on right now — each names the metric that should move, so the race shows the gap widening as they land.
          </p>
          <ol className={styles.plays}>
            {playbook.map((play) => (
              <li key={play.id} className={play.status === "in-place" ? styles.playDone : styles.playNext}>
                <div className={styles.playMeta}>
                  <span className={styles.skill}>{play.skill}</span>
                  {play.status === "in-place"
                    ? <span className={styles.inPlace}><CheckCircle2 size={14} aria-hidden="true" /> In place</span>
                    : <span className={styles.nextUp}><CircleDashed size={14} aria-hidden="true" /> Next</span>}
                </div>
                <h3>{play.title}</h3>
                <p>{play.body}</p>
                <p className={styles.moves}>Moves: <b>{play.moves}</b></p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="lab-method">
          <h2 id="lab-method">How the race is measured — and what it does not prove.</h2>
          <div className={styles.columns}>
            <ul className={styles.list}>
              <li><b>Browsers.</b> Two fresh headless Chrome sessions on Cloudflare Browser Run, launched in parallel, browser cache disabled.</li>
              <li><b>Mobile profile.</b> 390 px viewport, 1.6 Mbps down, 150 ms latency, 4× CPU slowdown — the profile in both projects&apos; perf-report scripts.</li>
              <li><b>Timings.</b> Read from the page&apos;s own PerformanceObserver: paint, largest-contentful-paint, layout-shift and longtask entries.</li>
              <li><b>Finish line.</b> The load event, or the moment the page has painted its LCP and the network has been quiet for 2.5 s, capped at 25 s.</li>
              <li><b>Scoring.</b> A gap within 5% (or a small absolute floor per metric) is a draw. A round goes to whoever wins more of its metrics.</li>
            </ul>
            <ul className={styles.list}>
              <li><b>One run is one sample.</b> Network and CPU on a shared cloud browser vary; race twice and expect small gaps to flip.</li>
              <li><b>Lab, not field.</b> No real-user (CrUX) data: this is how the page behaves under one controlled profile, not across visitors.</li>
              <li><b>Home page only.</b> The race loads a single URL cold. Navigation, prefetching and repeat visits are not measured.</li>
              <li><b>Live, not frozen.</b> The after build is still being optimized. The race always measures what is deployed today, so the gap you see is the current state, not a best-ever screenshot.</li>
              <li><b>Review hosts.</b> Both builds run on pages.dev preview hosts marked noindex on purpose, so the Indexable check fails for both.</li>
              <li><b>Your site.</b> A challenger races the optimized build in a real browser on Cloudflare&apos;s network. Only public http(s) domains are accepted, two per minute.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
