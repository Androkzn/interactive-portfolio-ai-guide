# Interactive Portfolio & AI Interview Guide

The first implementation slice of Andrei Tekhtelev's interactive portfolio. It is a static Next.js experience with local, seeded demos and a curated guide fallback. The guide is intentionally independent from the demo runtime and does not require a paid AI service.

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

## Current connected source

Symply House is the first connected project: [Androkzn/symply-house](https://github.com/Androkzn/symply-house). Its source matrix is recorded as iPhone, iPad, Android and Web. This portfolio currently presents a safe local Web preview; native platforms are not misrepresented as browser runtimes.

See [`documents/IMPLEMENTATION_STATUS.md`](documents/IMPLEMENTATION_STATUS.md) for requirement traceability, completed blocks and the next verification gates.
