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

## Published projects

The portfolio currently contains [House of Commons Citizen Companion](https://github.com/Androkzn/hocv2), [Symply Budget](https://github.com/Androkzn/symply-budget) and [Symply House](https://github.com/Androkzn/symply-house). Their Device Lab previews are seeded and local. They show the interaction contract inside the site; native iOS and Android binaries are not misrepresented as browser runtimes.

See [`documents/IMPLEMENTATION_STATUS.md`](documents/IMPLEMENTATION_STATUS.md) for requirement traceability, completed blocks and the next verification gates.
