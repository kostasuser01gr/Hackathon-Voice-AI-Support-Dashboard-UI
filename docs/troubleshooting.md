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

## Deployment precheck fails
- Run:
  - `PROJECT_ID=<your-project> ./scripts/precheck-cloudrun.sh`
- Ensure:
  - billing is enabled
  - required APIs are enabled
  - required env vars are set

