# CWA Assistant Discord Bot

discord.py bridge to the ADK community_assistant agent.

## Architecture

- **In-process Runner**: this bot embeds `google.adk.runners.Runner` directly. There is NO separate FastAPI agent service. The bot.py process holds both the Discord gateway websocket AND the agent execution loop.
- **Single channel, @mention only**: the bot only responds to @mentions in `ASSISTANT_CHANNEL_ID`.
- **Per-user sessions**: each Discord user_id maps to one `InMemorySessionService` session for the lifetime of the container.

## Local development

1. Install runtime deps in the agent virtualenv:
   ```bash
   cd agent
   uv pip install "discord.py>=2.7.1" "google-auth>=2.0.0"
   ```
   (`google-adk`, `python-dotenv`, `httpx` are already in pyproject.toml.)

2. Create `agent/discord_bot/.env` from `.env.example` and fill in:
   - `CWA_ASSISTANT_DISCORD_BOT_TOKEN` — from Discord Developer Portal → CWA Assistant → Bot
   - `ASSISTANT_CHANNEL_ID` — right-click your test channel → Copy Channel ID
   - `GOOGLE_API_KEY` — Gemini API key
   - `PLATFORM_API_BASE_URL` — `http://localhost:3000` for local dev, `https://codewithahsan.dev` for prod

3. Make sure `npm run dev` is running (the bot's tools call the Next.js API).

4. Run the bot:
   ```bash
   cd agent
   uv run python discord_bot/bot.py
   ```
   Expected: `Bot ready as CWA Assistant#NNNN; listening on channel ...`

5. In Discord, in your test channel: `@CWA Assistant Find me a mentor who knows Angular`
   Expected: typing indicator, then a reply with mentor results and clickable URLs.

## Deploy to Cloud Run

**IMPORTANT: Build context is the repo root.** The Dockerfile copies `agent/discord_bot/` and `agent/community_assistant/` — both paths are relative to the repo root. Run all deploy commands from the repo root (`/home/ahsan/projects/code-with-ahsan`), NOT from `agent/discord_bot/`.

From the repo root:

```bash
gcloud run deploy cwa-assistant-bot \
  --source=. \
  --dockerfile=agent/discord_bot/Dockerfile \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=1 \
  --cpu=1 \
  --memory=512Mi \
  --timeout=3600 \
  --no-allow-unauthenticated \
  --set-secrets="CWA_ASSISTANT_DISCORD_BOT_TOKEN=cwa-assistant-discord-bot-token:latest,GOOGLE_API_KEY=google-api-key:latest,PLATFORM_API_BASE_URL=platform-api-base-url:latest" \
  --set-env-vars="ASSISTANT_CHANNEL_ID=<paste channel id>" \
  --project=$GOOGLE_CLOUD_PROJECT
```

**Why these flags:**
- `--min-instances=1` keeps the gateway websocket alive (prevents gateway disconnect on idle)
- `--max-instances=1` prevents session-splitting across instances (one session store per container)
- `--timeout=3600` is the Cloud Run max; discord.py handles reconnection within the connection lifecycle
- `--no-allow-unauthenticated` because the bot has no inbound HTTP — it doesn't need public ingress

**After first deploy, also run:**
```bash
gcloud run services update cwa-assistant-bot --region=us-central1 --no-cpu-throttling
```
Without this, Cloud Run throttles CPU when no HTTP requests are active, which freezes the Discord event loop.

### Secret Manager setup (one-time, before first deploy)

```bash
echo -n "$CWA_ASSISTANT_DISCORD_BOT_TOKEN" | gcloud secrets create cwa-assistant-discord-bot-token --data-file=- --replication-policy=automatic
echo -n "$GOOGLE_API_KEY" | gcloud secrets create google-api-key --data-file=- --replication-policy=automatic
echo -n "https://codewithahsan.dev" | gcloud secrets create platform-api-base-url --data-file=- --replication-policy=automatic
```

If a secret already exists: `gcloud secrets versions add <name> --data-file=-`

### Verify deployment

```bash
# Check service health
gcloud run services describe cwa-assistant-bot --region=us-central1 --format="value(status.url, status.conditions[0].status)"

# Tail logs (look for "Bot ready as CWA Assistant")
gcloud run services logs tail cwa-assistant-bot --region=us-central1
```

### Update channel ID (e.g. switch from test → production channel)

```bash
gcloud run services update cwa-assistant-bot \
  --region=us-central1 \
  --update-env-vars="ASSISTANT_CHANNEL_ID=<new channel id>"
```

## Usage tracking (Cloud Logging log-based metrics)

Every handled message emits one structured JSON line to stdout. Cloud Run captures stdout into Cloud Logging as `jsonPayload`. No new infra. Privacy: raw user IDs are HMAC-hashed; raw query text is never emitted.

Event shape (see `usage_metrics.py`):

```json
{"severity":"INFO","event_type":"bot_message","user_id_hash":"abc123def4567890",
 "guild_id":"987...","channel_id":"1504...","routed_agents":["root_agent","content_agent"],
 "tool_calls":["search_blog_posts"],"cited_urls":["https://blog.codewithahsan.dev/x"],
 "response_chars":512,"latency_ms":1234,"status":"ok","query_len":42,"query_topic":"content_agent"}
```

### One-time secret setup

Generate a 32-byte secret and store it in Secret Manager so user_id_hash is stable across deploys:

```bash
python -c "import secrets; print(secrets.token_hex(32))" | tr -d '\n' \
  | gcloud secrets create usage-hash-secret --data-file=- --replication-policy=automatic
```

Add the secret to the service (extend the existing `--set-secrets` list):

```bash
gcloud run services update cwa-assistant-bot --region=us-central1 \
  --update-secrets="USAGE_HASH_SECRET=usage-hash-secret:latest"
```

### Create log-based metrics

Filter all five on `jsonPayload.event_type="bot_message"`. Run from anywhere with `gcloud` configured:

```bash
PROJECT=$(gcloud config get-value project)
FILTER='resource.type="cloud_run_revision" AND resource.labels.service_name="cwa-assistant-bot" AND jsonPayload.event_type="bot_message"'

# 1. Total questions answered (status=ok)
gcloud logging metrics create cwa_bot_questions_answered \
  --description="Count of successfully answered bot messages" \
  --log-filter="${FILTER} AND jsonPayload.status=\"ok\""

# 2. Errors
gcloud logging metrics create cwa_bot_errors \
  --description="Count of bot message handler errors" \
  --log-filter="${FILTER} AND jsonPayload.status=\"error\""

# 3. Latency distribution (P50/P95 visible in Cloud Monitoring)
gcloud logging metrics create cwa_bot_latency_ms \
  --description="Bot response latency in milliseconds" \
  --log-filter="${FILTER}" \
  --value-extractor="EXTRACT(jsonPayload.latency_ms)" \
  --metric-descriptor='{"metricKind":"DELTA","valueType":"DISTRIBUTION","unit":"ms"}'

# 4. Counts split by sub-agent (query_topic label)
gcloud logging metrics create cwa_bot_by_topic \
  --description="Bot messages by routed sub-agent" \
  --log-filter="${FILTER}" \
  --label-extractors="topic=EXTRACT(jsonPayload.query_topic)" \
  --metric-descriptor='{"metricKind":"DELTA","valueType":"INT64","labels":[{"key":"topic","valueType":"STRING"}]}'

# 5. Unique users (rough — based on user_id_hash cardinality)
gcloud logging metrics create cwa_bot_unique_users \
  --description="Distinct user_id_hash values per window" \
  --log-filter="${FILTER}" \
  --label-extractors="user_hash=EXTRACT(jsonPayload.user_id_hash)" \
  --metric-descriptor='{"metricKind":"DELTA","valueType":"INT64","labels":[{"key":"user_hash","valueType":"STRING"}]}'
```

### Ad-hoc queries (Logs Explorer)

Last 7 days, just the bot events:

```
resource.type="cloud_run_revision"
resource.labels.service_name="cwa-assistant-bot"
jsonPayload.event_type="bot_message"
```

Top topics this week (Logs Explorer → CREATE METRIC → or in BigQuery after sink):

```sql
SELECT jsonPayload.query_topic, COUNT(*) AS n
FROM `PROJECT.LOG_DATASET.run_googleapis_com_stdout_*`
WHERE jsonPayload.event_type = "bot_message"
  AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
                        AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
GROUP BY 1 ORDER BY n DESC;
```

### Optional: BigQuery sink (when volume justifies it)

```bash
bq --location=US mk --dataset $PROJECT:cwa_bot_logs
gcloud logging sinks create cwa-bot-bq-sink \
  bigquery.googleapis.com/projects/$PROJECT/datasets/cwa_bot_logs \
  --log-filter="${FILTER}"
# Then grant the sink's writer service account BigQuery Data Editor on the dataset (gcloud prints the SA).
```

## Manual smoke test (local)

1. Run the bot locally with a test Discord server.
2. Test these queries (covers the demo conversation candidates):
   - `@CWA Assistant Find me a mentor who knows Angular` → mentorship_agent → semantic_search_mentors → reply quotes a bio
   - `@CWA Assistant I'm a junior React dev, any projects I can contribute to?` → projects_agent
   - `@CWA Assistant Show me the AI engineer roadmap` → roadmap_agent
   - `@CWA Assistant I'm new here, where do I start?` → onboarding_agent
3. Each reply should include at least one clickable `https://codewithahsan.dev/...` URL.

## Troubleshooting

- **`message.content` is empty string**: Privileged Message Content Intent not enabled in Developer Portal (Application → Bot → Privileged Gateway Intents → toggle Message Content Intent ON → Save).
- **Bot goes silent after a while**: Check Cloud Run logs for gateway disconnects. discord.py auto-reconnects; if it doesn't, restart the service.
- **`RuntimeError: asyncio.run() cannot be called from a running event loop`**: bot.py is calling sync `runner.run()` instead of `runner.run_async()`. The discord.py event loop is already running — always use `async for event in runner.run_async(...)`.
- **Long replies cut off**: Discord silently drops messages over 2000 chars. `chunk_reply()` handles this automatically at 1990 chars. If you see cut-off replies, file a bug — the chunking logic may have a regression.
- **"PrivilegedIntentsRequired" on startup**: The Message Content intent is enabled in code (`intents.message_content = True`) but NOT in the Developer Portal. Both are required for bots in servers with 100+ members.
- **`SystemExit: ASSISTANT_CHANNEL_ID must be an integer`**: The channel ID in your `.env` contains a newline or quotes. Paste the raw numeric ID only.
