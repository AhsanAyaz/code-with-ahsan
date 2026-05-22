---
phase: 06-agent-workflow-refactor-state-wiring
plan: 03
subsystem: agent
tags:
  - adk
  - agent-tool
  - llm-agent
  - featured-resources
  - content-agent
  - tdd
requires:
  - google-adk>=1.0.0 (installed 1.29.0)
provides:
  - agent: featured_resources_agent (LlmAgent wrapping lookup_featured_resource)
  - tool: featured_resources_tool (AgentTool wrap of featured_resources_agent)
  - contract: content_agent.tools[0] is featured_resources_tool (FIRST position pinned by test 4)
affects:
  - agent/community_assistant/sub_agents/content_agent.py (refactor — Python-side prepend retired)
  - agent/tests/test_content_agent_blog.py (3 prepend-era tests retired)
tech-stack:
  added: []
  patterns:
    - "LlmAgent wrapped in AgentTool for synchronous call-and-return invocation visible in adk web's Events tab"
    - "Long-form import path `from google.adk.tools.agent_tool import AgentTool` (RESEARCH §3.1, §5.8) — works on google-adk >=1.0.0"
    - "Self-contained wrapped-agent instruction (RESEARCH §3.4 — AgentTool only passes the `request` string to the wrapped agent, no conversation history)"
key-files:
  created:
    - .planning/phases/06-agent-workflow-refactor-state-wiring/06-03-PREFLIGHT.md
    - agent/tests/test_featured_resources_agent_tool.py
    - .planning/phases/06-agent-workflow-refactor-state-wiring/deferred-items.md
  modified:
    - agent/community_assistant/sub_agents/featured_resources.py
    - agent/community_assistant/sub_agents/content_agent.py
    - agent/tests/test_content_agent_blog.py
decisions:
  - "AgentTool import path: long-form `from google.adk.tools.agent_tool import AgentTool` (RESEARCH §3.1, §5.8) — works on every google-adk release >=1.0.0; no pyproject.toml bump needed"
  - "skip_summarization left at default False — Phase 06-04 soak will revisit if cost/latency demands the flip to True (RESEARCH Assumption A6)"
  - "lookup_featured_resource stays sync — ADK auto-wraps sync callables as FunctionTool; the dict scan is microsecond-level so async-vs-sync is irrelevant (RESEARCH Open Question 5 recommendation)"
  - "Task 2 and Task 3 landed as separate commits — Task 2 commits both the new RED file AND the trimmed test_content_agent_blog.py (deletions don't break greenness), Task 3 commits the production code that turns the new file GREEN"
metrics:
  duration: 13 min
  completed: "2026-05-22T16:11:15Z"
  tasks: 3
  files_created: 3
  files_modified: 3
  files_deleted: 0
  tests_passing: 26 (10 new + 6 retained + 10 unchanged dict-scan tests)
  google_adk_version_verified: "1.29.0"
  agent_tool_attribute_name: "agent"
---

# Phase 06 Plan 03: AgentTool Wrap of featured_resources Summary

Promoted `featured_resources.py`'s 54-line Python-side prepend into an ADK-native pattern: `featured_resources_agent` (`LlmAgent` with `lookup_featured_resource` as its only tool) wrapped in `agent_tool.AgentTool` (`featured_resources_tool`) and installed as the FIRST entry in `content_agent.tools`. `search_blog_posts` is now a plain Ghost-search wrapper — no curated-prepend, no `featured: True` flags, no `status="partial"` branch. The AgentTool invocation is now visible in `adk web`'s Events tab — closes AGENT-TOOL-01 and establishes the AgentTool shape that Phase 8's `mentor_critic` and `project_critic` will reuse.

## What Changed

### `agent/community_assistant/sub_agents/featured_resources.py`

Added two new top-level symbols at the bottom (file grew from 54 → ~84 lines). The `FEATURED_RESOURCES` dict (lines 8-33 of the original) and the `lookup_featured_resource` function (lines 36-54) are byte-identical — only consumption pattern changed.

| New symbol | Type | Purpose |
|------------|------|---------|
| `featured_resources_agent` | `LlmAgent` | name=`"featured_resources_agent"`, model=`"gemini-2.5-flash"`, `tools=[lookup_featured_resource]`. Self-contained instruction: "call `lookup_featured_resource(topic)` and return the matched curated resources as a structured reply. Never invent a URL — only echo what the tool returned." |
| `featured_resources_tool` | `AgentTool` | `AgentTool(agent=featured_resources_agent)`. Default `skip_summarization=False`. |

Two new imports at the top alongside `from __future__ import annotations`:
```python
from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool
```

### `agent/community_assistant/sub_agents/content_agent.py`

| Change | Lines | What |
|--------|-------|------|
| Import swap | line 4 | `from .featured_resources import lookup_featured_resource` → `from .featured_resources import featured_resources_tool` |
| Delete helper | old lines 42-51 | `_featured_as_post` helper removed entirely |
| Simplify `search_blog_posts` | old lines 54-99 | Removed `featured = [...]` prepend, `featured_urls` dedupe set, `deduped_ghost` / `merged` merging, and the `status="partial"` branch. Now a plain Ghost-search wrapper that returns `status="success"` (or `status="error"` on Ghost upstream failure) |
| Docstring trim | search_blog_posts docstring | Dropped the "deterministic curated-resource lookup runs first" paragraph and the `featured` field mention from the returned-posts description |
| Instruction rewrite | content_agent.instruction (TOOLS / SEARCH STRATEGY / REPLY FORMAT blocks) | Now directs the LLM to call `featured_resources_agent` FIRST for flagship-content queries (AI guide, signature posts). The "Featured posts appear FIRST" prose tied to the prepend is gone. RELEVANCE RULE + GUIDELINES blocks preserved verbatim |
| Tools reordered | content_agent.tools | `tools=[featured_resources_tool, search_blog_posts, search_youtube_videos]` — `featured_resources_tool` is FIRST (pinned by test 4 of the new contract test file) |

### `agent/tests/test_content_agent_blog.py`

Retired 3 prepend-era tests + the `AI_GUIDE_URL` constant + the obsolete section header comment. The 5 retained tests (3 `_shape_blog_post` shape tests + happy-path / empty-query / ghost-error) + 1 (`test_shape_blog_post_no_slug_no_url` which was already present) = 6 surviving tests continue to pass against the new `search_blog_posts` shape.

| Retired test | Why |
|--------------|-----|
| `test_search_blog_posts_featured_first_in_posts` | Asserted `posts[0]["featured"] is True` — contract no longer surfaces `featured` inside `posts` |
| `test_search_blog_posts_no_featured_flag_on_no_match` | Asserted no post carries `featured` — trivially true now; assertion measures a contract that no longer exists |
| `test_search_blog_posts_featured_still_returned_on_ghost_error` | Asserted `status="partial"` and featured-as-post on Ghost error — partial-status branch removed |

### `agent/tests/test_featured_resources_agent_tool.py` (NEW)

10 contract tests covering the AGENT-TOOL-01 shape:

| # | Test | Pins |
|---|------|------|
| 1 | `test_featured_resources_agent_exists_and_is_llm_agent` | LlmAgent existence + name |
| 2 | `test_featured_resources_agent_has_lookup_function_in_tools` | `lookup_featured_resource` is in `featured_resources_agent.tools` (tolerates ADK's auto-wrap as FunctionTool by checking the wrapped `.func` if present) |
| 3 | `test_featured_resources_tool_wraps_agent` | `type(featured_resources_tool).__name__ == "AgentTool"` and `featured_resources_tool.agent is featured_resources_agent` (verified the attribute name `.agent` in Plan 03 Task 1 preflight) |
| 4 | `test_content_agent_first_tool_is_featured_resources_agent_tool` | `content_agent.tools[0] is featured_resources_tool` (pinned by T-06-10 threat-model mitigation) |
| 5 | `test_content_agent_tools_still_has_search_blog_posts_and_youtube` | 3 tools total; the two preserved ones are identifiable by `__name__` |
| 6 | `test_search_blog_posts_no_longer_prepends_featured` | `not any(p.get("featured") for p in result["posts"])` after `search_blog_posts("AI guide")` |
| 7 | `test_search_blog_posts_no_longer_returns_partial_status` | `result["status"] == "error"` (was `"partial"` on the Ghost-down + featured-matched path) |
| 8 | `test_content_agent_instruction_references_featured_resources_agent` | Loose substring check: `"featured_resources_agent"` and `"FIRST"`/`"first"` both present |
| 9 | `test_content_agent_no_longer_imports_lookup_function` | Module doesn't expose `lookup_featured_resource` |
| 10 | `test_content_agent_no_longer_has_featured_as_post_helper` | Module doesn't expose `_featured_as_post` |

## Verification

### Per-task

- **Task 1 (preflight gate):** `python -c "from google.adk.tools.agent_tool import AgentTool; print('OK')"` printed `OK`. `pip show google-adk` reported 1.29.0. `dir(AgentTool(agent=stub))` confirmed the wrapped-agent attribute is `.agent` (not `wrapped_agent`) on the installed google-adk 1.29.0 — matches RESEARCH §3.2 documented name, so test 3's assertion `featured_resources_tool.agent is featured_resources_agent` is correct as-written. Preflight log committed at `ff1d72c`.
- **Task 2 (RED):** `pytest tests/test_featured_resources_agent_tool.py` failed at collection with `ImportError: cannot import name 'featured_resources_agent' from 'community_assistant.sub_agents.featured_resources'` (10 tests in import-error state — RED confirmed). 10 test functions present (`grep -c "^def test_"` returns 10). The trimmed `test_content_agent_blog.py` had 6 passing tests against the unchanged content_agent.py. Committed as `ca8f95b`.
- **Task 3 (GREEN):** `pytest tests/test_featured_resources_agent_tool.py tests/test_content_agent_blog.py tests/test_featured_resources.py -x` → **26 passed** (10 + 6 + 10). Full `cd agent && pytest -q` shows 131 passed; the 1 remaining failure (`test_fan_out_executes_three_leaves_concurrently` in `test_external_knowledge_fan_out.py`) is a pre-existing Plan 06-01 flake that passes in isolation — see Deferred Issues below. Committed as `e233f51`.

### Plan-level grep gates (all PASS)

- `grep -c "_featured_as_post" agent/community_assistant/sub_agents/content_agent.py` → **0** (helper deleted)
- `grep -c "lookup_featured_resource" agent/community_assistant/sub_agents/content_agent.py` → **0** (import deleted, no callsite)
- `grep -cE "featured: True|featured_urls" agent/community_assistant/sub_agents/content_agent.py` → **0** (prepend code deleted)
- `grep -cE "status.*partial" agent/community_assistant/sub_agents/content_agent.py` → **0** (partial-status branch deleted)
- `grep -c "featured_resources_tool" agent/community_assistant/sub_agents/content_agent.py` → **2** (one import, one in `tools=[...]`)
- Integration smoke `python -c "from ...featured_resources_tool; ...; assert content_agent.tools[0] is featured_resources_tool; ...; print('OK')"` printed **OK**

## Decisions Made

- **AgentTool import path: long-form `from google.adk.tools.agent_tool import AgentTool`** (RESEARCH §3.1, §5.8). Works on every google-adk release ≥1.0.0 — the pyproject.toml pin `google-adk>=1.0.0` already covers the installed 1.29.0; no version bump required.
- **`skip_summarization` left at default `False`** — content_agent's LLM gets an extra summarization pass over the wrapped agent's structured reply. RESEARCH Assumption A6 notes this can be flipped to `True` if Plan 04 soak surfaces unacceptable cost/latency; deferred as a Plan 04 concern.
- **`lookup_featured_resource` stays a sync Python function** — ADK auto-wraps sync callables as `FunctionTool`s (RESEARCH Open Question 5 recommendation). The dict scan is microsecond-level so sync-vs-async makes no difference.
- **Task 2 + Task 3 landed as separate commits** — Task 2 commits both the new RED test file AND the trimmed `test_content_agent_blog.py` (the deletions don't break greenness because the production code in those areas is still the OLD prepend code, which the 5 retained tests in `test_content_agent_blog.py` keep passing). Task 3 commits production code, immediately turning the RED file GREEN.
- **AgentTool wrapped-agent attribute observed: `agent`** — matches RESEARCH §3.2 documented name on google-adk 1.29.0. The full `dir()` list is recorded in `06-03-PREFLIGHT.md` for traceability if a future ADK release renames it.

## Deviations from Plan

None — plan executed exactly as written. The single deviation candidate (the test 2 assertion logic for `lookup_featured_resource in featured_resources_agent.tools`) was anticipated by the plan: "membership check by identity or by `.func` if ADK auto-wraps as FunctionTool" — implemented exactly as the plan suggested (the test tolerates both raw-callable and FunctionTool-wrapped storage).

## Deferred Issues

**Pre-existing Plan 06-01 flake — NOT introduced by Plan 06-03:**

- `agent/tests/test_external_knowledge_fan_out.py::test_fan_out_executes_three_leaves_concurrently` fails intermittently when run as part of the full agent test suite (e.g., `pytest -q`); passes deterministically when run in isolation. Plan 06-01's deviation #2 already documents relaxing the spread threshold 100ms → 2000ms for LLM-jitter tolerance. The remaining full-suite-only flakiness likely stems from accumulated Gemini API jitter across the ~131-test run.
- **Out of scope for Plan 06-03:** Plan 06-03 touches only `featured_resources.py` and `content_agent.py` — neither is imported by the fan-out test. Logged in `.planning/phases/06-agent-workflow-refactor-state-wiring/deferred-items.md` (commit `2d70c53`) for Plan 06-04 (`adk web` smoke) or a future Phase 06 hardening pass.

## Authentication Gates

None — preflight import smoke ran without any auth dependency. Plan 04's Cloud Run deploy is the next opportunity for env-var/credential checks.

## Cross-phase contract realized

Per RESEARCH §3.6 ("Sets the pattern for Phase 8"), Phase 8's `mentor_critic` and `project_critic` AgentTools can now follow this exact wrap shape:

```python
# Phase 8 pattern (model)
critic_agent = LlmAgent(name=..., model="gemini-2.5-flash", instruction="...", tools=[critique_function])
critic_tool = AgentTool(agent=critic_agent)
# Then add critic_tool to the parent agent's tools=[...] list
```

## Threat surface scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced by Plan 06-03. All AgentTool invocation flows through ADK's standard `process_llm_request` machinery; the only user-influenced data path is the `request` string passed from `content_agent`'s LLM into the wrapped `featured_resources_agent` — already analyzed and mitigated in the plan's `<threat_model>` (T-06-08 / T-06-09 / T-06-10), with T-06-10 specifically pinned by test 4 in `test_featured_resources_agent_tool.py`.

## Final ordering of content_agent.tools

```python
tools=[featured_resources_tool, search_blog_posts, search_youtube_videos]
```

First tool: `featured_resources_tool` → `featured_resources_tool.agent.name == "featured_resources_agent"`.

## Self-Check

### Created files exist
- `.planning/phases/06-agent-workflow-refactor-state-wiring/06-03-PREFLIGHT.md` — FOUND
- `agent/tests/test_featured_resources_agent_tool.py` — FOUND
- `.planning/phases/06-agent-workflow-refactor-state-wiring/deferred-items.md` — FOUND

### Modified files exist
- `agent/community_assistant/sub_agents/featured_resources.py` — FOUND (extended with LlmAgent + AgentTool)
- `agent/community_assistant/sub_agents/content_agent.py` — FOUND (refactored)
- `agent/tests/test_content_agent_blog.py` — FOUND (3 tests + 1 constant retired)

### Commits exist
- `ff1d72c` — docs(phase-06): record AgentTool preflight — google-adk 1.29.0 + long-form import verified — FOUND
- `ca8f95b` — test(06-03): add RED contract tests for featured_resources AgentTool + retire prepend tests — FOUND
- `e233f51` — feat(agent): wrap featured_resources in AgentTool and remove Python-side prepend (google-adk 1.29.0 verified) — FOUND
- `2d70c53` — docs(phase-06): log pre-existing flaky test_fan_out_executes_three_leaves_concurrently as deferred — FOUND
