# Judge Runbook (10 Minutes)

## 1) Setup (2 minutes)
1. `npm install`
2. `cp .env.local.example .env.local`
3. Set `GEMINI_API_KEY=...` in `.env.local`
4. Keep defaults:
   - `HISTORY_MODE=local`
   - `INTEGRATIONS_MODE=mock`
   - `FEATURE_WAVE1=true`
5. Optional judge-stable mode:
   - `DEMO_SAFE_MODE=true` (allows processing even if Gemini key is unavailable)
6. Optional auth hardening:
   - `SESSION_SIGNING_SECRET=...` to enable signed session cookies

## 2) Verify quality gates (3 minutes)
1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
   - Includes `/api/process` contract snapshot guard
4. `npm run eval`
5. `npm run build`
6. `npm run scan`
7. Optional one-command check: `npm run judge:verify`

## 3) Run app (2 minutes)
1. `npm run dev`
2. Open `http://localhost:3000`
3. Confirm banner is green if Gemini key is present.

## 4) Core demo flow (3 minutes)
1. Click `Try sample script`.
2. Click `Process`.
3. Confirm right column renders:
   - Summary
   - Tasks
   - Email Draft
   - Audit Trail (`capture`, `transcribe`, `extract`, `draft`, `safety_check`)
4. Open Export Center:
   - Copy Markdown/JSON
   - Download `.md`, `.json`, `.txt`
5. Open `/history` and open a session detail.
6. Open `/api/guardian` to view real-time guardian status.

## Optional Wave 1 checks
1. Open `/actions` and verify pending/approved/executed filters.
2. Open `/integrations`, run `Dry-run only`, then retry latest job.
3. Open `/open-loops` and `/history/compare`.
4. Open `/status` and `/api/metrics` for diagnostics.
