import type { CSSProperties, ReactNode } from "react";
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
    <>
      {/* The elapsed time, a pie of radius 8 behind the dial that fills clockwise and turns green:
          two half-discs turning behind half windows, on the compositor (see the CSS). */}
      <span className={styles.pie} aria-hidden="true">
        <span className={styles.pieHalf}><i className={styles.pieWedge} /></span>
        <span className={styles.pieHalf}><i className={styles.pieWedge} /></span>
        <i className={styles.pieGreen} />
      </span>
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line className={styles.crown} x1="10" x2="14" y1="2" y2="2" />
        <circle cx="12" cy="14" r="8" />
        <line className={styles.hand} style={origin(12, 14)} x1="12" x2="15" y1="14" y2="11" />
      </svg>
    </>
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
  const svg = (child: ReactNode) => <svg viewBox="0 0 24 24">{child}</svg>;
  return (
    <>
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path className={`${styles.sheet} ${styles.sheetBack}`} style={origin(4, 22)} d={page} />
        <path className={`${styles.sheet} ${styles.sheetMid}`} style={origin(4, 22)} d={page} />
        {/* The front page hides the others: filled with the badge colour, outlined as Lucide draws it. */}
        <path className={styles.sheetFill} d={page} stroke="none" />
        <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path className={styles.tick} d="m3 15 2 2 4-4" pathLength="10" />
      </svg>
      {/* While the scene plays, the lines write themselves and the check is drawn again on the
          compositor: each stroke whole in its own <svg>, clipped square at the pen, with a disc at
          the pen for the round cap (see the CSS). */}
      <span className={styles.ink} aria-hidden="true">
        {["M12 12.5h4", "M12 15.5h4", "M10.5 18.5h5.5"].map((d, i) => (
          <span key={d} className={styles.line} style={{ "--l": i } as CSSProperties}>{svg(<path d={d} />)}{svg(<circle r=".8" />)}</span>
        ))}
        <span className={styles.tickDraw}>{svg(<path d="M3 15l2 2" />)}{svg(<path d="M5 17l4-4" />)}{svg(<circle r="1" />)}</span>
      </span>
    </>
  );
}
