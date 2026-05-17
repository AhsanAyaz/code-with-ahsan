from google.adk.agents import LlmAgent

from ..platform_client import BASE_URL, fetch_blog_posts, fetch_youtube_videos
from .featured_resources import lookup_featured_resource

_BLOG_LIMIT = 5
_YOUTUBE_LIMIT = 5


def _shape_blog_post(raw: dict) -> dict:
    slug = raw.get("slug")
    url = raw.get("url")
    if not url:
        url = f"https://blog.codewithahsan.dev/{slug}/" if slug else None
    excerpt = raw.get("excerpt") or ""
    return {
        "title": raw.get("title"),
        "slug": slug,
        "url": url,
        "excerpt": excerpt[:300],
        "published_at": raw.get("published_at"),
        "reading_time": raw.get("reading_time"),
    }


def _shape_youtube_video(raw: dict) -> dict:
    video_id = raw.get("videoId")
    url = raw.get("url")
    if not url:
        url = f"https://youtube.com/watch?v={video_id}" if video_id else None
    return {
        "video_id": video_id,
        "title": raw.get("title"),
        "url": url,
        "description": (raw.get("description") or "")[:300],
        "thumbnail": raw.get("thumbnail"),
        "published_at": raw.get("published_at"),
    }


def get_featured_resource(topic: str) -> dict:
    """Returns curated flagship resources hand-picked for known topics.

    Call this FIRST before search_blog_posts / search_youtube_videos. Surfaces
    deterministic URLs for flagship content (e.g., the AI Guide) without relying
    on Ghost NQL substring matching.

    Args:
        topic: User's topic or keyword (e.g., "AI guide", "developer AI guide").

    Returns:
        A dict with status, topic, count, and resources (id, title, url, description).
        count=0 means no curated match — fall through to search_blog_posts /
        search_youtube_videos.
    """
    t = (topic or "").strip()
    if not t:
        return {"status": "success", "topic": t, "count": 0, "resources": []}
    hits = lookup_featured_resource(t)
    return {
        "status": "success",
        "topic": t,
        "count": len(hits),
        "resources": hits,
    }


def search_blog_posts(query: str) -> dict:
    """Searches Ahsan's blog at blog.codewithahsan.dev for posts matching a query.

    Calls the ISR-cached /api/content/blog/search proxy (3600s cache) so repeated queries
    do not hit the Ghost Content API on every Discord message.

    Args:
        query: Topic or keyword to search for (e.g., "angular signals", "rxjs", "ngrx").

    Returns:
        A dict with status, query, count, and a list of posts (title, slug, url,
        excerpt, published_at, reading_time). Always include the url in your reply.
        On error, returns status="error", message, and posts=[].
    """
    q = (query or "").strip()
    if not q:
        return {"status": "error", "message": "Query is empty", "posts": []}

    result = fetch_blog_posts(q)
    if not result["ok"]:
        return {"status": "error", "message": result["error"], "posts": []}

    all_posts = (result["data"] or {}).get("posts", [])
    sliced = all_posts[:_BLOG_LIMIT]
    return {
        "status": "success",
        "query": q,
        "count": len(sliced),
        "posts": [_shape_blog_post(p) for p in sliced],
    }


def search_youtube_videos(query: str) -> dict:
    """Searches Code With Ahsan's YouTube channel for videos matching a query.

    Calls the ISR-cached /api/content/youtube/search proxy (3600s cache) so repeated
    queries do not burn the YouTube Data API v3 daily-unit quota on every Discord message.
    Results are scoped to Code With Ahsan's channel only — not arbitrary YouTube results.

    Args:
        query: Topic or keyword to search for (e.g., "angular signals", "rxjs", "ngrx").

    Returns:
        A dict with status, query, count, and a list of videos (video_id, title, url,
        description, thumbnail, published_at). Always include the url in your reply.
        On error, returns status="error", message, and videos=[].
    """
    q = (query or "").strip()
    if not q:
        return {"status": "error", "message": "Query is empty", "videos": []}

    result = fetch_youtube_videos(q)
    if not result["ok"]:
        return {"status": "error", "message": result["error"], "videos": []}

    all_videos = (result["data"] or {}).get("videos", [])
    sliced = all_videos[:_YOUTUBE_LIMIT]
    return {
        "status": "success",
        "query": q,
        "count": len(sliced),
        "videos": [_shape_youtube_video(v) for v in sliced],
    }


content_agent = LlmAgent(
    name="content_agent",
    model="gemini-2.5-flash",
    description=(
        "Surfaces Code with Ahsan's owned content — blog posts from blog.codewithahsan.dev "
        "and YouTube videos from youtube.com/codewithahsan."
    ),
    instruction="""You help community members discover content Ahsan has published.

TOOLS:
- get_featured_resource(topic): returns curated flagship URLs for known topics \
(e.g., the AI Guide). Deterministic — call FIRST before any search tool.
- search_blog_posts(query): searches blog.codewithahsan.dev for articles and tutorials \
matching the query (ISR-cached, 3600s). Returns post titles, URLs, and excerpts.
- search_youtube_videos(query): searches Code With Ahsan's YouTube channel for videos \
matching the query (ISR-cached, 3600s). Returns video titles, youtube.com/watch?v= URLs, \
and thumbnails. Results are scoped to Ahsan's channel only.

SEARCH STRATEGY:
1. ALWAYS call get_featured_resource(topic) FIRST with the user's topic. \
If count > 0, surface those curated URLs in your reply (they take precedence over search hits).
2. Then choose the search tool based on intent:
   - "VIDEO / YouTube / watch a tutorial on X" → search_youtube_videos(X).
   - "BLOG / ARTICLE / WRITTEN on X" / "read about Y" → search_blog_posts(X).
   - Ambiguous ("anything on X" / "any content on Y") → call BOTH in parallel \
and merge top results.
3. If get_featured_resource returned a hit AND the search tools return additional hits, \
list the curated one(s) first, then "Other related content:" with the search hits.

GUIDELINES:
- ALWAYS cite the URL in your reply — community trust is non-negotiable. \
Never fabricate a URL.
- If both featured and search count are 0 for blog, say so honestly and suggest \
https://blog.codewithahsan.dev directly.
- If count is 0 for YouTube, say so honestly and suggest https://youtube.com/codewithahsan directly.
- If a tool returns status="error", tell the user the platform is temporarily unreachable.
- End every reply with a single concrete next action the user can take.""",
    tools=[get_featured_resource, search_blog_posts, search_youtube_videos],
)
