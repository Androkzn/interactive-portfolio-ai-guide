import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FlaskConical } from "lucide-react";
import { LabExperience } from "@/components/site-race/lab-experience";
import { skillMap } from "@/lib/site-race/playbook";
import { contactUrl, emailUrl } from "@/lib/site-links";
import styles from "@/components/site-race/lab-page.module.css";

const changes: { what: string; how: string; shows: string }[] = [
  { what: "Images sized for the screen", how: "Every photo and product render re-encoded as AVIF and WebP in several widths, so a phone gets a phone-sized file. A 1.2 MB render becomes about 40 KB.", shows: "data downloaded, main content on screen, page fully loaded." },
  { what: "Main photo first", how: "The hero is preloaded at high priority; scenes and images below the fold wait until the visitor scrolls near them, so nothing competes with it on a slow link.", shows: "main content on screen (LCP)." },
  { what: "Less work at start", how: "The home page's sections render on the server, their animation code loads only near the viewport, and the slider spreads its work out.", shows: "blocking time and the scorecard." },
  { what: "The next page before the tap lands", how: "When a finger touches a link, the model page's data and its photo start loading, so the tap opens a page that is mostly there.", shows: "the model page after the tap." },
  { what: "Files cached for a year", how: "Scripts, styles, fonts and images carry a hash of their content in the name, so the CDN and the browser keep them without asking again.", shows: "the edge cache round." },
  { what: "Pages built ahead of time", how: "Every page is pre-rendered HTML on Cloudflare's edge, readable without JavaScript.", shows: "time to first byte and the search round." },
];

const title = "From slow to fast: a live before/after performance race · Andrei Tekhtelev";
const description =
  "An original website rebuilt and optimized in Next.js 16, then raced live against the original in real Chrome on Cloudflare's edge: home page, catalogue, model page and a return visit, in one race.";

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
          <h2 id="lab-why">Take a slow website. Make it fast. Prove it in one race.</h2>
          <div className={styles.columns}>
            <p>
              The <b>before</b> is the original site as it was first shipped: never tuned, multi-megabyte images and all. The <b>after</b> is
              the same site, with the same content and routes, rebuilt in Next.js 16 and optimized. Nothing was removed to make it fast.
            </p>
            <p>
              One press of the button races both sites through the same visit: open the home page cold, tap through to the pump catalogue and on to a model, then come back as a returning visitor.
              Two real Chrome sessions on Cloudflare do it at the same moment and stream what they see, their paint milestones and every
              request straight to your screen. The numbers at the top are medians of repeated races; the live race lets you check them.
            </p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="lab-changes">
          <h2 id="lab-changes">What was optimized, and where you see it in the race.</h2>
          <ul className={styles.skillMap}>
            {changes.map((item) => (
              <li key={item.what}><b>{item.what}</b><span>{item.how} <i>Shows in: {item.shows}</i></span></li>
            ))}
          </ul>
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
              <li><b>The visit.</b> Each lane opens the home page cold. As soon as its main photo is on screen and the link is visible, a finger taps through to the pump catalogue, then to the HR40-5RZ page, as a visitor would, without waiting for the rest of the page. For each tap the race measures how long the new page takes to show its heading and its main image (capped at 20 s), and what it downloaded. If there is time left, the home page is then reloaded with the browser cache on: what a returning visitor pays.</li>
              <li><b>Browsers.</b> Two fresh headless Chrome sessions on Cloudflare Browser Run, launched in parallel, browser cache disabled for the first page.</li>
              <li><b>Mobile profile.</b> 390 px viewport, 1.6 Mbps down, 150 ms latency, 4× CPU slowdown. Desktop is 1440 px, unthrottled.</li>
              <li><b>Timings.</b> Read from the page&apos;s own PerformanceObserver: paint, largest-contentful-paint, layout-shift and longtask entries.</li>
              <li><b>Finish line.</b> The home page is done at its load event once it is interactive (Lighthouse&apos;s TTI rule). Both sites&apos; CDN caches are warmed identically before the start. A lane still downloading at the cap stops there and is reported as “&gt; cap”; requests still in flight are drawn hatched on the waterfall.</li>
              <li><b>Scoring.</b> A gap within the run-to-run noise measured for that metric is a draw. A round goes to whoever wins more of its metrics.</li>
              <li><b>Scorecard.</b> Lighthouse 10&apos;s weights (FCP 10%, Speed Index 10%, LCP 25%, TBT 30%, CLS 25%) and log-normal curves, applied to the home page&apos;s numbers. Speed Index comes from the screencast the way speedline computes it, so it is an estimate, not a Lighthouse report.</li>
            </ul>
            <ul className={styles.list}>
              <li><b>One run is one sample.</b> Network and CPU on a shared cloud browser vary; race twice and expect small gaps to flip. The numbers at the top are medians of several races.</li>
              <li><b>Lab, not field.</b> No real-user (CrUX) data: this is one controlled profile, not every visitor.</li>
              <li><b>Where the original is strong.</b> It runs less JavaScript, so its blocking time can be lower: React has a start-up cost. The race shows that too.</li>
              <li><b>Live sites.</b> Both sides are the live sites, loaded fresh on every race: redeploy either one and the next race shows it.</li>
              <li><b>Review hosts.</b> Both builds run on preview hosts (pages.dev) marked noindex on purpose, so the Indexable check fails for both of them.</li>
              <li><b>Your site.</b> A challenger races the optimized build in a real browser on Cloudflare&apos;s network. Only public http(s) domains are accepted, two per minute.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
