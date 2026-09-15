# Allowlisted Demo Actions

## Purpose

Give the guide a small, typed action surface without turning a chat response into arbitrary browser automation.

## Allowed actions

- `openProject(projectId)`
- `selectViewport(viewport)`
- `showEvidence(projectId, evidenceId)`
- `nextTourStep()` / `resumeTour()`
- `resetDemo(projectId)` only after an explicit user request

## Invariants

- Validate IDs against the current manifest before execution.
- Carry `sessionId`, `projectId` and `requestId` through the action.
- Ignore stale acknowledgements and commands for another project.
- Never execute JavaScript, shell commands, arbitrary URLs, DOM selectors or raw state from the model.
