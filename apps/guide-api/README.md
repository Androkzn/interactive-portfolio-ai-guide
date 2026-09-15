# Guide API

Cloudflare Worker boundary for the portfolio guide. The first slice defaults to curated mode: it validates a typed request, resolves a reviewed project, returns source IDs and optionally emits one allowlisted UI action. A Workers AI adapter exists behind `GENERATIVE_GUIDE_ENABLED=true`, but accepts a model answer only when it is short, cites a source from the same project and passes safety checks. This keeps the public portfolio usable when AI quota is unavailable.

The Worker does not accept user-controlled system prompts, model IDs, URLs, code or tool names. Request-scoped data stays inside the handler; logs contain IDs and modes, never full conversation text.

## Local checks

```bash
npx wrangler dev --config apps/guide-api/wrangler.jsonc
npm run test:worker
```

Before a production inference binding is enabled, add server-side challenge validation and keep the curated path as the quota/timeout fallback.
