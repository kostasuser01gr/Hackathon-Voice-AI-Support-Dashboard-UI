# Security Baseline

## Identity and Session
1. Signed session cookies are required in production.
2. Header-based session fallback is disabled in production by default.
3. RBAC is enforced for every protected route (`owner/admin/agent/viewer`).
4. Workspace membership checks are applied when DB history mode is enabled.

## API Safety Controls
1. Request schema validation with Zod on all mutation endpoints.
2. Idempotency support for mutation routes via `Idempotency-Key`.
3. Request size limits and rate limiting are always enabled.
4. Runtime security shield blocks abusive clients temporarily.

## Secrets and Data
1. API keys and signing secrets are server-only.
2. Share links use signed tokens with default 7-day TTL.
3. Share tokens support revocation and optional password.
4. PII redaction path is available and configurable.

## Infrastructure
1. Managed Postgres (Cloud SQL) is required for production history/job durability.
2. Managed Redis (Memorystore) is required for shared runtime state at scale.
3. Cloud Tasks is the default async execution mechanism for integration jobs.
4. TLS is mandatory for all external communication.

## Observability and Audit
1. Structured logs include `requestId`, `workspaceId`, `userId`, and route.
2. Health/metrics endpoints expose guardian and reliability diagnostics.
3. Approval and execution events are persisted in DB for audit trails.

## Hardening Checklist
- `SESSION_SIGNING_SECRET` set in production.
- `SHARE_TOKEN_SECRET` set in production.
- `REQUIRE_SIGNED_SESSION_IN_PROD=true`.
- `ALLOW_HEADER_SESSION_FALLBACK_IN_PROD=false`.
- `HISTORY_MODE=db`.
- `RUNTIME_STATE_MODE=redis` with `REDIS_URL` configured.
