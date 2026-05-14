# Phase 2: ADK Community Assistant for Discord (Google Cloud Next 2026 demo) - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning
**Deadline:** Apr 22-24, 2026 (on-site filming at Google Cloud Next, Mandalay Bay Las Vegas)

<domain>
## Phase Boundary

Ship a demo-ready, multi-agent ADK community assistant running inside the live Code with Ahsan Discord community (4,600+ members) for Google Cloud Tech YouTube filming at Google Cloud Next 2026. Three coordinated improvements on the existing `feat/adk-agent` branch:

1. **Link polish** — every tool response carries actionable `https://codewithahsan.dev` URLs so the agent's Discord answers are clickable and drive traffic back to the platform.
2. **RAG semantic search over mentor bios** — a new `semantic_search_mentors` tool using Firestore Vector Search over mentor bios, so queries like "Angular mentor" return real Angular specialists instead of everyone tagged "Web Development".
3. **Discord bot bridge** — a dedicated Discord bot process that forwards @mentions to the ADK agent and posts responses back, running on Cloud Run, using Discord user IDs as ADK session keys.

**Out of scope for this phase:**
- Voice input, web UI, analytics dashboards
- Real-time mentor profile embedding updates (one-shot indexing only)
- Vertex AI Sessions Service / Memory Bank (InMemorySessionService is enough for demo)
- Rate limiting beyond basic in-memory per-user throttle
- Moving the agent off Gemini API (AI Studio) to Vertex AI backend

</domain>

<decisions>
## Implementation Decisions

### Scope & Priority
- **Priority #1 (must-ship):** Discord bridge. Non-negotiable. Without it the demo is "look at this CLI."
- **Priority #2:** RAG semantic search over bios. The "not a toy demo" claim from the Google email depends on real Angular/React/etc. search working.
- **Priority #3:** Link polish. Lowest risk, highest confidence of shipping.
- **Fallback if Discord bridge fails on-camera:** Live `adk web` demo on-screen. Visual, interactive, shows multi-agent reasoning via ADK's trace panel. **No pre-recorded clips — we commit to live.**
- **Demo environment:** **Full production Discord community** (4,600+ members). Bold choice — accept the exposure risk in exchange for maximum authenticity and the "agent running in a real community" demo hook.
- **RSVP:** Email reply to Google by Apr 17 is sufficient; no working prototype required before RSVP.

### Discord Bridge: Bot Identity
- **New dedicated Discord bot** — separate Discord application, its own token, its own avatar and name (e.g., "CWA Assistant"). Clean separation from the existing mentorship-channel bot at `src/lib/discord.ts`.
- **Why:** If the assistant misbehaves, gets rate-limited, or has intent/scope issues, the existing mentorship automation is untouched. Gateway intents for MESSAGE_CONTENT and MENTIONS are scoped to this bot only.
- **Token storage:** New env var (e.g., `CWA_ASSISTANT_DISCORD_BOT_TOKEN`), stored in Secret Manager when deployed to Cloud Run.

### Discord Bridge: Invocation & UX
- **Invocation:** @mention in a dedicated channel (name TBD — e.g., `#ask-the-assistant`).
- **Why:** Conversational framing matches the Google email's "natural conversation inside Discord" pitch. Visible to other community members = social proof during the demo. Single channel = tight blast radius for the demo window.
- **Response style:** Full message (non-streaming for v1), plain text with clickable absolute URLs. Discord renders the URLs natively.
- **Typing indicator:** Yes, while the agent thinks — standard Discord bot UX pattern.
- **No slash commands, no DMs** for v1. Single invocation surface to test before filming.

### Discord Bridge: Hosting
- **Cloud Run for both bot and agent services.**
  - Cloud Run service #1: Discord bot process (min-instances=1, always-on, holds the gateway websocket)
  - Cloud Run service #2: ADK agent FastAPI wrapper (scale-to-zero, called by the bot over HTTPS with service-account ID token)
- **Matches the "Built on Google Cloud" narrative Google wants.**
- Agent service is deployed via `adk deploy cloud_run`.
- Bot service is deployed via `gcloud run deploy` from a custom Dockerfile.

### Discord Bridge: Session Management
- **Session key = Discord user ID** passed into ADK as `user_id`.
- **Session service:** ADK's built-in `InMemorySessionService`. One session per Discord user, lives for the lifetime of the agent Cloud Run instance.
- **Why not Vertex AI Sessions:** InMemory is free, zero GCP setup, and session continuity across cold starts is not demo-critical. Sessions are ephemeral; users can recover by re-stating context in-message.
- **Tradeoff accepted:** If the agent Cloud Run cold-starts mid-conversation, the user loses prior turns. For a 10-minute demo, this is fine.

### RAG: Vector Store & Indexing
- **Vector store:** **Firestore Vector Search.** Add a `bioEmbedding` vector field to existing `mentorship_profiles` documents. Query via `findNearest()` from Firebase Admin SDK.
- **Why:** Reuses existing Firebase infrastructure. Zero new managed services. For ~28 mentors, latency and cost are negligible. Vertex AI Vector Search would cost $1-3/hr idle on a provisioned endpoint — unjustifiable for this scale.
- **Indexing:** One-shot Next.js script at `scripts/embed-mentor-bios.ts`, run manually via `npx tsx scripts/embed-mentor-bios.ts`.
- **Why Next.js side and not Python:** Uses existing `firebase-admin` + `@google/genai` dependencies already wired into the platform. No duplicate Firebase auth setup in Python. One-shot run ahead of the demo; re-run manually if bios change.
- **Embedding model:** `gemini-embedding-001` (cheapest, well-supported in `@google/genai`). Single vector per mentor = whole bio (bios are short enough to fit under token limits).

### RAG: Tool API
- **New tool:** `semantic_search_mentors(query: str) -> dict` in `agent/community_assistant/sub_agents/mentorship_agent.py`.
- **Complements, does not replace, `search_mentors`:**
  - `search_mentors(topic)` — category/substring match (existing behavior). Use for broad areas like "Web Development" or "Career Growth".
  - `semantic_search_mentors(query)` — vector match over bios. Use for specific techs like "Angular", "RAG agents", "iOS Swift" where bios contain specifics that tags don't.
- **Agent instructions updated:** Try `semantic_search_mentors` first for specific technology queries; fall back to `search_mentors` for broad categories or if semantic returns zero hits.
- **Backend:** The Python tool calls a new Next.js API endpoint `GET /api/mentorship/mentors/semantic-search?q=...` that runs `findNearest()` against Firestore. Reuses the existing API-as-MCP pattern.

### RAG: Return Shape
- Returns: **metadata + 300-char bio excerpt + match score** per mentor.
- Shape: `{name, username, url, expertise, availability, rating, completed_sessions, bio_excerpt, match_score}`.
- LLM can quote the excerpt in responses: *"Muhammad Ali specifically mentions Angular and React in his bio."* This is the key differentiator for the "not a toy demo" framing.
- **Excerpt selection:** First 300 chars of the bio (simple). Future: highlight the matching sentence. Defer to v2.

### Link Polish: URL Shape & Placement
- **Absolute URLs only:** `https://codewithahsan.dev/mentors/{username}`, `https://codewithahsan.dev/projects/{id}`, `https://codewithahsan.dev/roadmaps/{id}`. Base URL from `PLATFORM_API_BASE_URL` env var.
- **All three entities get URLs:** mentors, projects, roadmaps. Consistent treatment.
- **Dedicated `url` field** in tool response dicts (top-level, next to `name`/`title`). Not markdown-formatted strings.
- **Creator attribution links:** Project and roadmap creator names link back to `/mentors/{username}`. Closes the loop — click a project → see the creator's mentor profile → book a session.

### Claude's Discretion
- Exact channel name for the dedicated assistant channel (TBD with Ahsan when creating the Discord channel).
- The bot's Discord display name and avatar (Claude can suggest options during planning).
- Typing indicator implementation details (debounce, interval).
- Response formatting micro-decisions (bullets vs paragraphs, emoji use).
- Rate-limiting implementation (defer full design to planner — basic in-memory throttle is fine).
- Bot Dockerfile specifics and Cloud Run resource sizing.
- Error message copy when the agent can't reach the platform API or when Gemini rate-limits.
- Exact prompt for embedding queries (prepend "mentor expert in:" or not).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **agent/community_assistant/platform_client.py** — httpx client with graceful error handling. Add a new `fetch_mentors_semantic(query)` method that hits the new `/api/mentorship/mentors/semantic-search` endpoint.
- **agent/community_assistant/sub_agents/mentorship_agent.py** — existing `search_mentors` + `list_expertise_categories` + `get_mentorship_process`. New `semantic_search_mentors` slots in alongside; update the agent's instruction block to prefer semantic for specific tech queries.
- **src/lib/firebaseAdmin.ts** — already-initialized Firebase Admin SDK. `scripts/embed-mentor-bios.ts` can import this directly.
- **@google/genai v1.33.0** — already in package.json, already used for course descriptions in v4.0. Supports `gemini-embedding-001` for embeddings.
- **src/app/api/mentorship/mentors/route.ts** — existing mentor GET endpoint. New `semantic-search` route lives next to it at `src/app/api/mentorship/mentors/semantic-search/route.ts`.
- **Existing Discord bot at src/lib/discord.ts** — reference only. Demonstrates discord.js patterns, rate-limit retry logic, and the non-blocking failures pattern. Do NOT reuse the token or gateway connection.
- **bjbloemker-google/discord-adk-agent** — external reference for the Python-side bot. Clone it locally for the discord.py + ADK bridge pattern, adapt to the CWA conventions.

### Established Patterns
- **Non-blocking Discord failures** — every Discord call wraps in try/catch, logs errors, never throws up to the caller. Apply to the new bot: if ADK agent is down, the bot should reply "I'm temporarily unavailable" rather than crash.
- **API-as-MCP** — Python tools call Next.js REST endpoints instead of hitting Firestore directly. This keeps business logic in one place. Extend the pattern: new semantic-search endpoint on Next.js side, Python tool calls it.
- **Firebase Admin initialized once** — `src/lib/firebaseAdmin.ts` singleton. `scripts/embed-mentor-bios.ts` imports it the same way admin API routes do.
- **Scripts in scripts/** — existing precedent for one-shot scripts (e.g., `scripts/generate-sitemap.js`). New embed script follows the same convention.
- **AES-256-GCM for secrets** — established pattern for sensitive env vars. New `CWA_ASSISTANT_DISCORD_BOT_TOKEN` goes into Secret Manager on Cloud Run deploy.

### Integration Points
- **New Next.js API route:** `src/app/api/mentorship/mentors/semantic-search/route.ts` (GET with `q` query param).
- **New Next.js script:** `scripts/embed-mentor-bios.ts` (one-shot).
- **Firestore schema addition:** `mentorship_profiles/{uid}` gains a `bioEmbedding` field (Firestore vector, 768 dims for `gemini-embedding-001`) and a `bioEmbeddingGeneratedAt` timestamp.
- **Python agent:** New file `agent/community_assistant/sub_agents/mentorship_agent.py` gains `semantic_search_mentors`; `agent/community_assistant/platform_client.py` gains `fetch_mentors_semantic`.
- **New repo subdirectory:** `agent/discord_bot/` — the discord.py bot process, its own Dockerfile, deployed separately to Cloud Run.
- **Cloud Run deployments:** Two services — `cwa-assistant-agent` (ADK via `adk deploy cloud_run`) and `cwa-assistant-bot` (discord.py via `gcloud run deploy`).
- **Secret Manager:** Store `CWA_ASSISTANT_DISCORD_BOT_TOKEN`, `GOOGLE_API_KEY` (for Gemini), and `PLATFORM_API_BASE_URL` as secrets.
- **Service accounts:** Bot service needs `run.invoker` on agent service. Agent service needs `datastore.user` (Firestore read) and `secretmanager.secretAccessor`. Minimum IAM.

</code_context>

<specifics>
## Specific Ideas

- **"Not a toy demo" framing** — the line from the email Google is evaluating. The RAG-over-bios work is what makes this claim defensible: live semantic search over real mentor bios, producing quotes the LLM can cite.
- **bjbloemker-google/discord-adk-agent sample** — Google-authored reference for the Discord+ADK wiring. Clone as a starting point, don't rebuild from scratch.
- **Google Cloud Tech "How I Built my AI Agent" series** — 5-7 minute split-screen video, presenter explains while code/agent runs live. Demo flow must be narratable in that format.
- **Live Discord community as demo surface** — users can click the link in the YouTube video description and actually use the assistant afterward. This changes the deployment story: the thing needs to keep running post-demo, not just survive the recording.
- **Demo conversation candidates to prepare:**
  - "I'm a junior React dev, any projects I can contribute to?" → projects_agent
  - "Find me a mentor who knows Angular" → mentorship_agent with semantic search → quotes Muhammad Ali's bio
  - "Show me the AI engineer roadmap" → roadmap_agent, returns what's available even if the exact query doesn't match
  - "I'm new here, where do I start?" → onboarding_agent

</specifics>

<deferred>
## Deferred Ideas

- **Real-time bio embedding updates** — Firestore trigger re-embedding on profile update. Script-based one-shot is enough for demo. Add in v2 if the agent sticks around.
- **Vertex AI Sessions + Memory Bank** — cross-restart persistence. InMemorySessionService is fine for the demo window; upgrade if users complain post-demo.
- **Slash commands / DM support** — single invocation path (@mention in one channel) for v1. Expand based on actual usage after launch.
- **Rate limiting / abuse prevention beyond basic throttle** — 4,600 active users could generate real load. For demo, basic per-user throttle; proper Firestore-backed rate limits are v2.
- **`adk eval` evaluation suite** — 20-30 curated prompts covering each sub-agent's happy path. Nice to have for polish, not blocking the filming.
- **Web frontend (AG-UI or custom)** — demo runs in Discord. Web UI is a future direction.
- **Multilingual support** — community is global but English-only is fine for the demo.
- **Observability: Cloud Trace / Cloud Logging dashboards** — basic structured logs are enough; dashboards can wait.
- **MCP server split** — for demo, tools stay inline Python functions inside the agent. Converting to a standalone MCP server is a post-demo optimization.

</deferred>

---

*Phase: 02-adk-community-assistant-for-discord-google-cloud-next-2026-demo*
*Context gathered: 2026-04-12*
