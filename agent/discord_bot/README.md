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
