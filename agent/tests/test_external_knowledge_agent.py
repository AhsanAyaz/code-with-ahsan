"""Tests for external_knowledge_agent — GitHub, dev.to, and Stack Overflow tools.

All tests use monkeypatch.setattr on the module-level httpx clients so no real
network calls are made.
"""

from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest

import community_assistant.sub_agents.external_knowledge_agent as mod
from community_assistant.sub_agents.external_knowledge_agent import (
    search_devto_articles,
    search_github_repos,
    search_stackoverflow_questions,
)

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> dict | list:
    return json.loads((FIXTURES / name).read_text())


def _ok_response(json_data, url: str = "https://example.com/") -> httpx.Response:
    """Build an httpx.Response that can call raise_for_status (requires request to be set)."""
    request = httpx.Request("GET", url)
    return httpx.Response(200, json=json_data, request=request)


# ---------------------------------------------------------------------------
# Happy-path tests
# ---------------------------------------------------------------------------


def test_search_github_repos_returns_url_under_github_com(monkeypatch):
    fixture = _load("external_github.json")

    def _mock_get(url, **kwargs):
        return _ok_response(fixture, "https://api.github.com/search/repositories")

    monkeypatch.setattr(mod._GITHUB_CLIENT, "get", _mock_get)
    result = search_github_repos("angular")

    assert result["status"] == "success"
    assert result["count"] >= 1
    for repo in result["repos"]:
        assert repo["url"] is not None
        assert repo["url"].startswith("https://github.com/")


def test_search_devto_articles_returns_url_under_devto(monkeypatch):
    fixture = _load("external_devto.json")

    def _mock_get(url, **kwargs):
        return _ok_response(fixture, "https://dev.to/api/articles")

    monkeypatch.setattr(mod._DEVTO_CLIENT, "get", _mock_get)
    result = search_devto_articles("angular")

    assert result["status"] == "success"
    assert result["count"] >= 1
    for article in result["articles"]:
        assert article["url"] is not None
        assert "dev.to" in article["url"]


def test_search_stackoverflow_questions_returns_url_under_stackoverflow(monkeypatch):
    fixture = _load("external_stackoverflow.json")

    def _mock_get(url, **kwargs):
        return _ok_response(fixture, "https://api.stackexchange.com/2.3/search/advanced")

    monkeypatch.setattr(mod._STACKOVERFLOW_CLIENT, "get", _mock_get)
    result = search_stackoverflow_questions("async await deadlock")

    assert result["status"] == "success"
    assert result["count"] >= 1
    for question in result["questions"]:
        assert question["url"] is not None
        assert "stackoverflow.com" in question["url"]


# ---------------------------------------------------------------------------
# Error-path tests
# ---------------------------------------------------------------------------


def test_search_github_repos_error_path(monkeypatch):
    def _raise(*args, **kwargs):
        raise httpx.ConnectError("dns failed")

    monkeypatch.setattr(mod._GITHUB_CLIENT, "get", _raise)
    result = search_github_repos("angular")

    assert result["status"] == "error"
    assert result["repos"] == []
    assert "message" in result


def test_search_devto_articles_error_path(monkeypatch):
    def _raise(*args, **kwargs):
        raise httpx.ConnectError("dns failed")

    monkeypatch.setattr(mod._DEVTO_CLIENT, "get", _raise)
    result = search_devto_articles("angular")

    assert result["status"] == "error"
    assert result["articles"] == []
    assert "message" in result


def test_search_stackoverflow_questions_error_path(monkeypatch):
    def _raise(*args, **kwargs):
        raise httpx.ConnectError("dns failed")

    monkeypatch.setattr(mod._STACKOVERFLOW_CLIENT, "get", _raise)
    result = search_stackoverflow_questions("async await")

    assert result["status"] == "error"
    assert result["questions"] == []
    assert "message" in result


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


def test_search_github_repos_uses_auth_header_when_token_present(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "test_token_abc")
    captured_headers: dict = {}

    def _mock_get(url, **kwargs):
        captured_headers.update(kwargs.get("headers", {}))
        return _ok_response({"total_count": 0, "items": []}, "https://api.github.com/search/repositories")

    monkeypatch.setattr(mod._GITHUB_CLIENT, "get", _mock_get)
    search_github_repos("angular")

    assert "Authorization" in captured_headers
    assert captured_headers["Authorization"] == "Bearer test_token_abc"


def test_search_github_repos_omits_auth_header_when_token_absent(monkeypatch):
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    captured_headers: dict = {}

    def _mock_get(url, **kwargs):
        captured_headers.update(kwargs.get("headers", {}))
        return _ok_response({"total_count": 0, "items": []}, "https://api.github.com/search/repositories")

    monkeypatch.setattr(mod._GITHUB_CLIENT, "get", _mock_get)
    search_github_repos("angular")

    assert "Authorization" not in captured_headers


def test_search_stackoverflow_questions_unescapes_html_entities(monkeypatch):
    fixture = _load("external_stackoverflow.json")

    def _mock_get(url, **kwargs):
        return _ok_response(fixture, "https://api.stackexchange.com/2.3/search/advanced")

    monkeypatch.setattr(mod._STACKOVERFLOW_CLIENT, "get", _mock_get)
    result = search_stackoverflow_questions("await deadlock")

    assert result["status"] == "success"
    # First fixture title contains &quot; which should be unescaped to "
    first_title = result["questions"][0]["title"]
    assert '"' in first_title, f"Expected unescaped '\"' in title, got: {first_title!r}"
    assert "&quot;" not in first_title, f"HTML entity &quot; should have been unescaped"


def test_empty_query_returns_error_for_all_tools():
    result_gh = search_github_repos("")
    assert result_gh["status"] == "error"
    assert result_gh["repos"] == []

    result_devto = search_devto_articles("")
    assert result_devto["status"] == "error"
    assert result_devto["articles"] == []

    result_so = search_stackoverflow_questions("")
    assert result_so["status"] == "error"
    assert result_so["questions"] == []
