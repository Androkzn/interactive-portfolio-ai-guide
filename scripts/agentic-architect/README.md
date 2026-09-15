# Agentic architect scripts

These scripts make the AI approach inspectable in a public repository. They are intentionally small and deterministic: the model is replaceable, while contracts, grounding, action boundaries and evals stay stable.

```bash
npm run content:validate
npm run eval:grounding
```

The scripts never print secrets and do not call external services. They are the offline gate that should run before enabling a live Workers AI adapter.
