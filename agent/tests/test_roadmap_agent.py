from __future__ import annotations
from community_assistant.sub_agents.roadmap_agent import (
    _shape_roadmap, list_roadmaps,
)


def test_shape_roadmap_url_and_author():
    raw = {"id": "rm-ai", "title": "T", "creatorProfile": {"username": "ahsan", "displayName": "Ahsan"}}
    shaped = _shape_roadmap(raw)
    assert shaped["url"] == "https://codewithahsan.dev/roadmaps/rm-ai"
    assert shaped["author"] == "Ahsan"
    assert shaped["author_url"] == "https://codewithahsan.dev/mentors/ahsan"


def test_shape_roadmap_null_author():
    shaped = _shape_roadmap({"id": "x", "creatorProfile": None})
    assert shaped["author"] is None
    assert shaped["author_url"] is None


def test_shape_roadmap_no_id_no_url():
    shaped = _shape_roadmap({"title": "T"})
    assert shaped["url"] is None


def test_roadmap_url_and_creator_link(mock_platform_client, roadmaps_payload):
    mock_platform_client("/api/roadmaps", roadmaps_payload)
    result = list_roadmaps()
    assert result["status"] == "success"
    for r in result["roadmaps"]:
        if r["id"]:
            assert r["url"] == f"https://codewithahsan.dev/roadmaps/{r['id']}"
