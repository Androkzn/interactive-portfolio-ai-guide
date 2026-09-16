# UX and live Web repair — 2026-09-16

## Shipped

- Hero: personal product focus, three verified live projects, four source platforms, interactive question link, real LinkedIn contact links. No invented impact metric or job-availability claim.
- Device Lab: Citizen Companion opens first with public data; larger project buttons above the player; smoothly resizable Web frames; live app theme controls. Device changes preserve the iframe instance. Project changes and explicit reloads reset loading state.
- Theme messages validate the exact child origin and window source. The app-side bridge allows only the portfolio origin and localhost:3000, is inert outside an embedded browser, and does not persist/sync account preferences.
- Guide: looping WebM/MP4 portrait without a close X; portrait pause control; larger question pills; progressively revealed formatted answers; accessible complete-answer announcements; reduced-motion support; manual speech with stop and visibility cancellation. Curated responses are labeled, not presented as a live model.
- Architecture: keyboard-operable connected steps, highlighted downstream path, selected input/output detail, larger code labels. Explicitly an architecture walkthrough, not an execution log.
- Page: reading progress, persistent contact link after scrolling, visible focus styles and skip link.

## Root causes corrected

### Login request blocked by CORS

The shared House/Budget Axios client sends `Cache-Control: no-cache` and `Pragma: no-cache`, including on `/auth/login`. Those headers were absent from the CORS allowlist. Allowing only the Web origins was insufficient. Both deployed APIs now allow the actual request headers while retaining exact origin checks. The standalone Budget backend source/config is also updated to prevent a future deployment from restoring the broken policy.

### Missing icon fonts

Expo exports dependency fonts/images into `assets/node_modules`. Cloudflare Pages excludes that directory during upload, and the SPA fallback returned HTML with status 200 for `.ttf` requests. Brand image icons survived, but Ionicons became missing-glyph squares.

Both product repositories now include `scripts/prepare-pages-web.mjs` and production Web export/deploy scripts. Preparation copies only exported dependency assets into `assets/vendor`, with an internal Pages rewrite preserving the original URLs. It preserves existing redirects and original generated assets. This is not a dependency upload or a change to icon glyphs.

## Verification completed

- Portfolio production build, TypeScript, 12 Vitest tests and 14 static export markers passed.
- House and Budget full TypeScript checks passed after adding native-compatible types/guards to the browser-only theme bridge; both production Web exports and the Citizen Companion production build passed.
- Approved corpus validation passed; grounding fixtures passed 3/3.
- Full browser preflights to both `/auth/login` endpoints: 204 with the exact Web origin and all required headers.
- Synthetic invalid-account POST to both APIs: 401 `Invalid email or password`, with readable CORS headers. No real password used.
- CORS regression suite: 4 tests per backend source, including complete preflight, exposed auth rejection, and unknown-origin rejection.
- Asset preparation tests: 2 per product, including idempotence and preservation of existing routing.
- Published fonts: all 19 fonts per product (38 total) returned 200 and bytes identical to the export. Ionicons content type changed from `text/html` to `font/ttf`.
- Local Chrome: hero/workspace layout visually inspected; Citizen Companion rendered real parliamentary rankings; Light/Dark changed the child document theme; device selection and progressive guide answer exercised.
- Custom domain serves the new hero/guide/theme/video/architecture markers over HTTPS, without the previous unsupported “production API connected” load claim.

## Verification boundary

A Chrome extension popup blocked browser automation after filling deliberately invalid login fields. The UI submit, successful account login, and remaining mobile/responsive visual checks were not completed in this pass. Server auth rejection is not proof of successful login. The owner subsequently supplied a Settings screenshot, which is useful evidence of progress but not a substitute for a full authenticated regression test. No accounts were created, passwords changed, or production records modified for testing.

Native iOS/Android runtimes, all account-scoped product workflows and browser Google OAuth are outside these completed checks. Device Lab remains explicitly a live Web preview.

## Release references

- Portfolio: `a769f75a.interactive-portfolio-ai-guide.pages.dev` (also served on `andreitekhtelev.dev`).
- House: `a77446aa.symply-house-web.pages.dev`.
- Budget: `25763757.symply-budget-web.pages.dev`.
- Citizen Companion: `5e83a548.hoc-v2-web.pages.dev`.

The final House/Budget deployments were rechecked for Ionicons: 200, `font/ttf`, 389724 bytes, TrueType signature `00 01 00 00`.
