# Symply House Web integration

Updated: 2026-09-15

The portfolio embeds the connected Expo Web build of [Symply House](https://github.com/Androkzn/symply-house) in the active project workspace. The deployment is intentionally separate from the portfolio so the source application can be tested as a real app surface and updated independently.

## Public endpoints

- Portfolio: `https://andreitekhtelev.dev/`
- Connected Web preview: `https://symply-house-web.pages.dev/?embed=portfolio-v1`
- In-site Device Lab: `iPhone` · `iPad` · `Android` · `Desktop` modes inside the portfolio workspace
- Cloudflare Pages project: `symply-house-web`
- Source commit: `caf3b0595` (`fix(web): isolate public review runtime`)

## What the reviewer can try

The preview opens directly into a deterministic Home surface. Overview, Tasks and Spaces tabs are interactive, and task completion is local to the browser session. The disclosure in the app makes the boundary explicit: no account, microphone, or production write access is used.

The portfolio also offers a separate full-preview link and an in-site Device Lab with iPhone, iPad, Android and Desktop shells. Native targets remain part of the same Expo source repository: iPhone, iPad, Android and Web. The browser runs the connected Web build inside these platform-sized shells; it does not claim to execute the closed native iOS/Android runtimes.

The host and preview use a small typed `DemoMessage` contract. The child announces `ready`, `screen`, and `stepComplete` events; the portfolio validates the fixed source origin and iframe window before accepting them, then sends an `ack`. The child accepts `hostReady` only from the portfolio origin. This keeps the demo observable without granting the embedded build production credentials or write access.

## Web compatibility boundary

The connected source uses small platform adapters for native-only modules that are reachable through the shared route graph:

- `@react-native-community/blur` → semantic `View` fallback
- `react-native-pdf` → non-document placeholder for Web-only review mode
- `react-native-fs` → safe no-op filesystem adapter
- `react-native-webrtc` → browser WebRTC globals where available, otherwise an explicit unsupported error
- Expo SQLite `.wasm` → included as a Metro asset

Native iOS and Android resolution is unchanged. The public preview flag is only enabled in the Web deployment command:

```bash
EXPO_PUBLIC_PUBLIC_PREVIEW=1 npx expo export --platform web
npx wrangler pages deploy dist --project-name symply-house-web --branch main --commit-dirty=true
```

The authenticated app path remains the default when the flag is absent. This is a review surface, not a bypass around production authentication.

## Verification checklist

- Expo Web export completes with 14 bundles and 504 assets.
- Cloudflare Pages responds with HTTP 200.
- Browser smoke check reaches `PublicHousePreviewScreen` without a login gate.
- Portfolio build and static export checks pass.
- Portfolio iframe uses a sandbox, explicit source URL and a read-only label.
- Public Web runtime smoke confirms the latest review deployment loads without the previous native auth/notification initialization paths.
