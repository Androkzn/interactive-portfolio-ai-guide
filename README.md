# Interactive Portfolio & AI Interview Guide

The interactive portfolio of Andrei Tekhtelev. It is a static Next.js experience with three connected production Web builds and one native-only app and a curated guide fallback. The guide is intentionally independent from the app runtimes and does not require a paid AI service.

Live preview: [interactive-portfolio-ai-guide.pages.dev](https://interactive-portfolio-ai-guide.pages.dev/)

## Run locally

```bash
npm install
npm run dev
```

Build the static export:

```bash
npm run build
```

## Published projects

The portfolio currently contains House of Commons Citizen Companion, Symply Health, Symply Budget and Symply House. Their Device Lab entries load independently deployed Web builds connected to their production APIs. Authentication and account-scoped actions remain user-initiated; native iOS and Android binaries are not misrepresented as browser runtimes.

See [`documents/IMPLEMENTATION_STATUS.md`](documents/IMPLEMENTATION_STATUS.md) for requirement traceability, completed blocks and the next verification gates.

The September 16 UX refresh and live app repairs are recorded in [`documents/UX_RELEASE_QA_2026-09-16.md`](documents/UX_RELEASE_QA_2026-09-16.md), including the CORS and missing-icon-font root causes, verification results and remaining browser-test boundary.
