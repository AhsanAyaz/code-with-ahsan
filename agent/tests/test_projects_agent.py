from __future__ import annotations
from community_assistant.sub_agents.projects_agent import (
    _shape_project, list_open_projects,
)


def test_shape_project_url_and_creator():
    raw = {"id": "proj-1", "title": "T", "creatorProfile": {"username": "alice", "displayName": "Alice"}}
    shaped = _shape_project(raw)
    assert shaped["url"] == "https://codewithahsan.dev/projects/proj-1"
    assert shaped["creator"] == "Alice"
    assert shaped["creator_url"] == "https://codewithahsan.dev/mentors/alice"


def test_shape_project_no_id_no_url():
    shaped = _shape_project({"title": "T"})
    assert shaped["url"] is None


def test_shape_project_null_creator_profile():
    shaped = _shape_project({"id": "x", "creatorProfile": None})
    assert shaped["creator"] is None
    assert shaped["creator_url"] is None


def test_shape_project_creator_without_username():
    shaped = _shape_project({"id": "x", "creatorProfile": {"displayName": "Bob"}})
    assert shaped["creator"] == "Bob"
    assert shaped["creator_url"] is None


def test_project_url_and_creator_link(mock_platform_client, projects_payload):
    mock_platform_client("/api/projects", projects_payload)
    result = list_open_projects()
    assert result["status"] == "success"
    for p in result["projects"]:
        if p["id"]:
            assert p["url"] == f"https://codewithahsan.dev/projects/{p['id']}"
