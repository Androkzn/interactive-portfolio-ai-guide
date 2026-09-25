# Implementation status

Updated: 2026-09-24

This tracker is updated as implementation blocks are completed. It separates what is working in this repository from source material and project inputs that still need owner verification.

## Correction — 2026-09-24 (later the same day): the credentials have been removed from the portfolio

The correction below described the portfolio accurately when it was written earlier today. It no longer does, and the difference matters, so both entries are kept. Established by a live browser probe of the deployed apps on 2026-09-24:

- `lib/preview.ts` no longer contains a demo email or password. The message it posts into the iframe is now `{type: "portfolio:demo", projectId}` and carries no credential. `lib/preview.test.ts` fails if a credential is reintroduced, so the removal is pinned rather than merely done.
- The pre-fill still works, because the embedded app does it itself: the deployed build reads the `portfolioDemo=1` query parameter off its own URL and fills its login fields before it even registers a message listener. Verified live — with the flag both fields are pre-filled, without it they are empty. The pre-fill now depends solely on that query parameter staying on the preview URL.
- **The demo account is still public.** The same credentials remain embedded in each app's own public JavaScript bundle, so the account must still be described as shared and public. What changed is only that the portfolio no longer republishes them — one publicly readable copy fewer. The credentials are not secret, rotated, scoped, rate-limited or otherwise protected. The remaining exposure lives in the app repositories (the portfolio demo service in the shared Symply monorepo); ending publicly readable demo credentials altogether still requires a change there, not here.
- Sign-in is still a real authentication request against that product's production API, performed by the visitor. Nothing auto-submits — re-confirmed.
- The household and budget content the visitor then browses is synthetic, editable, lives only in that browser tab and is never persisted or synced.
- **`portfolioSession` is inert.** The deployed app builds contain zero references to it. The claim in the entry below that the records are "seeded per visit into an ephemeral local session keyed by `portfolioSession`" and that "the app skips auto-sync while a `portfolioSession` is present" is therefore false for the currently deployed builds. The portfolio still appends the parameter, but only for its own bookkeeping; `lib/preview.ts` has had its own comment corrected. The in-tab, never-synced property is verified independently of that id, so the per-visit-session wording has been dropped from `lib/content.ts` and `packages/content/approved-corpus.json` rather than repeated.
- House of Commons Citizen Companion is unchanged and remains credential-free on both sides: no credentials, no demo flag, public data from a deployed public API.

Downstream wording updated with this entry: `lib/content.ts` (Symply House and Symply Budget checkpoints, challenge bodies, live-boundary evidence and the shared tour step) and `packages/content/approved-corpus.json` (all three project boundaries, corpus version `0.3.2`).

## Correction — 2026-09-24 (earlier, superseded in part): the portfolio does embed demo credentials

Kept for the record, unedited. Read it as history, not current state: the entry above removes the embedded credentials described in the first two bullets, and shows the `portfolioSession` behaviour described in the fourth bullet to be absent from the deployed app builds. The closing paragraph's "the portfolio can stop shipping them" has since happened; the app-repository half of it has not.

Two earlier claims in this tracker — that "no credentials were embedded or submitted" and that "the portfolio embeds no credentials" — were false. They are corrected in the entries below. What the code actually does:

- `lib/preview.ts` hardcodes a demo email and password for `symply-house` and `symply-budget`, and those strings are present in the static export under `out/_next/static/chunks/`. The same password string is reused for both accounts, so both must be treated as public.
- The portfolio sends the pair to the embedded app by `postMessage`, targeted at the app's exact origin, and appends `?portfolioDemo=1&portfolioSession=<uuid>` to the preview URL.
- The embedded app pre-fills its own login form and does not auto-submit. The visitor taps Sign In, which performs a real authentication request against that product's production API with a genuine production account.
- The household and budget records the visitor then browses are synthetic, seeded per visit into an ephemeral local session keyed by `portfolioSession`, kept only in that browser tab and never synced (the app skips auto-sync while a `portfolioSession` is present). Real account, real production auth, non-persisted content.
- House of Commons Citizen Companion uses no credentials and no demo flag; its "public data, no account" boundary is accurate.

Removing the embedded credentials is not a portfolio-only change. The portfolio can stop shipping them because the app already derives the pre-fill from the `portfolioDemo` URL flag alone (`portfolioDemoCredentialsFromLocation`), but the app repository holds its own copy of the guest credential map, so ending publicly readable demo credentials altogether requires a change there.

## Online release

- **GitHub:** https://github.com/Androkzn/interactive-portfolio-ai-guide
- **Cloudflare Pages production URL:** https://interactive-portfolio-ai-guide.pages.dev/
- **Deployment preview URL:** latest immutable preview is emitted by each Cloudflare Pages deploy; the canonical public URL is the production URL above.
- **Site build source commit:** `69ad7dc` (`feat: connect three project web previews`).
- **Verification:** preview and custom domain return HTTP `200`; cache-busted production smoke shows exactly the three approved project names and no removed project names. Static smoke and all local quality gates pass.
- **Custom domain:** `andreitekhtelev.dev` was registered in Cloudflare Registrar and added to the Pages project on 2026-09-15. Cloudflare Pages status: `Active` with `SSL enabled`; the root CNAME is present in the Cloudflare DNS zone, public resolvers return Cloudflare addresses, and HTTPS returns `200`. The local default resolver on the development machine still has a negative-cache result and may require a DNS cache/network refresh.
- **Framework security update:** upgraded to Next.js `16.3.5` / React `19.3.0`; `npm audit --omit=dev` reports 0 vulnerabilities.

## Completed in the first implementation slice

**2026-09-16 refresh:** see [UX release QA](UX_RELEASE_QA_2026-09-16.md) for the superseding hero, live theme controls, video guide, architecture stepper, API-header CORS correction and Pages icon-font repair. Earlier first-slice descriptions below are historical where those controls changed.

- **Repository:** created public GitHub repository [Androkzn/interactive-portfolio-ai-guide](https://github.com/Androkzn/interactive-portfolio-ai-guide).
- **Static shell:** Next.js App Router with `output: export`, responsive layout, and no required runtime server.
- **Portfolio workspace:** one active project player with live Web source builds; account-scoped actions remain behind each app's normal authentication.
- **Approved project set:** exactly three projects are now published in presentation order: [Androkzn/symply-house](https://github.com/Androkzn/symply-house), sourced from the shared Symply brand monorepo at `/Users/andreitekhtelev/Desktop/Symply Ecosystem/Simply Ecosystem-budget/` (which carries both the `symply-house` and `symply-budget` brands, and the portfolio demo service used by each); [Androkzn/hocv2](https://github.com/Androkzn/hocv2), sourced from `/Users/andreitekhtelev/Desktop/DEVELOPMENT/HoC-v2/`; and [Androkzn/symply-budget](https://github.com/Androkzn/symply-budget), sourced from the same monorepo clone.
- **Project cleanup:** the former Swiper, Brij, WiFi Map, One Dialer and Pixalere entries, corpus records, guide fallback and connected bridge files were removed from the portfolio application. Their external source folders were intentionally preserved.
- **Device Lab:** iPhone, iPad, Android and Desktop shells remain selectable and labeled with their dimensions. Symply House, HoC v2 and Symply Budget load independently deployed production Web builds inside a sandboxed iframe; each remains explicitly labeled as Web, not native.
- **Connected Web deployments:** [symply-house-web.pages.dev](https://symply-house-web.pages.dev/), [hoc-v2-web.pages.dev](https://hoc-v2-web.pages.dev/) and [symply-budget-web.pages.dev](https://symply-budget-web.pages.dev/). The builds use the source repositories' production API/auth configuration and were deployed independently on 2026-09-16; Citizen Companion includes a web-only style-flattening fix required by React Native Web.
- **Source Web verification:** House and Budget render their own production login screens; HoC renders Home and receives live MP/ranking data from its production public API. Cache-busted browser smoke passed for all three builds. House and Budget are opened with a shared demo login that the deployed app pre-fills itself from the `portfolioDemo` URL flag; the portfolio no longer embeds those credentials, though the account stays public because the app's own bundle carries them. The visitor submits the sign-in, and the resulting content is synthetic, editable and confined to that browser tab. HoC uses no credentials and no demo flag.
- **Source test boundary:** Budget TypeScript passed and focused local-first/task tests passed 18/18. HoC Web build passed; its repository-wide type/test commands still expose pre-existing missing legacy modules, API-shape drift and contract fixtures (recorded as baseline debt, not hidden by the portfolio release).
- **Guide modes:** Explore, Tour and Interview tabs share the same in-tab conversation state.
- **Curated guide:** local responses cover personal contribution, technical challenge, AI verification, opening a project and unknown/pending facts. No paid AI key is required.
- **Speech fallback:** browser `speechSynthesis` is opt-in with Stop, mute, visibility cancellation and text-first behavior.
- **Personal avatar:** approved portrait is stored at `public/images/andrei-tekhtelev-avatar.png` and displayed in the guide panel; the CSS frame remains the no-asset fallback.
- **Transparency:** every project is labeled with its runtime boundary; connected source builds are isolated in sandboxed iframes, sign-in requirements are visible, and native-vs-Web limits remain explicit in the UI.
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
- [x] Replace the previous catalog with the three owner-selected source projects and record their repositories, source paths and platform evidence.
- [x] Replace the synthetic Device Lab flows with independently deployed source Web builds connected to their production APIs.
- [ ] Add a secure remote-native preview runner for real iOS Simulator and Android Emulator sessions; browser shells remain labeled as Web until that runner exists. The researched implementation path is documented in `documents/WEB_NATIVE_PREVIEW_RESEARCH.md`.
- [x] Re-check `andreitekhtelev.dev` until Cloudflare Pages changes from `Verifying` to `Active` and public DNS/HTTPS verification succeeds.
- [x] Add the Worker Guide API with server-side challenge validation, strict content grounding and curated fallback.
- [x] Add the Workers AI adapter behind a reviewed feature flag; preserve curated mode on quota/timeout.
- [ ] Add eval fixtures: 20 first questions, action tests and multi-turn interruption/resume scenarios.
- [x] Add approved portrait avatar asset supplied by Andrei. Speaking state remains device-generated voice plus a restrained status animation.

## Requirement traceability

| Requirement block | Current evidence | Status |
| --- | --- | --- |
| BR-04 / C1 / C4 | Manifest-driven project workspace and case content | Implemented for exactly three approved projects |
| BR-05 / A2 | Multi-platform source evidence and explicit Web/native preview labels | Web source builds connected for all three projects; real native streaming remains pending |
| BR-06 / C5 | Clear runtime boundary and safe account handoff | Live builds use production APIs; House and Budget pre-fill a shared, still-public demo login from the `portfolioDemo` URL flag the app reads itself, the portfolio ships no credentials, the visitor submits the sign-in, and demo content stays in that browser tab only (see both 2026-09-24 corrections) |
| BR-07 / F2 | Static shell and curated guide do not require AI quota | Implemented for first slice |
| BR-10 / D1–D6 | Project-aware local guide, mode state and interruption-safe new turns | First slice implemented; Worker grounding pending |
| BR-11 / B4 | Guide can request/open a project in the shared player | Implemented for the three-project connected Web player |
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
