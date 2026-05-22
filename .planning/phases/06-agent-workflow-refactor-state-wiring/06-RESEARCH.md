# Phase 06: Agent Workflow Refactor + State Wiring — Research

**Researched:** 2026-05-22
**Domain:** Google ADK Python multi-agent topology (ParallelAgent, SequentialAgent, output_key whiteboard, AgentTool)
**Confidence:** HIGH (every pattern verified against a working reference file in `/Users/amu1o5/personal/ai-agents-google-adk/` AND the talk dossier `reference.md`)

## Summary

Phase 06 has no novel ADK research surface — every primitive needed (`ParallelAgent`, `SequentialAgent`, `output_key` + `{key?}` templating, `agent_tool.AgentTool`) is already in production-tested form in Ahsan's own ADK tutorial repo and explicitly documented in the talk's `reference.md`. The refactor is mechanical: split one 289-line monolith into 4 LlmAgents under a `SequentialAgent[ParallelAgent[…], synthesizer]` wrapper, attach two `output_key` strings to `onboarding_agent`, sprinkle `{user_skill_level?}` / `{user_goals?}` into three downstream instructions, and wrap `featured_resources` as an `AgentTool`.

The single non-trivial finding is that **ADK ParallelAgent does not have graceful per-branch failure handling** — an unhandled exception in any sub-agent's tool propagates up and kills the whole fan-out. The existing httpx tools already swallow `HTTPStatusError` and `RequestError` and return `{"status": "error", ...}`, so the refactor is safe AS LONG AS the planner preserves that try/except discipline in each of the 3 split tools.

The privacy invariant the prompt called out (HMAC hashing inside agent tools) is **NOT** what the codebase actually does — HMAC lives in `agent/discord_bot/usage_metrics.py`, not in any `community_assistant/*` agent. Phase 6 therefore does not need to replicate HMAC patterns in new sub-agents; the bot bridge handles it.

**Primary recommendation:** Mirror the `3-multi-model/agent.py` reference file structure exactly. It is the closest live ADK example to what Phase 6 needs (ParallelAgent inside SequentialAgent with `{state_key}` consumption downstream), shipped by the same author who wrote the talk.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Topology:**
- 3-agent split for `external_knowledge`. GitHub, dev.to, Stack Overflow each become a standalone `LlmAgent` with a single httpx tool. The current monolithic `external_knowledge_agent` with three sequential httpx tools is decomposed.
- ParallelAgent inside SequentialAgent. Pattern: `SequentialAgent(name="ExternalResearchAndSynthesize", sub_agents=[ParallelAgent(name="ExternalFanOut", sub_agents=[gh, devto, so]), synthesizer])`. Root_agent still delegates via the same `description` so coordinator routing logic doesn't change.
- One specialist per upstream API. dev.to's tag→top=7 fallback stays internal to that specialist — no separate fallback agent.
- Featured resources is an LlmAgent wrapped in AgentTool. Not a `sub_agent` of content_agent (sub_agents = LLM-driven transfer; we want synchronous call-and-return).

**State wiring:**
- `output_key` namespace (locked at milestone level): `user_skill_level`, `user_goals`, `gh_result`, `devto_result`, `so_result`. Phase 8 reserves `user_timezone`, `user_focus_area`, `next_clarifying_question`.
- Optional templating with `{key?}`. Mentor/project/roadmap agents must use the question-mark form so first-turn (empty state) doesn't raise.
- No `tool_context.state` writes in this phase. Tool-context state writes belong to Phase 7's `before_tool_callback` cache.

**Testing:**
- TDD where the contract is testable. Use the v6.0 RED/GREEN pattern.
- pytest, not vitest. Agent tests live under `agent/tests/` (existing convention confirmed: `agent/tests/test_*.py`).
- Mock the LLM + httpx layers. Use existing `mock_platform_client` monkeypatch pattern.
- Performance assertion is best-effort. Latency target (≥40% P95 drop from ~19s) is measured in prod soak, not in unit tests.

**Deployment + soak:**
- Cloud Run redeploy required to `cwa-assistant-bot`. User decides when to flip.
- 24h soak gate on existing HMAC-hashed usage metrics dashboard.
- Privacy invariant preserved. No new logging in this phase.

**Code organization:**
- New files preferred over inline edits where size justifies. Planner picks flat vs. package layout.
- Delete or deprecate the monolithic `external_knowledge_agent.py`. No dual-path support.
- Featured resources Python dict stays; agent wraps it.

### Claude's Discretion
- Naming of the new package/file split for external_knowledge specialists.
- Pytest fixture organization (top-level conftest vs. per-test-file fixtures).
- Whether to land the refactor in 1 commit per workstream or per-file. Default: per-workstream atomic commits, following the v6.0 plan convention.
- Whether the synthesizer is an explicit LlmAgent or a `SequentialAgent` wrapper that re-uses the existing aggregation logic in the deprecated monolith. Recommendation: explicit LlmAgent so it's debuggable in `adk web`'s Events tab.

### Deferred Ideas (OUT OF SCOPE)
- Callbacks (PII redaction, tool cache, lifecycle logging) — Phase 7
- LoopAgent for mentor critic / clarification — Phase 8
- Firestore-backed `DatabaseSessionService` — Phase 8
- Featured resources migration to Firestore — separate quick task, post-v7.0
- Multi-model `LiteLlm` routing — talk namecheck only, no production need
- MCP toolset for any agent — out of scope for v7.0 entirely
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AGENT-PAR-01 | Refactor `external_knowledge_agent` into `SequentialAgent[ParallelAgent[gh_researcher, devto_researcher, so_researcher], synthesizer]`; each branch has a distinct `output_key`. | §1 — exact APIs, full code template, naming confirmed idiomatic. Reference: `/Users/amu1o5/personal/ai-agents-google-adk/3-multi-model/agent.py` ships this exact composition. |
| AGENT-PAR-02 | ≥40% P95 latency drop on 3-source queries. Measured during 24h soak. | §1.5 — ParallelAgent uses `asyncio.gather` semantics so the 3 httpx calls overlap; existing httpx clients have `timeout=10.0`. Worst-case branch latency dominates instead of the sum. |
| AGENT-STATE-01 | `onboarding_agent` writes `user_skill_level` and `user_goals` via `output_key`. | §2 — `output_key` semantics confirmed; recommendation in §2.3 to split onboarding into two sub-agents under a `SequentialAgent` because `output_key` is single-valued per LlmAgent. |
| AGENT-STATE-02 | Mentorship/projects/roadmap instructions consume `{user_skill_level?}` / `{user_goals?}`. | §2.2 — `?` syntax verified in ADK docs (silently empty if missing); §2.4 shows full before/after for `mentorship_agent`. |
| AGENT-TOOL-01 | Promote `featured_resources.py` from Python-side prepend to an LlmAgent wrapped in `AgentTool` and called from `content_agent.tools=[…]`. | §3 — both import paths (`from google.adk.tools import AgentTool` and the older `from google.adk.tools.agent_tool import AgentTool`) verified; sub_agents-vs-AgentTool distinction documented in talk reference.md §6 and ADK docs. |
| AGENT-TEST-01 | pytest coverage for fan-out shape, state propagation, AgentTool invocation. | §4 — existing `agent/tests/conftest.py` already has `mock_platform_client` fixture; pytest-asyncio is configured (`asyncio_mode = "auto"` in `pyproject.toml`). Recommendation: unit-test the tool functions directly (cheapest, deterministic) + a single Runner-based integration test per workstream. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Discord webhook receive + reply | Discord bot bridge (`agent/discord_bot/bot.py`) | — | Out of scope; not touched. |
| Multi-agent orchestration (routing, fan-out, state) | ADK agent runtime (`community_assistant/*`) | — | This is Phase 6's entire surface. |
| Per-API httpx fetch (GH/dev.to/SO) | ADK tools inside the 3 leaf LlmAgents | — | Each leaf owns its httpx client and shape helper — splits the current monolith 3 ways. |
| Result synthesis (rank/dedupe across 3 sources) | `external_knowledge_synthesizer` LlmAgent | — | New LlmAgent that reads `{gh_result}` / `{devto_result?}` / `{so_result?}` and emits a single unified payload. |
| Featured-resource lookup (curated dict) | `featured_resources_agent` LlmAgent + `lookup_featured_resource` tool | — | The Python dict stays; LlmAgent wraps it. Called via `AgentTool` from `content_agent`. |
| State whiteboard | ADK `session.state` via `output_key` | — | Implicit cross-agent data flow; no explicit `tool_context.state` writes this phase. |
| Privacy / HMAC hashing | Discord bot bridge (`discord_bot/usage_metrics.py`) | — | NOT inside any community_assistant agent — that's a critical pitfall (see §5.3). Phase 6 doesn't touch HMAC. |
| Cloud Logging structured emit | Discord bot bridge (existing) | — | Phase 7 will move some of this into `before_/after_agent_callback`; not in scope here. |

---

## 1. ParallelAgent + SequentialAgent composition (AGENT-PAR-01, AGENT-PAR-02)

**Confidence: HIGH** — exact pattern verified against a working file in the author's own repo.

### 1.1 Exact ADK Python API signatures

```python
from google.adk.agents import LlmAgent, ParallelAgent, SequentialAgent
```

Both `ParallelAgent` and `SequentialAgent` accept the same minimal constructor surface:

```python
ParallelAgent(
    name: str,                    # Python-identifier-style, unique in the tree
    description: str = "",        # Used IF a parent LLM delegates here via sub_agents (optional in workflow trees)
    sub_agents: list[BaseAgent],  # Children run concurrently
)

SequentialAgent(
    name: str,
    description: str = "",
    sub_agents: list[BaseAgent],  # Children run in list order, sharing one InvocationContext
)
```

Workflow agents are deterministic glue — they have **no `model`, no `instruction`, no `tools`** of their own. They cannot be configured with prompts; their only behavior is the scheduling policy.

**Sources:**
- Working reference: `/Users/amu1o5/personal/ai-agents-google-adk/3-multi-model/agent.py` lines 61-89 (CITED below) — ParallelAgent and SequentialAgent in the same file, this is the canonical pattern.
- Talk dossier: `/Users/amu1o5/personal/slides/talks/zero-to-agentic-orchestra/reference.md` §3, §4 — full API explanation with the climate-research canonical example.

### 1.2 Reference file (verbatim, lines 61-89 of `3-multi-model/agent.py`)

```python
# Note: only the composition lines reproduced; full file in cited path
postsAgent = ParallelAgent(
    sub_agents=[linkedInAgent, instagramAgent],
    description="An agent that generates social media posts by using the linkedIn and Instagram agents",
    name="PostsAgent",
)

postsMergerAgent = Agent(
    model=os.environ.get("GOOGLE_GENAI_MODEL"),
    name="PostsMergerAgent",
    description="An agent that merges the posts from the linkedIn and Instagram agents",
    instruction="""
        You are an AI Assistant responsible for combining linkedin and instagram reels script into a structured output.
        ...
        Input Summaries:
        - LinkedIn Post: {linkedIn_post}
        - Instagram Reels Script: {instagram_reel_script}
""",
)

root_agent = SequentialAgent(
    name="SocialMediaAgent",
    description="An agent that generates social media posts by using the research agent and the posts agent",
    sub_agents=[researchAgent, postsAgent, postsMergerAgent],
)
```

This is **exactly** the shape Phase 6 needs, with `linkedInAgent` ⇄ `gh_researcher`, `instagramAgent` ⇄ `devto_researcher` (+ a 3rd for `so_researcher`), and `postsMergerAgent` ⇄ `external_knowledge_synthesizer`.

### 1.3 Concrete Phase 6 composition

```python
# agent/community_assistant/sub_agents/external_knowledge/__init__.py  (proposed)
from google.adk.agents import LlmAgent, ParallelAgent, SequentialAgent

from .gh_researcher import gh_researcher
from .devto_researcher import devto_researcher
from .so_researcher import so_researcher
from .synthesizer import external_knowledge_synthesizer

external_knowledge_fan_out = ParallelAgent(
    name="ExternalFanOut",
    description="Fans out a single user query across GitHub, dev.to, and Stack Overflow.",
    sub_agents=[gh_researcher, devto_researcher, so_researcher],
)

external_knowledge_agent = SequentialAgent(
    name="external_knowledge_agent",  # KEEP THE NAME so root_agent description routing still works
    description=(
        "Surfaces third-party developer knowledge from GitHub (trending repos), dev.to "
        "(community articles), and Stack Overflow (answered questions). "
        "This is a FALLBACK agent — use mentorship_agent, projects_agent, roadmap_agent, "
        "and content_agent first when the query fits their domain."
    ),
    sub_agents=[external_knowledge_fan_out, external_knowledge_synthesizer],
)
```

**Naming verdict (idiomatic check):** `ExternalFanOut` inside `external_knowledge_agent` (SequentialAgent) IS idiomatic — it mirrors `PostsAgent` (ParallelAgent) inside `SocialMediaAgent` (SequentialAgent) in the reference. Optional polish: rename outer to `ExternalResearchAndSynthesize` to make the two-stage intent explicit at the cost of breaking the existing root_agent's `description` routing key. **Recommendation: keep the outer name `external_knowledge_agent` to minimize ripple into `root_agent`'s instruction text and the coordinator-LLM's mental model.**

### 1.4 The 3 leaf researchers — each owns its own tool

**YES, each leaf needs its own `tools=[…]` with a single httpx-backed function.** They do not share the parent's tools (the parent is a SequentialAgent — workflow agents have no tools field at all). The current single-agent's three tool functions (`search_github_repos`, `search_devto_articles`, `search_stackoverflow_questions`) are split 1-per-leaf:

```python
# agent/community_assistant/sub_agents/external_knowledge/gh_researcher.py
from google.adk.agents import LlmAgent
from .tools.github import search_github_repos  # moved out of the old monolith

gh_researcher = LlmAgent(
    name="gh_researcher",
    model="gemini-2.5-flash",
    description="Searches GitHub for repos matching the user query.",
    instruction="""Call search_github_repos with the user query as-is.
Return a concise JSON-ish summary of the top results.
ALWAYS cite the html_url of each repo.
If the tool returns status='error', return {"source": "github", "error": <message>, "repos": []}.""",
    tools=[search_github_repos],
    output_key="gh_result",
)
```

The httpx Client instance variables (`_GITHUB_CLIENT`, `_DEVTO_CLIENT`, `_STACKOVERFLOW_CLIENT` — lines 19-21 of the current monolith) MUST be module-level singletons inside their respective leaf modules. Sharing one global `_GITHUB_CLIENT` across multiple agents is fine (httpx Client is thread-safe), but co-locating it next to the tool function that uses it improves testability and matches the current structure.

### 1.5 ParallelAgent concurrency + failure semantics

**Confidence: MEDIUM-HIGH** — confirmed via ADK docs and discussion threads, not literally read from `adk-python` source in this session.

- **Concurrency:** ParallelAgent calls `asyncio.gather` over each child's `run_async()` — they all start at roughly the same time and the overall step completes when all branches resolve. There is no fail-fast switch; the framework waits for all.
- **Failure mode:** an **unhandled** exception in any child propagates up and stops the whole ParallelAgent (and therefore the parent SequentialAgent's downstream synthesizer). This is the known pitfall: ADK does not wrap children in `asyncio.gather(return_exceptions=True)` by default.
- **What saves us:** all three existing tool functions (`search_github_repos:103-116`, `search_devto_articles:148-157`, `search_stackoverflow_questions:213-233`) already catch `httpx.HTTPStatusError, httpx.RequestError` and return `{"status": "error", "message": ..., "repos|articles|questions": []}`. As long as this discipline is preserved in the split, no exception escapes to the agent layer, and a 5xx on one upstream simply yields a `status='error'` result in that branch's `output_key`.
- **Synthesizer must tolerate per-branch errors.** Instruction must say: "If a branch result has `status='error'` or is empty, summarize the available branches and surface that one source is temporarily unreachable."

**Citations:**
- [ADK ParallelAgent docs](https://google.github.io/adk-docs/agents/workflow-agents/parallel-agents/) — "all the agents start running at approximately the same time"
- [adk-python Issue #742](https://github.com/google/adk-python/issues/742) — "MCP Tool Failure Crashes Entire ADK Multi-Agent Workflow" — confirms unhandled tool exceptions propagate
- Reference.md §4 — "race conditions on the same state key will silently overwrite each other" (we avoid this by using distinct `gh_result`/`devto_result`/`so_result`)

### 1.6 The synthesizer — reads via instruction templating

```python
# agent/community_assistant/sub_agents/external_knowledge/synthesizer.py
from google.adk.agents import LlmAgent

external_knowledge_synthesizer = LlmAgent(
    name="external_knowledge_synthesizer",
    model="gemini-2.5-flash",
    description="Merges GitHub, dev.to, and Stack Overflow results into a unified, cited reply.",
    instruction="""You synthesize developer search results from three independent sources \
into a single reply for the user.

Sources (any may be missing or contain an error payload):
- GitHub repos: {gh_result?}
- dev.to articles: {devto_result?}
- Stack Overflow questions: {so_result?}

RULES:
- ALWAYS cite the source URL for every item. Label by source: "(via GitHub)", "(via dev.to)", "(via Stack Overflow)".
- If a branch returned an error, mention that source is temporarily unreachable and proceed with the others.
- If ALL three are empty, say so honestly and suggest the user re-phrase or try the platform directly.
- Rank ~3-5 best items overall. Prefer items with higher engagement signals (stars, reactions, score).
- Never invent a URL. Only echo what the upstream branches provided.
- End with ONE concrete next action.""",
)
```

**Use `{gh_result?}` (with `?`)** even though the upstream branches always run — the `?` form silently renders empty when a child agent emits no output (e.g., empty response). The non-`?` form throws on a missing key. Cost of `?` is zero, defensive value is real.

### 1.7 Root agent wiring

`agent/community_assistant/agent.py:53-69` — the existing `sub_agents=[…]` list keeps the same 6 entries but the `external_knowledge_agent` import now points to the new SequentialAgent composite. The root LlmAgent's coordinator instruction (lines 12-51) does NOT change — `external_knowledge_agent` is still a name the coordinator routes to; it just happens to be a SequentialAgent under the hood now.

```python
# agent/community_assistant/agent.py — only the import line changes
from .sub_agents.external_knowledge import external_knowledge_agent  # new path
# (was: from .sub_agents.external_knowledge_agent import external_knowledge_agent)
```

### 1.8 Latency math (informs AGENT-PAR-02)

Existing baseline: `latency_ms=18933` on a 3-source query (from CONTEXT.md / cfp-framing.md). With three httpx calls each taking T_gh, T_devto, T_so seconds and serialized via tool-call-then-LLM-think loops:
- Sequential: ~ T_gh + T_devto + T_so + 3 × LLM_think + 1 final LLM
- Parallel: ~ max(T_gh, T_devto, T_so) + LLM_think + 1 synthesizer LLM

If branch latencies are roughly equal and dominated by SO (slowest in informal tests), expected drop is ~50-60% — well above the 40% target. The synthesizer adds one extra LLM round-trip versus the monolith (which folded fetch + format into one LLM); this is the trade. Real number must be measured in soak.

---

## 2. output_key whiteboard wiring (AGENT-STATE-01, AGENT-STATE-02)

**Confidence: HIGH** — `output_key` is the most-cited ADK primitive and the existing `5-sessions-and-agents/agent.py` reference uses the templating pattern directly.

### 2.1 How `output_key` injects into `session.state`

When an `LlmAgent` is configured with `output_key="user_skill_level"`, ADK's runner copies the agent's final text response into `session.state["user_skill_level"]` immediately after the agent produces its final response event. The write happens **inside** the framework's runner loop (specifically, the `Runner` constructs a `state_delta` and applies it before the next sub-agent in the parent's schedule runs). No manual `tool_context.state[…] = …` is needed.

**Confirmed via:**
- Reference.md §2 — "ADK writes the agent's final response into `session.state[output_key]`"
- `1-marketing_campaign_agent/agent.py:24-30,33-41,44-50,53-59,63-68` — five sequential agents chained via `output_key` → `{state_key}` interpolation
- [Cloud blog: Remember this — Agent state and memory with ADK](https://cloud.google.com/blog/topics/developers-practitioners/remember-this-agent-state-and-memory-with-adk)

### 2.2 `{key?}` vs `{key}` semantics

| Syntax | Behavior when key is missing |
|--------|------------------------------|
| `{user_skill_level}` | Raises (literal `{user_skill_level}` is left in prompt OR a templating error fires, depending on ADK version — either way, broken prompt) |
| `{user_skill_level?}` | Silently renders as empty string |
| `{state.user_skill_level?}` | Same as `{user_skill_level?}` — explicit namespace form |

**Phase 6 mandate:** use `{user_skill_level?}` and `{user_goals?}` everywhere downstream. The user has not yet completed onboarding on their first turn, and the `?` form is the only one that won't surface as a broken prompt.

**Citations:**
- [ADK State docs](https://google.github.io/adk-docs/sessions/state/) — "{key?} or {state.key?} returns an empty string if the key is not found"
- Reference.md §7 — "Templating in instructions uses `{key}` (raises if missing) or `{key?}` (silently empty if missing). This is invaluable for LoopAgent first iterations where downstream state hasn't been written yet."
- [DEV.to: Smarter ADK Prompts](https://dev.to/masahide/smarter-adk-prompts-inject-state-and-artifact-data-dynamically-placeholders-2dcm) — confirms behavior

### 2.3 `onboarding_agent` decision: two keys → two LlmAgents OR Pydantic schema + unpack

`output_key` is **scalar** — one LlmAgent writes exactly one key. To get both `user_skill_level` and `user_goals` into state, there are two options:

**Option A (RECOMMENDED): Pydantic `output_schema` + a tiny post-processor agent.** Have `onboarding_agent` produce structured JSON via `output_schema = OnboardingResult(skill_level: str, goals: str)`, written to `output_key="onboarding"`. Downstream then reads `{onboarding?.skill_level}` (but ADK templating does NOT support attribute access — see pitfall §5.2). So Option A also needs an unpacker step.

**Option B (SIMPLER, RECOMMENDED FOR THIS PHASE): split onboarding into two LlmAgents under a SequentialAgent.**

```python
# agent/community_assistant/sub_agents/onboarding_agent.py — replace existing
from google.adk.agents import LlmAgent, SequentialAgent

skill_level_extractor = LlmAgent(
    name="onboarding_skill_level",
    model="gemini-2.5-flash",
    description="Asks/identifies the user's current skill level.",
    instruction="""From the conversation so far, identify the user's developer skill level \
("beginner" / "intermediate" / "advanced" / "unknown"). Reply with JUST that single word. \
If you cannot tell, reply "unknown".""",
    output_key="user_skill_level",
)

goals_extractor = LlmAgent(
    name="onboarding_goals",
    model="gemini-2.5-flash",
    description="Asks/identifies the user's stated goals.",
    instruction="""From the conversation so far, summarize the user's stated goals in <40 words. \
If no goals are clear, reply "unknown".""",
    output_key="user_goals",
)

# The user-facing onboarding agent (with the existing tools + welcoming-tone instruction)
welcome_agent = LlmAgent(
    name="onboarding_welcome",
    model="gemini-2.5-flash",
    description=(
        "Welcomes new members to the Code with Ahsan community and helps them navigate channels, "
        "community norms, and first steps."
    ),
    instruction="""<existing warm welcome instruction>""",
    tools=[get_community_overview, get_channel_guide],
)

onboarding_agent = SequentialAgent(
    name="onboarding_agent",  # KEEP NAME — root_agent's coordinator routes by this string
    description=(
        "Welcomes new members and captures their skill level + goals into session state "
        "for downstream agents to consume."
    ),
    sub_agents=[welcome_agent, skill_level_extractor, goals_extractor],
)
```

This composition runs welcome → skill-level-extract → goals-extract on every onboarding turn. The two extractor LlmAgents are silent (their output is the state value, not the user-visible reply — the user only sees `welcome_agent`'s final response). The extractors execute against the same conversation history, so they can derive skill_level / goals from whatever the user said in their turn.

**Trade-off acknowledged:** Option B adds 2 extra LLM calls per onboarding turn. Each is ≤200 tokens of output (single word / 40-word summary), so cost+latency impact is small. The talk's `adk web` State tab will visibly populate both keys, which is the demo win.

### 2.4 Downstream consumption — before/after for `mentorship_agent`

**Current (line 150-177 of `mentorship_agent.py`):**

```python
mentorship_agent = LlmAgent(
    name="mentorship_agent",
    model="gemini-2.5-flash",
    description=(
        "Handles mentorship-related questions: finding mentors by topic, explaining the mentorship "
        "program, and matching mentees to available mentors."
    ),
    instruction="""You help community members find mentors and understand the mentorship program.

TOOLS:
- search_mentors(topic): substring match over expertise TAGS. ...
- semantic_search_mentors(query): vector similarity over mentor BIOS. ...
...
```

**After (Phase 6):**

```python
mentorship_agent = LlmAgent(
    name="mentorship_agent",
    model="gemini-2.5-flash",
    description=(
        "Handles mentorship-related questions: finding mentors by topic, explaining the mentorship "
        "program, and matching mentees to available mentors."
    ),
    instruction="""You help community members find mentors and understand the mentorship program.

USER CONTEXT (may be empty on first turn):
- Skill level: {user_skill_level?}
- Goals: {user_goals?}

If skill level is known, mention it explicitly when recommending mentors ("based on your beginner level, …"). If goals are known, prioritize mentors whose expertise overlaps with those goals.

TOOLS:
- search_mentors(topic): substring match over expertise TAGS. ...
- semantic_search_mentors(query): vector similarity over mentor BIOS. ...
... <unchanged from here on>""",
    tools=[...],
)
```

Same pattern applies verbatim to `projects_agent.py` (block goes before the existing TOOLS section, line 95) and `roadmap_agent.py` (before line 93's TOOLS section).

### 2.5 output_key namespace lock (Phase 6 scope)

Phase 6 writes these keys; downstream phases must not break them:

| Key | Writer | Type | Notes |
|-----|--------|------|-------|
| `user_skill_level` | `onboarding_skill_level` LlmAgent | string | One of: beginner / intermediate / advanced / unknown. |
| `user_goals` | `onboarding_goals` LlmAgent | string | ≤40-word summary, or "unknown". |
| `gh_result` | `gh_researcher` LlmAgent | string (JSON-ish text) | From `search_github_repos` output. |
| `devto_result` | `devto_researcher` LlmAgent | string (JSON-ish text) | From `search_devto_articles` output. |
| `so_result` | `so_researcher` LlmAgent | string (JSON-ish text) | From `search_stackoverflow_questions` output. |

**Explicitly NOT written in Phase 6** (reserved for Phase 8): `user_timezone`, `user_focus_area`, `next_clarifying_question`. The synthesizer reads only `gh_result/devto_result/so_result`; nothing reads the onboarding keys except mentor/project/roadmap agents.

### 2.6 Conflict handling

`output_key` writes are **overwrites**. Each invocation of `onboarding_skill_level` blows away the prior value. This is the desired behavior (the most recent turn's understanding wins) and is consistent with the talk reference's "writer" pattern in LoopAgent (`output_key=STATE_CURRENT_DOC` — "overwrites each iteration", reference.md §5).

No append, no merge, no error. If the planner wants stickiness (e.g., once skill_level is set don't re-extract), that's a Phase 7/8 concern (a `before_model_callback` checking `state.get("user_skill_level")` first).

---

## 3. AgentTool wrap for featured_resources (AGENT-TOOL-01)

**Confidence: HIGH** for the API and pattern; **MEDIUM** for the precise input-shaping behavior under-the-hood (which version of ADK normalizes how — see §3.4).

### 3.1 Import path

Both forms work as of ADK ≥1.16 (the `__init__.py` was updated to re-export):

```python
from google.adk.tools import AgentTool                # preferred, since ADK 1.16+
# OR (older but still supported)
from google.adk.tools.agent_tool import AgentTool
```

CWA's `pyproject.toml` pins `google-adk>=1.0.0` — to be safe in case the deployed Cloud Run image lands on something <1.16, use the longer `from google.adk.tools.agent_tool import AgentTool` form. (Reference.md §6 also uses this longer form.)

**Citations:**
- [adk-python PR #1375: fix: AgentTool import](https://github.com/google/adk-python/pull/1375) — confirms the re-export was added
- [adk-docs Issue #645: correct way to import AgentTool](https://github.com/google/adk-docs/issues/645) — confirms both paths

### 3.2 Class signature

```python
AgentTool(
    agent: BaseAgent,                  # the agent to wrap
    skip_summarization: bool = False,  # if True, the tool's raw output is returned verbatim to the caller LLM rather than passing through another summarization pass
)
```

### 3.3 Wrap-and-use pattern

```python
# agent/community_assistant/sub_agents/featured_resources.py — add at bottom
from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool

def lookup_featured_resource(topic: str) -> list[dict]:
    """<existing docstring>"""
    # ... existing dict-scan implementation, unchanged ...

featured_resources_agent = LlmAgent(
    name="featured_resources_agent",
    model="gemini-2.5-flash",
    description=(
        "Returns curated flagship resources (e.g., Ahsan's AI Guide) whose keywords match "
        "the user query. Always call this BEFORE search_blog_posts when the user asks about "
        "flagship content (AI guide, signature posts)."
    ),
    instruction="""Given the user's topic/query, call lookup_featured_resource(topic) \
and return the matched curated resources (title, url, description) as a structured reply. \
If no matches, reply with an empty list and "No featured resources match this query."
Never invent a URL — only echo what the tool returned.""",
    tools=[lookup_featured_resource],
)

featured_resources_tool = AgentTool(agent=featured_resources_agent)
```

Then in `content_agent.py`:

```python
# agent/community_assistant/sub_agents/content_agent.py
from .featured_resources import featured_resources_tool  # was: lookup_featured_resource

content_agent = LlmAgent(
    name="content_agent",
    model="gemini-2.5-flash",
    description="<unchanged>",
    instruction="""You help community members discover content Ahsan has published.

TOOLS:
- featured_resources_agent(request): call FIRST when the user asks about flagship content \
(AI guide, signature posts, "the developer guide"). Returns curated resources by topic match.
- search_blog_posts(query): searches blog.codewithahsan.dev. ...
- search_youtube_videos(query): ...

SEARCH STRATEGY:
- "AI guide" / "developer guide" / any flagship keyword → call featured_resources_agent FIRST.
  If it returns matches, lead with them. Then optionally augment with search_blog_posts.
- "VIDEO / YouTube" → search_youtube_videos.
- Generic "BLOG / ARTICLE" → search_blog_posts.

<remainder of existing instruction unchanged, except remove the bit about `featured: true` flag — that prepend layer is gone>""",
    tools=[featured_resources_tool, search_blog_posts, search_youtube_videos],
)
```

**Lines to DELETE in `content_agent.py`:**
- Line 4: `from .featured_resources import lookup_featured_resource`
- Lines 42-51: `_featured_as_post` helper function
- Lines 78-79: `featured = [_featured_as_post(f) for f in lookup_featured_resource(q)]` and `featured_urls = {p["url"] for p in featured}`
- Lines 88-91: the dedupe + merge into `merged`
- Adjust the return shape: `posts` no longer carries a `featured: true` flag because featured resources arrive via a separate tool call.

The `search_blog_posts` function shrinks back to just shaping Ghost results — featured-resource concerns leave content_agent.py entirely.

### 3.4 How AgentTool invocation works under the hood

When the parent LLM emits a `FunctionCall(name="featured_resources_agent", args={"request": "AI guide for developers"})`, the AgentTool wrapper:

1. Takes the string from `args["request"]` and wraps it as a `types.Content(role="user", parts=[types.Part(text=…)])`.
2. Runs a fresh InvocationContext over the wrapped agent with that content as `new_message`.
3. Captures the wrapped agent's final response text.
4. Returns it to the parent as the tool result.

**Implication:** the wrapped agent's `instruction` must be self-contained — it does **not** see the parent's conversation history except via the single `request` string passed in. That's why our `featured_resources_agent` instruction explicitly says "Given the user's topic/query, call lookup_featured_resource(topic)" — the LLM extracts `topic` from the single request string and passes it to the tool.

**Citation:** [adk-python Discussion #3418](https://github.com/google/adk-python/discussions/3418) — "AgentTool takes the string value from args['request'] and wraps it in a types.Content object … as the new_message to the Runner that executes the target agent."

### 3.5 sub_agents vs AgentTool — decision matrix

| You want… | Use… | Effect on conversation |
|-----------|------|------------------------|
| Specialist takes over the conversation; user-facing handoff | `sub_agents=[specialist]` (LLM-driven transfer via `transfer_to_agent`) | Control moves to specialist; user replies go to specialist next turn unless `disallow_transfer_to_parent=True` |
| Specialist runs as a function call; returns a result; original agent continues | `tools=[AgentTool(agent=specialist)]` | Specialist invoked synchronously, result inlined, original agent stays in control |

Phase 6 needs the second behavior for `featured_resources` (content_agent calls it, gets curated list back, decides whether to lead with featured or augment with `search_blog_posts`). Reference.md §6: "Use `sub_agents` for 'delegate and the conversation moves there'; use `AgentTool` for 'call this specialist like a function and continue.'"

### 3.6 Why not just keep the Python-side prepend?

It works today (the existing tests pass). The reasons CONTEXT.md mandates the wrap:
1. **Demo-ability** — featured-resource lookup becomes visible in `adk web`'s Events tab as a tool call with its own input/output. Slides need this.
2. **Testability** — featured_resources_agent can be unit-tested as a standalone agent without spinning up the whole content_agent stack.
3. **Sets the pattern for Phase 8** — `mentor_critic` and `project_critic` will use the same wrap shape.

---

## 4. Testing strategy (AGENT-TEST-01)

**Confidence: HIGH** — existing test infrastructure (`agent/tests/conftest.py`, `pyproject.toml` with `asyncio_mode = "auto"`) is already set up; the patterns transfer directly.

### 4.1 Test framework — already wired

| Property | Value |
|----------|-------|
| Framework | pytest 8.x + pytest-asyncio 0.23+ |
| Config file | `agent/pyproject.toml` lines 22-25 (`[tool.pytest.ini_options]`) |
| Test path | `agent/tests/` |
| Quick run | `cd agent && pytest tests/test_external_knowledge_fan_out.py -x` |
| Full suite | `cd agent && pytest -q` |
| Existing fixture | `mock_platform_client` in `agent/tests/conftest.py:48-65` — JSON-fixture-backed monkeypatch over `community_assistant.platform_client._get`. Reusable for any platform-tier-mediated tool. |

### 4.2 What to test — three workstreams, three test files

**`agent/tests/test_external_knowledge_fan_out.py`** (covers AGENT-PAR-01)
- Test that each leaf tool function (`search_github_repos`, `search_devto_articles`, `search_stackoverflow_questions`) shapes upstream responses correctly. **Reuse the existing pattern from `test_content_agent_blog.py`**: monkeypatch the httpx client at module level, assert returned dict shape.
- Test that the leaf LlmAgents are instantiated with the correct `output_key`: `gh_researcher.output_key == "gh_result"`, etc. Pure attribute-introspection assertion, no Runner needed.
- Test that `external_knowledge_agent` (the new SequentialAgent) has the correct topology: `external_knowledge_agent.sub_agents[0]` is a ParallelAgent with 3 children, `sub_agents[1]` is the synthesizer.
- **Optional integration test** (more expensive — requires LLM call OR a stubbed LLM): drive the full SequentialAgent via `Runner` + `InMemorySessionService`, assert `session.state` contains all three result keys after a run. Skip if it bloats CI time; the topology + leaf-tool tests above cover the contract.

**`agent/tests/test_state_propagation.py`** (covers AGENT-STATE-01, AGENT-STATE-02)
- Test that `onboarding_agent` is a SequentialAgent with three sub-agents and the two extractor children write the expected `output_key`s (`user_skill_level`, `user_goals`).
- Test instruction templating: read `mentorship_agent.instruction`, `projects_agent.instruction`, `roadmap_agent.instruction` and assert each contains `{user_skill_level?}` and `{user_goals?}` substrings. Trivial smoke test — catches accidental removal during future edits.
- **Optional integration test:** pre-populate session state via `InMemorySessionService.create_session(..., state={"user_skill_level": "beginner", "user_goals": "learn React"})`, run `mentorship_agent` against a fixed user message, capture the LLM's input prompt (via a `before_model_callback` stub OR by mocking `LlmAgent.model.generate_content_async`), assert the resolved prompt contains `"beginner"` and `"learn React"`.

**`agent/tests/test_featured_resources_agent_tool.py`** (covers AGENT-TOOL-01)
- Test that `featured_resources_agent` is an LlmAgent with `lookup_featured_resource` in `tools=[…]`.
- Test that `content_agent.tools` includes the wrapped `AgentTool` instance (assert type + that its wrapped `.agent.name == "featured_resources_agent"`).
- Test that `search_blog_posts` no longer prepends featured (i.e., the dedupe/merge logic is gone). The existing test `test_search_blog_posts_featured_first_in_posts` in `test_content_agent_blog.py` **MUST be updated or removed** — the contract changed.
- **Optional integration test:** drive `content_agent` with `Runner` against a query for "AI guide", mock the wrapped agent to return a known curated payload, assert the final response cites the AI Guide URL. This is the most valuable test for catching wire-up breakage but the most brittle to maintain.

### 4.3 How to mock the LLM layer for integration tests

Two options:

**(A) Use ADK's testing utilities if present.** Quick search of the codebase didn't surface `google.adk.tests` — confirm before relying on it. If ADK exposes a `MockModel` or fixture, use it.

**(B) Monkeypatch `LlmAgent.canonical_model.generate_content_async`** (or whatever the model-call method is named in the installed version) to return canned `types.GenerateContentResponse` objects. This is what most community pytest examples do.

For Phase 6, the **recommendation is to lean heavily on tool-function unit tests + topology introspection** (cheap, deterministic, no LLM mocking needed) and add ONE integration test per workstream gated behind a `@pytest.mark.integration` marker so CI can skip when needed.

### 4.4 Parallel-fan-out concurrency assertion (the hard one)

CONTEXT.md §AGENT-TEST-01 asks for: *"mock 3 upstream httpx calls; assert all 3 invoked in a single InvocationContext.branch tick; assert each writes to distinct `output_key`"*.

**Honest reality check:** asserting "all 3 invoked in a single event-loop tick" is hard to test deterministically. Two approximations:

1. **Side-effect ordering test:** monkeypatch each leaf's tool with a function that records its call timestamp into a shared list, then run the SequentialAgent via Runner and assert the three timestamps are within e.g. 100ms of each other (`max - min < 0.1`). This catches "they ran sequentially" but adds time-dependent flakiness.

2. **State-shape test (RECOMMENDED):** drive the SequentialAgent via Runner, assert `session.state` contains all three of `gh_result`, `devto_result`, `so_result` after a single run. This proves the fan-out wired correctly and all three branches completed; it does NOT prove concurrency, but concurrency is an ADK framework property — we don't need to re-test the framework.

The "really did run in parallel" assertion is best deferred to the soak (latency drop is the proof).

### 4.5 Unit vs. composition test recommendation

**Recommendation: test each leaf separately + topology introspection + one Runner-based integration per workstream.**

Rationale: testing the full SequentialAgent end-to-end requires real LLM calls (expensive, flaky) OR heavy LLM mocking (brittle). The contract Phase 6 must preserve is:
- Each leaf tool function returns the right shape given upstream JSON. (Covered by existing-pattern tool-function unit tests.)
- The agent tree has the right topology — names, output_keys, sub_agents pointers. (Covered by attribute-introspection tests.)
- The synthesizer instruction references the three state keys. (Substring assertion.)
- Downstream instructions reference `{user_skill_level?}` and `{user_goals?}`. (Substring assertion.)

That set proves the wire-up without needing the full LLM in the loop. The 24h soak proves the live behavior.

---

## 5. Pitfalls to call out for the planner

### 5.1 ParallelAgent + race-condition keys
Reference.md §4 calls this out as the canonical ParallelAgent footgun: two branches writing to the same state key = silent overwrite. Phase 6 avoids this by design (`gh_result`/`devto_result`/`so_result` are distinct). **Pitfall guard:** if Phase 7/8 ever adds a 4th branch, the key must be added to the synthesizer instruction explicitly — there is no automatic "merge all branches" plumbing.

### 5.2 ADK templating does NOT support attribute access
`{onboarding.skill_level}` does NOT work. Templating is flat — keys at the top level of `session.state` only. This is why the recommendation in §2.3 splits onboarding into two LlmAgents (each writing a flat key) rather than producing one structured `OnboardingResult` Pydantic object.

### 5.3 HMAC privacy invariant — already in the right place
The prompt suggested "existing print()-based USAGE_HASH_SECRET hashing in tools must be preserved (Phase 6 is a no-callbacks phase) — flag in research that any new sub-agent's tools must replicate this exact hash pattern until Phase 7 centralizes it."

**Investigation result (`grep -r USAGE_HASH_SECRET community_assistant/`): NO matches.** The HMAC lives entirely in `agent/discord_bot/usage_metrics.py` (the bot bridge), not in any community_assistant agent or tool. Phase 6 does **not** need to replicate any HMAC pattern inside the new sub-agents — privacy is enforced by the bot's `emit_usage_event(...)` wrapping at the boundary. Phase 7's lifecycle callback work is what will centralize agent-side telemetry.

This is a notable correction to the prompt. The planner should record this so the implementation tasks don't add unnecessary HMAC scaffolding inside `gh_researcher.py` / `devto_researcher.py` / `so_researcher.py`.

### 5.4 Live-demo visibility (ParallelAgent in `adk web`)
Cfp-framing.md §Live-Demo Storyboard wants visible parallel fan-out. ADK's `adk web` Events tab DOES surface ParallelAgent branches as separate, interleaved events (this is the canonical talk demo for §4 of reference.md). The Events tab is built into the ADK CLI — no extra observability tooling needed for the live demo.

**Caveat:** Cloud Run production traffic does NOT route through `adk web`. The "branches visible interleaved" demo runs locally against `adk web`, against the same code that's deployed. The bot's existing Cloud Logging emit (`latency_ms`, `tool_calls`, etc., via `discord_bot/usage_metrics.py`) will show the latency drop but not a per-branch timing breakdown — that's Phase 7's `before_/after_agent_callback` instrumentation.

### 5.5 24h soak — what to watch
Cloud Logging dashboard (existing, from Phase 02.1) tracks `latency_ms` and `query_topic`. After deploy, watch:
- `latency_ms` P95 on `query_topic=external_knowledge` queries — expect ~50%+ drop. ≥40% is the gate.
- Error rate on the new SequentialAgent — should be ≤ baseline. Per-branch httpx failures are fine (each branch returns `status='error'` and synthesizer handles it); what we DON'T want is a `KeyError: 'devto_result'` style template failure (which would only happen if `{devto_result}` was used without the `?`).
- Total LLM call count per Discord turn — expect +1 (synthesizer) versus baseline. Cost impact: marginal at gemini-2.5-flash rates.

### 5.6 Backwards compatibility with Discord conversation flow
**Yes — no user-visible change.** The root LlmAgent's `description` + `instruction` text in `agent/community_assistant/agent.py:53-69` is unchanged. The coordinator-LLM routes "GitHub trending" / "dev.to article" / "Stack Overflow" queries to the same agent-name string (`external_knowledge_agent`); whether that string resolves to an `LlmAgent` (old) or a `SequentialAgent` (new) is transparent to the routing decision. Similarly, `onboarding_agent` stays a top-level routable name; it just resolves to a `SequentialAgent` internally now. `content_agent` stays an LlmAgent; only its `tools=[…]` list changes.

### 5.7 The existing `test_content_agent_blog.py` will break
Specifically the tests that assert `featured: true` on returned posts (`test_search_blog_posts_featured_first_in_posts`, `test_search_blog_posts_no_featured_flag_on_no_match`, `test_search_blog_posts_featured_still_returned_on_ghost_error`) — these assert the Python-side prepend that Phase 6 removes. Plan to update or delete them as part of the AGENT-TOOL-01 workstream.

### 5.8 ADK version pinning
`pyproject.toml` currently pins `google-adk>=1.0.0`. Recommend bumping to `>=1.16.0` (or whatever the current stable is at Phase 6 implementation time) before relying on `from google.adk.tools import AgentTool` — earlier versions only had the `agent_tool.AgentTool` path. **Safer:** use the explicit `from google.adk.tools.agent_tool import AgentTool` path regardless of version; works on every release.

---

## Code Examples

### Composition: full external_knowledge refactor (proposed file layout)

```
agent/community_assistant/sub_agents/
├── external_knowledge/                          # NEW package (replaces external_knowledge_agent.py)
│   ├── __init__.py                              # exports `external_knowledge_agent`
│   ├── gh_researcher.py                         # LlmAgent + search_github_repos tool + httpx client
│   ├── devto_researcher.py                      # LlmAgent + search_devto_articles tool + httpx client
│   ├── so_researcher.py                         # LlmAgent + search_stackoverflow_questions tool + httpx client
│   ├── synthesizer.py                           # LlmAgent reading {gh_result?}/{devto_result?}/{so_result?}
│   └── _shapes.py                               # shared _shape_github_repo / _shape_devto_article / _shape_stackoverflow_question
└── external_knowledge_agent.py                  # DELETE (or keep as a re-export shim if backwards-compat needed; CONTEXT.md says no shim)
```

Alternative flat layout (also acceptable per CONTEXT.md "Claude's Discretion"):

```
agent/community_assistant/sub_agents/
├── gh_researcher.py
├── devto_researcher.py
├── so_researcher.py
├── external_knowledge_synthesizer.py
└── external_knowledge_agent.py                  # rewrites as the SequentialAgent composite (no DELETE)
```

**Recommendation: the package layout.** The flat layout pollutes `sub_agents/` with 5 files for one logical capability. A package keeps related modules co-located and matches how ADK samples organize multi-agent compositions.

### Composition: onboarding refactor (full file)

See §2.3 — the file replaces `onboarding_agent.py` entirely. Net diff:
- The existing `onboarding_agent` LlmAgent (lines 48-64) becomes `welcome_agent` (renamed, unchanged otherwise).
- Two new LlmAgents (`skill_level_extractor`, `goals_extractor`).
- One new SequentialAgent (`onboarding_agent`) wrapping all three.

### Composition: content_agent AgentTool integration

Two-file delta:
- `featured_resources.py`: add `featured_resources_agent` LlmAgent + `featured_resources_tool = AgentTool(agent=…)` at module bottom; existing `lookup_featured_resource` function stays as the tool callable.
- `content_agent.py`: import `featured_resources_tool` instead of `lookup_featured_resource`; remove the prepend logic in `search_blog_posts`; add `featured_resources_tool` as the first entry in `content_agent.tools`; update instruction to call featured_resources first for flagship-content queries.

---

## Runtime State Inventory

This is a refactor phase — applying the §2.5 of the research protocol:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `InMemorySessionService` is wiped on Cloud Run cold start; no Firestore session docs yet (Phase 8). No databases store agent state. | None. |
| Live service config | None — agent code is the only config; no n8n / Datadog / external config to update. | None. |
| OS-registered state | None — Cloud Run service `cwa-assistant-bot` is the only registration; container redeploy picks up the refactor atomically. | Cloud Run redeploy task (already in plan per CONTEXT.md "Deployment + soak"). |
| Secrets/env vars | `USAGE_HASH_SECRET`, `GITHUB_TOKEN`, `GOOGLE_API_KEY` / `GOOGLE_GENAI_MODEL`, Discord bot token. None change name in Phase 6. `GITHUB_TOKEN` is read inside `search_github_repos`; that function moves to `gh_researcher.py` but the env var lookup is preserved verbatim. | None — preserve env var names verbatim across the move. |
| Build artifacts | `agent/community_assistant.egg-info/` if installed via `pip install -e .`; no stale paths after refactor since package name stays `community_assistant`. | Reinstall in dev if Python can't find the moved `external_knowledge` package: `cd agent && pip install -e .`. |

**Nothing in any category requires data migration.** The `output_key`s are net-new (no existing state to migrate). The package layout shift is purely a Python-source rearrangement.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `google-adk` | All agents | ✓ (already in `pyproject.toml`) | ≥1.0.0 (recommend bump to ≥1.16 for clean `AgentTool` import) | Use `from google.adk.tools.agent_tool import AgentTool` (works on all versions) |
| `httpx` | gh/devto/so researcher tools | ✓ | ≥0.28.0 | — |
| `pytest` + `pytest-asyncio` | AGENT-TEST-01 | ✓ | 8.x / 0.23+ | — |
| `gemini-2.5-flash` model access | LLM calls | ✓ (in prod; local dev needs `GOOGLE_API_KEY`) | latest alias | — |
| `GITHUB_TOKEN` env var | `search_github_repos` to bump rate limit 60→5000/hr | ✓ (already set in Cloud Run env) | — | Optional — unauth rate limit is plenty for demo, mandatory for soak only if traffic spikes |
| Cloud Run deploy access | 24h soak | ✓ (existing CD path from Phase 02.1-03) | — | — |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** none required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 8.x + pytest-asyncio 0.23+ |
| Config file | `agent/pyproject.toml` lines 22-25 |
| Quick run command | `cd agent && pytest tests/test_external_knowledge_fan_out.py -x` (per-workstream) |
| Full suite command | `cd agent && pytest -q` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGENT-PAR-01 | gh_researcher / devto_researcher / so_researcher each emit to distinct output_key; synthesizer reads all three | unit (attribute introspection) | `pytest tests/test_external_knowledge_fan_out.py -x` | ❌ Wave 0 |
| AGENT-PAR-01 | `search_github_repos` returns expected shape under fixture | unit (shape) | `pytest tests/test_external_knowledge_fan_out.py::test_gh_shape -x` | ❌ Wave 0 |
| AGENT-PAR-01 | `external_knowledge_agent` is a SequentialAgent[ParallelAgent[3], synthesizer] | unit (topology) | `pytest tests/test_external_knowledge_fan_out.py::test_topology -x` | ❌ Wave 0 |
| AGENT-PAR-02 | ≥40% P95 latency drop | manual (soak) | Cloud Logging dashboard query post-deploy | n/a — measured in prod |
| AGENT-STATE-01 | onboarding_agent is SequentialAgent and writes both keys | unit (topology + attribute) | `pytest tests/test_state_propagation.py::test_onboarding_topology -x` | ❌ Wave 0 |
| AGENT-STATE-02 | mentor/projects/roadmap instructions contain `{user_skill_level?}` / `{user_goals?}` | unit (substring) | `pytest tests/test_state_propagation.py::test_instruction_templating -x` | ❌ Wave 0 |
| AGENT-TOOL-01 | content_agent.tools contains the AgentTool wrap; search_blog_posts no longer prepends featured | unit (attribute + behavior) | `pytest tests/test_featured_resources_agent_tool.py -x` | ❌ Wave 0 |
| AGENT-TOOL-01 | existing `test_content_agent_blog.py` featured-flag tests are removed/updated | regression | `pytest tests/test_content_agent_blog.py -x` (must pass after edit) | ✓ (must edit) |
| AGENT-TEST-01 | All new tests run green in CI | smoke | `pytest -q` (full suite) | n/a |

### Sampling Rate
- **Per task commit:** `cd agent && pytest tests/test_<workstream>.py -x`
- **Per wave merge:** `cd agent && pytest -q` (full suite)
- **Phase gate:** Full suite green AND 24h prod soak with ≥40% P95 drop AND no error-rate regression on the HMAC-hashed usage metrics dashboard.

### Wave 0 Gaps
- [ ] `agent/tests/test_external_knowledge_fan_out.py` — covers AGENT-PAR-01
- [ ] `agent/tests/test_state_propagation.py` — covers AGENT-STATE-01, AGENT-STATE-02
- [ ] `agent/tests/test_featured_resources_agent_tool.py` — covers AGENT-TOOL-01
- [ ] Updates to `agent/tests/test_content_agent_blog.py` — remove/update featured-flag assertions
- [ ] (Optional) `agent/tests/fixtures/external_knowledge_*.json` — fixture payloads for gh/devto/so shape tests; pattern mirrors existing `agent/tests/fixtures/content_blog.json`.

---

## Security Domain

Phase 6 has **no new security surface** — no new HTTP endpoints, no new data persistence, no new auth boundary. The existing security posture is preserved:

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — Discord bot owns auth; Phase 6 is internal agent reshuffle. |
| V3 Session Management | no | n/a — Phase 8 will swap session service; Phase 6 stays InMemory. |
| V4 Access Control | no | n/a |
| V5 Input Validation | yes (preserved) | Existing httpx tools strip/validate query strings; preserved across the split. |
| V6 Cryptography | yes (preserved) | HMAC-SHA256 in `discord_bot/usage_metrics.py`; not touched. |
| V10 Communication Security | yes (preserved) | httpx default TLS to github.com / dev.to / stackexchange.com; preserved. |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| PII in LLM prompt (user pastes a credit card / Discord ID) | Information Disclosure | Phase 7's `before_model_callback` PII sanitizer. NOT in Phase 6 — talk about it on the slide but ship it next phase. |
| Tool-injected prompt (upstream API returns malicious markdown) | Tampering | Existing tool shape helpers strip / truncate to ≤300 chars (`_shape_*` functions). Preserved across the split. |
| Logging raw user IDs | Information Disclosure | HMAC-hash via `usage_metrics.hash_user_id`. Preserved — no new logging added in Phase 6. |

**Security verdict for Phase 6:** clean — refactor is a no-op for the security surface.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ParallelAgent uses `asyncio.gather` semantics (concurrent start, wait-all, unhandled exception propagates) | §1.5 | If actually fail-fast or sequential, latency target may not be met. Risk mitigated: existing tools already swallow httpx exceptions. |
| A2 | `from google.adk.tools.agent_tool import AgentTool` works on `google-adk>=1.0.0` (the version pinned in pyproject.toml) | §3.1 | If ADK 1.0.0 had a different module layout, the import breaks. Mitigation: planner should run `python -c "from google.adk.tools.agent_tool import AgentTool"` against the actual installed version BEFORE writing any AgentTool code, and bump pin to ≥1.16 if needed. |
| A3 | `output_key` writes overwrite (not merge/append) | §2.6 | Documented in reference.md §5 as the loop-overwrite pattern; behavior would only matter if Phase 7/8 expects append. Low risk. |
| A4 | `{key?}` returns empty string when key missing (not None, not crash) | §2.2 | Confirmed in ADK State docs. Empty string in an instruction is benign — LLM sees "Skill level: \n" and treats it as unknown. |
| A5 | `adk web`'s Events tab visibly distinguishes ParallelAgent branches (interleaved events) | §5.4 | Reference.md §12 says this is the canonical demo. If the Events tab does NOT visually distinguish, the live demo slide degrades but the underlying refactor still works. |
| A6 | Adding `featured_resources_agent` as an AgentTool adds ~1 extra LLM call per content_agent turn | §3.6, §5.5 | Documented in Cloud Logging during soak. If cost or latency is unacceptable, planner can fall back to `skip_summarization=True` on the AgentTool (returns raw tool output without an extra LLM pass). |
| A7 | Splitting onboarding into 3 LlmAgents (welcome + 2 extractors) adds ≤2 extra small LLM calls per onboarding turn | §2.3 | Same as A6 — measured in soak. Tradeoff acknowledged. |

---

## Open Questions (RESOLVED)

1. **Should the synthesizer be an LlmAgent or a deterministic Python function inside a custom BaseAgent?**
   - **RESOLVED:** stick with LlmAgent for v7.0 to match the talk demo and reference pattern. Deterministic synthesizer is a Phase-9+ optimization opportunity.
   - What we know: CONTEXT.md says "explicit LlmAgent so it's debuggable in `adk web`'s Events tab" is the recommendation; reference.md §4's canonical example uses an LlmAgent synthesizer.
   - What's unclear: an LlmAgent synthesizer adds one LLM round-trip; a deterministic Python synthesizer (a custom `BaseAgent` with `_run_async_impl` that reads state and returns a templated string) would save that round-trip and be deterministic.
   - Recommendation: stick with LlmAgent for v7.0 to match the talk demo and reference pattern. Deterministic synthesizer is a Phase-9+ optimization opportunity.

2. **Should `onboarding_skill_level` and `onboarding_goals` extractor agents skip producing user-facing output?**
   - **RESOLVED:** reorder the SequentialAgent to `[skill_level_extractor, goals_extractor, welcome_agent]` — same end-state for downstream agents, but `welcome_agent` is the visible last reply. Live verification gate: Plan 04 Task 1's `adk web` smoke run (Turn 1) confirms welcome-last surfacing at the full-tree level; Plan 02 Task 4 is the per-workstream gate immediately before commit. If either gate observes welcome-FIRST surfacing, Plan 02 Task 5 (conditional) fires the deterministic flip. Not unresolved — gate-checked.
   - What we know: their `output_key` writes the response into state; the user-facing reply comes from `welcome_agent` (the first child of the SequentialAgent).
   - What's unclear: does the SequentialAgent's "final response" returned to the parent equal the last child's response (i.e., `goals_extractor`'s single-word output)? If yes, the user would see "unknown" or a 40-word summary instead of the warm welcome.
   - Workaround if so: use `goals_extractor.skip_summarization` or set `welcome_agent` LAST in the sub_agents list (after extractors). The extractors run first, populate state, then welcome_agent runs and its output is what the user sees.
   - **Recommendation for planner:** reorder the SequentialAgent to `[skill_level_extractor, goals_extractor, welcome_agent]` — same end-state for downstream agents, but `welcome_agent` is the visible last reply. Tested in dev before merging.

3. **Should `external_knowledge_synthesizer` be the routable name instead of wrapping in a SequentialAgent named `external_knowledge_agent`?**
   - **RESOLVED:** keep the routable name `external_knowledge_agent` attached to the SequentialAgent. Live verification gate: Plan 04 Task 1's `adk web` smoke run (Turn 1 confirms `transfer_to_agent` routes to `onboarding_agent` SequentialAgent; Turn 4 confirms the same for `external_knowledge_agent` SequentialAgent). If transfer fails to either SequentialAgent target, fall back to wrapping in a thin LlmAgent forwarder per the original recommendation. Not unresolved — gate-checked.
   - What we know: CONTEXT.md mandates keeping the routable name `external_knowledge_agent` so root_agent's coordinator routing stays unchanged. The SequentialAgent inherits the routable description.
   - What's unclear: does the coordinator's `transfer_to_agent` work against a SequentialAgent target, or only against LlmAgent targets? Reference.md §6 only shows LlmAgent → LlmAgent transfer.
   - Recommendation: verify against `adk-python` source / a local `adk web` smoke test BEFORE landing the refactor. If SequentialAgent isn't a valid transfer target, wrap it in a thin LlmAgent forwarder OR keep the old monolith name attached to a tiny LlmAgent that delegates inside (one extra layer, ugly but safe).

4. **Verify ADK version on the Cloud Run image.**
   - **RESOLVED:** use the long-form import path `from google.adk.tools.agent_tool import AgentTool` (version-tolerant across every google-adk ≥1.0.0 release). Verified in Plan 03 Task 1 preflight (`python -c "from google.adk.tools.agent_tool import AgentTool; print('OK')"`) BEFORE any AgentTool code is written. The installed `google-adk` version captured in `06-03-PREFLIGHT.md` is also re-checked on the Cloud Run build context per Plan 04 Task 2 Part B (pre-deploy import smoke).
   - `pyproject.toml` says `>=1.0.0`. The Cloud Run image was built from a `pyproject.toml` lock-file generation at deploy time; the actual installed version could be anywhere from 1.0.0 to current.
   - Recommendation: before writing AgentTool code, run `pip show google-adk` in the Cloud Run image (or its build context) and confirm. If <1.16, use the longer import path.

5. **Does `lookup_featured_resource` need to become an async function for AgentTool to call it?**
   - **RESOLVED:** leave it sync. The dict scan is microseconds — it doesn't matter even if blocking. If perf testing during soak shows otherwise, switch to async then.
   - What we know: ADK auto-wraps synchronous Python functions as `FunctionTool` from type hints + docstring. The existing function is sync.
   - What's unclear: when an LlmAgent wrapped in AgentTool calls a sync tool, does ADK run it in a threadpool or does it block the event loop?
   - Recommendation: leave it sync. The dict scan is microseconds — it doesn't matter even if blocking. If perf testing during soak shows otherwise, switch to async then.

---

## Sources

### Primary (HIGH confidence)
- `/Users/amu1o5/personal/ai-agents-google-adk/3-multi-model/agent.py` — verbatim reference for ParallelAgent inside SequentialAgent with `output_key` consumption in `instruction`. The single most important file. Authored by the talk's speaker.
- `/Users/amu1o5/personal/ai-agents-google-adk/1-marketing_campaign_agent/agent.py` — 5-stage SequentialAgent with `output_key` chaining; reference for `{state_key}` templating syntax.
- `/Users/amu1o5/personal/ai-agents-google-adk/5-sessions-and-agents/agent.py` + `run_agent_with_session.py` — reference for `InMemorySessionService` use, state-templated instructions (`{user_name}`).
- `/Users/amu1o5/personal/ai-agents-google-adk/4-structured-output/agent.py` — reference for Pydantic `output_schema` + cross-agent state consumption (`{problem_analysis_result}`).
- `/Users/amu1o5/personal/ai-agents-google-adk/8-agentspan/agent.py` — reference for `before_/after_agent_callback` lifecycle hooks (Phase 7 preview).
- `/Users/amu1o5/personal/slides/talks/zero-to-agentic-orchestra/reference.md` §1-§13 — the talk's authoritative ADK dossier. Cited inline throughout this RESEARCH.md.
- `/Users/amu1o5/personal/slides/talks/zero-to-agentic-orchestra/cfp-framing.md` — Phase 6's "why" document.
- `/Users/amu1o5/personal/code-with-ahsan/.planning/milestones/v7.0-ROADMAP.md` — milestone-level lock on output_key namespace, success criteria, cross-phase contracts.

### Secondary (MEDIUM confidence — community-verified, but not first-party docs)
- [ADK ParallelAgent docs](https://google.github.io/adk-docs/agents/workflow-agents/parallel-agents/) — concurrency semantics
- [ADK State docs](https://google.github.io/adk-docs/sessions/state/) — `{key?}` syntax confirmation
- [adk-python PR #1375: fix AgentTool import](https://github.com/google/adk-python/pull/1375) — both AgentTool import paths
- [adk-docs Issue #645: correct way to import AgentTool](https://github.com/google/adk-docs/issues/645)
- [adk-python Issue #742: MCP Tool Failure Crashes Entire ADK Multi-Agent Workflow](https://github.com/google/adk-python/issues/742) — unhandled exception propagation
- [adk-python Discussion #3418: passing parameters between root LLM agent and sequential agent-as-a-tool](https://github.com/google/adk-python/discussions/3418) — AgentTool `args["request"]` wrapping behavior
- [Cloud blog: Remember this — Agent state and memory with ADK](https://cloud.google.com/blog/topics/developers-practitioners/remember-this-agent-state-and-memory-with-adk)
- [DEV.to: Smarter ADK Prompts](https://dev.to/masahide/smarter-adk-prompts-inject-state-and-artifact-data-dynamically-placeholders-2dcm) — placeholder syntax
- [Developers Blog: guide to multi-agent patterns in ADK](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)

### Tertiary (LOW confidence — single-source, flagged for validation)
- [Saptak: Google ADK Masterclass Part 10 (Parallel)](https://saptak.in/writing/2025/05/10/google-adk-masterclass-part10) — third-party blog; only used as corroboration on the asyncio.gather claim.

### Existing CWA code read (for grounding)
- `agent/community_assistant/agent.py` (69 lines) — root LlmAgent.
- `agent/community_assistant/sub_agents/external_knowledge_agent.py` (289 lines) — the monolith.
- `agent/community_assistant/sub_agents/onboarding_agent.py` (64 lines).
- `agent/community_assistant/sub_agents/mentorship_agent.py` (179 lines).
- `agent/community_assistant/sub_agents/projects_agent.py` (104 lines).
- `agent/community_assistant/sub_agents/roadmap_agent.py` (116 lines).
- `agent/community_assistant/sub_agents/content_agent.py` (187 lines).
- `agent/community_assistant/sub_agents/featured_resources.py` (54 lines).
- `agent/discord_bot/bot.py` + `usage_metrics.py` — confirmed HMAC privacy invariant lives in the bot bridge, NOT inside agents.
- `agent/pyproject.toml` — pytest already configured with `asyncio_mode = "auto"`.
- `agent/tests/conftest.py` + `test_content_agent_blog.py` — existing pytest fixture pattern (`mock_platform_client`).

---

## Metadata

**Confidence breakdown:**
- ParallelAgent + SequentialAgent composition: HIGH — verified against `3-multi-model/agent.py` line-for-line.
- output_key + `{key?}` templating: HIGH — ADK docs + multiple reference files.
- AgentTool import + wrap: HIGH on the pattern; MEDIUM on the precise version pinning (which import path is safest).
- Pytest test strategy: HIGH — existing test infra already in place.
- Latency target achievability: MEDIUM — math says yes, real number is a soak-measurement.
- ADK ParallelAgent failure mode: MEDIUM-HIGH — confirmed via docs + issue threads, not read from `adk-python` source in this session.

**Research date:** 2026-05-22
**Valid until:** 2026-06-21 (30 days) — ADK is on bi-weekly release cadence; if Phase 6 implementation slips past this window, re-verify the `AgentTool` import path against the then-current `google-adk` version.
