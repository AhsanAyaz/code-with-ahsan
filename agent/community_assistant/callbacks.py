"""
callbacks.py — Single home for all Phase 7 callback layers.

Plan 07-01 creates this file with the PII layer ONLY.
Plans 07-02 (tool cache) and 07-03 (lifecycle) extend this same module.

Public exports:
  - PII_PATTERNS       dict[str, re.Pattern]
  - REDACTION_PLACEHOLDER  str
  - pii_sanitizer      before_model_callback for root_agent

Private helpers:
  - _hmac_session_id   INLINE HMAC helper (NOT imported from discord_bot.usage_metrics
                       — avoids circular-import risk, RESEARCH §11)
"""
import hashlib as _hashlib
import hmac as _hmac
import json
import logging
import os as _os
import re
import sys
from typing import Optional

from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmRequest, LlmResponse

# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------

PII_PATTERNS: dict[str, re.Pattern] = {
    # Visa/MC/Amex/Discover patterns (13–16 digits with optional separators)
    "CREDIT_CARD": re.compile(r"\b(?:\d[ -]?){13,16}\b"),
    # US Social Security Number
    "SSN": re.compile(r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b"),
    # Discord mention: <@123456789012345678> or <@!123456789012345678>
    "DISCORD_MENTION": re.compile(r"<@!?\d{17,19}>"),
    # Raw Discord snowflake ID (17–19 digits NOT preceded by '<', '@', or '!'
    # — lookbehind suppresses double-redacting already-caught mentions)
    "DISCORD_SNOWFLAKE": re.compile(r"(?<![<@!])\b\d{17,19}\b"),
    # Email addresses
    "EMAIL": re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"),
    # Phone numbers (E.164 / North-American style)
    "PHONE": re.compile(r"\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),
}

REDACTION_PLACEHOLDER = "[REDACTED PII]"

_logger = logging.getLogger("cwa_callbacks")


# ---------------------------------------------------------------------------
# Private HMAC helper (INLINE — not imported from discord_bot.usage_metrics)
# ---------------------------------------------------------------------------

def _hmac_session_id(session_id: str) -> str:
    """HMAC-SHA256 of session_id keyed by USAGE_HASH_SECRET env var, truncated to 16 hex.

    Returns "" when either input is missing (matches discord_bot.usage_metrics.hash_user_id
    degradation path so counts still emit when secret is unset; uniqueness signal lost).

    INLINE in callbacks.py — NOT imported from discord_bot.usage_metrics.
    RESEARCH §11 flags the circular-import risk: discord_bot.usage_metrics is reachable
    from bot.py which imports community_assistant, and callbacks.py is imported by
    ~11 sub-agent files. Plans 07-02 and 07-03 REUSE this helper directly from the
    same module (no extraction needed — both callback layers live here).
    """
    secret = _os.environ.get("USAGE_HASH_SECRET", "")
    if not session_id or not secret:
        return ""
    mac = _hmac.new(secret.encode("utf-8"), session_id.encode("utf-8"), _hashlib.sha256)
    return mac.hexdigest()[:16]


# ---------------------------------------------------------------------------
# PII sanitizer — before_model_callback for root_agent ONLY
# ---------------------------------------------------------------------------

def pii_sanitizer(
    callback_context: CallbackContext,
    llm_request: LlmRequest,
) -> Optional[LlmResponse]:
    """Redact PII from the most-recent user message before root_agent's Gemini call.

    Attachment: root_agent (community_assistant) ONLY — RESEARCH §3.2 + §15 A1 verified
    that before_model_callback on root_agent fires only for root_agent's own LLM call.
    Sub-agents receive LLM-rewritten routing context, NOT raw user content — attaching
    here is sufficient and minimal.

    Mutates llm_request.contents[-1].parts[0].text in-place when patterns match and
    emits a single structured stdout JSON event. Always returns None (proceed semantics).

    Exceptions are swallowed (logged WARNING) so a regex/state bug never crashes a
    user turn — RESEARCH §9 Pitfall 1.
    """
    try:
        if not llm_request.contents:
            return None

        for content in reversed(llm_request.contents):
            if content.role == "user" and content.parts:
                text = content.parts[0].text or ""
                redacted_types: list[str] = []

                for pii_type, pattern in PII_PATTERNS.items():
                    if pattern.search(text):
                        text = pattern.sub(REDACTION_PLACEHOLDER, text)
                        redacted_types.append(pii_type)

                if redacted_types:
                    content.parts[0].text = text
                    session_id_hash = _hmac_session_id(
                        getattr(callback_context.session, "id", "") or ""
                    )
                    sys.stdout.write(
                        json.dumps({
                            "severity": "INFO",
                            "event_type": "pii_redacted",
                            "agent": callback_context.agent_name,
                            "invocation_id": callback_context.invocation_id,
                            "session_id_hash": session_id_hash,
                            "redacted_count": len(redacted_types),
                            "pii_types": redacted_types,
                        })
                        + "\n"
                    )
                    sys.stdout.flush()

                break  # Only process the most-recent user message (reversed + break)

        return None  # Always proceed — never short-circuit with an LlmResponse

    except Exception:
        _logger.warning("pii_sanitizer error", exc_info=True)
        return None


# Plans 07-02 (tool cache) + 07-03 (lifecycle) extend this module.
