# voice-to-action-agent

Production-like hackathon SaaS demo built with Next.js App Router + TypeScript + Tailwind.

It converts browser voice transcript or typed text into:
- transcript
- concise executive summary
- action item list
- email draft
- audit trail timeline
- meta diagnostics (`requestId`, model, latency, validation, fallback)

## Features

- Strict structured JSON output using Gemini + JSON Schema + Zod
- Server-side-only Gemini integration (`@google/genai`)
- Deterministic safety checks for grounded output
- Rate limiting + request size and length limits
- Voice mode (Web Speech API) with auto text fallback
- Simulated voice mode for demo reliability
- Export Center (copy/download markdown, json, txt)
- History pages (`/history`, `/history/[id]`)
- Settings page with diagnostics + performance panel
- Integrations page with safe mock connectors

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Zod
- Gemini SDK: `@google/genai`
- Vitest

## Pages

- `/` main dashboard
- `/history` session list with search/filter
- `/history/[id]` prefilled detail view
- `/settings` preferences + diagnostics
- `/integrations` mock integration cards

## API Routes

- `POST /api/process`
- `GET /api/health`
- `GET /api/history` (db mode)
- `GET /api/history/[id]` (db mode)

## Environment Variables

Required:
- `GEMINI_API_KEY`

Optional:
- `APP_BASE_URL`
- `HISTORY_MODE` = `local` | `db` (default `local`)
- `RATE_LIMIT_PER_MIN` (default `20`)
- `MAX_INPUT_CHARS` (default `2000`)
- `DATABASE_URL` (required only when `HISTORY_MODE=db`)

See `.env.local.example`.

## Local Run

```bash
npm install
cp .env.local.example .env.local
# fill GEMINI_API_KEY in .env.local
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run eval
```

## Structured Output Design

1. `/api/process` validates request with Zod.
2. Gemini is called server-side with `responseJsonSchema` matching the full response contract.
3. Model JSON is validated with strict Zod schema.
4. Deterministic safety checks run on summary/tasks/email.
5. Final response includes ordered fields and meta diagnostics.

## History Mode

### Local mode (default)
- Stores latest 25 sessions in localStorage.
- Includes stable storage schema with migration handling.

### DB mode
- Uses Postgres via `lib/db.ts`.
- `sessions` table columns:
  - `id uuid pk`
  - `created_at`
  - `input_mode`
  - `transcript`
  - `summary`
  - `tasks jsonb`
  - `email_draft text`
  - `audit_trail jsonb`
  - `meta jsonb`

To enable DB mode:
1. Set `HISTORY_MODE=db`
2. Set `DATABASE_URL`
3. Start app; table is auto-created on first write

## Export Usage

From dashboard Export Center:
- Copy Markdown
- Copy JSON
- Copy Text
- Download `.md`
- Download `.json`
- Download `.txt`

## Demo Script (90s)

See `docs/demo-script.md`.

## Deployment (Vercel)

1. Push repo to GitHub.
2. Import project in Vercel.
3. Set env vars in project settings.
4. Deploy.

If using DB mode, also provision Postgres (Neon / Vercel Postgres / Supabase) and set `DATABASE_URL`.

## Judging Highlights

- Strict schema-first AI output path (model + server validation)
- Safety-focused deterministic post-processing
- Transparent audit trail and request metadata
- Robust demo UX with voice fallback and simulated mode
- Dual persistence mode architecture (local + db)

## Docs

- `docs/architecture.md`
- `docs/demo-script.md`
- `docs/qa-checklist.md`

## Screenshot Placeholders

- `docs/screenshots/dashboard-main.png`
- `docs/screenshots/history-list.png`
- `docs/screenshots/settings-diagnostics.png`
- `docs/screenshots/export-center.png`
