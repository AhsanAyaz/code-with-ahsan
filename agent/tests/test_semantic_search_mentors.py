from __future__ import annotations

import pytest
from community_assistant.sub_agents.mentorship_agent import semantic_search_mentors


def test_semantic_empty_query_no_api_call(monkeypatch):
    called = []

    def fake_get(path, params=None):
        called.append(path)
        return {"ok": True, "data": {"mentors": []}}

    monkeypatch.setattr("community_assistant.platform_client._get", fake_get)
    result = semantic_search_mentors("   ")
    assert result["status"] == "error"
    assert result["mentors"] == []
    assert called == [], "API should not be called for empty query"


def test_semantic_success_shape(mock_platform_client, semantic_mentors_payload):
    mock_platform_client("/api/mentorship/mentors/semantic-search", semantic_mentors_payload)
    result = semantic_search_mentors("Angular")
    assert result["status"] == "success"
    assert result["query"] == "Angular"
    assert result["count"] >= 1
    top = result["mentors"][0]
    # Fields from the semantic_mentors fixture must round-trip
    assert "bio_excerpt" in top
    assert "match_score" in top
    assert "url" in top
    assert top["url"].startswith("https://codewithahsan.dev/mentors/")


def test_semantic_error_propagation(monkeypatch):
    monkeypatch.setattr(
        "community_assistant.platform_client._get",
        lambda path, params=None: {"ok": False, "error": "boom", "path": path},
    )
    result = semantic_search_mentors("Angular")
    assert result["status"] == "error"
    assert "boom" in result["message"]
    assert result["mentors"] == []


def test_semantic_respects_limit(mock_platform_client):
    payload = {
        "mentors": [
            {
                "name": f"M{i}",
                "username": f"m{i}",
                "bio_excerpt": "x",
                "match_score": i * 0.1,
                "url": f"https://codewithahsan.dev/mentors/m{i}",
            }
            for i in range(10)
        ]
    }
    mock_platform_client("/api/mentorship/mentors/semantic-search", payload)
    result = semantic_search_mentors("anything")
    assert result["count"] == 5  # _SEMANTIC_LIMIT cap
