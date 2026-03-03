# Troubleshooting

## GEMINI_API_KEY missing
- Symptom: dashboard shows error banner and Process is disabled.
- Fix:
  1. Add `GEMINI_API_KEY` to `.env.local`
  2. Restart `npm run dev`

## Rate limited on `/api/process`
- Symptom: `429 RATE_LIMITED`
- Fix:
  1. Wait for the retry window
  2. Increase `RATE_LIMIT_PER_MIN` and/or `RATE_LIMIT_BURST_PER_10S` in `.env.local`

## Voice capture unsupported
- Symptom: mic controls disabled or permission denied.
- Fix:
  1. Use `Text fallback`
  2. Use `Simulated voice mode` for demo reliability

## DB mode errors
- Symptom: history endpoints return `HISTORY_MODE_LOCAL` or DB connectivity failures.
- Fix:
  1. Set `HISTORY_MODE=db`
  2. Set valid `DATABASE_URL`
  3. Re-run app

## Wave 1 endpoint disabled
- Symptom: new routes return `FEATURE_DISABLED`
- Fix:
  1. Set `FEATURE_WAVE1=true`
  2. Restart app

## Integrations execute blocked
- Symptom: `APPROVAL_REQUIRED`
- Fix:
  1. Approve tasks and email for the target session
  2. Retry `/api/integrations/execute` with same session id

## Live integrations require dry-run acknowledgement
- Symptom: `DRY_RUN_REQUIRED`
- Fix:
  1. Keep `INTEGRATIONS_MODE=mock` for demo runs, or
  2. In live mode send `payload.dryRunAcknowledged=true` after reviewing dry-run output

## Session signing mismatch
- Symptom: authenticated APIs act as viewer/default unexpectedly in production.
- Fix:
  1. Set `SESSION_SIGNING_SECRET` consistently across all deployments
  2. Clear browser cookies for the app domain and re-sync session
  3. Re-run `/api/me` and verify `authSource` response

## Security shield blocked requests
- Symptom: `/api/process` returns `403 SECURITY_BLOCKED`.
- Fix:
  1. Wait for `SECURITY_BLOCK_MINUTES` window to expire
  2. Reduce malformed retries / RBAC failures from the same client fingerprint
  3. Tune `SECURITY_RISK_THRESHOLD` for your environment

## Guardian degraded/critical
- Symptom: `/api/health` guardian status is `degraded` or `critical`.
- Fix:
  1. Check `/api/metrics` for success-rate and p95 latency pressure
  2. Reduce request bursts or raise capacity
  3. Temporarily set `VERIFIER_POLICY=reject` during abusive traffic

## Local port conflict
- Symptom: `npm run dev` fails because port 3000 is in use.
- Fix:
  1. `lsof -nP -iTCP:3000 -sTCP:LISTEN`
  2. Stop the conflicting process or run `PORT=3001 npm run dev`

## Deployment precheck fails
- Run:
  - `PROJECT_ID=<your-project> ./scripts/precheck-cloudrun.sh`
- Ensure:
  - billing is enabled
  - required APIs are enabled
  - required env vars are set
