# Incident Severity Matrix

## Sev 1
- Customer-facing outage for core processing (`/api/process`) or queue execution.
- Data integrity risk across multiple workspaces.
- Broad authz/security bypass confirmed.

### Response
- Page on-call immediately.
- Incident commander assigned within 5 minutes.
- Status update every 15 minutes.
- Target mitigation start: <15 minutes.

## Sev 2
- Partial degradation: high 5xx or p95 breach with service still available.
- Isolated workspace-level failures impacting critical workflows.
- Cloud Tasks/Redis/DB degradation with fallback still working.

### Response
- On-call acknowledges within 15 minutes.
- Status update every 30 minutes.
- Mitigation plan within 30 minutes.

## Sev 3
- Non-critical feature failure (for example, share revoke endpoint or optional v2 stream).
- Elevated retries but no user-visible outage.

### Response
- Triage in business hours.
- Fix in next patch window.

## Sev 4
- Cosmetic issues, docs drift, low-risk operational warnings.

### Response
- Backlog and schedule during routine maintenance.

## Escalation Triggers
- Any Sev 2 lasting >60 minutes auto-escalates to Sev 1.
- Any incident with potential data leak becomes Sev 1 immediately.
