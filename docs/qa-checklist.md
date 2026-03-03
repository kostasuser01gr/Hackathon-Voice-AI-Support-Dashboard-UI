# QA Checklist

## Core

- [ ] `npm run dev` starts successfully
- [ ] Dashboard loads without errors
- [ ] Text mode processes end-to-end
- [ ] Voice mode works (or auto-falls back with warning)

## API

- [ ] `/api/health` returns diagnostics
- [ ] `/api/guardian` returns live guardian health state
- [ ] `/status` public status page renders
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
- [ ] Export modal supports signed share link + webhook relay
- [ ] Approval center saves review notes to local history

## Quality

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run eval`
- [ ] `npm run build`

## No-Regression Guardrail

- [ ] `npm run test -- tests/process-contract.test.ts`
- [ ] Confirm top-level `/api/process` keys are exactly:
  - `inputMode`, `transcript`, `summary`, `actions`, `auditTrail`, `meta`
- [ ] Confirm nested keys remain unchanged:
  - `actions`: `taskList`, `emailDraft`
  - `auditTrail[]`: `step`, `timestamp`, `details`
  - `meta`: `requestId`, `model`, `latencyMs`, `validation`, `fallbackUsed`
- [ ] Expected result:
  - contract test passes with no key removal/rename failures
