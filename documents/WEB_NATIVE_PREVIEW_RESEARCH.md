# Web and native preview research

Updated: 2026-09-16

## Decision

There are three different products that are easy to confuse:

1. A responsive Web build of a cross-platform application.
2. A virtual iOS/Android device streamed into a browser.
3. A real physical device streamed into a browser.

The portfolio now uses (1) for all three source projects. It will use (2), or a managed service that provides (2), for the public native preview. It will not call a CSS device shell “native”.

## What the platform vendors support

- Apple documents Simulator as a Mac-hosted runtime. It is useful for interaction and debugging, but Apple explicitly says it does not reproduce the performance or all features of physical devices. See [Running your app on simulated or physical devices](https://developer.apple.com/documentation/Xcode/running-your-app-on-simulated-or-physical-devices).
- Android Emulator is a virtual device that runs on a development computer and can be started from the command line. Android recommends testing on physical devices as well, and points to Firebase Test Lab for hosted device coverage. See [Android Emulator](https://developer.android.com/studio/run/emulator) and [Run apps on a hardware device](https://developer.android.com/studio/run/device).
- Expo’s current Web path is universal Metro. Expo documents `npx expo export --platform web`, platform-aware Metro resolution, and the WASM/header requirements for `expo-sqlite`. See [Expo Metro](https://docs.expo.dev/guides/customizing-metro/) and [Expo SQLite Web setup](https://docs.expo.dev/versions/latest/sdk/sqlite/#web-setup).

## Practical options

| Option | What the employer experiences | Strength | Limitation | Portfolio decision |
| --- | --- | --- | --- | --- |
| Expo/React Native Web | The shared application code rendered as Web | Fast, public, low operational cost | Native APIs and platform performance are not represented | Enabled now for House, HoC and Budget |
| Appetize embed | A real virtual iOS/Android app in an iframe | Purpose-built browser streaming, iframe embed and JavaScript session control | Requires app uploads, build IDs and a paid/managed service boundary | Preferred first native-runtime integration |
| Self-hosted runners | Our own Mac iOS Simulator and Android Emulator streamed through a gateway | Maximum control, strongest architecture story | Mac capacity, licensing, WebRTC/input security, session isolation and operations | Second phase after public Web previews |
| Firebase Test Lab | Cloud device test execution and artifacts | Excellent matrix testing on hosted Android/iOS devices | Primarily test execution/results, not a low-latency public interactive preview | CI verification, not the portfolio player |

Appetize documents both iframe embedding and a JavaScript SDK that can start/configure sessions. See [Appetize embedding](https://docs.appetize.io/platform/embedding-apps), [Appetize JavaScript SDK](https://docs.appetize.io/javascript-sdk) and [configuration](https://docs.appetize.io/javascript-sdk/configuration). Firebase documents hosted real-device testing for iOS and Android, but its model is a test matrix rather than an always-on public demo. See [Firebase Test Lab](https://firebase.google.com/docs/test-lab).

## Recommended production architecture

```text
Portfolio UI
  ├─ Web preview adapter → deployed Expo/Vite Web build in sandboxed iframe
  └─ Native preview adapter → Appetize or self-hosted device gateway
                                  ├─ iOS Simulator on isolated macOS runner
                                  └─ Android Emulator on isolated runner
```

The native adapter should receive only an allowlisted session contract: `start`, `tap`, `swipe`, `back`, `reset` and `terminate`. It should never expose shell commands, arbitrary URLs, production credentials or a persistent device. Sessions need short-lived tokens, per-project build allowlists, inactivity expiry, origin checks, rate limits and structured telemetry for frame health, input rejection and teardown.

## Why the current implementation is honest

The portfolio’s four visual shells are presentation chrome around a real Web runtime. This makes the source applications available online today without claiming that a browser is executing an iOS `.app` or Android APK. Native streaming is a separate adapter and release gate, not a hidden approximation.

## Next native milestone

1. Produce public-review iOS and Android artifacts with accounts, secrets and production writes disabled.
2. Upload them to Appetize and receive stable build IDs, or provision isolated macOS/Android runners.
3. Implement the native adapter behind a feature flag and keep Web fallback available.
4. Add Playwright/CUA smoke checks for start, input, reset and teardown, plus Firebase Test Lab matrices for release verification.
5. Change the UI label from `Web` to `Native live` only after those checks pass.
