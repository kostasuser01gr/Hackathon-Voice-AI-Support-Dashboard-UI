#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-voice-to-action-agent}"
PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-europe-west1}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
DEMO_SAFE_MODE="${DEMO_SAFE_MODE:-false}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is required."
  echo "Usage: PROJECT_ID=<gcp-project> GEMINI_API_KEY=<key> ./scripts/deploy.sh"
  exit 1
fi

if [[ -z "${GEMINI_API_KEY}" && "${DEMO_SAFE_MODE}" != "true" ]]; then
  echo "GEMINI_API_KEY is required unless DEMO_SAFE_MODE=true."
  echo "Usage: PROJECT_ID=<gcp-project> GEMINI_API_KEY=<key> ./scripts/deploy.sh"
  echo "   or: PROJECT_ID=<gcp-project> DEMO_SAFE_MODE=true ./scripts/deploy.sh"
  exit 1
fi

gcloud config set project "${PROJECT_ID}" >/dev/null

billing_enabled="$(gcloud billing projects describe "${PROJECT_ID}" --format='value(billingEnabled)' 2>/dev/null || echo false)"
if [[ "${billing_enabled}" != "True" && "${billing_enabled}" != "true" ]]; then
  echo "Billing is disabled for ${PROJECT_ID}. Cloud Run deployment requires billing."
  echo "Enable billing first, then rerun deploy."
  exit 1
fi

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

effective_gemini_key="${GEMINI_API_KEY}"
if [[ -z "${effective_gemini_key}" ]]; then
  effective_gemini_key="placeholder-demo-safe-key"
fi

gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region "${REGION}" \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=${effective_gemini_key},DEMO_SAFE_MODE=${DEMO_SAFE_MODE},HISTORY_MODE=local,RATE_LIMIT_PER_MIN=20,MAX_INPUT_CHARS=2000"

gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --format='value(status.url)'
