"""
test_callbacks_current_date.py — tests for Plan 07-05 inject_current_date callback.

Verifies the date is appended to LlmRequest.config.system_instruction via ADK's
LlmRequest.append_instructions() API. Date must be UTC, ISO YYYY-MM-DD.
"""
import logging
import re
from unittest.mock import MagicMock

import pytest
from freezegun import freeze_time
from google.adk.models import LlmRequest

from community_assistant.callbacks import inject_current_date


def _ctx(agent_name: str = "community_assistant") -> MagicMock:
    c = MagicMock()
    c.agent_name = agent_name
    c.invocation_id = "test-inv"
    c.session.id = "test-sess"
    return c


def _req() -> LlmRequest:
    return LlmRequest()


def test_date_injected_into_system_instruction():
    req = _req()
    inject_current_date(_ctx(), req)
    si = req.config.system_instruction or ""
    assert "Today is " in si
    assert "(UTC)" in si


def test_date_iso_format():
    req = _req()
    inject_current_date(_ctx(), req)
    si = req.config.system_instruction or ""
    assert re.search(r"Today is \d{4}-\d{2}-\d{2} \(UTC\)\.", si), si


def test_date_matches_utc_today(monkeypatch):
    """Patch datetime in callbacks module; verify UTC date (not naive local)."""
    import community_assistant.callbacks as cb
    from datetime import datetime as real_datetime, timezone

    class FrozenDT:
        @staticmethod
        def now(tz=None):
            base = real_datetime(2026, 5, 23, 2, 30, 0, tzinfo=timezone.utc)
            if tz is None:
                return real_datetime(2026, 5, 22, 18, 30, 0)
            return base.astimezone(tz)

    monkeypatch.setattr(cb, "datetime", FrozenDT)
    req = _req()
    inject_current_date(_ctx(), req)
    si = req.config.system_instruction or ""
    assert "Today is 2026-05-23 (UTC)." in si, si


@freeze_time("2026-05-23 23:30:00")
def test_date_rolls_to_next_day_in_utc():
    """If freezegun pins UTC 23:30 on day N, injected date is day N."""
    req = _req()
    inject_current_date(_ctx(), req)
    si = req.config.system_instruction or ""
    assert "Today is 2026-05-23 (UTC)." in si, si


def test_exception_swallowed_and_warning_logged(caplog, monkeypatch):
    """Force append_instructions to raise; callback must return None and log WARNING."""
    req = _req()

    def boom(self, *_a, **_kw):
        raise RuntimeError("boom")

    monkeypatch.setattr(LlmRequest, "append_instructions", boom)
    with caplog.at_level(logging.WARNING, logger="cwa_callbacks"):
        result = inject_current_date(_ctx(), req)
    assert result is None
    assert any("inject_current_date error" in r.message for r in caplog.records)
