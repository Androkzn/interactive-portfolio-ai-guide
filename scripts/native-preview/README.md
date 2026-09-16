# Native preview runner

This folder is reserved for the self-hosted native preview runner used by the portfolio. It is intentionally separate from the Next.js static site: native simulators need macOS/Android host capabilities that Cloudflare Pages does not provide.

The runner contract should expose only:

- `GET /health` — runner and simulator readiness;
- `GET /stream` — authenticated read-only screen stream;
- `POST /input` — allowlisted `{ type: "tap" | "swipe" | "back" | "reset", ... }` events;
- `POST /session/close` — deterministic teardown.

The production transport should use a short-lived session token, an outbound connection to the Cloudflare gateway, origin validation, per-session rate limits and automatic simulator cleanup. Do not expose `xcrun`, `adb`, shell commands, simulator UDIDs or credentials to the browser.

Local capability checks:

```sh
xcrun simctl list devices available
idb list-targets
idb video-stream --format mjpeg --udid <UDID>
idb ui tap --udid <UDID> <x> <y>
```

The runner is not enabled by default until both selected projects have reproducible native install/build commands and a dedicated public host is provisioned.
