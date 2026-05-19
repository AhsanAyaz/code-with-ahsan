"""Structured Cloud Logging instrumentation for the CWA Discord bot.

Emits one JSON line per handled message to stdout. Cloud Run captures stdout
as Cloud Logging `jsonPayload`, so log-based metrics can scrape these fields
without an extra ingestion service.

Privacy: raw user IDs and raw query text are NEVER emitted. User IDs are
HMAC-SHA256 hashed with `USAGE_HASH_SECRET`. Only `query_len` (char count) and
`query_topic` (derived from routed sub-agent) leave the bot.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import re
import sys
import time
from typing import Any, Iterable

_logger = logging.getLogger("cwa_assistant_bot.usage")

_URL_RE = re.compile(r"https?://[^\s\)\]\}\>\"'`]+")
_USAGE_EVENT_TYPE = "bot_message"
_MAX_CITED_URLS = 10
_MAX_TOOL_CALLS = 20
_MAX_AGENTS = 8


def hash_user_id(raw_user_id: str, secret: str) -> str:
    """HMAC-SHA256 of raw_user_id keyed by secret, truncated to 16 hex chars.

    Returns "" when either input is empty so callers can still emit events when
    USAGE_HASH_SECRET is unset (counts still useful; uniqueness signal lost).
    """
    if not raw_user_id or not secret:
        return ""
    mac = hmac.new(secret.encode("utf-8"), raw_user_id.encode("utf-8"), hashlib.sha256)
    return mac.hexdigest()[:16]


def extract_cited_urls(text: str, max_urls: int = _MAX_CITED_URLS) -> list[str]:
    """Pull http(s) URLs from response text. De-duplicated, order-preserving, capped."""
    if not text:
        return []
    seen: list[str] = []
    for match in _URL_RE.findall(text):
        url = match.rstrip(".,;:!?'\"")
        if url not in seen:
            seen.append(url)
            if len(seen) >= max_urls:
                break
    return seen


def collect_event_signals(events: Iterable[Any]) -> dict:
    """Walk ADK Event-like objects and tally tool calls + agent authors.

    Defensive against shape drift — every access uses getattr with a default so
    a missing attribute degrades silently rather than crashing the bot.

    Returns: {"tool_calls": [...], "agents": [...]}.
    """
    tool_calls: list[str] = []
    agents: list[str] = []
    for event in events:
        author = getattr(event, "author", None)
        if author and author not in agents and len(agents) < _MAX_AGENTS:
            agents.append(author)
        content = getattr(event, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            fc = getattr(part, "function_call", None)
            name = getattr(fc, "name", None) if fc else None
            if name and len(tool_calls) < _MAX_TOOL_CALLS:
                tool_calls.append(name)
    return {"tool_calls": tool_calls, "agents": agents}


_ORCHESTRATOR_AGENT_NAMES = frozenset({"root_agent", "community_assistant"})


def derive_query_topic(
    agents: list[str], orchestrators: frozenset[str] | set[str] | None = None
) -> str | None:
    """Pick the last non-orchestrator agent in the routing chain.

    ADK appends agent authors in execution order, so the LAST specialist that
    acted is the leaf that produced the final response — that's the topic the
    user actually got served. Picking the first one would bucket every event as
    "community_assistant" (the orchestrator), wasting the topic dimension.
    """
    skip = orchestrators if orchestrators is not None else _ORCHESTRATOR_AGENT_NAMES
    for a in reversed(agents):
        if a and a not in skip:
            return a
    return None


def build_usage_event(
    *,
    user_id_hash: str,
    guild_id: int | None,
    channel_id: int,
    routed_agents: list[str],
    tool_calls: list[str],
    cited_urls: list[str],
    response_chars: int,
    latency_ms: int,
    status: str,
    query_len: int,
    query_topic: str | None,
) -> dict:
    """Assemble structured usage event. Raw query text is NEVER included."""
    return {
        "severity": "INFO",
        "event_type": _USAGE_EVENT_TYPE,
        "user_id_hash": user_id_hash,
        "guild_id": str(guild_id) if guild_id is not None else None,
        "channel_id": str(channel_id),
        "routed_agents": routed_agents,
        "tool_calls": tool_calls,
        "cited_urls": cited_urls,
        "response_chars": response_chars,
        "latency_ms": latency_ms,
        "status": status,
        "query_len": query_len,
        "query_topic": query_topic,
    }


def emit_usage_event(event: dict) -> None:
    """Print single-line JSON to stdout. Cloud Run scrapes as jsonPayload."""
    try:
        sys.stdout.write(json.dumps(event, separators=(",", ":")) + "\n")
        sys.stdout.flush()
    except Exception:
        _logger.exception("failed to emit usage event")


def now_ms() -> int:
    """Monotonic clock in milliseconds — use for latency deltas only."""
    return int(time.monotonic() * 1000)
