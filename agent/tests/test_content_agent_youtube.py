from __future__ import annotations

from community_assistant.sub_agents.content_agent import (
    _shape_youtube_video,
    search_youtube_videos,
)


# ---------------------------------------------------------------------------
# _shape_youtube_video unit tests
# ---------------------------------------------------------------------------

def test_shape_youtube_video_url_passthrough():
    raw = {
        "videoId": "abc123",
        "title": "Angular Signals",
        "url": "https://youtube.com/watch?v=abc123",
        "description": "All about signals.",
        "thumbnail": "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
        "published_at": "2025-01-01T00:00:00Z",
    }
    shaped = _shape_youtube_video(raw)
    assert shaped["url"] == "https://youtube.com/watch?v=abc123"


def test_shape_youtube_video_url_fallback_from_video_id():
    raw = {
        "videoId": "abc123",
        "title": "Angular Signals",
        "description": "All about signals.",
        "thumbnail": "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
        "published_at": "2025-01-01T00:00:00Z",
    }
    shaped = _shape_youtube_video(raw)
    assert shaped["url"] == "https://youtube.com/watch?v=abc123"


def test_shape_youtube_video_no_id_no_url():
    raw = {
        "title": "Orphan Video",
        "description": "No ID here.",
        "published_at": "2024-01-01T00:00:00Z",
    }
    shaped = _shape_youtube_video(raw)
    assert shaped["url"] is None


def test_shape_youtube_video_truncates_description():
    long_desc = "x" * 400
    raw = {
        "videoId": "abc123",
        "title": "Long Video",
        "description": long_desc,
        "published_at": "2025-01-01T00:00:00Z",
    }
    shaped = _shape_youtube_video(raw)
    assert len(shaped["description"]) == 300


# ---------------------------------------------------------------------------
# search_youtube_videos integration tests (mock_platform_client fixture)
# ---------------------------------------------------------------------------

def test_search_youtube_videos_returns_url(mock_platform_client, content_youtube_payload):
    mock_platform_client("/api/content/youtube/search", content_youtube_payload)
    result = search_youtube_videos("angular")
    assert result["status"] == "success"
    assert result["count"] >= 1
    for video in result["videos"]:
        assert video["url"] is not None
        assert video["url"].startswith("https://youtube.com/watch?v=")


def test_search_youtube_videos_empty_query_returns_error():
    result = search_youtube_videos("")
    assert result["status"] == "error"
    assert result["videos"] == []


def test_search_youtube_videos_error_path(monkeypatch):
    monkeypatch.setattr(
        "community_assistant.platform_client._get",
        lambda path, params=None: {
            "ok": False,
            "error": "upstream unreachable",
            "path": "/api/content/youtube/search",
        },
    )
    result = search_youtube_videos("signals")
    assert result["status"] == "error"
    assert result["videos"] == []


# ---------------------------------------------------------------------------
# Relevance filter — drop tangential search hits
# ---------------------------------------------------------------------------

def test_search_youtube_videos_drops_irrelevant_titles(mock_platform_client):
    payload = {
        "videos": [
            {
                "videoId": "good1",
                "title": "Mastering Angular Signals: What Every Developer Needs to Know",
                "description": "x",
                "url": "https://youtube.com/watch?v=good1",
                "thumbnail": None,
                "published_at": "2025-01-01",
                "channel_title": "Code With Ahsan",
            },
            {
                "videoId": "bad1",
                "title": "How to Connect MCP Servers to Gemini CLI",
                "description": "y",
                "url": "https://youtube.com/watch?v=bad1",
                "thumbnail": None,
                "published_at": "2025-01-02",
                "channel_title": "Code With Ahsan",
            },
            {
                "videoId": "bad2",
                "title": "How to become a sole developer to code without the internet",
                "description": "z",
                "url": "https://youtube.com/watch?v=bad2",
                "thumbnail": None,
                "published_at": "2025-01-03",
                "channel_title": "Code With Ahsan",
            },
        ],
        "count": 3,
    }
    mock_platform_client("/api/content/youtube/search", payload)
    result = search_youtube_videos("angular signals")
    ids = [v["video_id"] for v in result["videos"]]
    assert ids == ["good1"]


def test_search_youtube_videos_developer_guide_returns_empty_when_no_real_match(
    mock_platform_client,
):
    payload = {
        "videos": [
            {
                "videoId": "v1",
                "title": "So you're a senior JavaScript developer ?!!",
                "description": "x",
                "url": "https://youtube.com/watch?v=v1",
                "thumbnail": None,
                "published_at": "2025-01-01",
                "channel_title": "Code With Ahsan",
            },
            {
                "videoId": "v2",
                "title": "Mastering Angular Signals",
                "description": "y",
                "url": "https://youtube.com/watch?v=v2",
                "thumbnail": None,
                "published_at": "2025-01-02",
                "channel_title": "Code With Ahsan",
            },
        ],
        "count": 2,
    }
    mock_platform_client("/api/content/youtube/search", payload)
    # "developer guide" needs BOTH tokens in title — none of these match.
    result = search_youtube_videos("do you have a developer guide?")
    assert result["status"] == "success"
    assert result["videos"] == []
    assert result["count"] == 0
