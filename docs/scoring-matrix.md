# Scoring Matrix Mapping

## Product Completeness
- Strict process pipeline with transcript, summary, tasks, email draft, audit trail, meta.
- Judge-facing SaaS UI with dashboard, history, settings, integrations, actions, status.

## Google AI Usage
- Gemini structured output via `@google/genai` with JSON schema.
- Server-side only model calls; no API key leakage.

## Reliability and Safety
- Zod request/response validation.
- Deterministic safety check + grounding verifier policy (`warn|repair|reject`).
- Rate limiting and payload size limits.
- Cookie-first session identity with signed-cookie support and proxy fallback controls.
- Runtime guardian + security shield for live risk scoring and temporary abuse blocking.

## Engineering Quality
- TypeScript + ESLint + tests + eval harness.
- `/api/process` contract snapshot test prevents key-order/schema drift.
- CI pipeline includes lint, typecheck, test, eval, build.
- Observability counters and latency percentiles via `/api/metrics`.

## Cloud Readiness
- Firebase Hosting public proof.
- Cloud Run deploy script + Cloud Build + GitHub Actions.
- Cloud Run precheck script and release artifact bundling.

## Judge Experience
- `docs/judge-runbook.md` for zero-to-pass path.
- Export center, share links, status and health pages.
- Architecture diagram path in repo: `docs/architecture.png`.
