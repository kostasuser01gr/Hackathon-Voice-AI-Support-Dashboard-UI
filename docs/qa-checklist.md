# QA Checklist

## Core

- [ ] `npm run dev` starts successfully
- [ ] Dashboard loads without errors
- [ ] Text mode processes end-to-end
- [ ] Voice mode works (or auto-falls back with warning)

## API

- [ ] `/api/health` returns diagnostics
- [ ] `/api/process` enforces max input chars
- [ ] `/api/process` enforces rate limit
- [ ] Missing `GEMINI_API_KEY` shows clear UI banner

## Output Contract

- [ ] Response includes `inputMode`, `transcript`, `summary`, `actions`, `auditTrail`, `meta`
- [ ] Audit contains all steps
- [ ] Meta includes requestId/model/latency/validation/fallbackUsed

## History + Export

- [ ] Local mode stores and lists sessions
- [ ] `/history/[id]` opens full prefilled view
- [ ] Export modal supports copy/download for md/json/txt

## Quality

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run eval`
