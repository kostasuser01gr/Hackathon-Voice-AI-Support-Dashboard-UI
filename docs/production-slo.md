# Production SLOs

## Scope
- Services: `POST /api/process`, integrations queue APIs, history APIs (`/api/history*`, `/api/v2/*`), share APIs.
- Environment: Cloud Run + Cloud SQL (Postgres) + Memorystore Redis + Cloud Tasks.

## Targets
1. Availability
- Monthly API availability: `99.9%`.

2. Latency
- `POST /api/process` p95 latency: `<1500ms` for normal payloads.
- `/api/v2/history` and `/api/v2/open-loops` p95: `<500ms` for standard page sizes.

3. Reliability
- API error rate (5xx): `<1.5%` monthly.
- Queue job success rate: `>99%` (completed / total jobs).

4. Recovery
- RTO: `<30 minutes`.
- RPO: `<5 minutes`.

## Error Budget Policy
- Monthly downtime budget at 99.9%: `43m 49s`.
- Burn alerts:
  - Fast burn: >10% budget consumed in 1 hour.
  - Slow burn: >25% budget consumed in 24 hours.

## Required Instrumentation
- Correlation IDs (`x-correlation-id`) on all API responses.
- Structured logs with `requestId`, `workspaceId`, `userId`, `route`, `status`, `latencyMs`.
- SLO dashboard charts:
  - Availability
  - p50/p95 latency
  - 5xx rate
  - queue success/retry/failure rate
