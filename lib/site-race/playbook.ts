// The optimization playbook shown under the journey. "in-place" items are in the
// latest stage's deployment and visible in a race; "partial" items have started
// but still lose a metric to the original; "next" items are not built yet.
// Change a status only after a race (or a perf-report run) shows it on a deployment.

import type { StageId } from "./journey";

export type PlayStatus = "in-place" | "partial" | "next";

export type Play = {
  id: string;
  /** The area of work this play belongs to. */
  area: "Rebuild" | "Rendering" | "Page load" | "Cloudflare" | "Edge cache" | "SSG";
  title: string;
  body: string;
  /** Which race metric moves when this lands. */
  moves: string;
  status: PlayStatus;
  /** The journey stage that shipped it, if any. */
  stage?: StageId;
};

export const playbook: Play[] = [
  {
    id: "rebuild",
    area: "Rebuild",
    title: "Rebuild the whole site, page for page",
    body: "Same content, routes, both languages (English and Spanish) and images, on Next.js 16 — so every gap in the race comes from engineering decisions, not from a different website.",
    moves: "Makes before and after comparable",
    status: "in-place",
    stage: "port",
  },
  {
    id: "ssg",
    area: "SSG",
    title: "Every route pre-rendered at build time",
    body: "output: \"export\" with trailing-slash directories: Cloudflare Pages serves finished HTML with no server on the request path. The race checks it by counting words in the HTML before any JavaScript runs.",
    moves: "Content in the HTML · TTFB",
    status: "in-place",
    stage: "port",
  },
  {
    id: "images",
    area: "Page load",
    title: "AVIF/WebP in six widths, through <picture>",
    body: "Product renders went from 1.2–1.9 MB PNG to tens of KB of AVIF, with per-context sizes so an 84-px thumbnail no longer downloads a 1774-px file.",
    moves: "Image bytes · LCP",
    status: "in-place",
    stage: "images",
  },
  {
    id: "lcp-priority",
    area: "Page load",
    title: "The LCP image goes first",
    body: "The hero is preloaded from <head> with imageSrcSet and fetchpriority=high; everything below the fold waits until it is within one viewport.",
    moves: "Largest contentful paint",
    status: "in-place",
    stage: "lcp",
  },
  {
    id: "html-diet",
    area: "Rendering",
    title: "HTML carries content, not decoration",
    body: "A 349 KB inline SVG drawing left the server output; client code the bundle already had draws it near the viewport. Home HTML: 73 KB → 26 KB Brotli.",
    moves: "HTML document · FCP",
    status: "in-place",
    stage: "html",
  },
  {
    id: "immutable",
    area: "Edge cache",
    title: "Content-hashed files cached for a year",
    body: "/_next/static, fonts and /images/optimized carry a hash of their bytes in the name, so the browser and every Cloudflare location keep them as immutable — a changed file is a new URL, not an invalidation.",
    moves: "Immutable assets",
    status: "in-place",
    stage: "images",
  },
  {
    id: "prefetch",
    area: "Page load",
    title: "Prefetch the next page on intent",
    body: "router.prefetch() after a 65 ms hover, on touchstart or focus — once per URL, never by viewport on a metered connection.",
    moves: "Second-page navigation (not visible in a cold race)",
    status: "in-place",
    stage: "prefetch",
  },
  {
    id: "js",
    area: "Rendering",
    title: "JavaScript: still heavier than the original",
    body: "Removing framer-motion and per-page component scripts cut what each page loads, but the React runtime remains: about 160 KB against the original site's 12 KB on the model page. Next: more Server Components, fewer client boundaries.",
    moves: "JavaScript · Total blocking time",
    status: "partial",
    stage: "javascript",
  },
  {
    id: "cache-tags",
    area: "Edge cache",
    title: "Cache HTML at the edge, purge by tag on deploy",
    body: "HTML is still served with max-age=0, so the edge revalidates every page. Tag each page by section and language (Cache-Tag: page:/pumps, lang:es, models), cache it at the edge, and have the deploy purge only the tags whose content changed.",
    moves: "Warm HTML fetch · TTFB",
    status: "next",
  },
  {
    id: "speculation",
    area: "Cloudflare",
    title: "Prerender the likely next page",
    body: "Speculation Rules for the top navigation targets, so the second page can be fully rendered before the click — on top of the RSC prefetch already in place.",
    moves: "Second-page navigation",
    status: "next",
  },
];
