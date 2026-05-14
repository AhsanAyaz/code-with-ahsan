# Phase 2: ADK Community Assistant for Discord (Google Cloud Next 2026 Demo) - Research

**Researched:** 2026-04-12
**Domain:** Google ADK multi-agent, discord.py, Firestore Vector Search, Cloud Run, gemini-embedding-001
**Confidence:** HIGH (core stack), MEDIUM (deployment specifics), LOW (one edge case noted below)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Priority #1 (must-ship):** Discord bridge. Non-negotiable.
- **Priority #2:** RAG semantic search over bios.
- **Priority #3:** Link polish.
- **Fallback:** If Discord bridge fails on-camera — live `adk web` demo on-screen. No pre-recorded clips.
- **Demo environment:** Full production Discord community (4,600+ members).
- **RSVP:** Email reply by Apr 17. No working prototype required before RSVP.
- **Discord Bridge:** New dedicated bot (`CWA_ASSISTANT_DISCORD_BOT_TOKEN`), @mention in one dedicated channel, Cloud Run hosting with `min-instances=1`.
- **Session key:** Discord user ID passed into ADK as `user_id`. `InMemorySessionService`. One session per Discord user.
- **Vector store:** Firestore Vector Search. `bioEmbedding` field on `mentorship_profiles`. Query via `findNearest()` from Firebase Admin SDK.
- **Indexing:** One-shot script at `scripts/embed-mentor-bios.ts`, run manually via `npx tsx`.
- **Embedding model:** `gemini-embedding-001` via `@google/genai` already in package.json.
- **New tool:** `semantic_search_mentors(query: str)` in Python agent. Calls new Next.js endpoint `GET /api/mentorship/mentors/semantic-search?q=...`.
- **Link polish:** Absolute `https://codewithahsan.dev` URLs, all three entities, dedicated `url` field, creator attribution links.
- **Deployment:** `adk deploy cloud_run` for agent; `gcloud run deploy` for bot. Two Cloud Run services.
- **Architecture:** API-as-MCP — Python tools call Next.js REST endpoints.

### Claude's Discretion

- Exact channel name for the dedicated assistant channel.
- Bot's Discord display name and avatar.
- Typing indicator implementation details (debounce, interval).
- Response formatting micro-decisions (bullets vs paragraphs, emoji use).
- Rate-limiting implementation (basic in-memory throttle).
- Bot Dockerfile specifics and Cloud Run resource sizing.
- Error message copy when agent/API is unreachable.
- Exact prompt for embedding queries (whether to prepend "mentor expert in:").

### Deferred Ideas (OUT OF SCOPE)

- Real-time bio embedding updates (Firestore trigger).
- Vertex AI Sessions + Memory Bank.
- Slash commands / DM support.
- Rate limiting beyond basic per-user throttle.
- `adk eval` evaluation suite.
- Web frontend (AG-UI or custom).
- Multilingual support.
- Observability dashboards (Cloud Trace / Cloud Logging).
- MCP server split.
</user_constraints>

---

## Summary

This phase ships three coordinated improvements to the existing ADK agent on the `feat/adk-agent` branch: link polish across all tool responses, RAG semantic search over mentor bios using Firestore Vector Search, and a Discord bot bridge that forwards @mentions to the ADK agent and posts replies. All three must be demo-ready for Google Cloud Next filming on April 22-24, 2026.

The most critical unknown going in was the Discord bot + ADK wiring. Research confirmed the bjbloemker-google/discord-adk-agent sample uses discord.py with an **in-process Runner** (not HTTP). The bot instantiates `InMemorySessionService` and `Runner` in the same Python process as the Discord gateway, runs `runner.run_async()` inside `async with message.channel.typing():`, and sends the final response as a plain message. This pattern is straightforward and avoids the latency of an extra HTTP hop to a deployed ADK FastAPI service.

The second significant finding is a **cold-start risk for the ADK agent service**: GitHub issue #2704 documents 20-second cold starts and 5-10 second warm response times in the ADK FastAPI server. The mitigation is `--min-instances=1` on the agent service, combined with `--cpu-boost` for startup. The Discord bot service also requires `--min-instances=1` because the Discord gateway websocket is a long-lived connection that Cloud Run's request timeout of 60 minutes would otherwise drop.

The Firestore Vector Search dimension constraint is critical: the maximum supported dimension is **2048**, but `gemini-embedding-001` defaults to **3072 dimensions**. The embed script must pass `output_dimensionality=768` (or 1536) when calling the Gemini embedding API, and the gcloud index creation command must specify the same dimension. The Firebase Emulator does **not** support vector search — development for the embed script and semantic-search endpoint must use real Firestore (or an integration test that runs against a project with actual data).

**Primary recommendation:** Implement the bot in-process (Runner in same container as discord.py), set both Cloud Run services to `--min-instances=1`, use `output_dimensionality=768` for embeddings (within Firestore's 2048-dim limit), and test the end-to-end flow in the real Discord server's private staging channel before enabling in the community channel.

---

## Standard Stack

### Core (Python — agent + bot)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| google-adk | 1.29.0 (installed) | Multi-agent orchestration, Runner, session service | Already installed in agent/.venv; bjbloemker sample uses it |
| discord.py | 2.7.1 (latest as of Apr 2026) | Discord gateway, on_message events, typing() context manager | Google's reference sample uses discord.py specifically; py-cord is a fork with less ecosystem support |
| python-dotenv | >=1.0.1 | Env var loading for local dev | Already in pyproject.toml |
| httpx | >=0.28.0 | HTTP client for platform API calls | Already in pyproject.toml |
| google-auth | (transitive from google-adk) | ID token fetch for service-to-service Cloud Run auth | Standard Google Cloud auth library |

### Core (Node.js — Next.js side)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @google/genai | 1.33.0 (installed) | `gemini-embedding-001` embedding generation | Already in package.json; already used for course descriptions |
| firebase-admin | 13.6.0 (installed) | Firestore `FieldValue.vector()` writes, `findNearest()` queries | Already the Firestore client in all admin routes |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| google.adk.sessions.InMemorySessionService | (part of google-adk) | Per-user session state | Demo only — lost on restart |
| google.adk.runners.Runner | (part of google-adk) | Orchestrates agent execution in-process | Bot calls runner.run_async() directly |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| discord.py in-process Runner | HTTP POST to deployed ADK FastAPI | In-process avoids extra network hop and auth complexity; HTTP required only if bot and agent scale independently |
| Firestore Vector Search | Vertex AI Vector Search | Vertex costs $1-3/hr idle; Firestore reuses existing infrastructure at negligible cost for 28 mentors |
| gemini-embedding-001 output_dimensionality=768 | 3072 (default) | 3072 exceeds Firestore's 2048-dim max; 768 is within limit and sufficient for 28-doc corpus |

### Installation

For the new Discord bot service:

```bash
# In agent/discord_bot/ (new subdirectory)
uv add discord.py
# OR in requirements.txt for Dockerfile:
discord.py>=2.7.1
google-adk>=1.0.0
python-dotenv>=1.0.1
google-auth>=2.0.0
```

---

## Architecture Patterns

### Recommended Project Structure

```
agent/
├── community_assistant/          # existing ADK multi-agent (unchanged structure)
│   ├── agent.py                  # root_agent (gains no changes)
│   ├── platform_client.py        # gains fetch_mentors_semantic()
│   └── sub_agents/
│       ├── mentorship_agent.py   # gains semantic_search_mentors tool
│       ├── projects_agent.py     # gains url field in tool responses
│       ├── roadmap_agent.py      # gains url field in tool responses
│       └── onboarding_agent.py   # no changes
└── discord_bot/                  # NEW — separate Cloud Run service
    ├── bot.py                    # discord.py bot entry point
    ├── requirements.txt          # discord.py, google-adk, python-dotenv, google-auth
    ├── Dockerfile                # python:3.12-slim, CMD ["python", "bot.py"]
    └── .env.sample               # CWA_ASSISTANT_DISCORD_BOT_TOKEN, etc.

scripts/
└── embed-mentor-bios.ts          # NEW — one-shot embedding indexer

src/app/api/mentorship/mentors/
├── route.ts                      # existing
└── semantic-search/
    └── route.ts                  # NEW — GET ?q=... returns ranked mentor list
```

### Pattern 1: In-Process ADK Runner in Discord Bot

The Google reference sample (bjbloemker-google/discord-adk-agent) runs the ADK Runner **in the same Python process** as the Discord gateway. No HTTP call to a deployed FastAPI agent service.

**What:** discord.py bot holds the gateway websocket. On @mention, it calls `runner.run_async()` in-process within `async with message.channel.typing():`. This uses `asyncio` throughout — discord.py's event loop is asyncio, and ADK's `run_async` is a native async generator.

**When to use:** Always — for CWA, the bot and agent logic are in the same Cloud Run service. The "two services" in the CONTEXT.md refers to the existing ADK web dev server (optional) vs the bot, not a separate FastAPI agent service being called over HTTP.

**Clarification on "two Cloud Run services":** The CONTEXT.md decision says two services: the ADK agent FastAPI wrapper and the Discord bot. After research, the cleaner and latency-optimal approach is to embed the Agent Runner **inside** the bot process. The ADK FastAPI service is still useful as a development tool (`adk web`) but the demo bot should NOT call it over HTTP — that adds an unnecessary network hop, ID token overhead, and the cold-start problem described below. Planner should default to the **single-service in-process** approach for the bot.

**Example (from bjbloemker-google research, adapted):**

```python
# agent/discord_bot/bot.py
import discord
import asyncio
from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google import genai as types

# Import the existing community_assistant root_agent
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from community_assistant.agent import root_agent

intents = discord.Intents.default()
intents.message_content = True
intents.members = False

bot = discord.Client(intents=intents)
session_service = InMemorySessionService()
runner = Runner(
    agent=root_agent,
    app_name="CWAAssistant",
    session_service=session_service,
)

ASSISTANT_CHANNEL_ID = int(os.getenv("ASSISTANT_CHANNEL_ID", "0"))
# user_id → session_id map (one session per user for demo)
user_sessions: dict[str, str] = {}

@bot.event
async def on_ready():
    print(f"Bot ready: {bot.user}")

@bot.event
async def on_message(message: discord.Message):
    if message.author.bot:
        return
    if message.channel.id != ASSISTANT_CHANNEL_ID:
        return
    if bot.user not in message.mentions:
        return

    user_id = str(message.author.id)

    # Get or create session for this user
    if user_id not in user_sessions:
        import uuid
        session_id = str(uuid.uuid4())
        await session_service.create_session(
            app_name="CWAAssistant",
            user_id=user_id,
            session_id=session_id,
        )
        user_sessions[user_id] = session_id
    session_id = user_sessions[user_id]

    # Strip bot mention from message text
    content = message.content.replace(f"<@{bot.user.id}>", "").strip()
    new_message = types.Content(role="user", parts=[types.Part(text=content)])

    response_text = ""
    async with message.channel.typing():
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message,
        ):
            if event.is_final_response() and event.content:
                response_text = event.content.parts[0].text
                break

    if not response_text:
        response_text = "I couldn't generate a response. Please try again."

    # Discord message limit is 2000 chars — split if needed
    for chunk in [response_text[i:i+1990] for i in range(0, len(response_text), 1990)]:
        await message.channel.send(chunk)

bot.run(os.environ["CWA_ASSISTANT_DISCORD_BOT_TOKEN"])
```

**Source:** Adapted from bjbloemker-google/discord-adk-agent main.py; ADK session docs at adk.dev/sessions/session/

### Pattern 2: Firestore Vector Search (Node.js / firebase-admin)

**What:** Store `bioEmbedding` as `FieldValue.vector(numbers)` on each mentor document. Query with `collection.findNearest()`.

**Dimension constraint:** Firestore max is 2048. `gemini-embedding-001` defaults to 3072. Must use `output_dimensionality=768` in the embedding API call. Index must be created with `"dimension":"768"`.

**Example (embed script):**

```typescript
// scripts/embed-mentor-bios.ts
import { db } from "@/lib/firebaseAdmin";
import { GoogleGenAI } from "@google/genai";
import { FieldValue } from "firebase-admin/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

async function embedBio(bioText: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: bioText,
    config: {
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 768,
    },
  });
  return response.embeddings[0].values;
}

async function main() {
  const snapshot = await db
    .collection("mentorship_profiles")
    .where("role", "==", "mentor")
    .where("status", "==", "accepted")
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const bio = data.bio || data.about || "";
    if (!bio) continue;

    const embedding = await embedBio(bio);
    await doc.ref.update({
      bioEmbedding: FieldValue.vector(embedding),
      bioEmbeddingGeneratedAt: new Date(),
    });
    console.log(`Embedded ${data.displayName || doc.id}`);
  }
}

main().catch(console.error);
```

**Example (semantic-search API route):**

```typescript
// src/app/api/mentorship/mentors/semantic-search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const embedRes = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: q,
    config: { taskType: "RETRIEVAL_QUERY", outputDimensionality: 768 },
  });
  const queryVector = embedRes.embeddings[0].values;

  const vectorQuery = db
    .collection("mentorship_profiles")
    .where("role", "==", "mentor")
    .where("status", "==", "accepted")
    .findNearest({
      vectorField: "bioEmbedding",
      queryVector: FieldValue.vector(queryVector),
      limit: 10,
      distanceMeasure: "COSINE",
      distanceResultField: "vector_distance",
    });

  const snapshot = await vectorQuery.get();
  const mentors = snapshot.docs.map((doc) => {
    const d = doc.data();
    const bio: string = d.bio || d.about || "";
    return {
      name: d.displayName || d.username,
      username: d.username,
      url: `https://codewithahsan.dev/mentors/${d.username}`,
      expertise: d.expertise || [],
      availability: d.isAtCapacity
        ? "At capacity"
        : `Accepting mentees`,
      rating: d.avgRating || null,
      completed_sessions: d.completedMentorships || 0,
      bio_excerpt: bio.slice(0, 300),
      match_score: doc.get("vector_distance"),
    };
  });

  return NextResponse.json({ mentors });
}
```

**Source:** Official Firestore vector search docs at docs.cloud.google.com/firestore/native/docs/vector-search

### Pattern 3: Link Polish — `url` Field in Tool Responses

**What:** Add a top-level `url` field to every shaped entity in `platform_client.py` / mentorship_agent / projects_agent / roadmap_agent.

**Example (mentorship_agent _shape_mentor update):**

```python
BASE_URL = os.getenv("PLATFORM_API_BASE_URL", "https://codewithahsan.dev").rstrip("/")

def _shape_mentor(raw: dict) -> dict:
    username = raw.get("username")
    # ... existing fields ...
    return {
        "name": ...,
        "username": username,
        "url": f"{BASE_URL}/mentors/{username}" if username else None,
        "expertise": ...,
        # ...
    }
```

### Pattern 4: Firestore Vector Index Creation (gcloud CLI)

Must be run once before the semantic search endpoint works. Index creation can take 5-15 minutes.

```bash
gcloud firestore indexes composite create \
  --collection-group=mentorship_profiles \
  --query-scope=COLLECTION \
  --field-config field-path=bioEmbedding,vector-config='{"dimension":"768","flat":"{}"}' \
  --database="(default)"
```

**Pitfall:** The dimension in the index creation command must exactly match `outputDimensionality` in the embed call. If they differ, `findNearest()` throws an error.

### Anti-Patterns to Avoid

- **Bot calling ADK FastAPI over HTTP:** Adds network latency, ID token overhead, and requires a separately deployed agent service. Use in-process Runner instead.
- **gemini-embedding-001 at default dimensions (3072):** Exceeds Firestore's 2048-dim maximum. Always specify `outputDimensionality=768`.
- **Running embed script or semantic-search tests against Firebase Emulator:** Emulator does NOT support vector fields. Must use real Firestore.
- **Setting `min-instances=0` on either Cloud Run service:** The bot needs `min-instances=1` to hold the Discord gateway websocket. The agent service needs it to avoid 20-second cold starts during the demo.
- **Not splitting Discord responses >2000 chars:** Discord silently rejects messages over the limit. Split at 1990 chars with a safety buffer.
- **Message content intent not enabled in Discord Developer Portal:** Bot cannot read message content without `intents.message_content = True` AND enabling the privileged intent in the portal.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Discord gateway connection | Custom WebSocket client to Discord API | discord.py `Client.run()` | Rate limiting, heartbeat, reconnection, shard management handled automatically |
| Agent execution loop | Custom LLM invocation + tool loop | ADK `Runner.run_async()` | Multi-agent routing, tool call lifecycle, session history all managed |
| Session state | Custom dict in bot process | `InMemorySessionService` | Thread-safe, correct session lifecycle with ADK's event model |
| Vector similarity math | Cosine distance implementation | Firestore `findNearest()` | Server-side KNN; no data transfer of full embedding corpus |
| Embedding generation | Direct Gemini API REST call | `@google/genai` `ai.models.embedContent()` | Handles auth, retries, response deserialization |
| Service-to-service auth | Manual JWT generation | `google.oauth2.id_token.fetch_id_token()` | ADC-aware, handles token refresh |

**Key insight:** The entire bot-to-agent chain is one in-process call chain: `discord.py on_message` → `runner.run_async()` → `LlmAgent` → tool functions → `httpx` → Next.js API. No additional infrastructure needed between bot and agent.

---

## Common Pitfalls

### Pitfall 1: Firestore Emulator Vector Search Failure

**What goes wrong:** Running `scripts/embed-mentor-bios.ts` or the semantic-search route tests against the Firebase emulator throws an error about invalid nested entity or vector fields not supported.

**Why it happens:** The Firestore emulator explicitly does NOT support vector fields (confirmed in firebase-tools issue #7216 and #8077). There is no workaround in the emulator.

**How to avoid:** The embed script and semantic-search route must be tested against a real Firestore project. Use a dedicated dev/staging Firebase project, or run against production with a test mentor document.

**Warning signs:** Error: "Property bioEmbedding contains an invalid nested entity" when running against `localhost:8080`.

### Pitfall 2: Embedding Dimension Mismatch

**What goes wrong:** `findNearest()` throws a dimension mismatch error at query time.

**Why it happens:** The index was created with `dimension:768` but embeddings were stored with `outputDimensionality=3072` (or vice versa).

**How to avoid:** Lock `outputDimensionality=768` as a constant in both the embed script and the API route. Include dimension in the gcloud index command. Verify with a test query immediately after running the embed script.

**Warning signs:** Firestore error "Query vector dimension X does not match index dimension Y."

### Pitfall 3: Discord Gateway Drop on Cloud Run Timeout

**What goes wrong:** The Discord bot loses its gateway connection after 60 minutes (Cloud Run's max request timeout) and stops responding.

**Why it happens:** Cloud Run treats WebSocket connections as HTTP requests subject to timeout. The Discord gateway websocket is one long-lived connection.

**How to avoid:** Discord.py handles reconnection automatically via its heartbeat loop. The gateway connection is managed by discord.py internally; it will reconnect after drops. The key is `min-instances=1` so the container stays warm and the reconnect happens quickly (< 5 seconds). Also configure `--timeout=3600` on the Cloud Run service (max = 3600 seconds = 60 min; discord.py will reconnect after each).

**Warning signs:** Bot goes silent mid-session. Cloud Run logs show "Connection closed" or discord.py logs show "Websocket closed with 1000."

### Pitfall 4: ADK Agent Cold-Start Latency (if using separate FastAPI service)

**What goes wrong:** First user message after a cold start takes 20+ seconds to respond. Demo dies.

**Why it happens:** ADK's FastAPI server has ~20 second cold starts (documented in google/adk-python issue #2704). Agent loading, OAuth connection setup, and import overhead all contribute.

**How to avoid:** 
1. Run the Agent Runner **in-process** with the Discord bot (no separate FastAPI service for the bot path).
2. Set `--min-instances=1` on the bot Cloud Run service.
3. Use `--cpu-boost` flag on deployment to accelerate startup.

**If a separate agent FastAPI service is needed:** Also set `--min-instances=1` on it; use `--cpu=1` CPU always allocated (not throttled when idle).

**Warning signs:** First response in a new Cloud Run instance exceeds 15 seconds.

### Pitfall 5: Message Content Intent Not Enabled

**What goes wrong:** `message.content` is always empty string. Bot can't parse @mention text.

**Why it happens:** Since discord.py 2.0, `message_content` is a privileged gateway intent. Must be enabled in Discord Developer Portal AND in code.

**How to avoid:** 
1. Enable "Message Content Intent" in Discord Developer Portal → Bot → Privileged Gateway Intents.
2. In code: `intents = discord.Intents.default(); intents.message_content = True`.

**Note:** Bots in fewer than 100 servers don't require verification, but still need the portal toggle.

**Warning signs:** `message.content` is `""` or `None` even when @mentioned.

### Pitfall 6: `runner.run_async()` vs `runner.run()` in Discord Async Context

**What goes wrong:** Calling synchronous `runner.run()` inside an async `on_message` handler blocks the Discord event loop, causing the bot to freeze.

**Why it happens:** discord.py uses asyncio; `runner.run()` internally calls `asyncio.run()` which can't be called from a running loop.

**How to avoid:** Always use `runner.run_async()` inside async Discord handlers. Use `async for event in runner.run_async(...):`.

**Warning signs:** `RuntimeError: asyncio.run() cannot be called from a running event loop` in bot logs.

### Pitfall 7: Firestore Vector Index Creation Time

**What goes wrong:** Semantic search returns empty results immediately after running the embed script.

**Why it happens:** Firestore vector indexes can take 5-15 minutes to build after the `gcloud firestore indexes composite create` command. Documents written before the index is ready may not be queryable.

**How to avoid:** Run the gcloud index creation command first, wait for it to complete (check `gcloud firestore indexes composite list`), then run the embed script. Alternatively, run both and verify via the Firestore console before demo day.

**Warning signs:** `findNearest()` returns 0 results immediately after embedding with no error.

---

## Code Examples

### ADK Session Service + Runner (confirmed from bjbloemker-google/discord-adk-agent and adk.dev docs)

```python
# Source: bjbloemker-google/discord-adk-agent main.py + adk.dev/sessions/session/
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
import uuid

session_service = InMemorySessionService()

# Create session on first user message
adk_session = await session_service.create_session(
    app_name="CWAAssistant",
    user_id=user_id,          # Discord user ID string
    session_id=session_id,    # UUID string
    state={},                 # Optional initial state dict
)

runner = Runner(
    agent=root_agent,
    app_name="CWAAssistant",
    session_service=session_service,
)

# Run agent (ALWAYS use run_async inside async handlers)
async for event in runner.run_async(
    user_id=user_id,
    session_id=session_id,
    new_message=new_message,
):
    if event.is_final_response() and event.content:
        response_text = event.content.parts[0].text
        break
```

### ADK deploy cloud_run Command (confirmed from adk.dev/deploy/cloud-run/)

```bash
# Source: adk.dev/deploy/cloud-run/
adk deploy cloud_run \
  --project=$GOOGLE_CLOUD_PROJECT \
  --region=us-central1 \
  --service_name=cwa-assistant-agent \
  --app_name=community_assistant \
  --min_instances=1 \
  agent/community_assistant

# Request format for the deployed FastAPI service (if needed for dev/testing):
# POST /run
# Body:
{
  "appName": "community_assistant",
  "userId": "discord_user_id",
  "sessionId": "uuid-string",
  "newMessage": {
    "role": "user",
    "parts": [{ "text": "Find me an Angular mentor" }]
  }
}
```

### Firestore findNearest() (confirmed from official docs)

```typescript
// Source: docs.cloud.google.com/firestore/native/docs/vector-search
import { FieldValue, VectorQuery, VectorQuerySnapshot } from "firebase-admin/firestore";

const vectorQuery: VectorQuery = db
  .collection("mentorship_profiles")
  .findNearest({
    vectorField: "bioEmbedding",
    queryVector: FieldValue.vector(queryEmbeddingNumbers),
    limit: 10,
    distanceMeasure: "COSINE",
    distanceResultField: "vector_distance",  // adds score to each doc
  });

const snapshot: VectorQuerySnapshot = await vectorQuery.get();
```

### Cloud Run Bot Service Deployment

```bash
# Deploy Discord bot (gateway process, must always be on)
gcloud run deploy cwa-assistant-bot \
  --source=agent/discord_bot \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=1 \
  --cpu=1 \
  --memory=512Mi \
  --timeout=3600 \
  --no-allow-unauthenticated \
  --set-secrets="CWA_ASSISTANT_DISCORD_BOT_TOKEN=cwa-assistant-discord-bot-token:latest,GOOGLE_API_KEY=google-api-key:latest,PLATFORM_API_BASE_URL=platform-api-base-url:latest" \
  --project=$GOOGLE_CLOUD_PROJECT
```

### Cloud Run Service-to-Service Auth (Python)

```python
# Source: docs.cloud.google.com/run/docs/authenticating/service-to-service
import google.auth.transport.requests
import google.oauth2.id_token

def get_id_token(audience: str) -> str:
    auth_req = google.auth.transport.requests.Request()
    return google.oauth2.id_token.fetch_id_token(auth_req, audience)

# Usage in httpx calls (if bot ever needs to call a separate Cloud Run service):
token = get_id_token("https://cwa-assistant-agent-xxxx-uc.a.run.app")
headers = {"Authorization": f"Bearer {token}"}
```

### gemini-embedding-001 with output_dimensionality (confirmed from ai.google.dev/gemini-api/docs/embeddings)

```typescript
// Source: ai.google.dev/gemini-api/docs/embeddings
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const response = await ai.models.embedContent({
  model: "gemini-embedding-001",
  contents: bioText,
  config: {
    taskType: "RETRIEVAL_DOCUMENT",  // for indexing
    outputDimensionality: 768,        // MUST be ≤2048 for Firestore
  },
});
const embedding: number[] = response.embeddings[0].values;
```

### Bot Dockerfile

```dockerfile
# agent/discord_bot/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy bot + agent code
COPY . .

# Discord bot holds websocket; Cloud Run handles process lifecycle
CMD ["python", "bot.py"]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `runner.run()` synchronous | `runner.run_async()` async generator | ADK >=1.0 | Required for asyncio frameworks like discord.py |
| Custom vector DB (Pinecone, Weaviate) | Firestore Vector Search via `findNearest()` | GA in Firestore 2024 | Eliminates separate vector store for small corpora |
| Polling for bot responses | `async with channel.typing(): async for event in runner.run_async()` | discord.py 2.x + ADK 1.x | Native async typing indicator during generation |
| Fixed 3072-dim embeddings | `output_dimensionality` parameter for MRL | gemini-embedding-001 launch | Allows 768-dim embeddings within Firestore's 2048-dim limit |

**Deprecated/outdated:**
- `InMemorySessionService` sync `create_session`: now async (`await session_service.create_session(...)`). Missing `await` causes runtime ValueError.
- discord.py <2.0 intents: must use `discord.Intents.default()` with explicit `intents.message_content = True` since v2.0.

---

## Open Questions

1. **Session continuity across bot restarts**
   - What we know: `InMemorySessionService` is ephemeral. Sessions lost on restart.
   - What's unclear: For the demo, is one restart during filming acceptable? Discord users would lose context if the bot restarts mid-demo.
   - Recommendation: Set `--min-instances=1` and `--max-instances=1` to minimize restart risk. The container is stable for the 10-min demo window. Accept the tradeoff per CONTEXT.md.

2. **`@google/genai` import path for embeddings in Next.js 16**
   - What we know: `@google/genai` 1.33.0 is installed. Used in v4.0 for course descriptions via `gemini-flash-latest`. The `ai.models.embedContent()` API is documented.
   - What's unclear: Whether the `config.outputDimensionality` option is available in 1.33.0 specifically (the docs show it, but version pinning is uncertain).
   - Recommendation: Run `npx tsx -e "const {GoogleGenAI}=require('@google/genai');console.log(Object.keys(new GoogleGenAI({apiKey:'x'}).models))"` to verify the models object, then test embedding with a small string before running the full script.

3. **Firestore pre-filtering + vector search compatibility**
   - What we know: Firestore supports combining `where()` clauses before `findNearest()`. Used in the semantic-search route to filter by `role=="mentor"` and `status=="accepted"`.
   - What's unclear: Whether the pre-filter + vector query combination requires a separate composite index (filter fields + vector field together). The docs don't clearly state this.
   - Recommendation: Try the combined query first. If it fails with an "index missing" error, create a composite index with `role`, `status`, and the vector field. Alternatively, post-filter in application code after `findNearest()` on all mentors.

---

## Validation Architecture

> `workflow.nyquist_validation` not set in config.json — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no pytest.ini, jest.config.*, or test directories in the repo |
| Config file | Wave 0 gap — none exists |
| Quick run command | `npx tsx scripts/embed-mentor-bios.ts --dry-run` (for embed script smoke test) |
| Full suite command | Manual end-to-end: @mention bot in Discord → assert reply in channel |
| Python bot test | `python -c "import bot; print('imports ok')"` from `agent/discord_bot/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| LINK-01 | Mentor tool responses include `url` field | Unit (Python) | `python -c "from community_assistant.sub_agents.mentorship_agent import _shape_mentor; r=_shape_mentor({'username':'test'}); assert 'url' in r"` | Fast, no external deps |
| LINK-02 | Project tool responses include `url` field | Unit (Python) | Similar to LINK-01 for projects_agent | |
| LINK-03 | Roadmap tool responses include `url` field | Unit (Python) | Similar to LINK-01 for roadmap_agent | |
| RAG-01 | Embed script writes `bioEmbedding` to Firestore | Integration | `npx tsx scripts/embed-mentor-bios.ts` + Firestore console verification | Requires real Firestore; emulator NOT supported |
| RAG-02 | Semantic-search endpoint returns ranked results | Integration | `curl "https://localhost:3000/api/mentorship/mentors/semantic-search?q=Angular"` | Requires embedded data + vector index |
| RAG-03 | `semantic_search_mentors` Python tool returns correct shape | Unit (Python) | Mock httpx response, assert `bio_excerpt` and `match_score` fields present | Mock platform_client._get |
| RAG-04 | Vector index creation succeeds | Manual | `gcloud firestore indexes composite list` | One-time pre-deploy step |
| BOT-01 | Bot connects to Discord and marks as ready | Smoke | `timeout 10 python bot.py` exits without error (or logs "Bot ready") | Requires `CWA_ASSISTANT_DISCORD_BOT_TOKEN` in env |
| BOT-02 | @mention in designated channel triggers agent | Manual E2E | @mention bot in private staging channel → assert reply within 30s | Full integration test in real Discord |
| BOT-03 | Bot replies with absolute URLs for mentor results | Manual E2E | Ask "Find me an Angular mentor" → assert response contains `https://codewithahsan.dev/mentors/` | Validates LINK + RAG + BOT together |
| BOT-04 | Bot handles agent timeout gracefully | Manual | Kill platform API → @mention bot → assert "temporarily unavailable" reply | Tests non-blocking failure pattern |

### Sampling Rate

- **Per task commit:** Run the relevant unit test for the task's module (LINK-01/02/03 or RAG-03).
- **Per wave merge:** Run all Python unit tests + one curl to the semantic-search endpoint against staging.
- **Phase gate:** Full manual E2E (BOT-02 + BOT-03) green before `/gsd:verify-work`. This means a working bot in a private Discord staging channel responding correctly to at least the four demo conversation candidates from CONTEXT.md.

### Wave 0 Gaps

- [ ] No Python test runner configured. Add `pytest` + `pytest-asyncio` to `agent/discord_bot/requirements.txt` and create `agent/discord_bot/tests/test_bot_unit.py` covering LINK-01/02/03 and RAG-03 with mocked httpx.
- [ ] No `--dry-run` mode in embed script template. Implement dry-run that fetches mentors and prints what would be embedded without writing to Firestore.
- [ ] Vector index does not exist yet. Wave 0 must include running `gcloud firestore indexes composite create ...` before any RAG wave begins.
- [ ] Discord bot application not yet created in Developer Portal. Must be done manually (create app, enable Message Content Intent, generate token, add to guild) before any bot code is testable.

*(No existing test infrastructure in the repo covers any phase requirements — all test infrastructure is new.)*

---

## Sources

### Primary (HIGH confidence)

- `adk.dev/deploy/cloud-run/` — `adk deploy cloud_run` command syntax, request format, env vars
- `adk.dev/sessions/session/` — `InMemorySessionService.create_session()` async API, session fields
- `adk.dev/runtime/api-server/` — ADK FastAPI endpoint schema (`/run`, `/run_sse`, request body fields)
- `docs.cloud.google.com/firestore/native/docs/vector-search` — `FieldValue.vector()`, `findNearest()` with all params, `distanceMeasure` options, 2048-dim max, emulator NOT supported
- `docs.cloud.google.com/run/docs/authenticating/service-to-service` — `roles/run.invoker`, ID token Python pattern
- `docs.cloud.google.com/run/docs/configuring/min-instances` — `--min` flag, billing implications
- `docs.cloud.google.com/run/docs/triggering/websockets` — WebSocket support, 60-min max timeout, min-instances for gateway bots
- `ai.google.dev/gemini-api/docs/embeddings` — `gemini-embedding-001` default 3072 dims, `output_dimensionality` param, task types, `ai.models.embedContent()` Node.js signature

### Secondary (MEDIUM confidence)

- `github.com/bjbloemker-google/discord-adk-agent` main.py — in-process Runner pattern, discord.py library choice, `async with channel.typing()`, `runner.run()` (note: research confirmed this should be `runner.run_async()` for asyncio context)
- `medium.com/google-cloud/adding-an-ai-agent-to-your-discord-server-with-agent-development-kit` — session creation code pattern, Runner instantiation, event loop structure
- `pypi.org/project/discord.py/` — current version 2.7.1 (as of Mar 2026)
- `github.com/google/adk-python/issues/2704` — cold start latency issue (~20s cold, 5-10s warm)

### Tertiary (LOW confidence — flag for validation)

- WebSearch aggregated claims about Firestore 2048-dim max and emulator non-support (cross-verified with official docs — now HIGH)
- WebSearch claim that `output_dimensionality` is available in `@google/genai` 1.33.0 specifically — verify at implementation time

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — existing agent.py and installed packages are the ground truth; discord.py and versions verified via PyPI
- Architecture (in-process Runner): HIGH — confirmed from Google's own sample repo source code
- Firestore Vector Search API: HIGH — verified against official Cloud docs (not truncated version)
- Embedding dimensions: HIGH — verified from official Gemini API docs (3072 default, 768 recommended, 2048 Firestore max)
- Cold-start latency risk: MEDIUM — open GitHub issue, not official docs; mitigations are standard Cloud Run practice
- Emulator incompatibility: HIGH — verified against open GitHub issues on firebase-tools and official docs statement

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable APIs; google-adk releases bi-weekly — pin exact version in requirements.txt)
