---
phase: 06-agent-workflow-refactor-state-wiring
plan: 02
subsystem: agent
tags:
  - adk
  - sequential-agent
  - output-key
  - onboarding
  - state-templating
  - tdd
requires:
  - google-adk>=1.0.0 (LlmAgent, SequentialAgent, output_key whiteboard, `{key?}` templating)
provides:
  - agent: onboarding_agent (SequentialAgent composite, name preserved for root routing)
  - agent: onboarding_skill_level (LlmAgent, output_key="user_skill_level")
  - agent: onboarding_goals (LlmAgent, output_key="user_goals")
  - agent: onboarding_welcome (user-facing LlmAgent, no output_key; tools get_community_overview + get_channel_guide preserved verbatim)
  - templating-contract: mentorship_agent / projects_agent / roadmap_agent each read `{user_skill_level?}` + `{user_goals?}` from session.state
affects:
  - Phase 7 (callbacks attach to this topology — `before_model_callback` PII redaction will run AFTER `output_key` writes)
  - Phase 8 (mentor_intake_clarifier extends the same `output_key` namespace with user_timezone / user_focus_area / next_clarifying_question)
tech-stack:
  added: []
  patterns:
    - "SequentialAgent of [silent-extractor LlmAgents] + [user-facing LlmAgent LAST] — extractors populate session.state via output_key, last child's response is the user-visible reply"
    - "ADK `{key?}` optional templating in downstream instructions (silent-empty form mandatory — non-`?` form crashes first-turn before state populated, RESEARCH §2.2)"
    - "USER CONTEXT block prepended at top of downstream instructions (not interleaved with TOOLS section) — preserves existing instruction body verbatim"
key-files:
  created:
    - agent/tests/test_state_propagation.py
  modified:
    - agent/community_assistant/sub_agents/onboarding_agent.py
    - agent/community_assistant/sub_agents/mentorship_agent.py
    - agent/community_assistant/sub_agents/projects_agent.py
    - agent/community_assistant/sub_agents/roadmap_agent.py
decisions:
  - "Child order `[skill_level_extractor, goals_extractor, welcome_agent]` — welcome LAST per RESEARCH §Open Question 2 recommendation; confirmed by Task 4 `adk web` smoke that the SequentialAgent's user-visible reply IS the last child's response"
  - "Outer routable name `onboarding_agent` preserved — root_agent.sub_agents references this string unchanged; SequentialAgent inherits the name (RESEARCH §2.3 lines 346-353)"
  - "`output_key` namespace LOCKED for Phase 7/8 cross-phase contract: `user_skill_level` (scalar string from {beginner, intermediate, advanced, unknown}) + `user_goals` (≤40 word string). Phase 8's mentor_intake_clarifier will extend with `user_timezone`, `user_focus_area`, `next_clarifying_question`"
  - "USER CONTEXT block PREPENDED to mentorship/projects/roadmap instructions (not interleaved). Existing TOOLS sections and per-agent body bit-identical post-edit — verified by tests 7/8/9 substring assertions"
  - "All state references use the silent-empty `{user_skill_level?}` / `{user_goals?}` form (mandatory per RESEARCH §2.2). Test 10 regex-asserts no non-`?` form leaks into any of the three downstream instructions"
  - "welcome_agent has NO `output_key` — its text IS the user-facing reply, not a state value (RESEARCH §Open Question 2)"
  - "Task 5 SKIPPED (Branch A NO-OP) — Task 4 confirmed welcome-LAST surfacing works"
requirements-completed:
  - AGENT-STATE-01
  - AGENT-STATE-02
metrics:
  duration: 2 min (code commits 18:03:05 → 18:05:13) + Task 4 user-side `adk web` smoke
  completed: "2026-05-22T16:24:00Z"
  tasks: 5 (Tasks 1-3 auto, Task 4 human-verify PASS, Task 5 SKIPPED Branch A)
  files_created: 1
  files_modified: 4
  tests_passing: 10/10 (test_state_propagation.py)
---

# Phase 06 Plan 02: output_key Whiteboard between Onboarding and Downstream Agents Summary

Refactored `onboarding_agent` from a single LlmAgent into a `SequentialAgent[onboarding_skill_level, onboarding_goals, onboarding_welcome]` so two silent extractor LlmAgents write `user_skill_level` / `user_goals` into `session.state` via `output_key` while the third child (welcome_agent) emits the warm user-facing reply LAST; downstream mentorship / projects / roadmap agents now read those keys via ADK's `{user_skill_level?}` / `{user_goals?}` optional-templating form — closing AGENT-STATE-01 (writes) and AGENT-STATE-02 (reads) and locking the cross-phase `output_key` namespace for Phase 7/8.

## Performance

- **Duration:** 2 min (code commits) + Task 4 user-side `adk web` smoke verification
- **Started:** 2026-05-22T16:03:05Z (commit 0ca4807 — RED tests)
- **Completed:** 2026-05-22T16:24:00Z (SUMMARY + STATE/ROADMAP wrap)
- **Tasks:** 5 (Tasks 1-3 auto, Task 4 human-verify PASS, Task 5 SKIPPED Branch A)
- **Files modified:** 4 production + 1 new test file

## Accomplishments

- **AGENT-STATE-01 closed (writes):** `onboarding_agent` is a `SequentialAgent` with three children; `onboarding_skill_level` writes `session.state["user_skill_level"]` via `output_key="user_skill_level"`, `onboarding_goals` writes `session.state["user_goals"]` via `output_key="user_goals"`. Both validated live by Task 4 `adk web` smoke — State tab populated after a single onboarding turn (both keys = `"unknown"` from input "I'm onboarding here." — correct schema fallback for an under-specified prompt).
- **AGENT-STATE-02 closed (reads):** mentorship_agent / projects_agent / roadmap_agent each prepend a USER CONTEXT block reading `{user_skill_level?}` and `{user_goals?}` via ADK's silent-empty optional templating form (mandatory `?` per RESEARCH §2.2 — non-`?` form would crash first-turn before onboarding has populated state; test 10 regex-asserts no non-`?` form leaks).
- **Routable name preserved:** Outer `onboarding_agent` name is bit-identical to the pre-refactor single-LlmAgent name — `root_agent.sub_agents` continues to route by this string with zero coordinator-LLM change (RESEARCH §2.3 lines 347-349).
- **Welcome surfacing verified live:** Task 4 `adk web` confirmed the SequentialAgent's user-visible reply IS the last child's response (`welcome_agent`'s warm welcome), NOT the single-word skill_level extractor output and NOT the 40-word goals summary — RESEARCH Open Question 2 RESOLVED on the welcome-LAST side. Task 5 Branch B (the welcome-FIRST reorder fallback) was not needed.
- **RESEARCH Open Question 3 answered YES:** Task 4 also confirmed `transfer_to_agent("onboarding_agent")` from the root LlmAgent successfully routes to a SequentialAgent target — this unblocks Plan 06-01's `external_knowledge_agent` SequentialAgent for the same routing semantics (no thin-LlmAgent-forwarder fallback needed).
- **Cross-phase `output_key` namespace LOCKED:** `user_skill_level` (scalar string from {beginner, intermediate, advanced, unknown}) + `user_goals` (≤40 word string). Phase 8's `mentor_intake_clarifier` extends the same namespace (`user_timezone`, `user_focus_area`, `next_clarifying_question`) per `.planning/milestones/v7.0-ROADMAP.md ## Cross-Phase Contracts`.

## Task Commits

Each task was committed atomically (per CONTEXT.md `## Implementation Decisions > Code organization`):

1. **Task 1: RED — failing tests for SequentialAgent + downstream templating** — `0ca4807` (test)
2. **Task 2: GREEN — refactor onboarding_agent.py to SequentialAgent topology** — `72dc8ff` (refactor)
3. **Task 3: GREEN — prepend USER CONTEXT block to mentorship/projects/roadmap** — `a5d2864` (feat)
4. **Task 4: CHECKPOINT — `adk web` smoke verification** — no commit (resolved with resume signal `"ordering verified: welcome-last works"`)
5. **Task 5: SKIPPED Branch A — welcome-LAST ordering verified by Task 4, no reorder needed** — no commit

**Plan metadata commit:** (this SUMMARY + STATE/ROADMAP updates) — single docs commit.

## Files Created/Modified

### Created
- `agent/tests/test_state_propagation.py` — 10 tests covering onboarding topology assertion (SequentialAgent of 3 children with exact names + output_keys + welcome-last ordering), and instruction-substring assertions for all three downstream agents (`{user_skill_level?}` + `{user_goals?}` present, existing TOOLS/list_open_projects markers preserved, non-`?` form regex-asserted absent).

### Modified
- `agent/community_assistant/sub_agents/onboarding_agent.py` — SequentialAgent composition replaces the single-LlmAgent shape. `get_community_overview` / `get_channel_guide` tool functions UNCHANGED (verified verbatim). Welcome instruction text and `gemini-2.5-flash` model UNCHANGED — only the wrapping topology and the two new extractor LlmAgents are net-new.
- `agent/community_assistant/sub_agents/mentorship_agent.py` — USER CONTEXT block (6 lines including blank line) PREPENDED before the existing first content line; everything from the existing `TOOLS:` header through the closing `""",` is bit-identical.
- `agent/community_assistant/sub_agents/projects_agent.py` — same USER CONTEXT block PREPENDED; existing `list_open_projects` / `get_contribution_guide` body unchanged.
- `agent/community_assistant/sub_agents/roadmap_agent.py` — same USER CONTEXT block PREPENDED; existing `TOOLS:` section unchanged.

## USER CONTEXT block — exact substring as it landed in each downstream instruction

For cross-phase traceability (Phase 8's `mentor_intake_clarifier` will extend this same templating pattern with `user_timezone?` / `user_focus_area?`):

```
USER CONTEXT (may be empty on first turn):
- Skill level: {user_skill_level?}
- Goals: {user_goals?}

If skill level is known, mention it explicitly when recommending {mentors|projects|roadmaps} ("based on your beginner level, …"). If goals are known, prioritize {mentors|projects|roadmaps} whose {expertise|tech stack|domain} overlaps with those goals.
```

Per-agent substitutions:
| Agent | "recommending X" | "X whose Y overlaps" |
|-------|------------------|----------------------|
| mentorship_agent | recommending mentors | mentors whose expertise overlaps |
| projects_agent | recommending projects | projects whose tech stack overlaps |
| roadmap_agent | recommending roadmaps | roadmaps whose domain overlaps |

## Verification

### Per-task

- **Task 1 (RED):** `pytest tests/test_state_propagation.py -x` → 10 tests collected, all fail/error pre-Task-2 (`onboarding_agent` is still an `LlmAgent` with no `sub_agents` attribute) — RED state confirmed.
- **Task 2 (GREEN):** Tests 1-6 pass (`test_onboarding_is_sequential_with_three_children`, `test_onboarding_routable_name_preserved`, `test_onboarding_skill_level_extractor_writes_correct_output_key`, `test_onboarding_goals_extractor_writes_correct_output_key`, `test_onboarding_welcome_has_no_output_key`, `test_onboarding_welcome_is_last_child`); tests 7-10 still fail (downstream templating not yet wired).
- **Task 3 (GREEN):** All 10 tests pass.
- **Task 4 (CHECKPOINT — `adk web` live smoke):** User ran `adk web` against the new SequentialAgent. Event stream observed:
  1. `transfer_to_agent("onboarding_agent") ✓` — proves RESEARCH Open Question 3 (transfer_to_agent → SequentialAgent works).
  2. Two State writes (`skill_level_extractor` + `goals_extractor`, both wrote `"unknown"` from input "I'm onboarding here." — correct schema fallback for an under-specified prompt).
  3. `get_community_overview` tool call (welcome_agent's tool).
  4. **User-visible reply was the warm welcome** (welcome_agent's response, LAST in the sequence) — proves RESEARCH Open Question 2 RESOLVED on the welcome-LAST side.
- **Task 5 (CONDITIONAL):** Branch A NO-OP — Task 4 confirmed welcome-LAST works, no reorder needed, no commit. Branch B (welcome-FIRST flip) did not fire. Branch C (BLOCKED on Open Question 3) did not fire.

### Final test re-run

`cd agent && .venv/bin/python -m pytest tests/test_state_propagation.py -v` →

```
test_onboarding_is_sequential_with_three_children PASSED
test_onboarding_routable_name_preserved PASSED
test_onboarding_skill_level_extractor_writes_correct_output_key PASSED
test_onboarding_goals_extractor_writes_correct_output_key PASSED
test_onboarding_welcome_has_no_output_key PASSED
test_onboarding_welcome_is_last_child PASSED
test_mentorship_instruction_reads_state_keys PASSED
test_projects_instruction_reads_state_keys PASSED
test_roadmap_instruction_reads_state_keys PASSED
test_no_non_optional_state_refs_in_downstream_instructions PASSED

10 passed, 1 warning in 0.91s
```

### Topology smoke

```bash
$ python -c "from community_assistant.sub_agents.onboarding_agent import onboarding_agent; \
    print(type(onboarding_agent).__name__); \
    print([(a.name, getattr(a, 'output_key', None)) for a in onboarding_agent.sub_agents])"

SequentialAgent
[('onboarding_skill_level', 'user_skill_level'),
 ('onboarding_goals', 'user_goals'),
 ('onboarding_welcome', None)]
```

Matches the documented final ordering — extractors first (silent state writes), welcome LAST (user-visible reply).

## RESEARCH Open Questions Resolved

- **Open Question 2 (SequentialAgent surfacing order — does the user-visible reply come from the LAST child or the FIRST child?):** RESOLVED — **LAST child** is surfaced. Task 4 `adk web` confirmed welcome_agent (positioned last) was the user-visible reply. The defensive ordering recommended by RESEARCH §Open Question 2 (lines 826-830) is the right one. Task 5 Branch B (welcome-FIRST flip + test 6 inversion) was not needed.
- **Open Question 3 (does `transfer_to_agent` route from a root LlmAgent to a SequentialAgent target?):** RESOLVED — **YES.** Task 4 observed `transfer_to_agent("onboarding_agent") ✓` succeeding into the new SequentialAgent topology. This ALSO unblocks Plan 06-01's `external_knowledge_agent` SequentialAgent (same routing path) — no thin-LlmAgent-forwarder fallback needed for either composite.

## Decisions Made

- **Child order `[skill_level_extractor, goals_extractor, welcome_agent]`** — welcome LAST per RESEARCH §Open Question 2 RECOMMENDATION; live-verified by Task 4.
- **Outer routable name `onboarding_agent` preserved** — SequentialAgent inherits the name; coordinator-LLM routing semantics untouched (zero ripple into `ROOT_INSTRUCTION` or `root_agent.sub_agents`).
- **`output_key` namespace LOCKED for Phase 7/8:** `user_skill_level` + `user_goals` are scalar top-level strings. Phase 8's `mentor_intake_clarifier` extends with `user_timezone`, `user_focus_area`, `next_clarifying_question`.
- **All downstream state references use silent-empty `{key?}` form** — mandatory per RESEARCH §2.2; test 10 regex-asserts no non-`?` form leaks.
- **welcome_agent has NO `output_key`** — its text IS the user-facing reply, not a state value.
- **USER CONTEXT block PREPENDED** to downstream instructions, not interleaved with existing TOOLS sections — preserves existing instruction body verbatim (tests 7/8/9 substring assertions enforce this).
- **Task 5 Branch A NO-OP** — Task 4 confirmed welcome-LAST works; no production-code reorder, no test inversion, no commit.

## Deviations from Plan

None — plan executed exactly as written. Tasks 1-3 landed as 3 atomic commits in the expected RED → GREEN → GREEN sequence; Task 4 checkpoint resumed with the recommended outcome (welcome-LAST works); Task 5 Branch A NO-OP fired as documented.

## Issues Encountered

None.

## Cross-Phase Contracts Preserved

- **HMAC privacy invariant** (`agent/discord_bot/usage_metrics.py`) — NOT replicated inside any new sub-agent (`onboarding_skill_level`, `onboarding_goals`, `onboarding_welcome`). Privacy stays at the bot bridge boundary per RESEARCH §5.3 correction. No raw user_id, no raw query text emitted from the new SequentialAgent topology.
- **`root_agent.sub_agents` routing** — unchanged. `onboarding_agent` is still the routable name; coordinator LLM does not need re-training.
- **Existing onboarding tool surface preserved** — `get_community_overview` and `get_channel_guide` are still exported from `agent/community_assistant/sub_agents/onboarding_agent.py` and are now `welcome_agent`'s tools (verbatim from the pre-refactor LlmAgent).

## Threat Surface Scan

No new network endpoints, no new auth paths, no new file access patterns, no schema changes at trust boundaries. The threat register's T-06-05 (Tampering via extractor output injection), T-06-06 (Information Disclosure via state-stored PII), and T-06-07 (DoS via runaway extractor LLM) are addressed by the existing instruction constraints (`skill_level_extractor` reply-with-just-one-word from a fixed set; `goals_extractor` ≤40-word constraint) — see PLAN's `<threat_model>` for the full disposition. Phase 7's `before_model_callback` PII redaction will add a second defensive layer per CONTEXT.md `## Deferred Ideas`.

## Authentication Gates

None — `adk web` smoke used the existing `GOOGLE_API_KEY` env var already configured in the dev environment (per Phase 02.1 setup). No new env vars added by this plan.

## Next Phase Readiness

- AGENT-STATE-01 + AGENT-STATE-02 closed at code + topology layer. Plan 06-04 will measure cost/latency impact of the two extra extractor LLM calls per onboarding turn during the 24h prod soak.
- Phase 7's `before_model_callback` PII redaction layer can attach to the new topology (extractors are LlmAgents — same callback hook as any other). The `user_skill_level` / `user_goals` namespace is locked and stable for the redaction layer to whitelist.
- Phase 8's `mentor_intake_clarifier` extends the same templating pattern with additional state keys — no API change needed on this plan's side.

## Self-Check

### Created files exist
- `agent/tests/test_state_propagation.py` — FOUND

### Modified files exist
- `agent/community_assistant/sub_agents/onboarding_agent.py` — FOUND (SequentialAgent topology)
- `agent/community_assistant/sub_agents/mentorship_agent.py` — FOUND (USER CONTEXT block prepended)
- `agent/community_assistant/sub_agents/projects_agent.py` — FOUND (USER CONTEXT block prepended)
- `agent/community_assistant/sub_agents/roadmap_agent.py` — FOUND (USER CONTEXT block prepended)

### Commits exist
- `0ca4807` — test(06-02): add failing tests for onboarding SequentialAgent + downstream state-key templating — FOUND
- `72dc8ff` — refactor(agent): wire onboarding_agent as SequentialAgent with skill_level + goals extractors — FOUND
- `a5d2864` — feat(agent): wire downstream agents to consume {user_skill_level?} / {user_goals?} from onboarding — FOUND

### Test suite
- `pytest tests/test_state_propagation.py -v` → 10 passed, 0 failed, 1 warning (PLUGGABLE_AUTH UserWarning — pre-existing google-adk noise, not a test signal).

## Self-Check: PASSED

---
*Phase: 06-agent-workflow-refactor-state-wiring*
*Plan: 02*
*Completed: 2026-05-22*
