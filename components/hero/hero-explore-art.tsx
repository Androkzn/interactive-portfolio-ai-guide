import type { CSSProperties } from "react";
import styles from "./hero-explore.module.css";

/*
 * Icons for the hero's "Explore my work" column, drawn for this site as small inline SVG.
 * At rest each one is the Lucide icon it replaced, line for line (24-unit box, 2-unit round
 * strokes), so the column looks as it did; the extra parts only show while a row plays.
 */

const origin = (x: number, y: number) => ({ transformOrigin: `${x}px ${y}px` }) as CSSProperties;

/** Lucide "gauge", with a needle that can swing between the ends of its dial. */
export function GaugeIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
      <path className={styles.needle} style={origin(12, 14)} d="m12 14 4-4" />
    </svg>
  );
}

/** Lucide "timer": a hand that sweeps a full hour and a dial that fills behind it. */
export function StopwatchIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* A circle of radius 4 stroked 8 wide is a pie of radius 8: its dash is the elapsed time. */}
      <circle className={styles.elapsed} cx="12" cy="14" r="4" strokeWidth="8" strokeLinecap="butt" pathLength="100" transform="rotate(-90 12 14)" />
      <line className={styles.crown} x1="10" x2="14" y1="2" y2="2" />
      <circle cx="12" cy="14" r="8" />
      <line className={styles.hand} style={origin(12, 14)} x1="12" x2="15" y1="14" y2="11" />
    </svg>
  );
}

/** Lucide "smartphone". The screen it lights up is HTML laid over it (see the row). */
export function PhoneIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

/** Lucide "file-check-2", with two more case files behind it and lines that write themselves. */
export function CaseFileIcon() {
  const page = "M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z";
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path className={`${styles.sheet} ${styles.sheetBack}`} style={origin(4, 22)} d={page} />
      <path className={`${styles.sheet} ${styles.sheetMid}`} style={origin(4, 22)} d={page} />
      {/* The front page hides the others: filled with the badge colour, outlined as Lucide draws it. */}
      <path className={styles.sheetFill} d={page} stroke="none" />
      <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      {["M12 12.5h4", "M12 15.5h4", "M10.5 18.5h5.5"].map((d, i) => <path key={d} className={styles.writing} d={d} strokeWidth="1.6" pathLength="1" style={{ "--l": i } as CSSProperties} />)}
      <path className={styles.tick} d="m3 15 2 2 4-4" pathLength="10" />
    </svg>
  );
}
