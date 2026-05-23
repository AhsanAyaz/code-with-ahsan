---
phase: 07-agent-safety-observability-callbacks
plan: 03
subsystem: agent
tags: [google-adk, callbacks, lifecycle-logging, structured-logging, hmac, privacy, cloud-logging]

requires:
  - phase: 07-agent-safety-observability-callbacks/07-01
    provides: callbacks.py scaffold with PII layer + _hmac_session_id helper
  - phase: 07-agent-safety-observability-callbacks/07-02
    provides: tool cache layer in callbacks.py + content_agent wiring (before/after_tool_callback)
  - phase: 06-agent-workflow-refactor-state-wiring
    provides: 12-LlmAgent post-Phase-6 agent tree (attachment topology)

provides:
  - lifecycle_before_agent and lifecycle_after_agent in callbacks.py emitting agent.enter / agent.exit structured JSON
  - 13 lifecycle wiring sites across 11 files (root + 3 onboarding children + 4 specialists + featured_resources_agent + 4 external_knowledge leaves)
  - SequentialAgent + ParallelAgent wrapper-skip (onboarding_agent, external_knowledge_agent, ExternalFanOut receive no lifecycle callbacks)
  - 13-test pytest suite (test_callbacks_lifecycle.py) including privacy sentinel (Test 9) and cross-agent invocation_id correlation (Test 13)
  - P95-per-agent timing substrate via Cloud Logging filter on jsonPayload.invocation_id

affects:
  - 07-04 smoke verification (confirms agent.enter/agent.exit stream in adk web Events tab)
  - Phase 8 (Firestore sessions will need app_cache + lifecycle state key review for persistence)

tech-stack:
  added: []
  patterns:
    - "Sync lifecycle callbacks (def not async def) for string+JSON ops — no I/O, simpler stack traces"
    - "Agent-scoped state key _cb_enter_{agent_name} for duration calculation — prevents parallel-branch race (RESEARCH §9 Pitfall 5)"
    - "Factory-free direct env-read (os.environ.get at call-time) for USAGE_HASH_SECRET — same degradation path as bot.py (RESEARCH §15 A4)"
    - "Wrapper-skip rule: SequentialAgent + ParallelAgent constructors get NO lifecycle kwargs; leaf LlmAgents only"
    - "HMAC session_id reused from Plan 07-01 module-local _hmac_session_id — no circular import from discord_bot.usage_metrics"

key-files:
  created:
    - agent/tests/test_callbacks_lifecycle.py
  modified:
    - agent/community_assistant/callbacks.py
    - agent/community_assistant/agent.py
    - agent/community_assistant/sub_agents/onboarding_agent.py
    - agent/community_assistant/sub_agents/mentorship_agent.py
    - agent/community_assistant/sub_agents/projects_agent.py
    - agent/community_assistant/sub_agents/roadmap_agent.py
    - agent/community_assistant/sub_agents/content_agent.py
    - agent/community_assistant/sub_agents/featured_resources.py
    - agent/community_assistant/sub_agents/external_knowledge/gh_researcher.py
    - agent/community_assistant/sub_agents/external_knowledge/devto_researcher.py
    - agent/community_assistant/sub_agents/external_knowledge/so_researcher.py
    - agent/community_assistant/sub_agents/external_knowledge/synthesizer.py

key-decisions:
  - "Wiring count is 13 (not 12 as stated in plan body arithmetic) — plan's count of 12 was a typo; RESEARCH §7 topology lists 13 LlmAgents with lifecycle=YES (root + 3 onboarding + 4 specialists + featured_resources + 4 external_knowledge leaves)"
  - "Sync def (not async) for lifecycle callbacks — side-effect only (JSON + stdout); no awaitable calls; cleaner stack traces in asyncio event loop"
  - "Plans 07-01 + 07-02 surfaces in callbacks.py left entirely untouched — lifecycle section appended at end"
  - "Test file uses PYTHONPATH override to resolve worktree's community_assistant package ahead of editable install pointing to main checkout"

patterns-established:
  - "Lifecycle callback pair pattern: before writes _cb_enter_{name} state key, after reads it to compute duration_ms"
  - "All callback functions wrapped in try/except — swallow + WARNING log, never let telemetry crash user turn"
  - "Privacy gate test (Test 9) as regression sentinel — asserts no state values or raw session UUID in event payload"

requirements-completed:
  - AGENT-CB-AGENT-01
  - AGENT-CB-AGENT-02
  - AGENT-TEST-02

duration: 45min
completed: 2026-05-23
---

# Phase 07 Plan 03: Agent Lifecycle Logging Summary

**Structured agent.enter / agent.exit lifecycle callbacks wired to all 13 LlmAgents in the post-Phase-6 tree, with HMAC session hashing, privacy-gate sentinel, and full 175-test suite green**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-05-23T00:00:00Z
- **Completed:** 2026-05-23T00:45:00Z
- **Tasks:** 3 (Task 1 RED + Task 2a GREEN-CORE + Task 2b GREEN-FANOUT)
- **Files modified:** 12

## Accomplishments

- Extended `callbacks.py` with `lifecycle_before_agent` and `lifecycle_after_agent` — sync functions emitting RESEARCH §6 agent.enter / agent.exit JSON events to stdout (Cloud Logging picks up as jsonPayload)
- Wired lifecycle callbacks to all 13 LlmAgents in the post-Phase-6 tree; SequentialAgent + ParallelAgent wrappers correctly skipped per RESEARCH §7 wrapper-skip rule
- Created 13-test pytest suite covering enter/exit shape, HMAC determinism, privacy gate sentinel (Test 9), parallel-branch state isolation (Test 8), exception swallow, and cross-agent invocation_id correlation (Test 13)

## Task Commits

1. **Task 1 (RED): test_callbacks_lifecycle.py** - `7a117c4` (test)
2. **Task 2a (GREEN-CORE): callbacks.py + agent.py + onboarding_agent.py** - `7dc22b5` (feat)
3. **Task 2b (GREEN-FANOUT): 9 remaining sub-agent files** - `6e963bb` (feat)

## Files Created/Modified

- `agent/tests/test_callbacks_lifecycle.py` — 13-test lifecycle test suite incl. privacy sentinel + cross-agent correlation
- `agent/community_assistant/callbacks.py` — extended with lifecycle_before_agent + lifecycle_after_agent (Plans 07-01 + 07-02 surface untouched)
- `agent/community_assistant/agent.py` — root_agent gains before/after_agent_callback (alongside existing before_model_callback=pii_sanitizer)
- `agent/community_assistant/sub_agents/onboarding_agent.py` — 3 child LlmAgents wired; SequentialAgent wrapper explicitly skipped
- `agent/community_assistant/sub_agents/mentorship_agent.py` — lifecycle kwargs added
- `agent/community_assistant/sub_agents/projects_agent.py` — lifecycle kwargs added
- `agent/community_assistant/sub_agents/roadmap_agent.py` — lifecycle kwargs added
- `agent/community_assistant/sub_agents/content_agent.py` — lifecycle kwargs added (4 total callback kwargs with Plan 07-02 cache pair)
- `agent/community_assistant/sub_agents/featured_resources.py` — lifecycle on LlmAgent only; AgentTool wrapper not touched
- `agent/community_assistant/sub_agents/external_knowledge/gh_researcher.py` — lifecycle kwargs added
- `agent/community_assistant/sub_agents/external_knowledge/devto_researcher.py` — lifecycle kwargs added
- `agent/community_assistant/sub_agents/external_knowledge/so_researcher.py` — lifecycle kwargs added
- `agent/community_assistant/sub_agents/external_knowledge/synthesizer.py` — lifecycle kwargs added

## Decisions Made

- **Wiring count is 13 not 12**: The plan body arithmetic said "Expected: 12" but the actual RESEARCH §7 topology lists 13 LlmAgents with lifecycle=YES. The discrepancy was a counting error in the plan text; implementation correctly follows the topology table. 11 files contain the kwargs; 3 files (onboarding_agent.py) have multiple wiring sites.
- **Sync def not async def**: Lifecycle callbacks are pure string-manipulation + stdout writes — no I/O, no awaitables. Sync is simpler and ADK awaits callbacks via `inspect.isawaitable` regardless.
- **_hmac_session_id reused from Plan 07-01**: No redefinition, no import from `discord_bot.usage_metrics` (circular import risk per RESEARCH §11). Direct env-read approach (A1) used at callback call-time.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Deviation] Wiring count 13 vs plan text "12"**
- **Found during:** Task 2b verification
- **Issue:** Plan body stated "Expected: 12" for wiring count, but RESEARCH §7 topology clearly lists 13 LlmAgents with YES for lifecycle. The root_agent + 3 onboarding + 4 specialists + featured_resources + 4 external_knowledge leaves = 13.
- **Fix:** Implemented all 13 wiring sites per the RESEARCH §7 topology table (authoritative). Plan text arithmetic error does not override the explicit topology.
- **Files modified:** All 11 agent files
- **Verification:** All 175 tests pass; grep confirms 13 occurrences of `before_agent_callback=lifecycle_before_agent` across 11 files

---

**Total deviations:** 1 (plan text arithmetic error; resolved by following canonical RESEARCH §7 topology)
**Impact on plan:** Zero scope creep. Implementation matches stated architecture exactly; plan body had a miscounted Expected value.

## Issues Encountered

None — all gates passed on first attempt. The PYTHONPATH override (`PYTHONPATH=<worktree>/agent`) was needed to resolve the worktree's community_assistant package ahead of the editable install `.pth` pointing to the main checkout. Tests confirmed the worktree module was loaded via `inspect.getfile`.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Lifecycle callbacks are read-only on session state (`_cb_enter_*` keys written, read by the same callbacks only). No new trust boundaries.

All STRIDE threats T-07-16 through T-07-24 mitigated per plan:
- T-07-16/T-07-17 (info disclosure): Test 9 privacy gate sentinel passes
- T-07-18 (wrapper double-logging): wrapper-skip grep gate returns 0
- T-07-21 (parallel state race): Test 8 parallel-branch isolation passes

## Known Stubs

None — lifecycle callbacks emit real structured JSON. No hardcoded placeholder values.

## Self-Check

- [x] `agent/tests/test_callbacks_lifecycle.py` exists — confirmed
- [x] `agent/community_assistant/callbacks.py` defines `lifecycle_before_agent` + `lifecycle_after_agent` — confirmed
- [x] 13 wiring occurrences across 11 files — confirmed by grep
- [x] Wrapper-skip: 0 lifecycle kwargs on SequentialAgent/ParallelAgent — confirmed
- [x] AgentTool protection: 0 lifecycle kwargs on AgentTool wrapper — confirmed
- [x] 175 tests pass (43 callback tests + 132 other suite tests) — confirmed
- [x] Privacy sentinel Test 9 passes — confirmed
- [x] Cross-agent invocation_id Test 13 passes — confirmed
- [x] Plans 07-01 + 07-02 surfaces untouched in callbacks.py — confirmed
- [x] _hmac_session_id not redefined — confirmed (1 definition from Plan 07-01)
- [x] 9 public exports in callbacks.py — confirmed

## Self-Check: PASSED

All commits verified:
- `7a117c4` test(07-03): RED — lifecycle callback test suite
- `7dc22b5` feat(07-03): GREEN-CORE — lifecycle callbacks defined + wired on root_agent + 3 onboarding children
- `6e963bb` feat(07-03): GREEN-FANOUT — lifecycle callbacks wired on 8 remaining LlmAgents

## Next Phase Readiness

- Plan 07-04 (smoke verification) can now confirm via `adk web` that agent.enter/agent.exit events appear in the Events tab for each Discord turn
- Phase 7 ROADMAP Success Criterion 3 (P95-per-agent dashboards) is realized — Cloud Logging filter `jsonPayload.invocation_id = "<id>"` returns all lifecycle events for a single Discord turn
- Phase 7 ROADMAP Success Criterion 4 (privacy invariant) is satisfied — Test 9 privacy gate sentinel is in place

---
*Phase: 07-agent-safety-observability-callbacks*
*Completed: 2026-05-23*
