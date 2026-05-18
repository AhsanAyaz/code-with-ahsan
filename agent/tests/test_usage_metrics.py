"""Tests for discord_bot.usage_metrics — pure helpers, no ADK/discord deps."""
from __future__ import annotations

import json
import sys
from io import StringIO
from pathlib import Path
from types import SimpleNamespace

AGENT_ROOT = Path(__file__).resolve().parent.parent
if str(AGENT_ROOT) not in sys.path:
    sys.path.insert(0, str(AGENT_ROOT))

from discord_bot.usage_metrics import (
    build_usage_event,
    collect_event_signals,
    derive_query_topic,
    emit_usage_event,
    extract_cited_urls,
    hash_user_id,
)


# ---------------------------------------------------------------------------
# hash_user_id
# ---------------------------------------------------------------------------


def test_hash_user_id_deterministic_for_same_secret():
    a = hash_user_id("123456789", "secret-v1")
    b = hash_user_id("123456789", "secret-v1")
    assert a == b
    assert len(a) == 16


def test_hash_user_id_differs_when_secret_rotates():
    assert hash_user_id("123", "s1") != hash_user_id("123", "s2")


def test_hash_user_id_empty_inputs_return_empty():
    assert hash_user_id("", "secret") == ""
    assert hash_user_id("123", "") == ""


def test_hash_user_id_never_contains_raw_id():
    raw = "987654321"
    h = hash_user_id(raw, "secret-v1")
    assert raw not in h


# ---------------------------------------------------------------------------
# extract_cited_urls
# ---------------------------------------------------------------------------


def test_extract_cited_urls_basic():
    text = "See https://blog.codewithahsan.dev/ai-guide and https://github.com/foo/bar."
    urls = extract_cited_urls(text)
    assert urls == [
        "https://blog.codewithahsan.dev/ai-guide",
        "https://github.com/foo/bar",
    ]


def test_extract_cited_urls_dedupes_and_preserves_order():
    text = "a https://x.com/a b https://y.com c https://x.com/a"
    assert extract_cited_urls(text) == ["https://x.com/a", "https://y.com"]


def test_extract_cited_urls_empty_text():
    assert extract_cited_urls("") == []
    assert extract_cited_urls(None) == []  # type: ignore[arg-type]


def test_extract_cited_urls_strips_trailing_punctuation():
    text = "Read https://example.com/article."
    assert extract_cited_urls(text) == ["https://example.com/article"]


def test_extract_cited_urls_caps_at_max():
    urls = " ".join(f"https://x.com/{i}" for i in range(20))
    assert len(extract_cited_urls(urls, max_urls=5)) == 5


# ---------------------------------------------------------------------------
# collect_event_signals
# ---------------------------------------------------------------------------


def _fake_event(*, author=None, function_call_names=()):
    parts = [SimpleNamespace(function_call=SimpleNamespace(name=n)) for n in function_call_names]
    content = SimpleNamespace(parts=parts) if parts else None
    return SimpleNamespace(author=author, content=content)


def test_collect_event_signals_tallies_tools_and_agents():
    events = [
        _fake_event(author="root_agent"),
        _fake_event(author="content_agent", function_call_names=["search_blog_posts"]),
        _fake_event(author="content_agent", function_call_names=["search_youtube_videos"]),
    ]
    out = collect_event_signals(events)
    assert out["agents"] == ["root_agent", "content_agent"]
    assert out["tool_calls"] == ["search_blog_posts", "search_youtube_videos"]


def test_collect_event_signals_handles_missing_attrs():
    events = [SimpleNamespace(), SimpleNamespace(author=None, content=None)]
    out = collect_event_signals(events)
    assert out == {"tool_calls": [], "agents": []}


def test_collect_event_signals_dedupes_agents():
    events = [
        _fake_event(author="content_agent"),
        _fake_event(author="content_agent"),
    ]
    assert collect_event_signals(events)["agents"] == ["content_agent"]


# ---------------------------------------------------------------------------
# derive_query_topic
# ---------------------------------------------------------------------------


def test_derive_query_topic_picks_first_non_root():
    assert derive_query_topic(["root_agent", "content_agent"]) == "content_agent"


def test_derive_query_topic_returns_none_when_only_root():
    assert derive_query_topic(["root_agent"]) is None


def test_derive_query_topic_empty_list():
    assert derive_query_topic([]) is None


# ---------------------------------------------------------------------------
# build_usage_event
# ---------------------------------------------------------------------------


def test_build_usage_event_shape():
    event = build_usage_event(
        user_id_hash="abc123",
        guild_id=987,
        channel_id=1504452473056792668,
        routed_agents=["root_agent", "content_agent"],
        tool_calls=["search_blog_posts"],
        cited_urls=["https://blog.codewithahsan.dev/x"],
        response_chars=512,
        latency_ms=1234,
        status="ok",
        query_len=42,
        query_topic="content_agent",
    )
    assert event["severity"] == "INFO"
    assert event["event_type"] == "bot_message"
    assert event["guild_id"] == "987"  # serialized as string for log-based metric labels
    assert event["channel_id"] == "1504452473056792668"
    assert event["status"] == "ok"
    assert event["query_topic"] == "content_agent"


def test_build_usage_event_handles_missing_guild_id():
    event = build_usage_event(
        user_id_hash="",
        guild_id=None,
        channel_id=1,
        routed_agents=[],
        tool_calls=[],
        cited_urls=[],
        response_chars=0,
        latency_ms=0,
        status="error",
        query_len=0,
        query_topic=None,
    )
    assert event["guild_id"] is None


def test_build_usage_event_never_contains_query_text_key():
    event = build_usage_event(
        user_id_hash="h",
        guild_id=1,
        channel_id=2,
        routed_agents=[],
        tool_calls=[],
        cited_urls=[],
        response_chars=10,
        latency_ms=10,
        status="ok",
        query_len=5,
        query_topic=None,
    )
    # privacy invariant: no raw query field should ever leak
    for forbidden in ("query", "query_text", "user_message", "raw_query"):
        assert forbidden not in event


# ---------------------------------------------------------------------------
# emit_usage_event
# ---------------------------------------------------------------------------


def test_emit_usage_event_writes_single_line_json(monkeypatch):
    buf = StringIO()
    monkeypatch.setattr(sys, "stdout", buf)
    emit_usage_event({"severity": "INFO", "event_type": "bot_message", "n": 1})
    output = buf.getvalue()
    assert output.endswith("\n")
    assert "\n" not in output[:-1], "JSON payload must be single-line for Cloud Logging"
    parsed = json.loads(output.strip())
    assert parsed["event_type"] == "bot_message"
    assert parsed["n"] == 1
