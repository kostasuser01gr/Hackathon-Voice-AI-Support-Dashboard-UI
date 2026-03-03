#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${OUT_DIR:-artifacts}"
OUT_FILE="${OUT_DIR}/judge-release-bundle.txt"
OUT_JSON="${OUT_DIR}/judge-release-bundle.json"

mkdir -p "${OUT_DIR}"

commit_hash="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

{
  echo "voice-to-action-agent release bundle"
  echo "generated_at_utc=${timestamp}"
  echo "commit=${commit_hash}"
  echo ""
  echo "[public_urls]"
  echo "app=${PUBLIC_APP_URL:-TODO}"
  echo "health=${PUBLIC_HEALTH_URL:-TODO}"
  echo "status=${PUBLIC_STATUS_URL:-TODO}"
  echo ""
  echo "[diagram]"
  echo "repo_path=docs/architecture.png"
  echo "contest_upload_location=${ARCHITECTURE_UPLOAD_URL:-TODO}"
  echo ""
  echo "[screenshots]"
  find docs -maxdepth 1 -type f \
    \( -name "screenshot-*.png" -o -name "architecture.png" \) \
    -print | sort
  echo ""
  echo "[verification_commands]"
  echo "npm run lint"
  echo "npm run typecheck"
  echo "npm run test"
  echo "npm run eval"
  echo "npm run build"
  echo ""
  echo "[placeholder_links]"
  echo "published_content=${PUBLISHED_CONTENT_URL:-TODO}"
  echo "gdg_profile=${GDG_PROFILE_URL:-TODO}"
} >"${OUT_FILE}"

echo "Wrote ${OUT_FILE}"

cat >"${OUT_JSON}" <<EOF
{
  "name": "voice-to-action-agent release bundle",
  "generatedAtUtc": "${timestamp}",
  "commit": "${commit_hash}",
  "publicUrls": {
    "app": "${PUBLIC_APP_URL:-TODO}",
    "health": "${PUBLIC_HEALTH_URL:-TODO}",
    "status": "${PUBLIC_STATUS_URL:-TODO}"
  },
  "diagram": {
    "repoPath": "docs/architecture.png",
    "contestUploadLocation": "${ARCHITECTURE_UPLOAD_URL:-TODO}"
  },
  "verificationCommands": [
    "npm run lint",
    "npm run typecheck",
    "npm run test",
    "npm run eval",
    "npm run build"
  ],
  "placeholderLinks": {
    "publishedContent": "${PUBLISHED_CONTENT_URL:-TODO}",
    "gdgProfile": "${GDG_PROFILE_URL:-TODO}"
  },
  "screenshots": [
$(find docs -maxdepth 1 -type f \( -name "screenshot-*.png" -o -name "architecture.png" \) -print | sort | sed 's/.*/    "&",/' | sed '$ s/,$//')
  ]
}
EOF

echo "Wrote ${OUT_JSON}"
