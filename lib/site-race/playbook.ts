// The optimization playbook shown under the journey. "in-place" items are in the
// latest stage's deployment and visible in a race; "partial" items have started
// but still lose a metric to the original; "next" items are not built yet.
// Change a status only after a race (or a perf-report run) shows it on a deployment.

import type { StageId } from "./journey";

export type PlayStatus = "in-place" | "partial" | "next";

export type Play = {
  id: string;
  /** The job requirement this play demonstrates. */
  skill: "Rebuild" | "Rendering" | "Page load" | "Cloudflare" | "Edge cache" | "SSG";
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
    skill: "Rebuild",
    title: "Rebuild the whole site, page for page",
    body: "Same content, routes, three languages and images, on Next.js 16 — so every gap in the race comes from engineering decisions, not from a different website.",
    moves: "Makes before and after comparable",
    status: "in-place",
    stage: "port",
  },
  {
    id: "ssg",
    skill: "SSG",
    title: "Every route pre-rendered at build time",
    body: "output: \"export\" with trailing-slash directories: Cloudflare Pages serves finished HTML with no server on the request path. The race checks it by counting words in the HTML before any JavaScript runs.",
    moves: "Content in the HTML · TTFB",
    status: "in-place",
    stage: "port",
  },
  {
    id: "images",
    skill: "Page load",
    title: "AVIF/WebP in six widths, through <picture>",
    body: "Product renders went from 1.2–1.9 MB PNG to tens of KB of AVIF, with per-context sizes so an 84-px thumbnail no longer downloads a 1774-px file.",
    moves: "Image bytes · LCP",
    status: "in-place",
    stage: "images",
  },
  {
    id: "lcp-priority",
    skill: "Page load",
    title: "The LCP image goes first",
    body: "The hero is preloaded from <head> with imageSrcSet and fetchpriority=high; everything below the fold waits until it is within one viewport.",
    moves: "Largest contentful paint",
    status: "in-place",
    stage: "lcp",
  },
  {
    id: "html-diet",
    skill: "Rendering",
    title: "HTML carries content, not decoration",
    body: "A 349 KB inline SVG drawing left the server output; client code the bundle already had draws it near the viewport. Home HTML: 73 KB → 26 KB Brotli.",
    moves: "HTML document · FCP",
    status: "in-place",
    stage: "html",
  },
  {
    id: "immutable",
    skill: "Edge cache",
    title: "Content-hashed files cached for a year",
    body: "/_next/static, fonts and /images/optimized carry a hash of their bytes in the name, so the browser and every Cloudflare location keep them as immutable — a changed file is a new URL, not an invalidation.",
    moves: "Immutable assets",
    status: "in-place",
    stage: "images",
  },
  {
    id: "prefetch",
    skill: "Page load",
    title: "Prefetch the next page on intent",
    body: "router.prefetch() after a 65 ms hover, on touchstart or focus — once per URL, never by viewport on a metered connection.",
    moves: "Second-page navigation (not visible in a cold race)",
    status: "in-place",
    stage: "prefetch",
  },
  {
    id: "js",
    skill: "Rendering",
    title: "JavaScript: still heavier than the original",
    body: "Removing framer-motion and per-page component scripts cut what each page loads, but the React runtime remains: about 160 KB against the original site's 12 KB on the model page. Next: more Server Components, fewer client boundaries.",
    moves: "JavaScript · Total blocking time",
    status: "partial",
    stage: "javascript",
  },
  {
    id: "cache-tags",
    skill: "Edge cache",
    title: "Cache HTML at the edge, purge by tag on deploy",
    body: "HTML is still served with max-age=0, so the edge revalidates every page. Tag each page by section and language (Cache-Tag: page:/pumps, lang:es, models), cache it at the edge, and have the deploy purge only the tags whose content changed.",
    moves: "Warm HTML fetch · TTFB",
    status: "next",
  },
  {
    id: "speculation",
    skill: "Cloudflare",
    title: "Prerender the likely next page",
    body: "Speculation Rules for the top navigation targets, so the second page can be fully rendered before the click — on top of the RSC prefetch already in place.",
    moves: "Second-page navigation",
    status: "next",
  },
];

export const skillMap: { ask: string; where: string }[] = [
  { ask: "Refactoring / rebuilding entire websites", where: "An unoptimized original site rebuilt end to end in Next.js 16 — then optimized in six deployed, raceable stages." },
  { ask: "Next.js optimization: rendering performance, page load behavior", where: "Images, LCP priority, HTML weight, JavaScript and prefetch — each a commit, each measured, each raceable live." },
  { ask: "Production Next.js deploys on Cloudflare", where: "Every stage is a Cloudflare Pages deployment; the race itself runs on Workers and Browser Run." },
  { ask: "Edge cache: layers, tagging, invalidation", where: "Content-hashed immutable assets are in; HTML edge caching with Cache-Tag purges is the next step, below." },
  { ask: "Static Site Generation", where: "Round 5 of the race checks that a crawler gets the content without running JavaScript." },
];
