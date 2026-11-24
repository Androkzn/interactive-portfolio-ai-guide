"use client";

import { useEffect, useRef } from "react";

/**
 * Puts every CSS animation inside the parent element on one clock: one start time for all of them,
 * and a restart from the beginning whenever the element comes into view. The teaser's race, chart,
 * flag, bars and rail share one 4.8 s cycle and are timed against each other (the F1 car crosses the
 * line as the chart reaches its dot); animations that start at different moments (a style reload in
 * development, an element painted later) would drift apart without this. Renders nothing visible.
 */
export function SyncAnimations() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = ref.current?.parentElement;
    if (!root || typeof root.getAnimations !== "function") return;
    const restart = () => {
      const now = document.timeline?.currentTime;
      if (now === null || now === undefined) return;
      for (const animation of root.getAnimations({ subtree: true })) animation.startTime = now;
    };
    restart();
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) restart(); }, { threshold: 0.35 });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  return <span ref={ref} hidden />;
}
