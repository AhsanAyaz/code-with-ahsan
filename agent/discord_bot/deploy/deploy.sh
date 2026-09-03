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

# Bounded readiness check rather than `journalctl -f`, which never returns and
# so cannot be used in a script or from CI.
echo "==> Waiting for the gateway handshake (up to 3 min)"
gcloud compute ssh "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" --quiet \
  --command '
    for i in $(seq 1 36); do
      if sudo journalctl -u cwa-assistant-bot --since "-5 min" | grep -q "Bot ready as"; then
        sudo journalctl -u cwa-assistant-bot --since "-5 min" | grep "Bot ready as" | tail -1
        exit 0
      fi
      sleep 5
    done
    echo "TIMED OUT waiting for \"Bot ready as\". Recent logs:" >&2
    sudo journalctl -u cwa-assistant-bot -n 40 --no-pager >&2
    exit 1
  '

echo "==> Deployed ${IMAGE_TAG}"
