"use client";

import { useEffect, useRef } from "react";

/**
 * Holds the CSS animations inside the parent element still while it is off screen, and lets them run
 * on from the same frame as it scrolls back into view. Off screen, even a transform or opacity loop
 * leaves the compositor and is ticked on the main thread, and a colour, shadow or SVG loop is
 * recomputed there on every frame; paused, they cost nothing. Renders nothing visible.
 */
export function PauseOffscreen() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = ref.current?.parentElement;
    if (!root || typeof root.getAnimations !== "function" || typeof IntersectionObserver === "undefined") return;
    const held = new Set<Animation>();
    const observer = new IntersectionObserver((entries) => {
      const current = root.getAnimations({ subtree: true });
      if (entries[entries.length - 1]?.isIntersecting) {
        // Only animations that still exist: a style change (reduced motion, say) may have cancelled one.
        for (const animation of current) if (held.has(animation)) animation.play();
        held.clear();
        return;
      }
      for (const animation of current) {
        if (animation.playState !== "running") continue;
        animation.pause();
        held.add(animation);
      }
    }, { rootMargin: "40px 0px" });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  return <span ref={ref} hidden />;
}
