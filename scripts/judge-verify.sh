#!/usr/bin/env bash
set -euo pipefail

echo "==> voice-to-action-agent judge verification"

if [[ ! -f ".env.local" ]]; then
  echo "warning: .env.local is missing (copy from .env.local.example)."
fi

echo ""
echo "==> lint"
npm run lint

echo ""
echo "==> typecheck"
npm run typecheck

echo ""
echo "==> tests"
npm run test

echo ""
echo "==> eval"
npm run eval

echo ""
echo "==> build"
npm run build

echo ""
echo "==> screenshot checklist"
npm run verify:screenshots

echo ""
echo "Judge verification completed successfully."

