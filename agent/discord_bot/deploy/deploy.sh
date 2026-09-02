#!/usr/bin/env bash
#
# Redeploy the bot: build a new image, point the VM metadata at it, restart.
# This replaces `gcloud run deploy cwa-assistant-bot`.
#
#   ./agent/discord_bot/deploy/deploy.sh

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"

"${DEPLOY_DIR}/build-image.sh"
IMAGE_TAG="$(cat "${DEPLOY_DIR}/.last-image")"

echo "==> Pointing ${VM_NAME} at ${IMAGE_TAG} (and refreshing the startup script)"
gcloud compute instances add-metadata "${VM_NAME}" \
  --zone="${ZONE}" --project="${PROJECT_ID}" \
  --metadata="bot-image=${IMAGE_TAG},assistant-channel-id=${ASSISTANT_CHANNEL_ID}" \
  --metadata-from-file="startup-script=${DEPLOY_DIR}/startup-script.sh"

# Re-running the startup script re-applies the systemd unit, launcher and Ops
# Agent config from the repo, then restarts the bot. Keeps the VM from drifting
# away from what is committed here.
echo "==> Re-applying the startup script and restarting the unit"
gcloud compute ssh "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" \
  --command 'sudo google_metadata_script_runner startup && sleep 5 && sudo systemctl is-active cwa-assistant-bot'

echo "==> Tailing logs (Ctrl-C to stop). Expect: Bot ready as CWA Assistant#NNNN"
gcloud compute ssh "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" \
  --command 'sudo journalctl -u cwa-assistant-bot -n 50 -f'
