import { access, readFile } from "node:fs/promises";

await access(new URL("../out/index.html", import.meta.url));
await Promise.all([
  "iphone-16-pro-black-titanium.png",
  "ipad-pro-11-space-gray.png",
  "pixel-7-pro-obsidian.png",
].map((asset) => access(new URL(`../out/images/device-frames/${asset}`, import.meta.url))));
const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
const requiredMarkers = ["Work that holds", "House of Commons Citizen Companion", "Symply Budget", "Symply House", "Agentic architecture", "Ground", "Evaluate", "What did you personally own?", "App theme", "iphone-16-pro-black-titanium.png", "andrei-talking-lips-web.webm", "andrei-talking-lips-web-60fps.mp4", "https://hoc-v2-web.pages.dev/", "Interactive design walkthrough"];
const missing = requiredMarkers.filter((marker) => !html.includes(marker));
if (missing.length) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, export: "out/index.html", markers: requiredMarkers.length }, null, 2));
}
