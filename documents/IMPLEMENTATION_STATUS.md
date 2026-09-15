# Implementation status

Updated: 2026-09-15

This tracker is updated as implementation blocks are completed. It separates what is working in this repository from source material and project inputs that still need owner verification.

## Online release

- **GitHub:** https://github.com/Androkzn/interactive-portfolio-ai-guide
- **Cloudflare Pages production URL:** https://interactive-portfolio-ai-guide.pages.dev/
- **Deployment preview URL:** https://ab6f86c2.interactive-portfolio-ai-guide.pages.dev
- **Site build source commit:** `2ea5f52`.
- **Verification:** HTTP `200`; static smoke markers found in the deployed HTML.
- **Custom domain:** `andreitekhtelev.dev` was registered in Cloudflare Registrar and added to the Pages project on 2026-09-15. Cloudflare Pages status: `Verifying`; the root CNAME is present in the Cloudflare DNS zone and public resolver `1.1.1.1` returns Cloudflare addresses. HTTPS returns `200` when resolved through the public address; the local default resolver still has a negative-cache result, so the Pages URL remains the verified fallback during propagation.
- **Framework security update:** upgraded to Next.js `16.3.5` / React `19.3.0`; `npm audit --omit=dev` reports 0 vulnerabilities.

## Completed in the first implementation slice

- **Repository:** created public GitHub repository [Androkzn/interactive-portfolio-ai-guide](https://github.com/Androkzn/interactive-portfolio-ai-guide).
- **Static shell:** Next.js App Router with `output: export`, responsive layout, and no required runtime server.
- **Portfolio workspace:** one active demo player with `idle → active → complete`, seeded local state and reset.
- **Project manifests:** five candidate manifests remain explicit drafts; a sixth connected project, Symply House, is marked as the featured source build.
- **Symply House connection:** source repository linked to [Androkzn/symply-house](https://github.com/Androkzn/symply-house); source platform matrix recorded as iPhone, iPad, Android and Web. The portfolio itself runs the Web preview and does not claim native runtime inside the browser.
- **Viewports:** phone, tablet and desktop web-preview modes are selectable and labeled with their dimensions.
- **Guide modes:** Explore, Tour and Interview tabs share the same in-tab conversation state.
- **Curated guide:** local responses cover personal contribution, technical challenge, AI verification, opening a project and unknown/pending facts. No paid AI key is required.
- **Speech fallback:** browser `speechSynthesis` is opt-in with Stop, mute, visibility cancellation and text-first behavior.
- **Transparency:** every demo is labeled as local/synthetic; the connected source and pending manifest boundaries are visible in the UI.
- **Accessibility baseline:** semantic controls, live guide thread, visible focus-compatible controls and reduced-motion CSS fallback.
- **Backend contract:** typed `GuideTurnRequest`, `GuideTurnResponse` and allowlisted `GuideAction` contracts shared by the Worker and its tests.
- **Guide API first slice:** Cloudflare Worker boundary with origin allowlist, input size/schema validation, curated grounding, prompt-injection refusal, no-store responses, structured logs and explicit curated mode.
- **AI adapter boundary:** optional Workers AI call is behind `GENERATIVE_GUIDE_ENABLED`; model output is accepted only with project-local source citation and safety checks, otherwise the Worker returns curated mode.
- **Backend tests:** Vitest coverage for grounded answers, prompt-injection refusal, malformed input and origin rejection.
- **Agentic architecture artifacts:** reusable `skills/` contracts for grounding, allowlisted demo actions and evidence-first evals; offline scripts validate the corpus and run deterministic grounding fixtures.
- **Architecture presentation:** public UI section now exposes the agent loop as Ground → Decide → Act → Evaluate, with typed contracts, source IDs and offline evals named in the interface.
- **AI positioning:** the approved corpus now frames AI as process/system architecture with evals, monitoring, domain review and cost boundaries — not as a standalone prompt-engineering identity.
- **CI quality gates:** GitHub Actions runs generated Worker types, TypeScript, Vitest, corpus validation, offline grounding evals, static export build/smoke checks and Wrangler dry-run.

## In progress / next implementation blocks

- [x] Run and verify the Next.js build after dependencies are installed.
- [ ] Add a typed `DemoMessage` bridge for a separately deployed Symply House Web build (`ready`, `screen`, `stepComplete`, `ack`, `error`).
- [ ] Verify the actual Expo Web export from the connected Symply House repository and record its commit/build version here.
- [ ] Replace the local Symply House reconstruction in the player with the verified Web build only after origin, sandbox and reset behavior are checked.
- [ ] Complete the remaining four app audits: ownership, permitted sources, platform dependencies, evidence and core flow.
- [ ] Re-check `andreitekhtelev.dev` until Cloudflare Pages changes from `Verifying` to `Active` and the default resolver returns it without an override.
- [x] Add the Worker Guide API with server-side challenge validation, strict content grounding and curated fallback.
- [x] Add the Workers AI adapter behind a reviewed feature flag; preserve curated mode on quota/timeout.
- [ ] Add eval fixtures: 20 first questions, action tests and multi-turn interruption/resume scenarios.
- [ ] Add approved avatar poster/speaking-loop assets when supplied by Andrei. The CSS neutral frame remains the v1 fallback.

## Requirement traceability

| Requirement block | Current evidence | Status |
| --- | --- | --- |
| BR-04 / C1 / C4 | Manifest-driven project workspace and case content | Partial: five candidate sources still pending |
| BR-05 / A2 | Four-platform Symply House matrix plus explicit web-preview labels | Partial: actual web export verification pending |
| BR-06 / C5 | Synthetic local seed, reset, no production effects | Implemented for local preview |
| BR-07 / F2 | Static shell and curated guide do not require AI quota | Implemented for first slice |
| BR-10 / D1–D6 | Project-aware local guide, mode state and interruption-safe new turns | First slice implemented; Worker grounding pending |
| BR-11 / B4 | Guide can request/open a project in the shared player | First slice simulated locally; typed bridge pending |
| BR-12 / E2–E4 | Manual speech, Stop, mute, text fallback and visibility cancellation | First slice implemented |
| BR-14 / F3 | Responsive layout, reduced-motion CSS, semantic buttons | First slice implemented; device QA pending |
| TRD §4 / D1–D5 | `apps/guide-api` typed request/response, origin guard, safe action union | First slice implemented; Turnstile and live AI pending |
| TRD §7 / F1–F2 | Curated fallback, optional Workers AI adapter, prompt-injection refusal, no-store response, structured logging | First slice implemented; server-side challenge pending |
| BR-03 / D7 / F5 | `skills/` contracts plus offline corpus/eval scripts | First slice implemented |
| TRD §4.2 / F6 | Public agentic architecture map and replaceable-model boundary | First slice implemented |
| Positioning input | Process-first AI, evaluation/monitoring, domain ownership and cost awareness | Added to approved corpus and UI narrative |
| Public engineering proof | CI workflow with frontend/backend/static-export gates | Added |

## Owner inputs still required

- Confirm the final five-project list and the permission status of each candidate.
- Confirm the Symply House Web build commit/version and the approved demo scenario/reset contract.
- Provide approved personal contribution, challenge and evidence material for each published case.
- Provide neutral poster and speaking-loop assets if the CSS avatar should be replaced.
