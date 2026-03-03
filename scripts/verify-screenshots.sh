#!/usr/bin/env bash
set -euo pipefail

required=(
  "docs/architecture.png"
  "docs/screenshot-dashboard.png"
  "docs/screenshot-history.png"
  "docs/screenshot-session-detail.png"
  "docs/screenshot-settings.png"
  "docs/screenshot-integrations.png"
  "docs/screenshot-actions.png"
  "docs/screenshot-status.png"
)

missing=0
for file in "${required[@]}"; do
  if [[ -f "${file}" ]]; then
    echo "[ok] ${file}"
  else
    echo "[missing] ${file}"
    missing=1
  fi
done

if [[ "${missing}" -ne 0 ]]; then
  echo "Screenshot verification failed."
  exit 1
fi

echo "Screenshot verification passed."

