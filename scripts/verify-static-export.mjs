import { access, readFile } from "node:fs/promises";

await access(new URL("../out/index.html", import.meta.url));
await Promise.all([
  "iphone-16-pro-black-titanium.png",
  "ipad-pro-11-space-gray.png",
  "pixel-7-pro-obsidian.png",
].map((asset) => access(new URL(`../out/images/device-frames/${asset}`, import.meta.url))));
const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
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
  "Production engineering",
  "Systems that hold up",
  "24-hour production snapshot",
  "Measured in staging",
  "Latency removed",
  "Engineering workflow",
  "From evidence",
  "People I’ve",
  "worked with.",
  "Let’s build something",
  "Live application preview",
  "andrei-talking-lips-web.webm",
  "andrei-talking-lips-web-60fps.mp4",
];
const forbiddenMarkers = ["AI with guardrails", "Fun &amp; magic", "Architecture walkthrough", ">Muted<"];
const missing = requiredMarkers.filter((marker) => !html.includes(marker));
const unexpected = forbiddenMarkers.filter((marker) => html.includes(marker));
if (missing.length || unexpected.length) {
  console.error(JSON.stringify({ ok: false, missing, unexpected }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, export: "out/index.html", requiredMarkers: requiredMarkers.length, forbiddenMarkers: forbiddenMarkers.length }, null, 2));
}
