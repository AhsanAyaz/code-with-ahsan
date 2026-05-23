"""Plan 07-02 Task 1 (RED) — failing tests for tool-cache callbacks.

These tests target as-yet-unwritten exports in `community_assistant.callbacks`:
  - before_tool_cache  (async def — before_tool_callback)
  - after_tool_cache   (async def — after_tool_callback)
  - CACHEABLE_TOOLS    (frozenset[str])
  - CACHE_TTL_SECONDS  (int = 600)

12 behaviors covered (RESEARCH §6 + §11 + §9 Pitfalls):
  1. Cache miss returns None + emits `tool_cache_miss` event (6-field common shape).
  2. after_tool_cache writes 2-tuple (iso_ts, deepcopy(response)) into state.
  3. after_tool_cache does NOT cache `status="error"` responses (T-07-10).
  4. Cache hit returns deep-copy of cached dict + emits `tool_cache_hit` (7-field).
  5. TTL boundary HIT at 599s elapsed (freezegun).
  6. TTL boundary MISS at 601s elapsed (freezegun).
  7. Tool-name isolation — same query, different tool → cache MISS (T-07-08).
  8. Non-cacheable tool short-circuits — no event, no state write.
  9. Cache-key normalization — case + whitespace + punctuation collapse to same key.
 10. Multi-key cache — no collision; each key returns its own seeded payload.
 11. Malformed timestamp treated as miss (defensive — no crash).
 12. Exception inside callback swallowed — returns None + WARNING logged.
"""
import json
import logging
import re
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from freezegun import freeze_time

from community_assistant.callbacks import (
    CACHE_TTL_SECONDS,
    CACHEABLE_TOOLS,
    after_tool_cache,
    before_tool_cache,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _FakeTool:
    """Minimal stand-in for google.adk.tools.BaseTool — callbacks only read `.name`."""
    def __init__(self, name: str):
        self.name = name


class _StateProxy:
    """Lightweight dict-like state proxy.

    A plain class (not a MagicMock) is the only reliable way to override
    dunder methods (__getitem__ / __setitem__ / __contains__) on a mock —
    assigning lambdas to those attributes on a MagicMock causes the bound-
    method auto-`self` injection to clash with the lambda's signature
    (TypeError: lambda takes 2 positional args but 3 were given).
    """

    def __init__(self, backing: dict):
        self._backing = backing

    def get(self, key, default=None):
        return self._backing.get(key, default)

    def __getitem__(self, key):
        return self._backing[key]

    def __setitem__(self, key, value):
        self._backing[key] = value

    def __contains__(self, key):
        return key in self._backing


def _make_tool_context(initial_state=None):
    """Build a MagicMock that mimics ToolContext + a backing state dict.

    Returns (ctx, state) so tests can assert against the live state dict.
    """
    state = dict(initial_state or {})

    ctx = MagicMock()
    ctx.state = _StateProxy(state)
    ctx.agent_name = "content_agent"
    ctx.invocation_id = "test-inv-002"
    ctx.session.id = "test-session-uuid-002"  # raw UUID — MUST NOT leak to events
    return ctx, state


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

async def test_before_tool_cache_miss_returns_none_and_emits_event_with_common_fields(
    capsys, monkeypatch
):
    """Test 1 — Cold cache: returns None + emits 6-field tool_cache_miss event."""
    monkeypatch.setenv("USAGE_HASH_SECRET", "test-secret")
    ctx, state = _make_tool_context(initial_state={})
    tool = _FakeTool("search_blog_posts")

    result = await before_tool_cache(tool, {"query": "angular"}, ctx)

    assert result is None
    captured = capsys.readouterr()
    events = [json.loads(line) for line in captured.out.strip().splitlines() if line.strip()]
    miss_events = [e for e in events if e.get("event_type") == "tool_cache_miss"]
    assert len(miss_events) == 1, f"expected exactly 1 miss event, got {events}"
    e = miss_events[0]
    # BLOCKER 1 — exact 6-field shape (5 common + tool)
    assert set(e.keys()) == {
        "severity", "event_type", "agent", "invocation_id", "session_id_hash", "tool",
    }
    assert e["severity"] == "INFO"
    assert e["event_type"] == "tool_cache_miss"
    assert e["agent"] == "content_agent"
    assert e["invocation_id"] == "test-inv-002"
    assert re.match(r"^[0-9a-f]{16}$", e["session_id_hash"])
    assert e["tool"] == "search_blog_posts"
    # Privacy: raw session UUID MUST NOT leak
    assert "test-session-uuid-002" not in captured.out


async def test_after_tool_cache_writes_entry_to_state():
    """Test 2 — after_tool_cache populates state['app_cache'] with (iso_ts, response)."""
    ctx, state = _make_tool_context(initial_state={})
    tool = _FakeTool("search_blog_posts")
    payload = {"status": "success", "query": "angular", "count": 1, "posts": [{"title": "X"}]}

    result = await after_tool_cache(tool, {"query": "angular"}, ctx, payload)

    assert result is None
    assert "app_cache" in state
    assert "search_blog_posts__angular" in state["app_cache"]
    entry = state["app_cache"]["search_blog_posts__angular"]
    assert isinstance(entry, tuple)
    assert len(entry) == 2
    ts_str, cached_payload = entry
    # ISO timestamp parses successfully
    parsed = datetime.fromisoformat(ts_str)
    assert parsed.tzinfo is not None
    # Cached payload equals input
    assert cached_payload == payload
    # ...but deep-copied (not the same object)
    assert cached_payload is not payload


async def test_after_tool_cache_does_not_cache_error_response():
    """Test 3 (T-07-10) — error responses must not poison the cache."""
    ctx, state = _make_tool_context(initial_state={})
    tool = _FakeTool("search_blog_posts")
    error_payload = {"status": "error", "message": "Ghost upstream 503", "posts": []}

    result = await after_tool_cache(tool, {"query": "angular"}, ctx, error_payload)

    assert result is None
    assert "app_cache" not in state


async def test_before_tool_cache_hit_returns_cached_dict_and_emits_event_with_common_fields(
    capsys, monkeypatch
):
    """Test 4 — Warm cache: returns deep-copy + emits 7-field tool_cache_hit event."""
    monkeypatch.setenv("USAGE_HASH_SECRET", "test-secret")
    seeded_payload = {"status": "success", "posts": [{"title": "seeded"}]}
    seeded_ts = datetime.now(timezone.utc).isoformat()
    ctx, state = _make_tool_context(initial_state={
        "app_cache": {"search_blog_posts__angular": (seeded_ts, seeded_payload)},
    })
    tool = _FakeTool("search_blog_posts")

    result = await before_tool_cache(tool, {"query": "angular"}, ctx)

    assert result == seeded_payload
    # deep-copy assertion — returned dict must NOT be the same object as the seeded one
    assert result is not seeded_payload
    # mutation isolation — mutating returned dict must NOT poison the cache
    result["posts"].append({"title": "intruder"})
    assert state["app_cache"]["search_blog_posts__angular"][1] == seeded_payload

    captured = capsys.readouterr()
    events = [json.loads(line) for line in captured.out.strip().splitlines() if line.strip()]
    hit_events = [e for e in events if e.get("event_type") == "tool_cache_hit"]
    assert len(hit_events) == 1, f"expected exactly 1 hit event, got {events}"
    e = hit_events[0]
    # BLOCKER 1 — exact 7-field shape (5 common + tool + age_s)
    assert set(e.keys()) == {
        "severity", "event_type", "agent", "invocation_id",
        "session_id_hash", "tool", "age_s",
    }
    assert e["severity"] == "INFO"
    assert e["event_type"] == "tool_cache_hit"
    assert e["agent"] == "content_agent"
    assert e["invocation_id"] == "test-inv-002"
    assert re.match(r"^[0-9a-f]{16}$", e["session_id_hash"])
    assert e["tool"] == "search_blog_posts"
    assert isinstance(e["age_s"], int)
    assert 0 <= e["age_s"] <= CACHE_TTL_SECONDS
    # Privacy: raw session UUID MUST NOT leak
    assert "test-session-uuid-002" not in captured.out


@freeze_time("2026-05-24 12:00:00")
async def test_cache_hit_at_ttl_boundary_599s(capsys):
    """Test 5 — Boundary: 599s after population is still a HIT."""
    ctx, state = _make_tool_context(initial_state={})
    tool = _FakeTool("search_blog_posts")
    payload = {"status": "success", "query": "angular", "posts": []}

    # Populate cache at 12:00:00
    await after_tool_cache(tool, {"query": "angular"}, ctx, payload)
    assert "app_cache" in state
    capsys.readouterr()  # discard any output from populate

    # Query at 12:09:59 (599s elapsed) — should HIT
    with freeze_time("2026-05-24 12:09:59"):
        result = await before_tool_cache(tool, {"query": "angular"}, ctx)
        assert result is not None  # HIT
        assert result == payload
        captured = capsys.readouterr()
        events = [json.loads(line) for line in captured.out.strip().splitlines() if line.strip()]
        hit_events = [e for e in events if e.get("event_type") == "tool_cache_hit"]
        assert len(hit_events) == 1
        assert hit_events[0]["age_s"] == 599


@freeze_time("2026-05-24 12:00:00")
async def test_cache_miss_at_ttl_boundary_601s(capsys):
    """Test 6 — Boundary: 601s after population is a MISS."""
    ctx, state = _make_tool_context(initial_state={})
    tool = _FakeTool("search_blog_posts")
    payload = {"status": "success", "query": "angular", "posts": []}

    # Populate cache at 12:00:00
    await after_tool_cache(tool, {"query": "angular"}, ctx, payload)
    capsys.readouterr()

    # Query at 12:10:01 (601s elapsed) — should MISS
    with freeze_time("2026-05-24 12:10:01"):
        result = await before_tool_cache(tool, {"query": "angular"}, ctx)
        assert result is None  # MISS
        captured = capsys.readouterr()
        events = [json.loads(line) for line in captured.out.strip().splitlines() if line.strip()]
        miss_events = [e for e in events if e.get("event_type") == "tool_cache_miss"]
        assert len(miss_events) == 1
        # Old expired entry remains in state (no eviction in 07-02)
        assert "app_cache" in state
        assert "search_blog_posts__angular" in state["app_cache"]


async def test_tool_name_isolation(capsys, monkeypatch):
    """Test 7 (T-07-08) — same query, different tool → MISS (no key collision)."""
    monkeypatch.setenv("USAGE_HASH_SECRET", "test-secret")
    blog_payload = {"status": "success", "posts": [{"title": "blog"}]}
    seeded_ts = datetime.now(timezone.utc).isoformat()
    ctx, state = _make_tool_context(initial_state={
        "app_cache": {"search_blog_posts__angular": (seeded_ts, blog_payload)},
    })

    # Different tool, same query — must be a MISS
    yt_tool = _FakeTool("search_youtube_videos")
    result = await before_tool_cache(yt_tool, {"query": "angular"}, ctx)
    assert result is None

    captured = capsys.readouterr()
    events = [json.loads(line) for line in captured.out.strip().splitlines() if line.strip()]
    miss_events = [e for e in events if e.get("event_type") == "tool_cache_miss"]
    assert len(miss_events) == 1
    assert miss_events[0]["tool"] == "search_youtube_videos"

    # Original blog entry MUST be untouched
    assert state["app_cache"]["search_blog_posts__angular"] == (seeded_ts, blog_payload)


async def test_non_cacheable_tool_returns_none_immediately(capsys):
    """Test 8 — featured_resources_agent is NOT in CACHEABLE_TOOLS → silent pass-through."""
    ctx, state = _make_tool_context(initial_state={})
    tool = _FakeTool("featured_resources_agent")

    before_result = await before_tool_cache(tool, {"query": "ai guide"}, ctx)
    after_result = await after_tool_cache(
        tool, {"query": "ai guide"}, ctx, {"status": "success", "items": []}
    )

    assert before_result is None
    assert after_result is None
    # NO event emitted (neither hit nor miss) for non-cacheable tool
    captured = capsys.readouterr()
    assert "tool_cache_hit" not in captured.out
    assert "tool_cache_miss" not in captured.out
    # NO state write
    assert "app_cache" not in state


async def test_cache_key_normalization_case_and_whitespace(monkeypatch):
    """Test 9 — case + whitespace + punctuation normalization collapses to same key."""
    monkeypatch.setenv("USAGE_HASH_SECRET", "test-secret")
    ctx, state = _make_tool_context(initial_state={})
    tool = _FakeTool("search_blog_posts")
    payload = {"status": "success", "posts": [{"title": "ng signals"}]}

    # Populate with mixed-case query
    await after_tool_cache(tool, {"query": "Angular Signals"}, ctx, payload)
    assert "search_blog_posts__angular signals" in state["app_cache"]

    # Query with extra whitespace + different case — should HIT
    result_ws = await before_tool_cache(tool, {"query": "  angular signals  "}, ctx)
    assert result_ws == payload

    # Query with trailing punctuation — should HIT (punctuation stripped)
    result_punct = await before_tool_cache(tool, {"query": "angular signals!"}, ctx)
    assert result_punct == payload


async def test_multi_key_cache_does_not_collide(capsys, monkeypatch):
    """Test 10 — two cached queries each return their own seeded payload."""
    monkeypatch.setenv("USAGE_HASH_SECRET", "test-secret")
    angular_payload = {"status": "success", "posts": [{"title": "angular"}]}
    react_payload = {"status": "success", "posts": [{"title": "react"}]}
    now_iso = datetime.now(timezone.utc).isoformat()

    ctx, state = _make_tool_context(initial_state={
        "app_cache": {
            "search_blog_posts__angular": (now_iso, angular_payload),
            "search_blog_posts__react": (now_iso, react_payload),
        },
    })
    tool = _FakeTool("search_blog_posts")

    r1 = await before_tool_cache(tool, {"query": "angular"}, ctx)
    assert r1 == angular_payload
    r2 = await before_tool_cache(tool, {"query": "react"}, ctx)
    assert r2 == react_payload

    captured = capsys.readouterr()
    events = [json.loads(line) for line in captured.out.strip().splitlines() if line.strip()]
    hit_events = [e for e in events if e.get("event_type") == "tool_cache_hit"]
    assert len(hit_events) == 2
    # Both events report tool=search_blog_posts (correct cache lookup)
    for e in hit_events:
        assert e["tool"] == "search_blog_posts"


async def test_before_tool_cache_malformed_timestamp_treated_as_miss(capsys, monkeypatch):
    """Test 11 — malformed timestamp in cached entry → treat as MISS (defensive)."""
    monkeypatch.setenv("USAGE_HASH_SECRET", "test-secret")
    ctx, state = _make_tool_context(initial_state={
        "app_cache": {"search_blog_posts__angular": ("NOT-A-DATE", {"posts": []})},
    })
    tool = _FakeTool("search_blog_posts")

    result = await before_tool_cache(tool, {"query": "angular"}, ctx)
    assert result is None  # MISS

    captured = capsys.readouterr()
    events = [json.loads(line) for line in captured.out.strip().splitlines() if line.strip()]
    miss_events = [e for e in events if e.get("event_type") == "tool_cache_miss"]
    assert len(miss_events) == 1

    # Malformed entry preserved (no eviction in 07-02)
    assert state["app_cache"]["search_blog_posts__angular"] == ("NOT-A-DATE", {"posts": []})


async def test_exception_swallow_returns_none(caplog):
    """Test 12 (RESEARCH §9 Pitfall 1) — internal exception logged WARNING + returns None."""
    ctx = MagicMock()
    ctx.state.get = MagicMock(side_effect=RuntimeError("boom"))
    ctx.agent_name = "content_agent"
    ctx.invocation_id = "test-inv-002"
    ctx.session.id = "test-session-uuid-002"
    tool = _FakeTool("search_blog_posts")

    with caplog.at_level(logging.WARNING, logger="cwa_callbacks"):
        result = await before_tool_cache(tool, {"query": "angular"}, ctx)

    assert result is None
    # WARNING logged (exact message not asserted — just that the logger fired)
    assert any(rec.levelno == logging.WARNING for rec in caplog.records), \
        f"expected a WARNING log record, got {caplog.records}"


# ---------------------------------------------------------------------------
# Sanity: exported constants are what we expect (RESEARCH §5)
# ---------------------------------------------------------------------------

def test_cacheable_tools_exact_set():
    assert CACHEABLE_TOOLS == frozenset({"search_blog_posts", "search_youtube_videos"})


def test_cache_ttl_seconds_value():
    assert CACHE_TTL_SECONDS == 600
