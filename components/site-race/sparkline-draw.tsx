"use client";

import { useEffect, useRef } from "react";

/** Where each line is drawn in the teaser's 4.8 s cycle (after its .3 s delay), as fractions. */
const LINES = [
  { selector: "[data-line='original']", start: 0.12, end: 0.94 },
  { selector: "[data-line='next']", start: 0.12, end: 0.58 },
];
/** Pen positions per line, evenly spaced along its length (a chord between two is under 0.1 unit off the curve). */
const STEPS = 48;
const VIEW = { w: 360, h: 112 };
/** The half-plane behind the pen, drawn as a big quad: R across the line and BACK behind the pen (viewBox units). */
const R = 160;
const BACK = 420;

const pct = (x: number, y: number) => `${((x / VIEW.w) * 100).toFixed(2)}% ${((y / VIEW.h) * 100).toFixed(2)}%`;
const behind = (x: number, y: number, tx: number, ty: number) =>
  `polygon(${pct(x - ty * R, y + tx * R)}, ${pct(x - ty * R - tx * BACK, y + tx * R - ty * BACK)}, ${pct(x + ty * R - tx * BACK, y - tx * R - ty * BACK)}, ${pct(x + ty * R, y - tx * R)})`;

/**
 * Draws the sparkline's two lines on the compositor, the way stroke-dashoffset drew them on the main
 * thread: the whole line sits still in its own <svg>, an animated clip-path shows the part behind the
 * pen (cut square to the stroke at the pen point), and a disc riding at the pen point is the round cap.
 * The pen moves at an even pace along the path's length, as the dash did. The keyframes are worked out
 * from the paths here instead of being shipped in the page's render-blocking CSS. Without JavaScript,
 * or with reduced motion, the lines stay drawn in full. Renders nothing visible.
 */
export function SparklineDraw() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = ref.current?.parentElement;
    if (!root || typeof root.animate !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const created: Animation[] = [];
    for (const { selector, start, end } of LINES) {
      const wrap = root.querySelector(selector);
      const line = wrap?.querySelector("svg");
      const path = line?.querySelector("path");
      const pen = wrap?.querySelector("circle");
      if (!line || !path || !pen) continue;
      const length = path.getTotalLength();
      const at = (d: number) => path.getPointAtLength(Math.max(0, Math.min(length, d)));
      const pose = (d: number) => {
        const p = at(d), a = at(d - 0.5), b = at(d + 0.5);
        const n = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        return { x: p.x, y: p.y, tx: (b.x - a.x) / n, ty: (b.y - a.y) / n };
      };
      const first = pose(0);
      // Before the drawing starts the cut sits behind the start cap, so nothing of the line shows.
      const hidden = behind(first.x - first.tx * 8, first.y - first.ty * 8, first.tx, first.ty);
      const clip: Keyframe[] = [{ offset: 0, clipPath: hidden }, { offset: start - 0.0001, clipPath: hidden }];
      const moves: Keyframe[] = [0, start - 0.0001].map((offset) => ({ offset, opacity: 0, transform: `translate(${first.x}px, ${first.y}px)` }));
      for (let i = 0; i <= STEPS; i += 1) {
        const { x, y, tx, ty } = pose((i / STEPS) * length);
        const offset = start + (i / STEPS) * (end - start);
        clip.push({ offset, clipPath: behind(x, y, tx, ty) });
        moves.push({ offset, opacity: 1, transform: `translate(${x}px, ${y}px)` });
      }
      clip.push({ ...clip[clip.length - 1], offset: 1 });
      moves.push({ ...moves[moves.length - 1], offset: 1 });
      const timing: KeyframeAnimationOptions = { duration: 4800, delay: 300, iterations: Infinity, easing: "linear", fill: "backwards" };
      created.push(line.animate(clip, timing), pen.animate(moves, timing));
    }
    // One clock with the rest of the race (SyncAnimations restarts every animation in it on entry).
    const peer = root.closest("section")?.querySelector("[class*='__runnerNext']")?.getAnimations()[0];
    if (peer?.startTime != null) for (const animation of created) animation.startTime = peer.startTime;
    return () => created.forEach((animation) => animation.cancel());
  }, []);
  return <span ref={ref} hidden />;
}
