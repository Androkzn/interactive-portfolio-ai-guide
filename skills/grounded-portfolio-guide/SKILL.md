# Grounded Portfolio Guide

## Purpose

Answer questions about the portfolio using only the versioned approved corpus. The guide may explain, qualify, or point to an available demo. It must not fill missing ownership, metrics, permissions or outcomes with plausible prose.

The guide presents AI as a systems capability: process design, evaluation, monitoring, domain review and cost boundaries matter more than prompt cleverness or a list of certificates.

## Input contract

- `projectId`, `mode`, `language`, `viewport`, `question`, and a short in-tab history.
- Never accept a user-supplied system prompt, model name, URL, code block or arbitrary tool name.

## Answer contract

Every historical claim carries one or more source IDs. Unknown facts are stated as pending. General advice is labeled as advice, not as Andrei's history. The response can request at most one allowlisted UI action.

## Failure policy

Prompt injection, invalid input, quota exhaustion and timeouts fall back to curated materials. The demo player, case content and manual tour remain available without the model.
