import { access, readFile } from "node:fs/promises";

const exportUrl = (path) => new URL(`../${path}`, import.meta.url);

await access(exportUrl("out/index.html"));
await Promise.all([
  "iphone-16-pro-black-titanium.png",
  "ipad-pro-11-space-gray.png",
  "pixel-7-pro-obsidian.png",
].map((asset) => access(exportUrl(`out/images/device-frames/${asset}`))));
const html = await readFile(exportUrl("out/index.html"), "utf8");
const requiredMarkers = [
  "Fast with AI",
  "Serious about quality",
  "House of Commons Citizen Companion",
  "Symply Budget",
  "Symply House",
  "Architecture",
  "Quality",
  "AI workflow",
  "AI project guide",
  "Play commentary",
  "Ask the project guide",
  "I build web, mobile, and AI-powered products",
  "Read full recommendation",
  "id=\"engineering-work\"",
  "Engineering case studies",
  "Selected engineering",
  "work.",
  "Products I helped build, decisions I owned, and what changed as a result.",
  "Building the social layer at Step.",
  "AI coaching in production.",
  "Testing the agents that review engineering plans.",
  "My contribution",
  "Key decision",
  "Read case study",
  "Explore engineering work",
  "Product, AI, and engineering-tooling case studies.",
  "People I’ve",
  "worked with.",
  "Let’s build something",
  "Live application preview",
  "andrei-talking-lips-web.webm",
  "andrei-talking-lips-web-60fps.mp4",
];
const forbiddenMarkers = [
  "AI with guardrails",
  "Fun &amp; magic",
  "Architecture walkthrough",
  ">Muted<",
  "Systems that hold up",
  "24-hour production snapshot",
  "See production work",
];
const caseStudyHeadings = [
  "Problem",
  "My role",
  "Key decision",
  "How it works",
  "Verification",
  "Outcome &amp; limitations",
  "Sources &amp; available artifacts",
];
const caseStudyPages = [
  { file: "out/work/step-social-platform/index.html", title: "Building the social layer at Step." },
  { file: "out/work/step-ai-coach/index.html", title: "AI coaching in production." },
  { file: "out/work/ai-assisted-plan-review/index.html", title: "Testing the agents that review engineering plans." },
];
const missing = requiredMarkers.filter((marker) => !html.includes(marker));
const unexpected = forbiddenMarkers.filter((marker) => html.includes(marker));
const pages = [];
for (const page of caseStudyPages) {
  const markers = [page.title, "Back to engineering work", ...caseStudyHeadings];
  let pageHtml;
  try {
    await access(exportUrl(page.file));
    pageHtml = await readFile(exportUrl(page.file), "utf8");
  } catch {
    pages.push({ file: page.file, ok: false, exists: false, missing: markers });
    continue;
  }
  const pageMissing = markers.filter((marker) => !pageHtml.includes(marker));
  pages.push({
    file: page.file,
    ok: pageMissing.length === 0,
    exists: true,
    missing: pageMissing,
    requiredMarkers: markers.length,
  });
}
const failedPages = pages.filter((page) => !page.ok);
if (missing.length || unexpected.length || failedPages.length) {
  const failures = [
    ...(missing.length || unexpected.length ? [{ file: "out/index.html", exists: true, missing, unexpected }] : []),
    ...failedPages.map(({ file, exists, missing: pageMissing }) => ({ file, exists, missing: pageMissing })),
  ];
  console.error(JSON.stringify({ ok: false, failures, missing, unexpected, pages }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    export: "out/index.html",
    requiredMarkers: requiredMarkers.length,
    forbiddenMarkers: forbiddenMarkers.length,
    pages: pages.map(({ file, requiredMarkers: count }) => ({ file, requiredMarkers: count })),
  }, null, 2));
}
