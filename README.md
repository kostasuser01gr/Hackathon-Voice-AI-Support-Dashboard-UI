# voice-to-action-agent

Production-like hackathon SaaS that converts voice transcript or text input into strict structured outputs:

- transcript
- executive summary
- action items
- email draft
- audit trail
- meta diagnostics

## Live deployment proof (Google Cloud)

- Public URL (incognito): https://chatgpt-ops--hackathon-proof-x3amxlfx.web.app
- Health URL: https://chatgpt-ops--hackathon-proof-x3amxlfx.web.app/health.json

This is deployed on **Firebase Hosting** (Google Cloud).  
Cloud Run automation is included in repo (`scripts/deploy.sh`, `cloudbuild.yaml`, `.github/workflows/deploy-gcp.yml`) and can be used once billing is enabled.

## Zero to passing tests in under 10 minutes

```bash
npm install
cp .env.local.example .env.local
# set GEMINI_API_KEY in .env.local
npm run lint
npm run test
npm run eval
npm run build
npm run dev
```

Open `http://localhost:3000`.

## Tech stack

- Next.js (App Router, TypeScript)
- Tailwind CSS
- Zod
- Gemini SDK `@google/genai`
- Vitest
- Optional Postgres (`pg`) for DB history mode

## Core features

- Strict Gemini structured output with JSON Schema + server-side Zod validation
- Node runtime route handlers (`/app/api/*`) only
- Browser Web Speech API transcription with automatic text fallback
- Deterministic safety checks and quality scoring
- Request limits: body size, max chars, minute and burst rate limits
- Export center: copy/download Markdown, JSON, TXT, print to PDF
- Signed share links (`/share/[token]`)
- Webhook export relay (public HTTPS endpoints only)
- History mode:
  - `local` (default, localStorage + migrations + pin/delete)
  - `db` (Postgres sessions table)
- Settings diagnostics panel with observability counters
- Integrations page with safe dry-run background jobs
- Session intelligence card (topics/entities/open loops)
- Approval center (task/email approval + reviewer comments)
- Wave 1 APIs: approvals, compare/regenerate, open loops, metrics, integrations execute/retry
- Demo-safe deterministic fallback mode (`DEMO_SAFE_MODE=true`) for judge reliability

## Pages

- `/` dashboard
- `/history`
- `/history/[id]`
- `/history/compare`
- `/settings`
- `/integrations`
- `/actions`
- `/open-loops`
- `/share/[token]`
- `/status`

## API routes

- `POST /api/process`
- `GET /api/health`
- `GET /api/me`
- `GET /api/metrics`
- `GET /api/history` (db mode)
- `GET /api/history/[id]` (db mode)
- `GET /api/history/compare` (wave1 + db mode)
- `POST /api/history/[id]/regenerate` (wave1 + db mode)
- `GET /api/open-loops` (wave1 + db mode)
- `POST /api/sessions/[id]/approve-email` (wave1 + db mode)
- `POST /api/sessions/[id]/approve-tasks` (wave1 + db mode)
- `POST /api/sessions/[id]/comments` (wave1 + db mode)
- `GET|POST|DELETE /api/auth/session`
- `POST /api/share`
- `POST /api/export/webhook`
- `POST /api/integrations/dry-run`
- `POST /api/integrations/execute`
- `GET /api/integrations/jobs/[id]`
- `POST /api/integrations/jobs/[id]/retry`

## Structured output contract

`/api/process` returns:

```json
{
  "inputMode": "voice | text",
  "transcript": "string",
  "summary": "string",
  "actions": {
    "taskList": ["string"],
    "emailDraft": "string"
  },
  "auditTrail": [
    { "step": "capture|transcribe|extract|draft|safety_check", "timestamp": "string", "details": "string" }
  ],
  "meta": {
    "requestId": "string",
    "model": "string",
    "latencyMs": 0,
    "validation": "passed|failed",
    "fallbackUsed": false
  }
}
```

Validation path:
1. Request schema validation (Zod)
2. Gemini response schema enforcement (`responseJsonSchema`)
3. Zod response validation
4. Deterministic `safety_check`
5. Quality scoring and audit notes
6. Runtime security shield + guardian health model

## Environment variables

Required:
- `GEMINI_API_KEY`

Optional:
- `APP_BASE_URL`
- `HISTORY_MODE=local|db` (default `local`)
- `RATE_LIMIT_PER_MIN` (default `20`)
- `RATE_LIMIT_BURST_PER_10S` (default `6`)
- `MAX_INPUT_CHARS` (default `2000`)
- `PROMPT_VERSION` (default `v1`)
- `DEMO_SAFE_MODE=true|false` (default `false`)
- `FEATURE_WAVE1` (default `true`)
- `VERIFIER_POLICY=warn|repair|reject` (default `warn`)
- `INTEGRATIONS_MODE=mock|live` (default `mock`)
- `RUNTIME_STATE_MODE=memory|redis` (default `memory`)
- `REDIS_URL` (required when `RUNTIME_STATE_MODE=redis`)
- `SHARE_TOKEN_SECRET`
- `SHARE_TOKEN_TTL_MS` (default `604800000` = 7 days)
- `SHARE_TOKEN_REQUIRE_PASSWORD=true|false` (default `false`)
- `SESSION_SIGNING_SECRET` (recommended for production)
- `REQUIRE_SIGNED_SESSION_IN_PROD=true|false` (default `true`)
- `ALLOW_HEADER_SESSION_FALLBACK_IN_PROD=true|false` (default `false`)
- `MUTATION_IDEMPOTENCY_REQUIRED=true|false` (default `false`)
- `FEATURE_V2_APIS=true|false` (default `true`)
- `SECONDARY_GEMINI_MODEL`
- `GEMINI_TIMEOUT_MS` (default `10000`)
- `GEMINI_BREAKER_FAILURE_THRESHOLD` (default `5`)
- `GEMINI_BREAKER_COOLDOWN_MS` (default `30000`)
- `NEXT_PUBLIC_MAX_LOCAL_SESSIONS` (default `25`, min `5`, max `200`)
- `GUARDIAN_ENABLED=true|false` (default `true`)
- `GUARDIAN_INTERVAL_MS` (default `10000`)
- `SECURITY_BLOCK_MINUTES` (default `5`)
- `SECURITY_RISK_THRESHOLD` (default `100`)
- `DATABASE_URL` (required only when `HISTORY_MODE=db`)
- `CLOUD_TASKS_QUEUE`, `CLOUD_TASKS_LOCATION` (optional)
- `CANARY_WORKSPACE_ALLOWLIST` (comma-separated workspace IDs)

See `.env.local.example`.

## History mode: local vs db

Local:
- stores last 25 sessions
- schema versioned localStorage migration with checksum + backup recovery
- pin/delete/update review metadata

DB:
- `lib/db.ts` auto-creates and manages `sessions` table
- includes workspace and user columns
- API query support for search/mode/workspace/user

## Architecture diagram

- Repo path: `docs/architecture.png`
- Architecture write-up: `docs/architecture.md`
- Submission helper: `docs/submission-links.md`

## Deployment automation proof (bonus)

- `scripts/deploy-firebase.sh` one-command Firebase Hosting deploy (`npm run deploy:firebase`)
- `scripts/deploy.sh` one-command Cloud Run deploy
- `scripts/precheck-cloudrun.sh` billing/API/env preflight
- `scripts/release-bundle.sh` judge artifact bundle generator
- `scripts/judge-verify.sh` one-command zero-to-pass verification
- `scripts/migrate.ts` SQL migration runner (`npm run db:migrate`)
- `scripts/verify-screenshots.sh` required screenshot placeholders check
- `cloudbuild.yaml` Cloud Build pipeline deploy
- `.github/workflows/deploy-gcp.yml` GitHub Actions deploy to GCP
- `infra/main.tf` Terraform Cloud Run service

### Firebase deploy

```bash
PROJECT_ID=<your-gcp-project> npm run deploy:firebase
```

### Cloud Run deploy

```bash
PROJECT_ID=<your-gcp-project> GEMINI_API_KEY=<key> npm run deploy:gcp
```

Demo-safe fallback deploy (no live Gemini calls):

```bash
PROJECT_ID=<your-gcp-project> DEMO_SAFE_MODE=true npm run deploy:gcp
```

## Runtime guardian and attack prevention

- Background guardian loop evaluates health score continuously (status: `healthy|degraded|critical`).
- Temporary security shield blocks abusive client fingerprints on repeated malicious signals.
- Signals include malformed payload bursts, RBAC denials, repeated rate-limit abuse, and model/safety failures.
- Guardian telemetry is exposed in:
  - `GET /api/health`
  - `GET /api/metrics`
  - `GET /api/guardian`

## Docker option

```bash
npm run docker:build
docker run --rm -p 8080:8080 -e GEMINI_API_KEY=... voice-to-action-agent:local
```

## Demo script

See `docs/demo-script.md` (90-second judge flow).

## QA checklist

See `docs/qa-checklist.md`.

## Additional docs

- `docs/judge-runbook.md`
- `docs/troubleshooting.md`
- `docs/scoring-matrix.md`
- `docs/screenshot-checklist.md`

## Judging highlights

- Schema-first AI pipeline with strict contract enforcement
- Deterministic post-model safety layer and audit timeline
- Observable and reproducible: tests + eval + build + deployment automation
- Dual persistence architecture (local + db) with session replay
- Export/share/integration flows designed for safe hackathon demos

## Bonus links placeholders

- Published content URL: `TODO`
- Public GDG profile URL: `TODO`
