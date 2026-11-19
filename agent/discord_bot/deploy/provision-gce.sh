#!/usr/bin/env bash
#
# One-time provisioning of the GCE replacement for the Cloud Run service.
# Safe to re-run: every step is create-or-skip.
#
#   ./agent/discord_bot/deploy/provision-gce.sh
#
# Does NOT touch the existing Cloud Run service. Decommission it manually
# once the VM is verified (see README).

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

say "Project ${PROJECT_ID}, zone ${ZONE}"

say "Enabling required APIs"
gcloud services enable \
  compute.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  --project="${PROJECT_ID}"

say "Service account ${SA_EMAIL}"
if ! gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="CWA Assistant Bot VM" \
    --project="${PROJECT_ID}"
else
  echo "already exists"
fi

# IAM is eventually consistent: a freshly created service account is not
# immediately visible to the policy-binding APIs, which fail with
# "Status code: 400 ... does not exist". Wait for it to propagate.
say "Waiting for the service account to propagate"
for i in $(seq 1 30); do
  if gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo "  visible after ${i}s"
    break
  fi
  sleep 1
done
sleep 10  # describe() can succeed before the binding APIs agree

# Retries a policy-binding command through the remaining propagation window.
bind_with_retry() {
  local desc="$1"; shift
  for attempt in $(seq 1 10); do
    if "$@" >/dev/null 2>&1; then
      echo "  ${desc}"
      return 0
    fi
    sleep 6
  done
  echo "  FAILED after 10 attempts: ${desc}" >&2
  "$@"  # re-run once unsuppressed so the real error is visible
  return 1
}

say "Granting per-secret accessor (least privilege, not project-wide)"
for s in \
  "${SECRET_CWA_ASSISTANT_DISCORD_BOT_TOKEN}" \
  "${SECRET_GOOGLE_API_KEY}" \
  "${SECRET_PLATFORM_API_BASE_URL}" \
  "${SECRET_USAGE_HASH_SECRET}"
do
  bind_with_retry "${s}: accessor granted" \
    gcloud secrets add-iam-policy-binding "$s" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="roles/secretmanager.secretAccessor" \
      --project="${PROJECT_ID}"
done

say "Granting logging / monitoring / Artifact Registry read"
for role in \
  roles/logging.logWriter \
  roles/monitoring.metricWriter \
  roles/artifactregistry.reader
do
  bind_with_retry "${role}" \
    gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="${role}" \
      --condition=None
done

say "Building and pushing the first image"
"${DEPLOY_DIR}/build-image.sh"
IMAGE_TAG="$(cat "${DEPLOY_DIR}/.last-image")"
echo "image: ${IMAGE_TAG}"

say "Creating VM ${VM_NAME} (${MACHINE_TYPE}, ${BOOT_DISK_TYPE} ${BOOT_DISK_SIZE})"
if gcloud compute instances describe "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "VM already exists; updating metadata instead"
  gcloud compute instances add-metadata "${VM_NAME}" \
    --zone="${ZONE}" --project="${PROJECT_ID}" \
    --metadata="bot-image=${IMAGE_TAG},assistant-channel-id=${ASSISTANT_CHANNEL_ID}" \
    --metadata-from-file="startup-script=${DEPLOY_DIR}/startup-script.sh"
else
  gcloud compute instances create "${VM_NAME}" \
    --project="${PROJECT_ID}" \
    --zone="${ZONE}" \
    --machine-type="${MACHINE_TYPE}" \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --boot-disk-type="${BOOT_DISK_TYPE}" \
    --boot-disk-size="${BOOT_DISK_SIZE}" \
    --service-account="${SA_EMAIL}" \
    --scopes="https://www.googleapis.com/auth/cloud-platform" \
    --metadata="bot-image=${IMAGE_TAG},assistant-channel-id=${ASSISTANT_CHANNEL_ID}" \
    --metadata-from-file="startup-script=${DEPLOY_DIR}/startup-script.sh" \
    --labels="app=cwa-assistant-bot,managed-by=deploy-script" \
    --tags="cwa-assistant-bot"
fi

say "Done. The VM needs ~3-4 min to install Docker + Ops Agent on first boot."
cat <<MSG

Watch the boot:
  gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} \\
    --command 'sudo journalctl -u google-startup-scripts -f'

Watch the bot (expect "Bot ready as CWA Assistant#NNNN"):
  gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} \\
    --command 'sudo journalctl -u cwa-assistant-bot -f'

MSG
