---
phase: "07-agent-safety-observability-callbacks"
plan: "01"
subsystem: agent
tags: [adk, callbacks, pii, before-model-callback, privacy]
provides:
  - pii-sanitizer-callback
  - callbacks-py-module-scaffold
requires:
  - google-adk>=1.29.0
affects:
  - "agent/community_assistant/agent.py — root_agent before_model_callback wiring"
key-decisions:
  - "pii_sanitizer wired on root_agent ONLY (sub-agents receive LLM-rewritten context, not raw user input)"
  - "_hmac_session_id is INLINE in callbacks.py (not imported from discord_bot.usage_metrics) to avoid circular import"
  - "Exception-swallow pattern: entire pii_sanitizer body in try/except; logs WARNING; returns None — never crash a user turn"
  - "session_id_hash uses HMAC-SHA256 keyed by USAGE_HASH_SECRET, truncated to 16 hex chars — matches usage_metrics.hash_user_id convention"
  - "pii_redacted event emits exactly 7 fields (severity, event_type, agent, invocation_id, session_id_hash, redacted_count, pii_types) — no raw PII, no raw session UUID"
key-files:
  created:
    - agent/community_assistant/callbacks.py
    - agent/tests/test_callbacks_pii.py
  modified:
    - agent/community_assistant/agent.py
metrics:
  duration: "~6 minutes"
  completed: "2026-05-23"
  tasks: 2
  files: 3
---

# Phase 07 Plan 01: PII Redaction before_model_callback Summary

**One-liner:** PII redaction `before_model_callback` using 6-pattern regex catalog + HMAC session-id, wired exclusively on `root_agent`, with 16 privacy-sentinel tests including a no-raw-match emission gate.

## What Was Built

### `agent/community_assistant/callbacks.py` (new)

Single home for all Phase 7 callback layers. Plan 07-01 creates this file with the PII layer only — Plans 07-02 (tool cache) and 07-03 (lifecycle) will extend it in-place.

Public exports:
- `PII_PATTERNS: dict[str, re.Pattern]` — 6-pattern regex catalog (CREDIT_CARD, SSN, DISCORD_MENTION, DISCORD_SNOWFLAKE, EMAIL, PHONE)
- `REDACTION_PLACEHOLDER = "[REDACTED PII]"` — substitution string
- `pii_sanitizer(callback_context, llm_request) -> None` — `before_model_callback`

Private helpers:
- `_hmac_session_id(session_id: str) -> str` — INLINE HMAC-SHA256 helper, NOT imported from `discord_bot.usage_metrics` (circular-import avoidance per RESEARCH §11)

### `agent/community_assistant/agent.py` (modified)

One-line addition: `before_model_callback=pii_sanitizer` in the `root_agent` LlmAgent constructor. No other changes.

### `agent/tests/test_callbacks_pii.py` (new)

16 tests covering:
- True-positive redaction: Tests 1-6 (one per PII pattern)
- Multi-PII single message: Test 7
- False-positive negatives: Tests 8-10 (port `:8080`, semver `1.29.0`, large count `150000`)
- No-PII pass-through: Test 11
- Most-recent-user-message discipline: Test 12
- Exception-swallow guard: Test 13
- **Privacy-gate sentinel**: Test 14 (`test_event_no_raw_match_leakage_and_session_id_hash_present`) — asserts raw match and raw session_id absent from event JSON; `session_id_hash` matches `^[0-9a-f]{16}$`
- Return-value-None contract: Test 15
- Empty-contents safety: Test 16

## RESEARCH §14 Open Question 2 Resolution

**Open Question 2:** Does `before_model_callback` on `root_agent` fire for ALL sub-agent model calls, or only for root_agent's own call?

**Status:** RESOLVED (as noted in RESEARCH §14) — `before_model_callback` on `root_agent` fires ONLY for root_agent's own LLM call. Sub-agents have independent `_run_async_impl` paths with their own (unset) callback chains. Raw user content passes through root_agent's model call; sub-agents receive LLM-rewritten routing context.

**Confirmation deferred to smoke test:** Plan 07-04 Task 1 will exercise a real Gemini call with `before_model_callback=pii_sanitizer` to confirm sub-agents receive sanitized text, not raw PII. If any sub-agent prompt contains unredacted PII, the mitigation is to attach `pii_sanitizer` to all LlmAgents (per T-07-06).

## False-Positive Gate Results (Tests 8-10)

- `:8080` (port number): PASS — not matched (word-boundary `\b` prevents prefix match)
- `1.29.0` (semver): PASS — SSN pattern requires `\d{3}[-\s]?\d{2}[-\s]?\d{4}` shape; semver digit groups don't match
- `150000` (6-digit count): PASS — below 13-digit CREDIT_CARD floor and below 17-digit DISCORD_SNOWFLAKE floor

No pattern adjustments were needed. Regex catalog from RESEARCH §4 passed all false-positive cases as-is.

## Callback Overhead

`pii_sanitizer` is synchronous (regex + string ops, no I/O). No benchmark was run — callback overhead is negligible (O(microseconds) per call) relative to LLM API latency (~500ms-2000ms). Lifecycle callbacks in Plan 07-03 will provide per-agent `duration_ms` for actual measurement.

## Cross-Phase Contract

`agent/community_assistant/callbacks.py` is now the single home for all Phase 7 callback layers:
- **Plan 07-02 (tool cache):** extends this module with `before_tool_cache` and `after_tool_cache` async functions
- **Plan 07-03 (lifecycle):** extends this module with `before_agent_callback` and `after_agent_callback` functions + the `make_lifecycle_callbacks` factory pattern
- `_hmac_session_id` is reused directly by Plans 07-02 and 07-03 (same module, no extraction needed)

## Deviations from Plan

None — plan executed exactly as written.

The one transient test failure (`test_fan_out_executes_three_leaves_concurrently`) was confirmed pre-existing flakiness: passes 3/3 times in isolation and 132/132 in full suite on second run. Not caused by our changes (no sub-agent modifications; external_knowledge_agent does not import callbacks).

## Self-Check

- [x] `agent/community_assistant/callbacks.py` exists with 3 public exports and 1 private helper
- [x] `root_agent` constructor has exactly ONE new kwarg (`before_model_callback=pii_sanitizer`)
- [x] `grep -c "pii_sanitizer" agent/community_assistant/sub_agents/*.py` returns 0 for all files (all 9 checked)
- [x] `pii_redacted` event JSON contains exactly 7 fields — no `user_id`, no raw session UUID, no raw match strings
- [x] `session_id_hash` is 16-hex lowercase OR empty string (when `USAGE_HASH_SECRET` unset)
- [x] `callbacks.py` does NOT import from `discord_bot.usage_metrics` (references are comments only)
- [x] No new entries in `pyproject.toml [dependency-groups].dev` (no freezegun needed for Plan 07-01)
- [x] 16/16 tests pass on `test_callbacks_pii.py`
- [x] Full agent suite passes (132 tests green on second run; 1 transient LLM-routing flake on first run — pre-existing)
- [x] Two commits: `dbd9971` (RED) and `2c70456` (GREEN)

## TDD Gate Compliance

- [x] RED gate: commit `dbd9971` — `test(07-01): RED — pii_sanitizer test suite (16 tests) targets unwritten callbacks.py`
- [x] GREEN gate: commit `2c70456` — `feat(07-01): GREEN — PII redaction before_model_callback on root_agent (16 tests pass)`

## Known Stubs

None.

## Threat Flags

No new threat surface beyond what the plan's threat model documents:
- Trust boundary: Discord user → root_agent LLM call (T-07-01/T-07-02 — mitigated)
- `pii_sanitizer` → stdout/Cloud Logging (T-07-01/T-07-08 — mitigated; Test 14 enforces)
