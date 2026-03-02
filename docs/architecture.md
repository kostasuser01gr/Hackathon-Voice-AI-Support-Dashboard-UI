# Architecture

## High-Level Flow

```text
Browser UI (Web Speech API + Text Fallback)
        |
        | POST /api/process
        v
Next.js Route Handler (/app/api/process)
  - request validation (Zod)
  - request size + rate limit checks
  - transcript normalization
  - Gemini structured output call (@google/genai)
  - deterministic safety_check
  - response shaping + meta
        |
        v
Structured JSON Response
        |
        +--> Local history store (localStorage, default)
        |
        +--> DB history write (when HISTORY_MODE=db)
```

## Components

- `components/voice-action-dashboard.tsx`
- `app/history/*`
- `app/settings/page.tsx`
- `app/integrations/page.tsx`

## Server Modules

- `lib/schema.ts` strict output contract + JSON schema
- `lib/gemini.ts` server-only model call wrapper
- `lib/safety.ts` deterministic groundedness checks
- `lib/rateLimit.ts` in-memory IP limiter
- `lib/db.ts` postgres abstraction for db mode
- `lib/history.ts` local mode storage and migrations

## Notes

- All Gemini calls are server-side only.
- API key is never sent to the browser.
- Structured output is schema-enforced at model and server layers.
