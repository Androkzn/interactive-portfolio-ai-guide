// The optimization playbook shown under the race. Every "in place" item was
// checked against the Next.js repository (next.config.ts, public/_headers) and
// against what the race's own browser recorded on 2026-11-23; everything else is
// labelled "next" until a race shows it. Update the status here only after a
// race confirms the change on the live build.

export type PlayStatus = "in-place" | "next";

export type Play = {
  id: string;
  /** The job requirement this play demonstrates. */
  skill: "Rebuild" | "Rendering" | "Page load" | "Cloudflare" | "Edge cache" | "SSG";
  title: string;
  body: string;
  /** Which race metric should move when this lands. */
  moves: string;
  status: PlayStatus;
};

export const playbook: Play[] = [
  {
    id: "rebuild",
    skill: "Rebuild",
    title: "Start from a slow site, rebuild it to be fast",
    body: "The original Astro site was shipped as-is and never tuned. It was rebuilt in Next.js 16 page for page — same content, routes, languages and images — so every gap in the race comes from engineering decisions, not from a different website.",
    moves: "Makes before and after comparable",
    status: "in-place",
  },
  {
    id: "ssg",
    skill: "SSG",
    title: "Every route pre-rendered at build time",
    body: "output: \"export\" with trailing-slash directories: Cloudflare Pages serves finished HTML with no server on the request path. The race checks this directly by counting words in the HTML before any JavaScript runs.",
    moves: "Content in the HTML · TTFB",
    status: "in-place",
  },
  {
    id: "immutable",
    skill: "Edge cache",
    title: "Fingerprinted assets cached for a year",
    body: "/_next/static/* and content-hashed fonts ship with Cache-Control: immutable, so a returning visitor and every edge location never revalidate them. Images get a day plus a week of stale-while-revalidate.",
    moves: "Immutable assets",
    status: "in-place",
  },
  {
    id: "compression",
    skill: "Cloudflare",
    title: "Brotli on every text response",
    body: "HTML, JavaScript and CSS reach the browser Brotli-compressed from Cloudflare's edge.",
    moves: "Compressed text · Transferred",
    status: "in-place",
  },
  {
    id: "js-diet",
    skill: "Rendering",
    title: "Ship less JavaScript than the original",
    body: "Next ships the React runtime plus hydration by default, which is why the first port weighed more than the original. Keep pages as Server Components, move the few interactive widgets behind client boundaries and next/dynamic, and drop client-only libraries from the shared chunk.",
    moves: "JavaScript · Total blocking time",
    status: "next",
  },
  {
    id: "images",
    skill: "Page load",
    title: "Responsive AVIF/WebP and a prioritised LCP image",
    body: "images.unoptimized is on because a static export has no image optimizer. Generate AVIF/WebP variants with srcset at build time, mark the hero with fetchPriority=\"high\" and preload it, lazy-load the rest.",
    moves: "LCP · Transferred",
    status: "next",
  },
  {
    id: "cache-tags",
    skill: "Edge cache",
    title: "Cache-Tag headers and purge-by-tag on deploy",
    body: "HTML is still served with max-age=0, so the edge revalidates every page. Tag each page by section and language (Cache-Tag: page:/pumps, lang:es, models), cache HTML at the edge, and have the deploy job purge only the tags whose content changed instead of the whole zone.",
    moves: "Warm HTML fetch · TTFB",
    status: "next",
  },
  {
    id: "prefetch",
    skill: "Page load",
    title: "Instant next page",
    body: "Prefetch likely next routes on hover and viewport, and add Speculation Rules for prerendering the top navigation targets, so the second page load is close to zero.",
    moves: "Not in a single-page race — shows up on navigation",
    status: "next",
  },
];

export const skillMap: { ask: string; where: string }[] = [
  { ask: "Refactoring / rebuilding entire websites", where: "An unoptimized Astro site rebuilt end to end in Next.js 16, raced live against the original." },
  { ask: "Next.js optimization: rendering performance, page load behavior", where: "Rounds 1–3 of the race: paint timings, blocking time and the JavaScript budget, measured live." },
  { ask: "Production Next.js deploys on Cloudflare", where: "Both builds run on Cloudflare Pages; the race itself runs on Workers and Browser Run." },
  { ask: "Edge cache: layers, tagging, invalidation", where: "Round 4 reads the real cache headers; the playbook below covers tags and purge-by-tag." },
  { ask: "Static Site Generation", where: "Round 5 checks that a crawler gets the content without running JavaScript." },
];
