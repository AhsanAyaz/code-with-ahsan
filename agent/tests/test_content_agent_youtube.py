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
