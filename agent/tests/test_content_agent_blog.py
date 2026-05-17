from __future__ import annotations

from community_assistant.sub_agents.content_agent import (
    _shape_blog_post,
    search_blog_posts,
)


# ---------------------------------------------------------------------------
# _shape_blog_post unit tests
# ---------------------------------------------------------------------------

def test_shape_blog_post_url_passthrough():
    raw = {
        "title": "Signals Deep Dive",
        "slug": "signals-deep-dive",
        "url": "https://blog.codewithahsan.dev/signals-deep-dive/",
        "excerpt": "About signals.",
        "published_at": "2025-01-01",
        "reading_time": 5,
    }
    shaped = _shape_blog_post(raw)
    assert shaped["url"] == "https://blog.codewithahsan.dev/signals-deep-dive/"


def test_shape_blog_post_url_fallback_from_slug():
    raw = {
        "title": "Angular Basics",
        "slug": "angular-basics",
        "excerpt": "Intro to Angular.",
        "published_at": "2024-06-01",
        "reading_time": 4,
    }
    shaped = _shape_blog_post(raw)
    assert shaped["url"] == "https://blog.codewithahsan.dev/angular-basics/"


def test_shape_blog_post_no_slug_no_url():
    raw = {
        "title": "Orphan Post",
        "excerpt": "No slug here.",
        "published_at": "2024-01-01",
        "reading_time": 2,
    }
    shaped = _shape_blog_post(raw)
    assert shaped["url"] is None


# ---------------------------------------------------------------------------
# search_blog_posts integration tests (mock_platform_client fixture)
# ---------------------------------------------------------------------------

def test_search_blog_posts_returns_url(mock_platform_client, content_blog_payload):
    mock_platform_client("/api/content/blog/search", content_blog_payload)
    result = search_blog_posts("angular")
    assert result["status"] == "success"
    assert result["count"] >= 1
    for post in result["posts"]:
        assert post["url"] is not None
        assert post["url"].startswith("https://blog.codewithahsan.dev/")


def test_search_blog_posts_empty_query_returns_error():
    result = search_blog_posts("")
    assert result["status"] == "error"
    assert result["posts"] == []


def test_search_blog_posts_error_path(monkeypatch):
    monkeypatch.setattr(
        "community_assistant.platform_client._get",
        lambda path, params=None: {
            "ok": False,
            "error": "boom",
            "path": "/api/content/blog/search",
        },
    )
    result = search_blog_posts("anything")
    assert result["status"] == "error"
    assert result["posts"] == []
