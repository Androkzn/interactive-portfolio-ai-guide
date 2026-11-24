import Link from "next/link";
import { ArrowUpRight, Gauge } from "lucide-react";
import styles from "./performance-lab-teaser.module.css";

/**
 * Homepage entry to the live Astro vs Next.js race. It carries no numbers on
 * purpose: results come from the race itself, measured when the visitor runs it.
 */
export function PerformanceLabTeaser() {
  return (
    <section className={styles.section} id="performance-lab" aria-labelledby="performance-lab-title">
      <div className={styles.card}>
        <div className={styles.copy}>
          <div className="section-eyebrow"><Gauge size={14} />Live performance lab</div>
          <h2 id="performance-lab-title">From <span className={styles.astro}>slow</span> to <span className={styles.next}>fast</span>. <em>Live.</em></h2>
          <p>
            A real website as it was first shipped in Astro, never optimized — and the same site rebuilt in Next.js 16 to be fast.
            Press start and two Chrome browsers on Cloudflare&apos;s edge race before against after: paint timings, JavaScript,
            edge-cache headers and SEO, scored round by round. Then race your own site against the optimized build.
          </p>
          <Link className={styles.cta} href="/lab/site-race/">Start the race <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.lights}><i /><i /><i /><i /><i /></div>
          {["astro", "next"].map((lane) => (
            <div key={lane} className={`${styles.lane} ${lane === "astro" ? styles.laneAstro : styles.laneNext}`}>
              <span>{lane === "astro" ? "Before" : "After"}</span>
              <div className={styles.bar}><b /><em>TTFB</em><em>FCP</em><em>LCP</em></div>
            </div>
          ))}
          <p className={styles.tags}><span>Next.js 16</span><span>SSG</span><span>Cloudflare Pages</span><span>Edge cache</span><span>Browser Run</span></p>
        </div>
      </div>
    </section>
  );
}
