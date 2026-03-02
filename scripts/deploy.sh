#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-voice-to-action-agent}"
PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-europe-west1}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is required."
  echo "Usage: PROJECT_ID=<gcp-project> GEMINI_API_KEY=<key> ./scripts/deploy.sh"
  exit 1
fi

if [[ -z "${GEMINI_API_KEY}" ]]; then
  echo "GEMINI_API_KEY is required."
  echo "Usage: PROJECT_ID=<gcp-project> GEMINI_API_KEY=<key> ./scripts/deploy.sh"
  exit 1
fi

gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region "${REGION}" \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY},HISTORY_MODE=local,RATE_LIMIT_PER_MIN=20,MAX_INPUT_CHARS=2000"

gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --format='value(status.url)'
