# Implementation status

Updated: 2026-09-15

This tracker is updated as implementation blocks are completed. It separates what is working in this repository from source material and project inputs that still need owner verification.

## Online release

- **GitHub:** https://github.com/Androkzn/interactive-portfolio-ai-guide
- **Cloudflare Pages production URL:** https://interactive-portfolio-ai-guide.pages.dev/
- **Deployment preview URL:** https://afd92650.interactive-portfolio-ai-guide.pages.dev
- **Site build source commit:** `e86f8c9` (in-site native device lab release).
- **Verification:** HTTP `200`; static smoke markers found in the deployed HTML; browser iframe smoke check opened the embedded Tasks tab.
- **Connected Symply House Web build:** https://symply-house-web.pages.dev/?embed=portfolio-v1
- **Connected source commit:** `9e1c739df` (`feat(web): add safe public Home preview`). Expo export verified in Chrome; the public route opens a deterministic read-only Home surface with Overview, Tasks and Spaces interactions.
- **Custom domain:** `andreitekhtelev.dev` was registered in Cloudflare Registrar and added to the Pages project on 2026-09-15. Cloudflare Pages status: `Active` with `SSL enabled`; the root CNAME is present in the Cloudflare DNS zone, public resolvers return Cloudflare addresses, and HTTPS returns `200`. The local default resolver on the development machine still has a negative-cache result and may require a DNS cache/network refresh.
- **Framework security update:** upgraded to Next.js `16.3.5` / React `19.3.0`; `npm audit --omit=dev` reports 0 vulnerabilities.

## Completed in the first implementation slice

- **Repository:** created public GitHub repository [Androkzn/interactive-portfolio-ai-guide](https://github.com/Androkzn/interactive-portfolio-ai-guide).
- **Static shell:** Next.js App Router with `output: export`, responsive layout, and no required runtime server.
- **Portfolio workspace:** one active demo player with `idle → active → complete`, seeded local state and reset.
- **Project manifests:** five candidate manifests remain explicit drafts; a sixth connected project, Symply House, is marked as the featured source build.
- **Symply House connection:** source repository linked to [Androkzn/symply-house](https://github.com/Androkzn/symply-house); source platform matrix recorded as iPhone, iPad, Android and Web. The portfolio now embeds the connected Web build in a sandboxed player and presents it through an in-site Device Lab without claiming native runtime inside the browser.
- **Device Lab:** iPhone, iPad, Android and Desktop shells are selectable and labeled with their dimensions; each mode runs the connected Web build inside the site.
- **Guide modes:** Explore, Tour and Interview tabs share the same in-tab conversation state.
- **Curated guide:** local responses cover personal contribution, technical challenge, AI verification, opening a project and unknown/pending facts. No paid AI key is required.
- **Speech fallback:** browser `speechSynthesis` is opt-in with Stop, mute, visibility cancellation and text-first behavior.
- **Personal avatar:** approved portrait is stored at `public/images/andrei-tekhtelev-avatar.png` and displayed in the guide panel; the CSS frame remains the no-asset fallback.
- **Transparency:** every demo is labeled as local/synthetic; the connected source and pending manifest boundaries are visible in the UI.
- **Connected Home preview:** the separate Expo Web deployment uses an explicit `EXPO_PUBLIC_PUBLIC_PREVIEW=1` review mode, local seeded data, platform adapters for native-only modules and no production auth/write access. Full implementation notes live in [SYMPLY_HOUSE_WEB_INTEGRATION.md](./SYMPLY_HOUSE_WEB_INTEGRATION.md).
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
- [ ] Add a typed `DemoMessage` bridge for a separately deployed Symply House Web build (`ready`, `screen`, `stepComplete`, `ack`, `error`). The current iframe uses the browser load event; the richer event contract remains a follow-up.
- [x] Verify the actual Expo Web export from the connected Symply House repository and record its commit/build version here.
- [x] Replace the local Symply House reconstruction in the player with the verified Web build; origin, sandbox, local reset behavior and direct browser rendering were checked.
- [ ] Complete the remaining four app audits: ownership, permitted sources, platform dependencies, evidence and core flow.
- [x] Re-check `andreitekhtelev.dev` until Cloudflare Pages changes from `Verifying` to `Active` and public DNS/HTTPS verification succeeds.
- [x] Add the Worker Guide API with server-side challenge validation, strict content grounding and curated fallback.
- [x] Add the Workers AI adapter behind a reviewed feature flag; preserve curated mode on quota/timeout.
- [ ] Add eval fixtures: 20 first questions, action tests and multi-turn interruption/resume scenarios.
- [x] Add approved portrait avatar asset supplied by Andrei. Speaking state remains device-generated voice plus a restrained status animation.

## Requirement traceability

| Requirement block | Current evidence | Status |
| --- | --- | --- |
| BR-04 / C1 / C4 | Manifest-driven project workspace and case content | Partial: five candidate sources still pending |
| BR-05 / A2 | Four-platform Symply House matrix, connected Expo Web build and explicit web-preview labels | Implemented for Web preview; native targets remain source/build evidence |
| BR-06 / C5 | Synthetic local seed, reset, no production effects | Implemented for local preview |
| BR-07 / F2 | Static shell and curated guide do not require AI quota | Implemented for first slice |
| BR-10 / D1–D6 | Project-aware local guide, mode state and interruption-safe new turns | First slice implemented; Worker grounding pending |
| BR-11 / B4 | Guide can request/open a project in the shared player | Implemented for the connected player; typed cross-frame event bridge pending |
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
- Confirm the remaining native release artifacts and the richer cross-frame `DemoMessage` event contract; the public Web review mode and local reset contract are implemented at source commit `9e1c739df`.
- Provide approved personal contribution, challenge and evidence material for each published case.
- Provide neutral poster and speaking-loop assets if the CSS avatar should be replaced.
