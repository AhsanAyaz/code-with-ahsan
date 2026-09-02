#!/usr/bin/env bash
# Shared configuration for the GCE migration of cwa-assistant-bot.
# Source this from the other scripts; override any value via the environment.

PROJECT_ID="${PROJECT_ID:-code-with-ahsan-45496}"
REGION="${REGION:-us-central1}"
# Always Free e2-micro is only offered in us-west1, us-central1 and us-east1.
ZONE="${ZONE:-us-central1-a}"

VM_NAME="${VM_NAME:-cwa-assistant-bot}"
MACHINE_TYPE="${MACHINE_TYPE:-e2-micro}"
# pd-standard @ 30GB is the Always Free disk allowance; pd-balanced is billable.
BOOT_DISK_TYPE="${BOOT_DISK_TYPE:-pd-standard}"
BOOT_DISK_SIZE="${BOOT_DISK_SIZE:-30GB}"

SA_NAME="${SA_NAME:-cwa-bot-vm}"
SA_EMAIL="${SA_EMAIL:-${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com}"

AR_REPO="${AR_REPO:-cwa-docker}"
IMAGE_NAME="${IMAGE_NAME:-cwa-assistant-bot}"
IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}"

# Secrets the bot reads at start-up. Names must exist in Secret Manager.
SECRET_CWA_ASSISTANT_DISCORD_BOT_TOKEN="${SECRET_CWA_ASSISTANT_DISCORD_BOT_TOKEN:-cwa-assistant-discord-bot-token}"
SECRET_GOOGLE_API_KEY="${SECRET_GOOGLE_API_KEY:-google-api-key}"
SECRET_PLATFORM_API_BASE_URL="${SECRET_PLATFORM_API_BASE_URL:-platform-api-base-url}"
SECRET_USAGE_HASH_SECRET="${SECRET_USAGE_HASH_SECRET:-usage-hash-secret}"

# Non-secret env, mirrored from the Cloud Run revision cwa-assistant-bot-00015-bqv.
ASSISTANT_CHANNEL_ID="${ASSISTANT_CHANNEL_ID:-1504452473056792668}"

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
DEPLOY_DIR="${REPO_ROOT}/agent/discord_bot/deploy"
