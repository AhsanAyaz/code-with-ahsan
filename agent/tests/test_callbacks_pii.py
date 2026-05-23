"""
test_callbacks_pii.py — RED phase tests for Plan 07-01 PII sanitizer callback.

Target: agent/community_assistant/callbacks.py (does not exist yet).
All 16 tests MUST fail with ModuleNotFoundError on first run (RED state).
"""
import io
import json
import logging
import re
import sys
from unittest.mock import MagicMock

import pytest
from google.adk.models import LlmRequest
from google.genai import types

from community_assistant.callbacks import pii_sanitizer, PII_PATTERNS, REDACTION_PLACEHOLDER


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

def _make_ctx(
    agent_name: str = "community_assistant",
    invocation_id: str = "test-inv-001",
    session_id: str = "test-session-uuid-001",
) -> MagicMock:
    ctx = MagicMock()
    ctx.agent_name = agent_name
    ctx.invocation_id = invocation_id
    ctx.session.id = session_id
    return ctx


def _make_request(user_text: str) -> LlmRequest:
    return LlmRequest(
        contents=[types.Content(role="user", parts=[types.Part(text=user_text)])]
    )


def _capture(fn, *args, **kwargs):
    buf = io.StringIO()
    old = sys.stdout
    sys.stdout = buf
    try:
        result = fn(*args, **kwargs)
    finally:
        sys.stdout = old
    events = [
        json.loads(line)
        for line in buf.getvalue().strip().splitlines()
        if line.strip()
    ]
    return result, events


# ---------------------------------------------------------------------------
# Test 1 — CREDIT_CARD
# ---------------------------------------------------------------------------

def test_credit_card_redacted():
    ctx = _make_ctx()
    req = _make_request("my card is 4111-1111-1111-1111")
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    text = req.contents[-1].parts[0].text
    assert REDACTION_PLACEHOLDER in text
    assert "4111" not in text
    assert len(events) == 1
    assert events[0]["pii_types"] == ["CREDIT_CARD"]
    assert events[0]["redacted_count"] == 1


# ---------------------------------------------------------------------------
# Test 2 — SSN
# ---------------------------------------------------------------------------

def test_ssn_redacted():
    ctx = _make_ctx()
    req = _make_request("my ssn is 123-45-6789")
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    text = req.contents[-1].parts[0].text
    assert REDACTION_PLACEHOLDER in text
    assert "123-45-6789" not in text
    assert len(events) == 1
    assert "SSN" in events[0]["pii_types"]


# ---------------------------------------------------------------------------
# Test 3 — DISCORD_MENTION (lookbehind prevents double-match with DISCORD_SNOWFLAKE)
# ---------------------------------------------------------------------------

def test_discord_mention_redacted():
    ctx = _make_ctx()
    req = _make_request("thanks <@!123456789012345678> for the help")
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    text = req.contents[-1].parts[0].text
    assert REDACTION_PLACEHOLDER in text
    assert len(events) == 1
    assert "DISCORD_MENTION" in events[0]["pii_types"]
    # Lookbehind must suppress double-match: redacted_count should be 1, not 2
    assert events[0]["redacted_count"] == 1


# ---------------------------------------------------------------------------
# Test 4 — DISCORD_SNOWFLAKE (bare 18-digit, no preceding <@)
# ---------------------------------------------------------------------------

def test_discord_snowflake_redacted():
    ctx = _make_ctx()
    req = _make_request("user 987654321098765432 was helpful")
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    text = req.contents[-1].parts[0].text
    assert REDACTION_PLACEHOLDER in text
    assert len(events) == 1
    assert "DISCORD_SNOWFLAKE" in events[0]["pii_types"]


# ---------------------------------------------------------------------------
# Test 5 — EMAIL
# ---------------------------------------------------------------------------

def test_email_redacted():
    ctx = _make_ctx()
    req = _make_request("email me at jane.doe@example.com please")
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    text = req.contents[-1].parts[0].text
    assert REDACTION_PLACEHOLDER in text
    assert "jane.doe@example.com" not in text
    assert len(events) == 1
    assert "EMAIL" in events[0]["pii_types"]


# ---------------------------------------------------------------------------
# Test 6 — PHONE
# ---------------------------------------------------------------------------

def test_phone_redacted():
    ctx = _make_ctx()
    req = _make_request("call me at +1 (555) 123-4567")
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    text = req.contents[-1].parts[0].text
    assert REDACTION_PLACEHOLDER in text
    assert len(events) == 1
    assert "PHONE" in events[0]["pii_types"]


# ---------------------------------------------------------------------------
# Test 7 — multi-PII single message
# ---------------------------------------------------------------------------

def test_multi_pii_single_message():
    ctx = _make_ctx()
    req = _make_request("my card 4111111111111111 and email jane@x.io")
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    assert len(events) == 1
    assert events[0]["redacted_count"] == 2
    pii_types = events[0]["pii_types"]
    assert "CREDIT_CARD" in pii_types
    assert "EMAIL" in pii_types


# ---------------------------------------------------------------------------
# Test 8 — negative: port number not redacted
# ---------------------------------------------------------------------------

def test_negative_port_number_not_redacted():
    ctx = _make_ctx()
    input_text = "the server runs on port :8080 and you reach it at https://localhost:8080/api"
    req = _make_request(input_text)
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    text = req.contents[-1].parts[0].text
    assert text == input_text
    assert events == []


# ---------------------------------------------------------------------------
# Test 9 — negative: semver not redacted
# ---------------------------------------------------------------------------

def test_negative_semver_not_redacted():
    ctx = _make_ctx()
    input_text = "upgrade to version 1.29.0 to fix this"
    req = _make_request(input_text)
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    text = req.contents[-1].parts[0].text
    assert text == input_text
    assert events == []


# ---------------------------------------------------------------------------
# Test 10 — negative: large count not redacted
# ---------------------------------------------------------------------------

def test_negative_large_count_not_redacted():
    ctx = _make_ctx()
    input_text = "Angular has 150000 GitHub stars"
    req = _make_request(input_text)
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    text = req.contents[-1].parts[0].text
    assert text == input_text
    assert events == []


# ---------------------------------------------------------------------------
# Test 11 — no PII pass-through
# ---------------------------------------------------------------------------

def test_no_pii_pass_through():
    ctx = _make_ctx()
    input_text = "how do I write a React component?"
    req = _make_request(input_text)
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    assert req.contents[-1].parts[0].text == input_text
    assert events == []


# ---------------------------------------------------------------------------
# Test 12 — only most-recent user message processed
# ---------------------------------------------------------------------------

def test_only_most_recent_user_message_processed():
    ctx = _make_ctx()
    req = LlmRequest(
        contents=[
            types.Content(role="user", parts=[types.Part(text="hi")]),
            types.Content(role="model", parts=[types.Part(text="welcome")]),
            types.Content(role="user", parts=[types.Part(text="card 4111-1111-1111-1111")]),
        ]
    )
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    # First user message must be unchanged
    assert req.contents[0].parts[0].text == "hi"
    # Third content (most recent user) must be redacted
    assert REDACTION_PLACEHOLDER in req.contents[2].parts[0].text
    assert len(events) == 1


# ---------------------------------------------------------------------------
# Test 13 — exception inside callback swallowed
# ---------------------------------------------------------------------------

def test_exception_inside_callback_swallowed(caplog):
    # Passing text=None forces a code path that would TypeError without guard
    req = LlmRequest(
        contents=[types.Content(role="user", parts=[types.Part(text=None)])]
    )
    with caplog.at_level(logging.WARNING, logger="cwa_callbacks"):
        result = pii_sanitizer(_make_ctx(), req)
    assert result is None
    # Contract: no exception escapes. The warning is optional (depends on implementation).
    # Hard assertion: no pytest exception raised by this point.


# ---------------------------------------------------------------------------
# Test 14 — privacy sentinel: no raw match leakage + session_id_hash present
# ---------------------------------------------------------------------------

def test_event_no_raw_match_leakage_and_session_id_hash_present(monkeypatch):
    monkeypatch.setenv("USAGE_HASH_SECRET", "test-secret")
    ctx = _make_ctx(session_id="test-session-uuid-001")
    req = _make_request("my card 4111-1111-1111-1111")
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    assert len(events) == 1
    e = events[0]
    raw_event_str = json.dumps(e)
    # Raw PII must not appear in event JSON
    assert "4111-1111-1111-1111" not in raw_event_str
    # Raw session_id must not appear in event JSON
    assert "test-session-uuid-001" not in raw_event_str
    # Exact 7-field schema (RESEARCH §6 common-fields shape)
    assert set(e.keys()) == {
        "severity",
        "event_type",
        "agent",
        "invocation_id",
        "session_id_hash",
        "redacted_count",
        "pii_types",
    }
    # session_id_hash must be 16-char lowercase hex (HMAC-SHA256 truncated)
    assert re.match(r"^[0-9a-f]{16}$", e["session_id_hash"])


# ---------------------------------------------------------------------------
# Test 15 — return value is None (proceed semantics, never short-circuit)
# ---------------------------------------------------------------------------

def test_return_value_is_None_for_proceed():
    for user_text in [
        "my card is 4111-1111-1111-1111",   # PII present
        "how do I write a React component?",  # no PII
    ]:
        ctx = _make_ctx()
        req = _make_request(user_text)
        result, _ = _capture(pii_sanitizer, ctx, req)
        assert result is None, f"Expected None for input {user_text!r}, got {result!r}"


# ---------------------------------------------------------------------------
# Test 16 — empty contents: no crash, no event
# ---------------------------------------------------------------------------

def test_empty_contents_no_crash():
    ctx = _make_ctx()
    req = LlmRequest(contents=[])
    result, events = _capture(pii_sanitizer, ctx, req)
    assert result is None
    assert events == []
