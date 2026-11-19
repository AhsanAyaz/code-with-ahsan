# cwa-assistant-bot — Cloud Run → GCE migration

Moves the Discord bot off Cloud Run and onto a single Always-Free-tier
`e2-micro` Compute Engine VM.

## Why

The bot holds an **outbound** Discord gateway websocket and serves no inbound
HTTP. Cloud Run therefore has to run it with `min-instances=1` and
`cpu-throttling=false` (otherwise the discord.py event loop freezes between
requests). That combination switches Cloud Run to **instance-based billing** —
you rent 1 vCPU 24/7:

| SKU                                             | Monthly          |
| ----------------------------------------------- | ---------------- |
| Cloud Run CPU, 1 vCPU × 2.63M s × $0.000018     | ~$47 (≈ 494 SEK) |
| Cloud Run memory, 0.5 GiB × 2.63M s × $0.000002 | ~$2.6            |

The Cloud Run free tier is 180,000 vCPU-seconds/month ≈ **50 hours** — about two
days. The rest bills.

CPU cannot be reduced below 1 vCPU either: fractional vCPU is only permitted
when CPU throttling is on, which is exactly what breaks the bot.

### Why the credits did not absorb it

The billing account's credit (`Marketing - GDM Hackathons`) has
**Usage scope: "Certain usage"** — a SKU-scoped credit, not a general balance.
Cloud Run CPU allocation is outside that scope, so those charges fall through to
the card even with ~60% of the credit unspent. Compute Engine SKUs are most
likely outside the scope too — budget the VM as real cash, not credit.

## Cost after migration

| SKU                                           | Monthly                                    |
| --------------------------------------------- | ------------------------------------------ |
| `e2-micro` instance (us-central1)             | $0 — Always Free, 1 instance               |
| 30GB `pd-standard` boot disk                  | $0 — Always Free allowance                 |
| **Ephemeral external IPv4**                   | **~$3.20** — _not_ waived by the free tier |
| Egress (Discord + Gemini + codewithahsan.dev) | cents                                      |

**≈ $3–4/month vs ≈ $50/month.** Not zero — the external IPv4 charge is real.
Removing it would need Cloud NAT, which costs far more (~$32/mo per gateway),
so keeping the ephemeral IP is the cheap option.

## Architecture

```
Artifact Registry  us-central1-docker.pkg.dev/<project>/cwa-docker/cwa-assistant-bot:<tag>
        │ (pull, auth via VM metadata token)
        ▼
GCE e2-micro (debian-12, us-central1-a)
  ├─ systemd unit  cwa-assistant-bot.service   Restart=always
  │    └─ /usr/local/bin/cwa-bot-run.sh
  │         ├─ fetches 4 secrets from Secret Manager → /run/cwa-bot.env (tmpfs, 0600)
  │         └─ exec docker run --log-driver=journald
  └─ Cloud Ops Agent → journald → Cloud Logging (parse_json)
```

Same container image and same `Dockerfile` as Cloud Run used. The bot code is
untouched by this migration.

**Secrets are never written to persistent disk.** They are fetched fresh on
every service start into a tmpfs file and deleted on stop.

## Files

| File                | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `config.sh`         | Shared settings; every value is env-overridable                |
| `provision-gce.sh`  | One-time setup: APIs, service account, IAM, first image, VM    |
| `build-image.sh`    | Cloud Build → Artifact Registry, from a minimal staged context |
| `deploy.sh`         | Redeploy: build → update metadata → restart unit → tail logs   |
| `startup-script.sh` | Runs on every VM boot; installs and wires everything           |

## First run

```bash
./agent/discord_bot/deploy/provision-gce.sh
```

Takes ~5 min (first boot installs Docker and the Ops Agent). Then verify:

```bash
gcloud compute ssh cwa-assistant-bot --zone=us-central1-a \
  --command 'sudo journalctl -u cwa-assistant-bot -n 50'
```

Expect `Bot ready as CWA Assistant#NNNN; listening on channel 1504452473056792668`.

Then test in Discord: `@CWA Assistant find me an Angular mentor please`.

## Redeploy (replaces `gcloud run deploy`)

```bash
./agent/discord_bot/deploy/deploy.sh
```

## Decommission Cloud Run — only after the VM is verified

Run the bot in **both** places briefly and you will get duplicate replies, so do
this as soon as the VM is confirmed working.

First scale to zero (instant, reversible, stops the billing immediately):

```bash
gcloud run services update cwa-assistant-bot --region=us-central1 --min-instances=0
```

Once you are confident, delete it (irreversible):

```bash
gcloud run services delete cwa-assistant-bot --region=us-central1
```

## Follow-ups not covered by these scripts

1. **Log-based metrics must be re-pointed.** The usage metrics in
   `../usage_metrics.py` were built against Cloud Run's
   `resource.type="cloud_run_revision"`. On the VM the resource type is
   `gce_instance`. The `jsonPayload` shape is unchanged, so only the resource
   filter in each metric needs editing.
2. **Artifact Registry is 3.0 GB** across `cloud-run-source-deploy` (2.2 GB) and
   `cwa-docker` (0.8 GB) against a 0.5 GB free allowance — that is the 2.30 SEK
   line on the invoice. Add a cleanup policy or prune old digests.
3. **Uptime alert.** Nothing currently pages if the VM dies. A log-based alert on
   the absence of `bot_message` events, or a Cloud Monitoring uptime check
   against the instance, would cover it.
