import { readFile } from "node:fs/promises";

const corpusPath = new URL("../../packages/content/approved-corpus.json", import.meta.url);
const corpus = JSON.parse(await readFile(corpusPath, "utf8"));
const errors = [];
const ids = new Set();

if (!/^\d+\.\d+\.\d+$/.test(corpus.corpusVersion)) errors.push("corpusVersion must use semver");
if (!Array.isArray(corpus.projects) || corpus.projects.length < 5) errors.push("expected at least five project manifests");
for (const project of corpus.projects ?? []) {
  if (!project.id || ids.has(project.id)) errors.push(`duplicate or missing project id: ${project.id ?? "<missing>"}`);
  ids.add(project.id);
  if (!project.name || !project.challenge || !project.boundary) errors.push(`missing grounded fields for ${project.id}`);
  if (!Array.isArray(project.sources) || project.sources.length === 0) errors.push(`missing sources for ${project.id}`);
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, corpusVersion: corpus.corpusVersion, projects: corpus.projects.length, sourceCount: corpus.projects.flatMap((project) => project.sources).length }, null, 2));
}
