# Native preview architecture

Updated: 2026-09-16

The public portfolio currently runs a deterministic Web preview. A browser cannot execute an iOS `.app` or Android APK directly, so the native experience must run on a real simulator/emulator and be streamed into the site.

## Target flow

```text
Portfolio browser
  └─ authenticated session + WebRTC/video or MJPEG stream
       └─ Cloudflare session gateway / Durable Object
            └─ outbound runner connection
                 ├─ iOS Simulator: HoC-A / Budget-A / Budget-iPad
                 └─ Android Emulator: HoC / Budget profile
```

The runner owns the native binary, screenshot/video capture and input adapter. The browser owns presentation and sends only an allowlisted input contract: tap, swipe, back, reset and terminate. No simulator shell, production credential or arbitrary command is exposed to the public client.

## Local evidence

- Xcode provides iOS 18.6 and iOS 26.5 simulator runtimes.
- Existing local profiles include `HoC-A`, `HoC-B`, `Budget-A` and `Budget-iPad`.
- `idb` is installed and supports simulator screenshots, MJPEG/H.264 streaming and coordinate-based tap/swipe actions.
- `cliclick` is available as a fallback for macOS window automation; it is not the preferred production transport.

## Release gates before enabling publicly

1. Build and install the selected HoC v2 or Symply Budget native artifact on an isolated profile.
2. Start the runner with a short-lived session token and a project allowlist.
3. Verify the stream is read-only, rate-limited and disconnected on tab/session expiry.
4. Validate taps and swipes against device-coordinate bounds; reject shell commands and arbitrary URLs.
5. Capture observability for session start, frame health, input rejection, reset and teardown.
6. Run iOS and Android smoke flows in CI or on the dedicated runner before changing the public status to `native live`.

Until these gates are complete, the portfolio deliberately labels the current four shells as Web/synthetic preview. This preserves the distinction between a responsive Web build and a real native runtime.
