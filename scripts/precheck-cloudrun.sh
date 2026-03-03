#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-europe-west1}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is required."
  echo "Usage: PROJECT_ID=<gcp-project> REGION=<region> ./scripts/precheck-cloudrun.sh"
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI is not installed."
  exit 1
fi

echo "Using project: ${PROJECT_ID}"
echo "Using region: ${REGION}"

gcloud config set project "${PROJECT_ID}" >/dev/null

echo ""
echo "Checking billing..."
if ! gcloud billing projects describe "${PROJECT_ID}" >/tmp/voice_action_billing.json 2>/dev/null; then
  echo "Could not read billing status. Ensure IAM permissions: billing.resourceAssociations.list"
  exit 1
fi
cat /tmp/voice_action_billing.json

echo ""
echo "Checking required APIs..."
for api in run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com; do
  if gcloud services list --enabled --filter="name:${api}" --format="value(name)" | grep -q "${api}"; then
    echo "  [ok] ${api}"
  else
    echo "  [missing] ${api} (enable with: gcloud services enable ${api})"
  fi
done

echo ""
echo "Checking local env vars..."
required_env=("GEMINI_API_KEY")
optional_env=("APP_BASE_URL" "HISTORY_MODE" "RATE_LIMIT_PER_MIN" "MAX_INPUT_CHARS")

for name in "${required_env[@]}"; do
  if [[ -n "${!name:-}" ]]; then
    echo "  [ok] ${name} is set in current shell"
  else
    echo "  [missing] ${name}"
  fi
done

for name in "${optional_env[@]}"; do
  if [[ -n "${!name:-}" ]]; then
    echo "  [set] ${name}=${!name}"
  else
    echo "  [default] ${name} not set"
  fi
done

echo ""
echo "Precheck complete."

