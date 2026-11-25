"use client";

import { useCallback, useEffect, useState } from "react";
import { MousePointerClick, X } from "lucide-react";
import styles from "./race-coach-mark.module.css";

// First-visit hint: a pulsing ring around the race's start button and a card that says
// what pressing it does. Shown once per browser (a per-viewer convenience in localStorage;
// if storage is unavailable it simply shows again). Dismissed by "Got it", Esc, or by
// starting the race. Anchors to the start button by its CSS-module class, so the race
// component needs no changes.
const SEEN_KEY = "site-race:coach-seen";
const START = '#race button[class*="startButton"]';

type Box = { top: number; left: number; width: number; height: number };

const seen = () => { try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode: fine */ } };

export function RaceCoachMark() {
  const [box, setBox] = useState<Box | null>(null);
  const [open, setOpen] = useState(false);

  const dismiss = useCallback(() => { setOpen(false); markSeen(); }, []);

  useEffect(() => {
    // A race that starts by any path (the button, a re-render of it, a link elsewhere) retires the hint.
    const onRace = () => { window.clearTimeout(timer); dismiss(); };
    window.addEventListener("site-race:start", onRace);
    const timer = seen() ? undefined : window.setTimeout(() => setOpen(true), 900);
    return () => { window.clearTimeout(timer); window.removeEventListener("site-race:start", onRace); };
  }, [dismiss]);

  useEffect(() => {
    if (!open) return;
    const button = document.querySelector<HTMLButtonElement>(START);
    if (!button) { setOpen(false); return; }
    const place = () => {
      const r = button.getBoundingClientRect();
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    place();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    const onStart = () => dismiss();
    button.addEventListener("click", onStart);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("keydown", onKey);
    const observer = new ResizeObserver(place);
    observer.observe(document.body);
    return () => {
      button.removeEventListener("click", onStart);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
      window.removeEventListener("keydown", onKey);
      observer.disconnect();
    };
  }, [open, dismiss]);

  if (!open || !box) return null;
  return (
    <div className={styles.layer} aria-live="polite">
      <span className={styles.ring} style={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }} aria-hidden="true" />
      <div className={styles.card} role="dialog" aria-label="How to start the race" style={{ top: box.top + box.height + 18, left: box.left + Math.min(box.width / 2, 160) }}>
        <span className={styles.arrow} aria-hidden="true" />
        <button type="button" className={styles.close} onClick={dismiss} aria-label="Close hint"><X size={16} /></button>
        <p className={styles.kicker}><MousePointerClick size={15} aria-hidden="true" /> Start here</p>
        <p className={styles.text}>
          Press the button: two real Chrome browsers on Cloudflare load both sites at the same moment, and you watch them
          <b> live, side by side</b>, with every millisecond measured.
        </p>
        <button type="button" className={styles.ok} onClick={dismiss}>Got it</button>
      </div>
    </div>
  );
}
