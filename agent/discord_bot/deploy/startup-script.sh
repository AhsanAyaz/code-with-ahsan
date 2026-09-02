#!/usr/bin/env bash
#
# GCE startup script for the cwa-assistant-bot VM.
#
# Runs on every boot, so every step is idempotent. It:
#   1. adds swap (e2-micro has only 1GB RAM),
#   2. installs Docker and the Cloud Ops Agent,
#   3. installs the secret-fetching launcher + systemd unit,
#   4. starts the bot.
#
# The image tag to run is read from the instance metadata key `bot-image`,
# so a redeploy is: update metadata -> restart the unit. No VM rebuild.

set -euo pipefail
exec > >(logger -t cwa-startup -s 2>/dev/console) 2>&1

echo "=== cwa-assistant-bot startup script begin ==="

meta() {
  curl -fsS -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/$1"
}

PROJECT_ID="$(meta project/project-id)"
BOT_IMAGE="$(meta instance/attributes/bot-image)"
ASSISTANT_CHANNEL_ID="$(meta instance/attributes/assistant-channel-id)"

echo "project=${PROJECT_ID} image=${BOT_IMAGE}"

# ---------------------------------------------------------------- swap ------
# 1GB of RAM is enough for the bot but leaves no headroom for Docker pulls and
# the Ops Agent at the same time. 2GB of swap makes the box survive a pull.
if [[ ! -f /swapfile ]]; then
  echo "creating 2G swapfile"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
swapon --show | grep -q '/swapfile' || swapon /swapfile

# -------------------------------------------------------------- docker ------
if ! command -v docker >/dev/null 2>&1; then
  echo "installing docker.io"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y --no-install-recommends docker.io ca-certificates curl python3
fi
systemctl enable --now docker

# ----------------------------------------------------------- ops agent ------
# Ships the bot's structured stdout to Cloud Logging so the usage log-based
# metrics keep working (they must be re-pointed at gce_instance, see README).
if ! systemctl list-unit-files | grep -q '^google-cloud-ops-agent'; then
  echo "installing Cloud Ops Agent"
  curl -fsSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
  bash add-google-cloud-ops-agent-repo.sh --also-install
  rm -f add-google-cloud-ops-agent-repo.sh
fi

install -d -m 0755 /etc/google-cloud-ops-agent
cat > /etc/google-cloud-ops-agent/config.yaml <<'OPSCFG'
logging:
  receivers:
    journal:
      type: systemd_journald
  processors:
    # The bot emits one JSON object per handled message (see usage_metrics.py).
    # parse_json promotes those into jsonPayload; plain-text lines from other
    # units pass through untouched as textPayload.
    json:
      type: parse_json
  service:
    pipelines:
      default_pipeline:
        receivers: [journal]
        processors: [json]
OPSCFG
systemctl restart google-cloud-ops-agent

# ------------------------------------------------------------- launcher -----
# Fetches secrets fresh on every (re)start using the VM service account token
# from the metadata server, writes them to a 0600 file on tmpfs, and execs
# the container. Nothing is persisted to disk.
cat > /usr/local/bin/cwa-bot-run.sh <<'LAUNCHER'
#!/usr/bin/env bash
set -euo pipefail

meta() {
  curl -fsS -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/$1"
}

PROJECT_ID="$(meta project/project-id)"
BOT_IMAGE="$(meta instance/attributes/bot-image)"
ASSISTANT_CHANNEL_ID="$(meta instance/attributes/assistant-channel-id)"

TOKEN="$(meta 'instance/service-accounts/default/token' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')"

secret() {
  curl -fsS -H "Authorization: Bearer ${TOKEN}" \
    "https://secretmanager.googleapis.com/v1/projects/${PROJECT_ID}/secrets/$1/versions/latest:access" \
  | python3 -c 'import sys,json,base64; print(base64.b64decode(json.load(sys.stdin)["payload"]["data"]).decode().strip(), end="")'
}

ENV_FILE=/run/cwa-bot.env
umask 077
: > "${ENV_FILE}"
{
  echo "ASSISTANT_CHANNEL_ID=${ASSISTANT_CHANNEL_ID}"
  echo "GOOGLE_GENAI_USE_VERTEXAI=FALSE"
  echo "PYTHONUNBUFFERED=1"
  echo "CWA_ASSISTANT_DISCORD_BOT_TOKEN=$(secret cwa-assistant-discord-bot-token)"
  echo "GOOGLE_API_KEY=$(secret google-api-key)"
  echo "PLATFORM_API_BASE_URL=$(secret platform-api-base-url)"
  echo "USAGE_HASH_SECRET=$(secret usage-hash-secret)"
} > "${ENV_FILE}"

# Artifact Registry pull auth via the same metadata token.
echo "${TOKEN}" | docker login -u oauth2accesstoken --password-stdin \
  "$(echo "${BOT_IMAGE}" | cut -d/ -f1)"

docker pull "${BOT_IMAGE}"

exec docker run --rm --name cwa-assistant-bot \
  --env-file "${ENV_FILE}" \
  --memory=512m \
  --log-driver=journald --log-opt tag=cwa-assistant-bot \
  "${BOT_IMAGE}"
LAUNCHER
chmod 0755 /usr/local/bin/cwa-bot-run.sh

# --------------------------------------------------------------- systemd ----
cat > /etc/systemd/system/cwa-assistant-bot.service <<'UNIT'
[Unit]
Description=CWA Assistant Discord Bot (Google ADK)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=exec
ExecStartPre=-/usr/bin/docker rm -f cwa-assistant-bot
ExecStart=/usr/local/bin/cwa-bot-run.sh
ExecStopPost=-/bin/rm -f /run/cwa-bot.env
# The container already reaches journald via `docker run --log-driver=journald`.
# Letting `docker run`'s attached stdout ALSO inherit the journal would log every
# line twice (and double the Cloud Logging bill), so discard it here. stderr is
# kept so launcher failures (secret fetch, AR login, pull) are still visible.
StandardOutput=null
StandardError=journal
Restart=always
RestartSec=10
TimeoutStopSec=30
SyslogIdentifier=cwa-assistant-bot

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable cwa-assistant-bot.service
systemctl restart cwa-assistant-bot.service

echo "=== cwa-assistant-bot startup script done ==="
