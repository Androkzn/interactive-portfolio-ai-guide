# Implementation status

Updated: 2026-09-16

This tracker is updated as implementation blocks are completed. It separates what is working in this repository from source material and project inputs that still need owner verification.

## Online release

- **GitHub:** https://github.com/Androkzn/interactive-portfolio-ai-guide
- **Cloudflare Pages production URL:** https://interactive-portfolio-ai-guide.pages.dev/
- **Deployment preview URL:** last verified release remains `https://c78a1171.interactive-portfolio-ai-guide.pages.dev`.
- **Site build source commit:** the two-project catalog change is pending the next Pages deployment.
- **Verification:** previous release returned HTTP `200`; the next release must repeat static smoke, project-count and Device Lab checks.
- **Custom domain:** `andreitekhtelev.dev` was registered in Cloudflare Registrar and added to the Pages project on 2026-09-15. Cloudflare Pages status: `Active` with `SSL enabled`; the root CNAME is present in the Cloudflare DNS zone, public resolvers return Cloudflare addresses, and HTTPS returns `200`. The local default resolver on the development machine still has a negative-cache result and may require a DNS cache/network refresh.
- **Framework security update:** upgraded to Next.js `16.3.5` / React `19.3.0`; `npm audit --omit=dev` reports 0 vulnerabilities.

## Completed in the first implementation slice

- **Repository:** created public GitHub repository [Androkzn/interactive-portfolio-ai-guide](https://github.com/Androkzn/interactive-portfolio-ai-guide).
- **Static shell:** Next.js App Router with `output: export`, responsive layout, and no required runtime server.
- **Portfolio workspace:** one active demo player with `idle → active → complete`, seeded local state and reset.
- **Approved project set:** exactly two projects are now published: [Androkzn/hocv2](https://github.com/Androkzn/hocv2), sourced from `/Users/andreitekhtelev/Desktop/DEVELOPMENT/HoC-v2/`, and [Androkzn/symply-budget](https://github.com/Androkzn/symply-budget), sourced from `/Users/andreitekhtelev/Desktop/Symply Ecosystem/Symply Budget/`.
- **Project cleanup:** the former Symply House, Swiper, Brij, WiFi Map, One Dialer and Pixalere entries, corpus records, guide fallback and connected bridge files were removed from the portfolio application. Their external source folders were intentionally preserved.
- **Device Lab:** iPhone, iPad, Android and Desktop shells remain selectable and labeled with their dimensions; each mode runs a project-specific synthetic, resettable preview. These shells are visual Web previews, not native binaries.
- **Guide modes:** Explore, Tour and Interview tabs share the same in-tab conversation state.
- **Curated guide:** local responses cover personal contribution, technical challenge, AI verification, opening a project and unknown/pending facts. No paid AI key is required.
- **Speech fallback:** browser `speechSynthesis` is opt-in with Stop, mute, visibility cancellation and text-first behavior.
- **Personal avatar:** approved portrait is stored at `public/images/andrei-tekhtelev-avatar.png` and displayed in the guide panel; the CSS frame remains the no-asset fallback.
- **Transparency:** every demo is labeled as local/synthetic; source boundaries and native-vs-Web runtime limits are visible in the UI.
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
- [x] Replace the previous six-project catalog with the two owner-selected source projects and record their repositories, source paths and platform evidence.
- [x] Make the two synthetic Device Lab flows project-specific through reviewed checkpoints rather than generic placeholder cards.
- [ ] Add a secure remote-native preview runner for real iOS Simulator and Android Emulator sessions; browser shells must remain labeled as Web until that runner exists.
- [x] Re-check `andreitekhtelev.dev` until Cloudflare Pages changes from `Verifying` to `Active` and public DNS/HTTPS verification succeeds.
- [x] Add the Worker Guide API with server-side challenge validation, strict content grounding and curated fallback.
- [x] Add the Workers AI adapter behind a reviewed feature flag; preserve curated mode on quota/timeout.
- [ ] Add eval fixtures: 20 first questions, action tests and multi-turn interruption/resume scenarios.
- [x] Add approved portrait avatar asset supplied by Andrei. Speaking state remains device-generated voice plus a restrained status animation.

## Requirement traceability

| Requirement block | Current evidence | Status |
| --- | --- | --- |
| BR-04 / C1 / C4 | Manifest-driven project workspace and case content | Implemented for exactly two approved projects |
| BR-05 / A2 | Multi-platform source evidence and explicit Web/native preview labels | Implemented for HoC v2; Symply Budget native matrix recorded; real native streaming remains pending |
| BR-06 / C5 | Synthetic local seed, reset, no production effects | Implemented for local preview |
| BR-07 / F2 | Static shell and curated guide do not require AI quota | Implemented for first slice |
| BR-10 / D1–D6 | Project-aware local guide, mode state and interruption-safe new turns | First slice implemented; Worker grounding pending |
| BR-11 / B4 | Guide can request/open a project in the shared player | Implemented for the two-project synthetic player |
| BR-12 / E2–E4 | Manual speech, Stop, mute, text fallback and visibility cancellation | First slice implemented |
| BR-14 / F3 | Responsive layout, reduced-motion CSS, semantic buttons | First slice implemented; device QA pending |
| TRD §4 / D1–D5 | `apps/guide-api` typed request/response, origin guard, safe action union | First slice implemented; Turnstile and live AI pending |
| TRD §7 / F1–F2 | Curated fallback, optional Workers AI adapter, prompt-injection refusal, no-store response, structured logging | First slice implemented; server-side challenge pending |
| BR-03 / D7 / F5 | `skills/` contracts plus offline corpus/eval scripts | First slice implemented |
| TRD §4.2 / F6 | Public agentic architecture map and replaceable-model boundary | First slice implemented |
| Positioning input | Process-first AI, evaluation/monitoring, domain ownership and cost awareness | Added to approved corpus and UI narrative |
| Public engineering proof | CI workflow with frontend/backend/static-export gates | Added |

## Owner inputs still required

- Confirm the personal contribution and evidence wording for HoC v2 and Symply Budget before publishing deeper case-study claims.
- Provide native preview runner infrastructure or hosted macOS/Android emulator capacity if real interactive native sessions must be available publicly inside the site.
- Provide neutral poster and speaking-loop assets if the CSS avatar should be replaced.
