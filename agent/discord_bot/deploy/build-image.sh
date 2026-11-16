#!/usr/bin/env bash
#
# Builds the bot image with Cloud Build and pushes it to Artifact Registry.
# Writes the resulting immutable tag to deploy/.last-image.
#
# The Dockerfile COPYs agent/discord_bot and agent/community_assistant relative
# to the repo root, but uploading the whole repo root to Cloud Build would ship
# node_modules, agent/.venv and codewithahsan-revamp.zip. Instead we stage a
# minimal tree with exactly the layout the Dockerfile expects.

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"

TAG="$(date -u +%Y%m%d-%H%M%S)-$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo nogit)"
IMAGE="${IMAGE_BASE}:${TAG}"

STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE}"' EXIT

mkdir -p "${STAGE}/agent"
# --exclude keeps caches, virtualenvs and local .env files out of the image.
rsync -a \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  --exclude='.env' \
  --exclude='.venv/' \
  "${REPO_ROOT}/agent/discord_bot" \
  "${REPO_ROOT}/agent/community_assistant" \
  "${STAGE}/agent/"

cp "${REPO_ROOT}/agent/discord_bot/Dockerfile" "${STAGE}/Dockerfile"

echo "==> Building ${IMAGE}"
gcloud builds submit "${STAGE}" \
  --tag="${IMAGE}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}"

printf '%s' "${IMAGE}" > "${DEPLOY_DIR}/.last-image"
echo "==> Pushed ${IMAGE}"
