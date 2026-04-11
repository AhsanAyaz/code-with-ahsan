from __future__ import annotations
import pytest
from community_assistant.sub_agents.mentorship_agent import (
    _shape_mentor, search_mentors,
)


def test_shape_mentor_includes_url():
    raw = {"username": "muhammad-ali", "displayName": "Muhammad Ali", "expertise": ["Web Development"]}
    shaped = _shape_mentor(raw)
    assert shaped["url"] == "https://codewithahsan.dev/mentors/muhammad-ali"
    assert shaped["name"] == "Muhammad Ali"


def test_shape_mentor_url_none_when_username_missing():
    raw = {"displayName": "Anonymous", "expertise": []}
    shaped = _shape_mentor(raw)
    assert shaped["url"] is None
    assert shaped["username"] is None


def test_shape_mentor_at_capacity():
    raw = {"username": "u", "isAtCapacity": True, "activeMenteeCount": 5, "maxMentees": 5}
    shaped = _shape_mentor(raw)
    assert shaped["availability"] == "At capacity"


def test_search_mentors_returns_url(mock_platform_client, mentors_payload):
    mock_platform_client("/api/mentorship/mentors", mentors_payload)
    result = search_mentors("web")
    assert result["status"] == "success"
    assert result["count"] >= 1
    # Every returned mentor either has a real url or None — never a bare "None" string
    for m in result["mentors"]:
        if m["username"]:
            assert m["url"] == f"https://codewithahsan.dev/mentors/{m['username']}"
        else:
            assert m["url"] is None


def test_search_mentors_error_path(monkeypatch):
    import community_assistant.platform_client as pc
    monkeypatch.setattr(pc, "_get", lambda path, params=None: {"ok": False, "error": "boom", "path": path})
    result = search_mentors("anything")
    assert result["status"] == "error"
    assert result["mentors"] == []


# Keep test for existing behavior — maps to the validation map LINKS-02 row
def test_mentor_url_shape(mock_platform_client, mentors_payload):
    mock_platform_client("/api/mentorship/mentors", mentors_payload)
    result = search_mentors("Web Development")
    assert any("/mentors/" in (m["url"] or "") for m in result["mentors"])
