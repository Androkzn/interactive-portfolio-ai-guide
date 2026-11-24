import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Archive, ArrowLeft, ArrowUp, ArrowUpRight, Braces, ChevronDown, Cpu, Dices, Equal, EyeOff,
  FileCode2, Flag, FlaskConical, Flame, Gauge, Globe, Hand, House, ImageDown, Info, ListChecks, Monitor, Rocket,
  RotateCcw, Scale, Smartphone, Snail, Snowflake, Swords, Timer, Trophy, Users, Wifi, Zap,
} from "lucide-react";
import { LabExperience } from "@/components/site-race/lab-experience";
import resultsData from "@/lib/site-race/results-data.json";
import { contactUrl, emailUrl } from "@/lib/site-links";
import styles from "@/components/site-race/lab-page.module.css";

// Medians of repeated races (scripts/site-race/build-results.mjs): the same numbers as the result block at the top.
// A rebuild of that file may drop a page, so every read tolerates a missing cell.
type Side = Record<string, number | null>;
const cells = resultsData.cells as unknown as Record<string, { races: number; before: Side; after: Side } | undefined>;
const home = cells["home/mobile"];
const races = Math.min(...["home/mobile", "model/mobile"].map((key) => cells[key]?.races ?? Infinity));
const mb = (kb: number | null | undefined) => (kb == null ? null : `${(kb / 1024).toFixed(1)} MB`);
const stat = (value: string | null, note: string) => (value ? { value, note } : undefined);

/** Where a change shows up: a round of the race's scoreboard and, optionally, the row inside it. */
type Shows = { round: string; row?: string };

const story: { tone: "before" | "after" | "proof"; icon: LucideIcon; label: string; title: string; body: string; stat?: { value: string; note: string }; cta?: boolean }[] = [
  {
    tone: "before", icon: Snail, label: "Before", title: "The original site",
    body: "Live and never tuned for speed: full-size images everywhere and no loading priorities, so the main photo queues behind everything else.",
    stat: stat(mb(home?.before.totalKb), "for the home page on a phone"),
  },
  {
    tone: "after", icon: Rocket, label: "After", title: "The same site in Next.js 16",
    body: "The same pages and content in both languages, rebuilt and optimized. Nothing was removed to make it fast.",
    stat: stat(mb(home?.after.totalKb), "for the same page"),
  },
  {
    tone: "proof", icon: Flag, label: "The proof", title: "One live race",
    body: "Two real Chrome browsers on Cloudflare make the same visit with the same phone and connection. You watch both screens.",
    cta: true,
  },
];

// The order the Worker runs it (apps/site-race-api/src/navigation.ts): cold load, repeat view, then the taps.
const visit: { icon: LucideIcon; title: string; who: string; scored: string[] | null; limit: string }[] = [
  { icon: House, title: "Home page, cold", who: "A first visit: empty cache, no open connections.", scored: ["Speed", "Smoothness", "Weight", "Edge cache", "Search"], limit: "Until loaded and quiet · 30 s max" },
  { icon: RotateCcw, title: "Home page again", who: "A returning visitor, with the cache on.", scored: ["Repeat visit"], limit: "10 s max" },
  { icon: Hand, title: "Tap → pump catalogue", who: "Scroll to the link, tap it, wait for the page.", scored: null, limit: "20 s max" },
  { icon: Hand, title: "Tap → HR40-5RZ page", who: "Scroll to the model card, tap it.", scored: ["Next page"], limit: "20 s max" },
];

const changes: { icon: LucideIcon; title: string; body: string; how: string; shows: Shows[] }[] = [
  {
    icon: ImageDown, title: "Images sized for the screen",
    body: "Renders and photos re-encoded as AVIF and WebP in several widths, so a phone gets a phone-sized file. One 1.2 MB product render is now 39 KB.",
    how: "<picture> · srcset + sizes · AVIF / WebP",
    shows: [{ round: "Weight", row: "Images" }, { round: "Speed", row: "LCP" }, { round: "Speed", row: "Fully loaded" }],
  },
  {
    icon: Zap, title: "Main photo first",
    body: "The hero is preloaded at high priority. Images below the fold wait for the scroll, and Next.js's own scripts wait until the hero has loaded.",
    how: "preload · fetchpriority=high · deferred scripts",
    shows: [{ round: "Speed", row: "LCP" }],
  },
  {
    icon: Cpu, title: "Less work at start-up",
    body: "No animation library: the browser's Web Animations API does the motion. Each page loads only its own scripts, and home sections render on the server.",
    how: "Web Animations API · per-page scripts · server rendering",
    shows: [{ round: "Smoothness", row: "Total blocking time" }],
  },
  {
    icon: FileCode2, title: "HTML without decoration",
    body: "A 349 KB decorative drawing left the HTML. Code the page already has draws it when its section scrolls near.",
    how: "client-drawn SVG · near the viewport",
    shows: [{ round: "Edge cache", row: "HTML document" }],
  },
  {
    icon: Hand, title: "The next page starts on touch",
    body: "When a finger lands on a link, about 100 ms before the tap completes, the next page's data starts loading, and for a model page its photo too.",
    how: "router.prefetch() on touchstart · 65 ms hover · Save-Data respected",
    shows: [{ round: "Next page", row: "Tap → content" }, { round: "Next page", row: "Tap → main image" }],
  },
  {
    icon: Archive, title: "Images cached for a year",
    body: "Images are now named by a hash of their bytes, as scripts and fonts already were, so browsers and Cloudflare keep them for a year. The original re-checks its images after a day.",
    how: "Cache-Control: immutable · hashed file names",
    shows: [{ round: "Edge cache", row: "Immutable assets" }],
  },
];

const conditions: { icon: LucideIcon; label: string; value: string }[] = [
  { icon: Smartphone, label: "Phone", value: "390 px wide, 2× screen" },
  { icon: Wifi, label: "Network", value: "Slow 4G: 1.6 Mbps down, 150 ms latency" },
  { icon: Cpu, label: "Processor", value: "4× CPU slowdown" },
  { icon: Monitor, label: "Desktop option", value: "1440 px wide, no throttling" },
];

const fairness: { icon: LucideIcon; text: string }[] = [
  { icon: Flame, text: "Both sites' CDNs are warmed the same way first: every page of the visit, in a throwaway session." },
  { icon: Snowflake, text: "Then each timed browser starts cold, with an empty cache and no open connections. Both launch together." },
  { icon: ListChecks, text: "Same steps, same taps, same order. Neither browser knows which site it is driving." },
];

const verdict: { icon: LucideIcon; text: string }[] = [
  { icon: Scale, text: "A gap smaller than two runs of the same site differ by is a draw. The thresholds come from racing each site against itself." },
  { icon: Timer, text: "A side cut off at a step's limit shows “> limit”: a lower bound, so it can lose but never win." },
  { icon: Trophy, text: "A round goes to whoever wins more of its metrics; the race goes to whoever wins more rounds." },
  { icon: Gauge, text: "The 0–100 scorecard applies Lighthouse 10's weights to the home page: an estimate, not a Lighthouse report." },
];

const caveats: { icon: LucideIcon; text: ReactNode }[] = [
  { icon: Dices, text: <><b>One race is one sample.</b> Close calls can flip between runs; the numbers at the top are medians of {Number.isFinite(races) ? `${races} races` : "repeated races"}.</> },
  { icon: Users, text: <><b>Lab, not field.</b> One controlled phone profile, no real-user (CrUX) data.</> },
  { icon: Braces, text: <><b>The original ships less JavaScript</b> on most pages. React has a start-up cost, so where images do not dominate, the original&apos;s main thread can be the freer one.</> },
  { icon: EyeOff, text: <><b>Preview hosts.</b> Both sites are marked noindex on purpose, so the Indexable check fails for both.</> },
  { icon: Globe, text: <><b>Live sites.</b> Both lanes load the sites as they are now: redeploy either one and the next race shows it.</> },
  { icon: Swords, text: <><b>Your site.</b> In the challenger round it races the Next.js site on the first page only. Public http(s) domains, two races a minute.</> },
];

const fullMethod: ReactNode[] = [
  <><b>Timings</b> come from the page&apos;s own PerformanceObserver (paint, largest-contentful-paint, layout-shift and longtask entries) and Navigation Timing.</>,
  <><b>The home page is done</b> at its load event once it is interactive: the first 5 s with no long task and at most two requests in flight (Lighthouse&apos;s TTI rule). Blocking time counts from first contentful paint to that point.</>,
  <><b>Bytes</b> are what crossed the wire: compressed, headers included, per request from Chrome&apos;s network events.</>,
  <><b>Between steps</b> the throttle is lifted while the previous page finishes downloading; each step then runs under the full profile.</>,
  <><b>A tap</b> is touchstart, 100 ms on the glass, then touchend (desktop: 300 ms of hover, then a click). Bytes count from the scroll to the link, times from the tap.</>,
  <><b>“Main image”</b> means the new page&apos;s largest visible image is loaded, decoded and painted.</>,
  <><b>The catalogue tap</b> is shown under each lane; the Next page round scores the tap to HR40-5RZ.</>,
  <><b>Speed Index</b> comes from the screencast frames, computed the way speedline does it.</>,
  <><b>Requests still downloading</b> when a lane stops are drawn hatched on the waterfall.</>,
];

const title = "From slow to fast: a live before/after performance race · Andrei Tekhtelev";
const description =
  "An original website rebuilt and optimized in Next.js 16, then raced live against the original in real Chrome on Cloudflare's edge: the home page cold, a return visit, then taps to the catalogue and a model page, in one race.";

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
          <ul className={styles.story}>
            {story.map(({ tone, icon: Icon, label, title: name, body, stat: figure, cta }) => (
              <li key={tone} className={`${styles.storyCard} ${styles[tone]}`}>
                <span className={styles.iconBox}><Icon size={20} aria-hidden="true" /></span>
                <p className={styles.storyLabel}>{label}</p>
                <h3>{name}</h3>
                <p className={styles.storyText}>{body}</p>
                {figure && <p className={styles.storyFoot}><b>{figure.value}</b> {figure.note}</p>}
                {cta && <p className={styles.storyFoot}><a className={styles.storyLink} href="#race"><ArrowUp size={15} aria-hidden="true" /> Start the race</a></p>}
              </li>
            ))}
          </ul>

          <div className={styles.visit}>
            <h3 className={styles.subhead}>One press, one visit: the same four steps for both sites</h3>
            <ol className={styles.steps}>
              {visit.map(({ icon: Icon, title: name, who, scored, limit }, index) => (
                <li key={name} className={styles.step}>
                  <span className={styles.stepNo} aria-hidden="true">{index + 1}</span>
                  <div className={styles.stepBody}>
                    <p className={styles.stepTitle}><Icon size={16} aria-hidden="true" /> {name}</p>
                    <p className={styles.stepWho}>{who}</p>
                    {scored ? (
                      <div className={styles.stepScored}>
                        <span className={styles.label}>Scored in</span>
                        <ul className={styles.chips}>{scored.map((round) => <li key={round}><b>{round}</b></li>)}</ul>
                      </div>
                    ) : (
                      <p className={styles.unscored}>Shown under each lane, not scored</p>
                    )}
                    <p className={styles.stepLimit}><Timer size={13} aria-hidden="true" /> {limit}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className={styles.stepNote}>
              <Info size={15} aria-hidden="true" />
              <span>The cache stays on after the first page, as in a real browser. Before each step the previous page may finish downloading, so every step measures only itself.</span>
            </p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="lab-changes">
          <h2 id="lab-changes">What was optimized, and where you see it in the race.</h2>
          <p className={styles.lede}>Six changes. Each card names the scoreboard round and row where it shows.</p>
          <ul className={styles.changes}>
            {changes.map(({ icon: Icon, title: name, body, how, shows }) => (
              <li key={name} className={styles.change}>
                <span className={styles.iconBox}><Icon size={20} aria-hidden="true" /></span>
                <h3>{name}</h3>
                <p className={styles.changeText}>{body}</p>
                <p className={styles.how}>{how}</p>
                <div className={styles.shows}>
                  <span className={styles.label}>Shows in the race</span>
                  <ul className={styles.chips}>
                    {shows.map(({ round, row }) => <li key={`${round}-${row}`}><b>{round}</b>{row ? ` · ${row}` : ""}</li>)}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
          <p className={styles.parity}>
            <Equal size={18} aria-hidden="true" />
            <span><b>Kept, not gained.</b> Like the original, every page is pre-rendered HTML on Cloudflare Pages that reads without JavaScript, so time to first byte and the Search round start level.</span>
          </p>
        </section>

        <section className={styles.section} aria-labelledby="lab-method">
          <h2 id="lab-method">How the race is measured, and what it does not prove.</h2>
          <div className={styles.method}>
            <div className={styles.panel}>
              <h3>Same conditions</h3>
              <dl className={styles.specs}>
                {conditions.map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <dt><Icon size={15} aria-hidden="true" /> {label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className={styles.panel}>
              <h3>A fair start</h3>
              <ul className={styles.points}>
                {fairness.map(({ icon: Icon, text }) => <li key={text}><Icon size={17} aria-hidden="true" /><span>{text}</span></li>)}
              </ul>
            </div>
            <div className={styles.panel}>
              <h3>Who wins</h3>
              <ul className={styles.points}>
                {verdict.map(({ icon: Icon, text }) => <li key={text}><Icon size={17} aria-hidden="true" /><span>{text}</span></li>)}
              </ul>
            </div>
          </div>

          <div className={styles.caveats}>
            <h3><Info size={18} aria-hidden="true" /> What one race does not prove</h3>
            <ul>
              {caveats.map(({ icon: Icon, text }, index) => <li key={index}><Icon size={17} aria-hidden="true" /><span>{text}</span></li>)}
            </ul>
          </div>

          <details className={styles.fullMethod}>
            <summary>
              <span>The full method</span>
              <small>Timings, finish lines, bytes and taps</small>
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <ul className={styles.list}>
              {fullMethod.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </details>
        </section>
      </main>
    </div>
  );
}
