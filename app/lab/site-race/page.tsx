import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FlaskConical } from "lucide-react";
import { LabExperience } from "@/components/site-race/lab-experience";
import { skillMap } from "@/lib/site-race/playbook";
import { contactUrl, emailUrl } from "@/lib/site-links";
import styles from "@/components/site-race/lab-page.module.css";

const title = "From slow to fast: a live before/after performance race · Andrei Tekhtelev";
const description =
  "An original website rebuilt and optimized in Next.js 16: measured before and after, then raced live in real Chrome on Cloudflare's edge. Race your own site against the optimized build too.";

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

        <LabExperience />

        <section className={styles.section} aria-labelledby="lab-why">
          <p className={styles.eyebrow}><FlaskConical size={14} aria-hidden="true" /> Why this exists</p>
          <h2 id="lab-why">Take a slow website. Make it fast. Prove it live.</h2>
          <div className={styles.columns}>
            <p>
              The <b>before</b> is the original site as it was first shipped — never tuned, heavy images and all. The <b>after</b> is the same
              site, with the same content and routes, rebuilt in Next.js 16 and optimized: images resized and compressed, the main photo
              loaded first, less work for the browser at start. The numbers at the top are medians of repeated races; the live race lets
              you check them yourself.
            </p>
            <p>
              The race itself is live: nothing in it is replayed from storage, except the recorded race, which is labelled as one. When you press start, a Worker launches two Chrome sessions on
              Cloudflare Browser Run, applies the same mobile throttling the projects&apos; own performance reports use, and streams the
              screencast, the paint milestones, the network log and the response headers straight to your screen.
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

        <section className={styles.section} aria-labelledby="lab-method">
          <h2 id="lab-method">How the race is measured — and what it does not prove.</h2>
          <div className={styles.columns}>
            <ul className={styles.list}>
              <li><b>Browsers.</b> Two fresh headless Chrome sessions on Cloudflare Browser Run, launched in parallel, browser cache disabled.</li>
              <li><b>Mobile profile.</b> 390 px viewport, 1.6 Mbps down, 150 ms latency, 4× CPU slowdown — the profile in both projects&apos; perf-report scripts.</li>
              <li><b>Timings.</b> Read from the page&apos;s own PerformanceObserver: paint, largest-contentful-paint, layout-shift and longtask entries.</li>
              <li><b>Finish line.</b> The load event once the page is interactive (Lighthouse&apos;s TTI rule), with both sites&apos; CDN caches warmed identically before the start. A lane still downloading at 30 s stops there: its LCP is reported as “&gt; 30 s”, and the requests still in flight are drawn hatched on the waterfall.</li>
              <li><b>Scoring.</b> A gap within the run-to-run noise measured for that metric is a draw. A round goes to whoever wins more of its metrics.</li>
              <li><b>Scorecard.</b> Lighthouse 10&apos;s weights (FCP 10%, Speed Index 10%, LCP 25%, TBT 30%, CLS 25%) and log-normal curves, applied to the race&apos;s own numbers. Speed Index is computed from the screencast the way speedline does it — colour histograms against the first and last frame — so it is an estimate, not a Lighthouse report.</li>
            </ul>
            <ul className={styles.list}>
              <li><b>One run is one sample.</b> Network and CPU on a shared cloud browser vary; race twice and expect small gaps to flip. That is why the numbers at the top are medians of several races per page and device.</li>
              <li><b>Lab, not field.</b> No real-user (CrUX) data: this is how the page behaves under one controlled profile, not across visitors.</li>
              <li><b>One cold page.</b> The race loads a single URL with an empty cache. Opening a second page, prefetching and repeat visits are not measured.</li>
              <li><b>Pinned builds.</b> Both sides are fixed deployments: the original as first shipped, and the current optimized build (named in the race settings). When a newer build ships, the race and the numbers at the top are updated together.</li>
              <li><b>Review hosts.</b> Both builds run on preview hosts (pages.dev) marked noindex on purpose, so the Indexable check fails for both of them.</li>
              <li><b>Your site.</b> A challenger races the optimized build in a real browser on Cloudflare&apos;s network. Only public http(s) domains are accepted, two per minute.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
