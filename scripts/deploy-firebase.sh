#!/usr/bin/env bash
set -euo pipefail

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI not found. Install with: npm i -g firebase-tools" >&2
  exit 1
fi

PROJECT_ID="${PROJECT_ID:-}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is required. Example:" >&2
  echo "  PROJECT_ID=my-gcp-project ./scripts/deploy-firebase.sh" >&2
  exit 1
fi

echo "Deploying Firebase Hosting to project: ${PROJECT_ID}"
firebase deploy --only hosting --project "${PROJECT_ID}"

echo "Firebase deploy completed."
