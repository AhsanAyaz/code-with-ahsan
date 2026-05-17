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


def search_blog_posts(query: str) -> dict:
    """Searches Ahsan's blog at blog.codewithahsan.dev for posts matching a query.

    Calls the ISR-cached /api/content/blog/search proxy (3600s cache) so repeated queries
    do not hit the Ghost Content API on every Discord message.

    A deterministic curated-resource lookup runs first: if the query matches a flagship
    resource (e.g., the AI Guide), the response includes a `featured` list with hand-picked
    URLs that ALWAYS take precedence over Ghost search hits. Surface featured items first
    in any user-facing reply.

    Args:
        query: Topic or keyword to search for (e.g., "angular signals", "AI guide", "rxjs").

    Returns:
        A dict with status, query, count, posts (title, slug, url, excerpt, published_at,
        reading_time), and `featured` (curated flagship hits — list of {id, title, url,
        description}). The featured list may be non-empty even when posts is empty.
    """
    q = (query or "").strip()
    featured = lookup_featured_resource(q) if q else []

    if not q:
        return {
            "status": "error",
            "message": "Query is empty",
            "posts": [],
            "featured": [],
        }

    result = fetch_blog_posts(q)
    if not result["ok"]:
        return {
            "status": "partial" if featured else "error",
            "message": result["error"],
            "posts": [],
            "featured": featured,
        }

    all_posts = (result["data"] or {}).get("posts", [])
    sliced = all_posts[:_BLOG_LIMIT]
    return {
        "status": "success",
        "query": q,
        "count": len(sliced),
        "posts": [_shape_blog_post(p) for p in sliced],
        "featured": featured,
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
- search_blog_posts(query): searches blog.codewithahsan.dev for articles and tutorials \
matching the query (ISR-cached, 3600s). Response contains TWO lists:
    * `featured`: curated flagship URLs hand-picked for this topic (e.g., the AI Guide). \
ALWAYS surface these FIRST and prominently — they are the canonical answer.
    * `posts`: additional Ghost search hits. Surface only after featured items, and only \
if they add genuine value.
- search_youtube_videos(query): searches Code With Ahsan's YouTube channel for videos \
matching the query (ISR-cached, 3600s). Returns video titles, youtube.com/watch?v= URLs, \
and thumbnails. Results are scoped to Ahsan's channel only.

SEARCH STRATEGY:
- "VIDEO / YouTube / watch a tutorial on X" → search_youtube_videos(X).
- "BLOG / ARTICLE / WRITTEN on X" / "read about Y" / "do you have a guide on Z" → \
search_blog_posts(X).
- Ambiguous ("anything on X" / "any content on Y") → call BOTH in parallel and merge.

REPLY FORMAT:
- If search_blog_posts returned `featured` items: lead with them. Example: \
"Yes — here's Ahsan's AI Guide: <title> — <url>". Then optionally add "Other related posts:" \
with the top one or two from `posts`.
- If only `posts` (no featured): surface those normally.
- If both featured and posts are empty: say so honestly, link \
https://blog.codewithahsan.dev directly.

GUIDELINES:
- ALWAYS cite the URL in your reply — community trust is non-negotiable. \
Never fabricate a URL.
- If count is 0 for YouTube, say so honestly and suggest https://youtube.com/codewithahsan directly.
- If a tool returns status="error", tell the user the platform is temporarily unreachable.
- End every reply with a single concrete next action the user can take.""",
    tools=[search_blog_posts, search_youtube_videos],
)
