# Symply House Web integration

Updated: 2026-09-15

The portfolio embeds the connected Expo Web build of [Symply House](https://github.com/Androkzn/symply-house) in the active project workspace. The deployment is intentionally separate from the portfolio so the source application can be tested as a real app surface and updated independently.

## Public endpoints

- Portfolio: `https://andreitekhtelev.dev/`
- Connected Web preview: `https://symply-house-web.pages.dev/?embed=portfolio-v1`
- Cloudflare Pages project: `symply-house-web`
- Source commit: `9e1c739df` (`feat(web): add safe public Home preview`)

## What the reviewer can try

The preview opens directly into a deterministic Home surface. Overview, Tasks and Spaces tabs are interactive, and task completion is local to the browser session. The disclosure in the app makes the boundary explicit: no account, microphone, or production write access is used.

The portfolio also offers a separate full-preview link and responsive phone/tablet/desktop viewport controls. Native targets remain part of the same Expo source repository: iPhone, iPad, Android and Web. Native builds are not represented as if they run inside an iframe.

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
