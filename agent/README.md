# Code With Ahsan — Community Assistant (ADK Agent)

A multi-agent AI assistant for the Code With Ahsan Discord community (4,600+ members), built on [Google ADK](https://github.com/google/adk-python) and powered by Gemini 2.5 Flash.

The root `community_assistant` agent delegates to four specialized sub-agents:

| Sub-agent | Handles |
|-----------|---------|
| `onboarding_agent` | Welcome new members, channel guides, "where do I start?" |
| `mentorship_agent` | Find mentors (semantic + category search), explain the program |
| `projects_agent` | Discover open-source projects to contribute to |
| `roadmap_agent` | Learning paths and technology roadmaps |

All tools call the live `codewithahsan.dev` platform API via `platform_client.py`. The mentorship agent adds semantic search over mentor bios through Firestore Vector Search (see `../src/app/api/mentorship/mentors/semantic-search/route.ts`).

## Prerequisites

- **Python 3.12** (via [`uv`](https://docs.astral.sh/uv/))
- **Node.js 20+** and **npm** (for the Next.js platform API)
- **Gemini API key** ([AI Studio](https://aistudio.google.com/apikey))
- **Firebase service account** for the parent Next.js project (only needed if you want to hit real Firestore data locally instead of the emulator)

## Install

```bash
cd agent
uv sync                                          # install core deps
uv pip install "discord.py>=2.7.1" "google-auth>=2.0.0"   # only needed to run the Discord bot
```

## Environment

The agent reads env vars via `python-dotenv`. ADK walks up from the package looking for the nearest `.env`, so putting them in the repo root `.env` works fine.

Minimum required:

```env
# agent-side
GOOGLE_GENAI_USE_VERTEXAI=FALSE
GOOGLE_API_KEY=<your Gemini API key from AI Studio>
PLATFORM_API_BASE_URL=https://codewithahsan.dev   # or http://localhost:3000 for local dev
```

For the Discord bot (create `agent/discord_bot/.env`):

```env
CWA_ASSISTANT_DISCORD_BOT_TOKEN=<from Discord Developer Portal>
ASSISTANT_CHANNEL_ID=<your test channel numeric ID>
PLATFORM_API_BASE_URL=http://localhost:3000        # or https://codewithahsan.dev
```

## Run the agent (no Discord) — `adk web`

Fastest way to iterate on agent logic. Opens a local web UI with a chat interface and a full trace panel showing tool calls, delegations, and LLM messages.

```bash
cd agent
uv run adk web community_assistant
```

Open http://localhost:8000, pick `community_assistant`, and send a message:

- *"I'm new here, where do I start?"* → onboarding_agent
- *"Find me a mentor who knows Angular"* → mentorship_agent (uses `semantic_search_mentors`)
- *"Show me beginner-friendly projects"* → projects_agent
- *"What AI roadmaps exist?"* → roadmap_agent

**Data source:** Whatever `PLATFORM_API_BASE_URL` points to. For the richest demo, point at `https://codewithahsan.dev` — it has real mentors, projects, and roadmaps.

## Run the full stack — Discord bot + local Next.js

For end-to-end testing in a real Discord channel with your own local Next.js for new endpoints (e.g., semantic search).

**Terminal 1 — Next.js platform API against real Firestore:**
```bash
# From the repo root
npm run dev
```
Confirm this is hitting real Firestore (not the emulator) — the terminal should NOT mention emulator connections. Your `.env` needs one of: `FIREBASE_SERVICE_ACCOUNT_KEY`, or `FIREBASE_PRIVATE_KEY` + `FIREBASE_CLIENT_EMAIL`. Without those, the Next.js `firebaseAdmin.ts` falls back to the emulator path.

**Terminal 2 — One-time: embed mentor bios to Firestore (needed for semantic search):**
```bash
# From the repo root, one-shot
npx tsx scripts/embed-mentor-bios.ts
# Optional dry run first:
# npx tsx scripts/embed-mentor-bios.ts --dry-run
```
Writes `bioEmbedding` (768-dim) + `bioEmbeddingGeneratedAt` to every accepted mentor doc. Only re-run when mentor bios change.

**Terminal 3 — Discord bot:**
```bash
cd agent
uv run python discord_bot/bot.py
```
Wait for: `Bot ready as CWA Assistant#NNNN; listening on channel <id>`

**Test in Discord** — in your test server's `#ask-the-assistant` channel:
```
@CWA Assistant find me an Angular mentor please
```
Expected: typing indicator, then a reply quoting bio excerpts from real Angular mentors with clickable `https://codewithahsan.dev/mentors/...` URLs.

## Firestore Vector Search indexes (semantic search)

The semantic search endpoint needs two composite indexes on `mentorship_profiles`. Create once per Firebase project (takes ~5–15 min per build):

```bash
# Single-field vector index (required)
gcloud firestore indexes composite create \
  --collection-group=mentorship_profiles \
  --query-scope=COLLECTION \
  --field-config=field-path=bioEmbedding,vector-config='{"dimension":"768","flat":"{}"}' \
  --database="(default)"

# Compound index for role pre-filter + vector search (required)
gcloud firestore indexes composite create \
  --collection-group=mentorship_profiles \
  --query-scope=COLLECTION \
  --field-config=order=ASCENDING,field-path=role \
  --field-config='vector-config={"dimension":"768","flat":"{}"},field-path=bioEmbedding'

# Check readiness
gcloud firestore indexes composite list --database="(default)" | grep -A 3 bioEmbedding
```

Both must reach `STATE: READY` before the semantic search endpoint works.

**Note:** The Firebase Emulator does NOT support vector fields. Semantic search only works against real Firestore.

## Run tests

```bash
cd agent
uv run pytest                      # all 41 tests, ~1.5s
uv run pytest -x --tb=short        # quick run, stop on first failure
```

Tests use fixtures from `tests/fixtures/` and mock `httpx` via `MockTransport` in `tests/conftest.py` — no real network calls.

## Deploy

- **Discord bot → Cloud Run**: see [`discord_bot/README.md`](./discord_bot/README.md) for the full `gcloud run deploy` command and Secret Manager setup. Single service, `--min-instances=1 --max-instances=1`.
- **Next.js platform API (including semantic search)**: deployed via the repo root `npm run build` / Vercel.

## Project structure

```
agent/
├── pyproject.toml              # uv project config, pytest config
├── community_assistant/
│   ├── agent.py                # Root LlmAgent, delegates to sub-agents
│   ├── platform_client.py      # httpx wrapper for codewithahsan.dev API
│   └── sub_agents/
│       ├── onboarding_agent.py     (2 tools, static content)
│       ├── mentorship_agent.py     (3 tools, incl. semantic_search_mentors)
│       ├── projects_agent.py       (2 tools)
│       └── roadmap_agent.py        (2 tools)
├── discord_bot/
│   ├── bot.py                  # discord.py + in-process ADK Runner
│   ├── Dockerfile              # python:3.12-slim
│   ├── requirements.txt        # pinned deps for Docker build
│   ├── .env.example
│   └── README.md               # Bot-specific docs + Cloud Run deploy
└── tests/
    ├── conftest.py             # httpx MockTransport + fixture loaders
    ├── fixtures/               # Realistic API response payloads
    └── test_*.py               # 41 pytest cases across all layers
```

## Troubleshooting

- **"platform is temporarily unreachable"** — your `PLATFORM_API_BASE_URL` is pointing somewhere the API isn't running. Either start `npm run dev` locally or switch to `https://codewithahsan.dev`.
- **"Missing vector index"** on `/api/mentorship/mentors/semantic-search` — create the composite indexes above and wait for them to reach READY.
- **Semantic search returns empty** — you haven't run `npx tsx scripts/embed-mentor-bios.ts` yet (or you're on the emulator — it doesn't support vector fields).
- **Discord bot silent** — Message Content Intent is OFF. Discord Developer Portal → your bot → Bot tab → Privileged Gateway Intents → toggle Message Content Intent ON.
- **`ModuleNotFoundError: No module named 'discord'`** — you haven't installed `discord.py` in the agent venv. Run `uv pip install "discord.py>=2.7.1" "google-auth>=2.0.0"`.
- **Bot connects to emulator instead of real Firestore** — `src/lib/firebaseAdmin.ts` falls back to the emulator in dev mode when no `FIREBASE_SERVICE_ACCOUNT_KEY` / `FIREBASE_PRIVATE_KEY` is set. Add Firebase Admin credentials to the repo root `.env`.
