"""test_callbacks_lifecycle.py — Lifecycle callback test suite (Plan 07-03).

Covers 13 behaviors per RESEARCH §8 + Plan 07-03 Task 1:
  1. enter event shape (6-field JSON per RESEARCH §6)
  2. exit event shape with duration_ms
  3. correlation_id matches across enter/exit pair
  4. session_id_hash determinism under same secret
  5. session_id_hash empty when USAGE_HASH_SECRET unset
  6. session_id_hash empty when session_id empty
  7. duration_ms when no enter key in state (default = 0)
  8. parallel-branch state key isolation (no race)
  9. PRIVACY SENTINEL — raw user input / state values NEVER appear in event payload
  10. exception swallow in before callback
  11. exception swallow in after callback
  12. both callbacks always return None (never short-circuit)
  13. invocation_id propagates across two agents in one Discord turn (P95 dashboard substrate)

Tests fail at import-time until Plan 07-03 GREEN lands lifecycle functions in callbacks.py.
RED state: ImportError: cannot import name 'lifecycle_before_agent' from 'community_assistant.callbacks'
"""
import io
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from community_assistant.callbacks import (
    lifecycle_after_agent,
    lifecycle_before_agent,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_ctx(
    agent_name: str,
    invocation_id: str = "test-inv-003",
    session_id: str = "test-sess-uuid-001",
    state: dict | None = None,
) -> tuple:
    """Build a MagicMock CallbackContext whose .state behaves like a dict."""
    state = state if state is not None else {}
    ctx = MagicMock()
    ctx.agent_name = agent_name
    ctx.invocation_id = invocation_id
    ctx.session.id = session_id
    # Wire state operations to the underlying dict
    ctx.state.get = lambda k, default=None: state.get(k, default)
    ctx.state.__getitem__ = lambda self, k: state[k]
    ctx.state.__setitem__ = lambda self, k, v: state.__setitem__(k, v)
    return ctx, state


def _capture(fn, *args, **kwargs):
    """Call fn(*args, **kwargs), capture stdout, parse JSON lines, return (result, events)."""
    buf = io.StringIO()
    old = sys.stdout
    sys.stdout = buf
    try:
        result = fn(*args, **kwargs)
    finally:
        sys.stdout = old
    lines = buf.getvalue().strip().splitlines()
    events = [json.loads(line) for line in lines if line.strip()]
    return result, events


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def hash_secret(monkeypatch):
    monkeypatch.setenv("USAGE_HASH_SECRET", "test-secret-deterministic")
    yield "test-secret-deterministic"


# ---------------------------------------------------------------------------
# Test 1: enter event shape matches RESEARCH §6
# ---------------------------------------------------------------------------


def test_enter_event_shape_matches_research_s6(hash_secret):
    """agent.enter event has exactly 6 expected keys with correct types + values."""
    ctx, _state = _make_ctx(
        "mentorship_agent",
        invocation_id="abc123",
        session_id="sess-uuid-001",
    )
    result, events = _capture(lifecycle_before_agent, ctx)

    assert len(events) == 1, f"Expected 1 event, got {len(events)}: {events}"
    ev = events[0]

    # Exact key set
    expected_keys = {"severity", "event_type", "agent", "invocation_id", "session_id_hash", "enter_ts_ms"}
    assert set(ev.keys()) == expected_keys, f"Key mismatch: {set(ev.keys())} != {expected_keys}"

    # Field values
    assert ev["severity"] == "INFO"
    assert ev["event_type"] == "agent.enter"
    assert ev["agent"] == "mentorship_agent"
    assert ev["invocation_id"] == "abc123"

    # session_id_hash: 16-char lowercase hex
    sid_hash = ev["session_id_hash"]
    assert isinstance(sid_hash, str), "session_id_hash must be a string"
    assert re.fullmatch(r"[0-9a-f]{16}", sid_hash), f"Not 16-char hex: {sid_hash!r}"

    # enter_ts_ms: int, sane epoch (after 2024-01-01 = 1704067200000 ms)
    assert isinstance(ev["enter_ts_ms"], int), "enter_ts_ms must be int"
    assert ev["enter_ts_ms"] >= 1704067200000, f"enter_ts_ms too old: {ev['enter_ts_ms']}"


# ---------------------------------------------------------------------------
# Test 2: exit event shape with duration_ms
# ---------------------------------------------------------------------------


def test_exit_event_shape_with_duration_ms(hash_secret):
    """agent.exit event has exactly 6 expected keys; duration_ms is non-negative int."""
    # Pre-seed enter timestamp 100 ms in the past
    enter_ms = int(datetime.now(timezone.utc).timestamp() * 1000) - 100
    ctx, _state = _make_ctx(
        "mentorship_agent",
        invocation_id="abc123",
        session_id="sess-uuid-001",
        state={"_cb_enter_mentorship_agent": enter_ms},
    )
    result, events = _capture(lifecycle_after_agent, ctx)

    assert len(events) == 1
    ev = events[0]

    expected_keys = {"severity", "event_type", "agent", "invocation_id", "session_id_hash", "duration_ms"}
    assert set(ev.keys()) == expected_keys, f"Key mismatch: {set(ev.keys())} != {expected_keys}"

    assert ev["severity"] == "INFO"
    assert ev["event_type"] == "agent.exit"
    assert ev["agent"] == "mentorship_agent"
    assert ev["invocation_id"] == "abc123"
    assert isinstance(ev["duration_ms"], int), "duration_ms must be int"
    assert ev["duration_ms"] >= 0, "duration_ms must be non-negative"
    assert ev["duration_ms"] <= 1000, f"duration_ms unreasonably large: {ev['duration_ms']}"


# ---------------------------------------------------------------------------
# Test 3: invocation_id matches across enter/exit pair
# ---------------------------------------------------------------------------


def test_correlation_id_matches_across_enter_exit_pair(hash_secret):
    """Both enter and exit events share the same invocation_id."""
    ctx, _state = _make_ctx(
        "mentorship_agent",
        invocation_id="corr-inv-007",
        session_id="sess-corr",
    )
    _, events_before = _capture(lifecycle_before_agent, ctx)
    _, events_after = _capture(lifecycle_after_agent, ctx)

    assert len(events_before) == 1
    assert len(events_after) == 1

    assert events_before[0]["invocation_id"] == "corr-inv-007"
    assert events_after[0]["invocation_id"] == "corr-inv-007"
    assert events_before[0]["invocation_id"] == events_after[0]["invocation_id"]


# ---------------------------------------------------------------------------
# Test 4: session_id_hash determinism
# ---------------------------------------------------------------------------


def test_session_id_hash_deterministic_under_same_secret(monkeypatch):
    """Same session_id + secret produces same hash; different session_id produces different hash."""
    monkeypatch.setenv("USAGE_HASH_SECRET", "secret-A")

    ctx1, _ = _make_ctx("mentorship_agent", session_id="sess-uuid-001")
    ctx2, _ = _make_ctx("mentorship_agent", session_id="sess-uuid-001")
    ctx3, _ = _make_ctx("mentorship_agent", session_id="sess-uuid-002")

    _, events1 = _capture(lifecycle_before_agent, ctx1)
    _, events2 = _capture(lifecycle_before_agent, ctx2)
    _, events3 = _capture(lifecycle_before_agent, ctx3)

    hash1 = events1[0]["session_id_hash"]
    hash2 = events2[0]["session_id_hash"]
    hash3 = events3[0]["session_id_hash"]

    # Same input → same hash
    assert hash1 == hash2, "Same session_id must produce same hash"

    # Different input → different hash
    assert hash1 != hash3, "Different session_id must produce different hash"

    # Format: 16-char lowercase hex
    assert re.fullmatch(r"[0-9a-f]{16}", hash1), f"Not 16-char hex: {hash1!r}"
    assert re.fullmatch(r"[0-9a-f]{16}", hash3), f"Not 16-char hex: {hash3!r}"


# ---------------------------------------------------------------------------
# Test 5: session_id_hash empty when USAGE_HASH_SECRET unset
# ---------------------------------------------------------------------------


def test_session_id_hash_empty_when_secret_unset(monkeypatch):
    """When USAGE_HASH_SECRET is unset, session_id_hash is empty string; no crash."""
    monkeypatch.delenv("USAGE_HASH_SECRET", raising=False)
    ctx, _ = _make_ctx("mentorship_agent", session_id="sess-uuid-any")

    result, events = _capture(lifecycle_before_agent, ctx)

    assert result is None
    assert len(events) == 1
    assert events[0]["session_id_hash"] == "", \
        f"Expected empty string, got {events[0]['session_id_hash']!r}"


# ---------------------------------------------------------------------------
# Test 6: session_id_hash empty when session_id empty
# ---------------------------------------------------------------------------


def test_session_id_hash_empty_when_session_id_empty(monkeypatch):
    """When session_id is empty, session_id_hash is empty string; no crash."""
    monkeypatch.setenv("USAGE_HASH_SECRET", "non-empty-secret")
    ctx, _ = _make_ctx("mentorship_agent", session_id="")

    result, events = _capture(lifecycle_before_agent, ctx)

    assert result is None
    assert len(events) == 1
    assert events[0]["session_id_hash"] == "", \
        f"Expected empty string, got {events[0]['session_id_hash']!r}"


# ---------------------------------------------------------------------------
# Test 7: duration_ms when no enter key in state (default = 0)
# ---------------------------------------------------------------------------


def test_duration_ms_when_no_enter_key_in_state(monkeypatch):
    """lifecycle_after_agent emits duration_ms >= 0 even if no enter key present (never crashed)."""
    monkeypatch.setenv("USAGE_HASH_SECRET", "secret-x")
    # Empty state — no _cb_enter_mentorship_agent key
    ctx, _ = _make_ctx("mentorship_agent", state={})

    result, events = _capture(lifecycle_after_agent, ctx)

    assert result is None, "Must return None"
    assert len(events) == 1, "Must emit exactly one event"
    assert events[0]["event_type"] == "agent.exit"
    dm = events[0]["duration_ms"]
    assert isinstance(dm, int)
    assert dm >= 0, f"duration_ms must be >= 0, got {dm}"


# ---------------------------------------------------------------------------
# Test 8: parallel-branch state key isolation
# ---------------------------------------------------------------------------


def test_parallel_branch_state_key_isolation(hash_secret):
    """Parallel branches write distinct state keys; no collision across gh/devto/so researchers."""
    shared_state: dict = {}

    # All three ctx objects share the SAME underlying state dict
    ctx_gh, _ = _make_ctx("gh_researcher", invocation_id="par-inv-001", state=shared_state)
    ctx_devto, _ = _make_ctx("devto_researcher", invocation_id="par-inv-001", state=shared_state)
    ctx_so, _ = _make_ctx("so_researcher", invocation_id="par-inv-001", state=shared_state)

    # Simulate parallel before callbacks
    lifecycle_before_agent(ctx_gh)
    lifecycle_before_agent(ctx_devto)
    lifecycle_before_agent(ctx_so)

    # Each branch wrote a DISTINCT state key
    assert "_cb_enter_gh_researcher" in shared_state
    assert "_cb_enter_devto_researcher" in shared_state
    assert "_cb_enter_so_researcher" in shared_state

    # Values are integer millisecond timestamps
    for key in ("_cb_enter_gh_researcher", "_cb_enter_devto_researcher", "_cb_enter_so_researcher"):
        assert isinstance(shared_state[key], int), f"State key {key!r} is not int"

    # Now call after callbacks — each emits with correct agent name
    _, events_gh = _capture(lifecycle_after_agent, ctx_gh)
    _, events_devto = _capture(lifecycle_after_agent, ctx_devto)
    _, events_so = _capture(lifecycle_after_agent, ctx_so)

    assert events_gh[0]["agent"] == "gh_researcher"
    assert events_devto[0]["agent"] == "devto_researcher"
    assert events_so[0]["agent"] == "so_researcher"

    for ev_list in (events_gh, events_devto, events_so):
        assert ev_list[0]["duration_ms"] >= 0


# ---------------------------------------------------------------------------
# Test 9: PRIVACY SENTINEL — no raw user input in any lifecycle event payload
# ---------------------------------------------------------------------------


def test_privacy_gate_no_raw_user_input_in_event_payload(hash_secret):
    """PRIVACY GATE (Phase 7 ROADMAP SC-4): state values NEVER appear in lifecycle events.

    This test is the privacy regression sentinel and MUST NOT be modified in future PRs.
    It asserts that session state values (user_skill_level, user_goals, PII-like strings)
    and the raw session_id are absent from the serialized event payloads.
    """
    state = {
        "user_skill_level": "intermediate",
        "user_goals": "PII-LIKE-CONTENT-jane@example.com-555-555-5555",
        "_cb_enter_mentorship_agent": int(datetime.now(timezone.utc).timestamp() * 1000) - 50,
    }
    ctx, _ = _make_ctx(
        "mentorship_agent",
        invocation_id="abc-priv",
        session_id="sess-uuid-priv",
        state=state,
    )

    _, events_before = _capture(lifecycle_before_agent, ctx)
    _, events_after = _capture(lifecycle_after_agent, ctx)

    all_events_serialized = json.dumps(events_before + events_after)

    forbidden_substrings = [
        "PII-LIKE-CONTENT",        # state value prefix sentinel
        "jane@example.com",         # email PII in state value
        "555-555-5555",             # phone PII in state value
        "intermediate",             # user_skill_level state value
        "sess-uuid-priv",           # raw session UUID MUST NOT appear (only HMAC'd form)
    ]

    for needle in forbidden_substrings:
        assert needle not in all_events_serialized, (
            f"PRIVACY GATE FAILED — {needle!r} leaked into lifecycle event payload.\n"
            f"Full events: {all_events_serialized}"
        )


# ---------------------------------------------------------------------------
# Test 10: exception swallow in before callback
# ---------------------------------------------------------------------------


def test_exception_swallow_in_before_callback(caplog, monkeypatch):
    """If before_agent_callback raises internally, exception is swallowed + WARNING logged."""
    monkeypatch.setenv("USAGE_HASH_SECRET", "secret-ex")

    ctx = MagicMock()
    ctx.agent_name = "boom_agent"
    ctx.invocation_id = "ex-inv-001"
    ctx.session.id = "ex-sess"

    # state.__setitem__ raises RuntimeError — this forces the callback body to raise
    # when it tries to write _cb_enter_boom_agent = now_ms
    ctx.state.__setitem__ = MagicMock(side_effect=RuntimeError("boom from state setitem"))
    ctx.state.get = MagicMock(return_value=None)

    with caplog.at_level(logging.WARNING, logger="cwa_callbacks"):
        result = lifecycle_before_agent(ctx)

    assert result is None, "Exception must be swallowed; return None"
    assert any("lifecycle_before_agent" in r.message or "error" in r.message.lower()
               for r in caplog.records if r.levelno >= logging.WARNING), \
        f"Expected WARNING from cwa_callbacks, got: {[r.message for r in caplog.records]}"


# ---------------------------------------------------------------------------
# Test 11: exception swallow in after callback
# ---------------------------------------------------------------------------


def test_exception_swallow_in_after_callback(caplog, monkeypatch):
    """If after_agent_callback raises internally, exception is swallowed + WARNING logged."""
    monkeypatch.setenv("USAGE_HASH_SECRET", "secret-ex2")

    ctx = MagicMock()
    ctx.agent_name = "boom_agent"
    ctx.invocation_id = "ex-inv-002"
    ctx.session.id = "ex-sess"

    # state.get raises RuntimeError — forces exception when reading _cb_enter_ key
    ctx.state.get = MagicMock(side_effect=RuntimeError("boom from state get"))
    ctx.state.__setitem__ = MagicMock()

    with caplog.at_level(logging.WARNING, logger="cwa_callbacks"):
        result = lifecycle_after_agent(ctx)

    assert result is None, "Exception must be swallowed; return None"
    assert any("lifecycle_after_agent" in r.message or "error" in r.message.lower()
               for r in caplog.records if r.levelno >= logging.WARNING), \
        f"Expected WARNING from cwa_callbacks, got: {[r.message for r in caplog.records]}"


# ---------------------------------------------------------------------------
# Test 12: both callbacks always return None
# ---------------------------------------------------------------------------


def test_callbacks_always_return_none(hash_secret):
    """Both lifecycle callbacks ALWAYS return None — never short-circuit the agent body."""
    ctx_enter, _ = _make_ctx("root_agent")
    ctx_exit, state = _make_ctx(
        "root_agent",
        state={"_cb_enter_root_agent": int(datetime.now(timezone.utc).timestamp() * 1000) - 10},
    )

    result_before = lifecycle_before_agent(ctx_enter)
    result_after = lifecycle_after_agent(ctx_exit)

    assert result_before is None, f"lifecycle_before_agent returned non-None: {result_before!r}"
    assert result_after is None, f"lifecycle_after_agent returned non-None: {result_after!r}"


# ---------------------------------------------------------------------------
# Test 13: invocation_id propagates across two agents in one Discord turn
# ---------------------------------------------------------------------------


def test_invocation_id_propagates_across_two_agents_in_one_turn(hash_secret):
    """BLOCKER 5 — Cross-agent invocation_id correlation.

    Simulates ADK passing the SAME invocation_id to root_agent and mentorship_agent
    in a single Discord turn. Asserts:
    - 4 events emitted (2 enter + 2 exit)
    - Both agents share invocation_id == "shared-inv-001"
    - State dict contains BOTH agent-scoped enter keys
    - This proves the P95-per-agent dashboard substrate works via Cloud Logging filter
      `jsonPayload.invocation_id = "shared-inv-001"`.
    """
    shared_state: dict = {}

    # Two mocks share the SAME invocation_id (ADK behavior per RESEARCH §6)
    ctx_root, _ = _make_ctx(
        "community_assistant",
        invocation_id="shared-inv-001",
        session_id="sess-multi-agent",
        state=shared_state,
    )
    ctx_mentorship, _ = _make_ctx(
        "mentorship_agent",
        invocation_id="shared-inv-001",
        session_id="sess-multi-agent",
        state=shared_state,
    )

    # Simulate: root enter → root exit → sub-agent enter → sub-agent exit
    _, events_root_enter = _capture(lifecycle_before_agent, ctx_root)
    _, events_root_exit = _capture(lifecycle_after_agent, ctx_root)
    _, events_sub_enter = _capture(lifecycle_before_agent, ctx_mentorship)
    _, events_sub_exit = _capture(lifecycle_after_agent, ctx_mentorship)

    all_events = events_root_enter + events_root_exit + events_sub_enter + events_sub_exit

    assert len(all_events) == 4, f"Expected 4 events, got {len(all_events)}: {all_events}"

    # All events share the same invocation_id
    for ev in all_events:
        assert ev["invocation_id"] == "shared-inv-001", \
            f"invocation_id mismatch in {ev}: expected 'shared-inv-001'"

    # State dict has BOTH agent-scoped enter keys (written by before callbacks)
    assert "_cb_enter_community_assistant" in shared_state, \
        "community_assistant enter key missing from shared state"
    assert "_cb_enter_mentorship_agent" in shared_state, \
        "mentorship_agent enter key missing from shared state"

    # Events are grouped correctly by agent
    root_events = [e for e in all_events if e["agent"] == "community_assistant"]
    sub_events = [e for e in all_events if e["agent"] == "mentorship_agent"]

    assert len(root_events) == 2  # enter + exit
    assert len(sub_events) == 2   # enter + exit

    root_types = {e["event_type"] for e in root_events}
    sub_types = {e["event_type"] for e in sub_events}

    assert root_types == {"agent.enter", "agent.exit"}
    assert sub_types == {"agent.enter", "agent.exit"}
