from __future__ import annotations
import sys
from pathlib import Path
import pytest

AGENT_ROOT = Path(__file__).resolve().parent.parent
if str(AGENT_ROOT) not in sys.path:
    sys.path.insert(0, str(AGENT_ROOT))

from discord_bot.bot import get_or_create_session


class FakeSessionService:
    def __init__(self):
        self.created_sessions: list[tuple[str, str, str]] = []

    async def create_session(self, *, app_name, user_id, session_id, state=None):
        self.created_sessions.append((app_name, user_id, session_id))


@pytest.mark.asyncio
async def test_first_call_creates_session():
    svc = FakeSessionService()
    sessions: dict[str, str] = {}
    session_id = await get_or_create_session(
        user_id="discord-user-1",
        sessions_map=sessions,
        session_service=svc,
        app_name="CWAAssistant",
    )
    assert session_id in sessions.values()
    assert len(svc.created_sessions) == 1
    assert svc.created_sessions[0] == ("CWAAssistant", "discord-user-1", session_id)


@pytest.mark.asyncio
async def test_second_call_reuses_session():
    svc = FakeSessionService()
    sessions: dict[str, str] = {}
    sid1 = await get_or_create_session(user_id="u1", sessions_map=sessions, session_service=svc, app_name="A")
    sid2 = await get_or_create_session(user_id="u1", sessions_map=sessions, session_service=svc, app_name="A")
    assert sid1 == sid2
    assert len(svc.created_sessions) == 1  # only one creation


@pytest.mark.asyncio
async def test_different_users_get_different_sessions():
    svc = FakeSessionService()
    sessions: dict[str, str] = {}
    sid1 = await get_or_create_session(user_id="u1", sessions_map=sessions, session_service=svc, app_name="A")
    sid2 = await get_or_create_session(user_id="u2", sessions_map=sessions, session_service=svc, app_name="A")
    assert sid1 != sid2
    assert len(svc.created_sessions) == 2
