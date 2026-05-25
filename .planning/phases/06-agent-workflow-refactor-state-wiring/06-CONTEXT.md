# Phase 6: Agent Workflow Refactor + State Wiring - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning
**Source:** Synthesized from milestone scoping (`.planning/milestones/v7.0-ROADMAP.md`) + CFP framing audit (`/Users/amu1o5/personal/slides/talks/zero-to-agentic-orchestra/cfp-framing.md`). User approved the 3-phase split for v7.0 on 2026-05-22.

<domain>
## Phase Boundary

This phase **only** refactors the `community_assistant` Python agent topology under `agent/community_assistant/`. Three workstreams:

1. **`ParallelAgent` fan-out** — replace `external_knowledge_agent`'s single LlmAgent with 3 sequential httpx tools into a `SequentialAgent[ParallelAgent[gh_researcher, devto_researcher, so_researcher], synthesizer]` composition. Each branch writes to a distinct `output_key`; synthesizer reads via instruction templating.
2. **`output_key` whiteboard** — `onboarding_agent` writes `user_skill_level` + `user_goals`. Downstream `mentorship_agent`, `projects_agent`, `roadmap_agent` instructions interpolate `{user_skill_level?}` / `{user_goals?}` (optional templating — `?` because first-turn the keys won't exist).
3. **`AgentTool`-wrap `featured_resources`** — current `featured_resources.py` is a Python dict prepended by `content_agent` code. Promote it to a `featured_resources_agent` LlmAgent wrapped in `agent_tool.AgentTool(...)` and invoked from `content_agent.tools=[...]`.

**Out of scope:**
- Callbacks of any kind (`before_/after_` × agent/model/tool) — Phase 7.
- Session service swap (`InMemorySessionService` → `DatabaseSessionService`) — Phase 8.
- LoopAgent for critic / clarification — Phase 8.
- New Discord features, BigQuery sink, MCP toolsets, multi-model LiteLlm routing.
- Any change under `src/` (Next.js) other than what's strictly required by ISR proxy compatibility (which should be zero — proxies untouched).

</domain>

<decisions>
## Implementation Decisions (LOCKED — user-approved upstream)

### Topology
- **3-agent split for external_knowledge.** GitHub, dev.to, Stack Overflow each become a standalone `LlmAgent` with a single httpx tool. The current monolithic `external_knowledge_agent` with three sequential httpx tools is decomposed.
- **ParallelAgent inside SequentialAgent.** Pattern: `SequentialAgent(name="ExternalResearchAndSynthesize", sub_agents=[ParallelAgent(name="ExternalFanOut", sub_agents=[gh, devto, so]), synthesizer])`. Root_agent still delegates to this composite via the same `description` so coordinator routing logic doesn't change.
- **One specialist per upstream API.** Even though dev.to fallback (tag→top=7) lives in the existing code, the dev.to specialist keeps it internal — no separate fallback agent.
- **Featured resources is an LlmAgent wrapped in AgentTool.** Not a sub_agent of content_agent (sub_agents would mean LLM-driven transfer; we want synchronous call-and-return). Wrapper lives in `featured_resources.py` next to the dict (or a new `featured_resources_agent.py`).

### State wiring
- **`output_key` namespace (locked at milestone level):**
  - `user_skill_level` (string) — onboarding_agent
  - `user_goals` (string) — onboarding_agent
  - `gh_result` / `devto_result` / `so_result` (string) — external_knowledge fan-out branches
  - (Reserved for Phase 8 — do not implement now: `user_timezone`, `user_focus_area`, `next_clarifying_question`)
- **Optional templating with `{key?}`.** Mentor/project/roadmap agents must use the question-mark form so first-turn (empty state) doesn't raise.
- **No `tool_context.state` writes in this phase.** Tool-context state writes belong to Phase 7's `before_tool_callback` cache. State writes here are purely via `output_key`.

### Testing
- **TDD where the contract is testable.** Use the v6.0 RED/GREEN pattern for: ParallelAgent fan-out (assert 3 mock httpx clients all called within one event loop tick, distinct branches), state templating (assert downstream agent reads upstream output_key value), AgentTool invocation (assert content_agent calls featured_resources via tool path with mock specialist response).
- **pytest, not vitest.** Agent tests live under `agent/community_assistant/` adjacent to source (existing convention — see `agent/community_assistant/sub_agents/test_*.py` if present, otherwise mirror Phase 02.1's pytest setup).
- **Mock the LLM + httpx layers.** Use the existing `mock_platform_client` monkeypatch pattern from Phase 02 for the platform httpx layer; mock the LLM with `google.adk.tests` helpers if available, otherwise fixture-injected response.
- **Performance assertion is best-effort.** Latency target (≥40% P95 drop from ~19s baseline) is measured in prod soak (post-deploy), not in unit tests. Unit tests verify the parallel-call shape; prod soak confirms the latency win.

### Deployment + soak
- **Cloud Run redeploy required.** Same path as Phase 02.1-03 redeploy (`cwa-assistant-bot` service). User decides when to flip — plan should include a "deploy + soak" task but not auto-deploy.
- **24h soak gate.** Phase doesn't ship until 24h on Cloud Run produces no regression on the HMAC-hashed usage metrics dashboard (existing Cloud Logging dashboard from Phase 02).
- **Privacy invariant preserved.** No new logging in this phase — existing HMAC + query_topic + query_len pattern is untouched. (Lifecycle callbacks land in Phase 7.)

### Code organization
- **New files preferred over inline edits where size justifies.** Split GH/dev.to/SO into 3 modules under `agent/community_assistant/sub_agents/external_knowledge/` (new package) or keep flat as `gh_researcher.py`, `devto_researcher.py`, `so_researcher.py`, `external_knowledge_synthesizer.py`. Planner picks based on existing repo conventions.
- **Delete or deprecate the monolithic `external_knowledge_agent.py`.** No dual-path support, no backwards-compat shim. Root agent's `sub_agents=[...]` list updates atomically with the refactor.
- **Featured resources Python dict stays, agent wraps it.** Don't migrate the curated featured list to Firestore in this phase — that's a separate quick task if needed later.

### Cross-phase contract (forward-locked for Phase 7/8)
- The `output_key` whiteboard schema established here is the contract phase 8's `mentor_intake_clarifier` reads. Don't break it later.
- The `featured_resources_agent` AgentTool is the model for phase 8's potential `mentor_critic` and `project_critic` AgentTools.
- The ParallelAgent fan-out is the structural template phase 8 will instrument with lifecycle callbacks.

### Claude's Discretion
- Naming of the new package/file split for external_knowledge specialists.
- Pytest fixture organization (top-level conftest vs. per-test-file fixtures).
- Whether to land the refactor in 1 commit per workstream or per-file. Default: per-workstream atomic commits, following the v6.0 plan convention.
- Whether the synthesizer is an explicit LlmAgent or a `SequentialAgent` wrapper that re-uses the existing aggregation logic in the deprecated monolith. Recommendation: explicit LlmAgent so it's debuggable in adk web's Events tab.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scoping
- `.planning/milestones/v7.0-ROADMAP.md` — full milestone (3 phases, success criteria, cross-phase contracts, output_key namespace lock)
- `.planning/ROADMAP.md` — Phase 6 section + dependencies on Phase 02 + 02.1

### Talk artifact (decision provenance)
- `/Users/amu1o5/personal/slides/talks/zero-to-agentic-orchestra/cfp-framing.md` — pre-refactor scorecard + audit
- `/Users/amu1o5/personal/slides/talks/zero-to-agentic-orchestra/reference.md` — ADK pattern dossier (ParallelAgent, output_key wiring, AgentTool sections)
- `/Users/amu1o5/personal/slides/talks/zero-to-agentic-orchestra/demo-tips.md` — demo storyboard (production code must match these demos)

### ADK reference code (canonical examples)
- `/Users/amu1o5/personal/ai-agents-google-adk/5-sessions-and-agents/agent.py` — state templating pattern (`{user_name}`)
- `/Users/amu1o5/personal/ai-agents-google-adk/7-agents-and-callbacks/example_*` — NOT used in this phase, but useful for understanding context (Phase 7)

### Existing CWA agent code (refactor target)
- `agent/community_assistant/agent.py` (69 lines) — root_agent definition; sub_agents list changes
- `agent/community_assistant/sub_agents/external_knowledge_agent.py` (289 lines) — gets decomposed
- `agent/community_assistant/sub_agents/content_agent.py` (187 lines) — adopts featured_resources_agent via AgentTool
- `agent/community_assistant/sub_agents/featured_resources.py` (54 lines) — wraps in AgentTool
- `agent/community_assistant/sub_agents/onboarding_agent.py` (64 lines) — adds output_key
- `agent/community_assistant/sub_agents/mentorship_agent.py` (179 lines) — reads `{user_skill_level?}` / `{user_goals?}`
- `agent/community_assistant/sub_agents/projects_agent.py` (104 lines) — reads same
- `agent/community_assistant/sub_agents/roadmap_agent.py` (116 lines) — reads same
- `agent/community_assistant/sub_agents/_relevance.py` (54 lines) — title-overlap helper; not touched
- `agent/community_assistant/platform_client.py` — httpx client used by mentorship_agent; not touched

### Phase 02/02.1 SUMMARYs (prior agent work)
- `.planning/phases/02-adk-community-assistant-for-discord-google-cloud-next-2026-demo/*-SUMMARY.md` (whichever plans landed)
- `.planning/phases/02.1-adk-content-external-knowledge-sub-agents/*-SUMMARY.md` (especially 02.1-03 for external_knowledge baseline + Cloud Run redeploy procedure)

### Cron / deploy conventions (referenced by soak step)
- `.github/workflows/ambassador-activity-checks.yml` — GHA + tsx pattern (sibling for Phase 8 session-prune cron)
- Cloud Run service: `cwa-assistant-bot` (deployed from Phase 02.1-03)

</canonical_refs>

<specifics>
## Specific Requirements

### AGENT-PAR-01 (ParallelAgent fan-out)
- Refactor `external_knowledge_agent.py` (289 lines, current monolith with 3 httpx clients) into 4 LlmAgents:
  - `gh_researcher` — GitHub repos/issues search; httpx client #1; `output_key="gh_result"`
  - `devto_researcher` — dev.to articles by tag; httpx client #2; `output_key="devto_result"`
  - `so_researcher` — Stack Overflow search; httpx client #3; `output_key="so_result"`
  - `external_knowledge_synthesizer` — reads `{gh_result} {devto_result} {so_result}`, ranks/dedupes, returns a single unified payload matching the prior contract
- Compose: `SequentialAgent(name="ExternalResearchAndSynthesize", sub_agents=[ParallelAgent(name="ExternalFanOut", sub_agents=[gh_researcher, devto_researcher, so_researcher]), external_knowledge_synthesizer])`
- Root agent's `sub_agents=[...]` list replaces `external_knowledge_agent` with this composite. Description preserved so coordinator-LLM still routes "GitHub-at-large / dev.to / Stack Overflow" queries here.

### AGENT-PAR-02 (latency)
- Measure baseline (~19s P95 on 3-source queries) BEFORE refactor — pull from Cloud Logging.
- Target: ≥40% P95 drop after refactor. Measured during 24h soak.

### AGENT-STATE-01 (onboarding writes)
- `onboarding_agent.py` gets `output_key="user_skill_level"` (or split into two agents — one per key, planner decides) and either a second sub-agent or a structured Pydantic output schema for `user_goals`.
- Decision: single onboarding_agent, structured `output_schema = Pydantic(skill_level: str, goals: str)` written to `output_key="onboarding"` then unpack in downstream. OR two separate output_keys via two pipeline sub-agents. Planner picks (with research input).

### AGENT-STATE-02 (downstream reads)
- `mentorship_agent.py`, `projects_agent.py`, `roadmap_agent.py` — each `instruction` adds a templated `{user_skill_level?}` and `{user_goals?}` block. Example: `"User skill level (if known): {user_skill_level?}\nUser goals (if known): {user_goals?}\n\n<existing instruction>"`.
- Don't crash on empty state — `?` is mandatory.

### AGENT-TOOL-01 (AgentTool wrap)
- Create `featured_resources_agent` (LlmAgent) that consumes the existing `featured_resources.py` dict via a tool function `get_featured_for_query(query: str) -> dict`.
- Wrap in `agent_tool.AgentTool(agent=featured_resources_agent)` and add to `content_agent.tools=[...]`.
- Remove the Python-side prepend in `content_agent.py` (the line that splices featured into `search_blog_posts.posts`).
- The content_agent's instruction is updated to "when the user asks about flagship content (AI guide, signature posts), call featured_resources first before search_blog_posts."

### AGENT-TEST-01 (pytest coverage)
- 3 test files (one per workstream) OR 1 file with 3 test classes — planner decides.
- Required cases:
  - **Parallel fan-out shape** — mock 3 upstream httpx calls; assert all 3 invoked in a single InvocationContext.branch tick; assert each writes to distinct `output_key`; assert synthesizer reads all three.
  - **State propagation** — mock onboarding_agent response with `skill_level="beginner"`; assert downstream agent's prompted LLM input contains `"beginner"`.
  - **AgentTool invocation** — mock featured_resources_agent's response; ask content_agent for "AI guide"; assert mock fired; assert no Python-side prepend executed.
- Use existing pytest-asyncio convention (`asyncio_mode=auto`).

</specifics>

<deferred>
## Deferred Ideas

- Callbacks (PII redaction, tool cache, lifecycle logging) — Phase 7
- LoopAgent for mentor critic / clarification — Phase 8
- Firestore-backed `DatabaseSessionService` — Phase 8
- Featured resources migration to Firestore (currently Python dict) — separate quick task, post-v7.0
- Multi-model `LiteLlm` routing (Claude/GPT) — talk namecheck, no production need
- MCP toolset for any agent — out of scope for v7.0 entirely

</deferred>

---

*Phase: 06-agent-workflow-refactor-state-wiring*
*Context gathered: 2026-05-22 — synthesized from v7.0-ROADMAP.md + CFP framing audit (user-approved upstream)*
