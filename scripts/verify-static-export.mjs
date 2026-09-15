import { access, readFile } from "node:fs/promises";

await access(new URL("../out/index.html", import.meta.url));
const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
const requiredMarkers = ["Work that holds", "Symply House", "Agentic architecture", "Ground", "Evaluate"];
const missing = requiredMarkers.filter((marker) => !html.includes(marker));
if (missing.length) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, export: "out/index.html", markers: requiredMarkers.length }, null, 2));
}
