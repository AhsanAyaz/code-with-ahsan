from google.adk.agents import LlmAgent

from ..platform_client import BASE_URL, fetch_blog_posts, fetch_youtube_videos
from ._relevance import is_relevant, query_tokens
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


def _featured_as_post(item: dict) -> dict:
    return {
        "title": item["title"],
        "slug": None,
        "url": item["url"],
        "excerpt": item["description"],
        "published_at": None,
        "reading_time": None,
        "featured": True,
    }


def search_blog_posts(query: str) -> dict:
    """Searches Ahsan's blog at blog.codewithahsan.dev for posts matching a query.

    Calls the ISR-cached /api/content/blog/search proxy (3600s cache) so repeated queries
    do not hit the Ghost Content API on every Discord message.

    A deterministic curated-resource lookup runs first: if the query matches a flagship
    resource (e.g., the AI Guide), it is PREPENDED to the posts list and tagged
    {"featured": true}. Featured items are part of `posts` so the agent cannot omit them.

    Args:
        query: Topic or keyword to search for (e.g., "angular signals", "AI guide", "rxjs").

    Returns:
        A dict with status, query, count, and posts (title, slug, url, excerpt,
        published_at, reading_time, featured). Featured posts appear FIRST in the list.
        On Ghost upstream failure but with a curated match, still returns the curated
        post (status="partial").
    """
    q = (query or "").strip()

    if not q:
        return {"status": "error", "message": "Query is empty", "posts": []}

    featured = [_featured_as_post(f) for f in lookup_featured_resource(q)]
    featured_urls = {p["url"] for p in featured}

    result = fetch_blog_posts(q)
    ghost_ok = bool(result["ok"])
    ghost_posts: list[dict] = []
    if ghost_ok:
        all_posts = (result["data"] or {}).get("posts", [])
        ghost_posts = [_shape_blog_post(p) for p in all_posts[:_BLOG_LIMIT]]

    deduped_ghost = [p for p in ghost_posts if p.get("url") not in featured_urls]
    merged = (featured + deduped_ghost)[:_BLOG_LIMIT]

    if not ghost_ok and not featured:
        return {"status": "error", "message": result["error"], "posts": []}

    return {
        "status": "success" if ghost_ok else "partial",
        "query": q,
        "count": len(merged),
        "posts": merged,
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

    # Deterministic relevance gate: every meaningful query token must appear in title.
    # Drops tangential YouTube results that share no real keywords with the query.
    tokens = query_tokens(q)
    relevant = [v for v in all_videos if is_relevant(tokens, v.get("title"))]

    sliced = relevant[:_YOUTUBE_LIMIT]
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
matching the query (ISR-cached, 3600s). Returns a `posts` list. Each post may carry a \
`featured: true` flag — those are hand-picked flagship resources and MUST be surfaced \
FIRST in your reply. Featured posts appear at the top of the list and you must never \
omit them.
- search_youtube_videos(query): searches Code With Ahsan's YouTube channel for videos \
matching the query (ISR-cached, 3600s). Returns video titles, youtube.com/watch?v= URLs, \
and thumbnails. Results are scoped to Ahsan's channel only.

SEARCH STRATEGY:
- "VIDEO / YouTube / watch a tutorial on X" → search_youtube_videos(X).
- "BLOG / ARTICLE / WRITTEN on X" / "read about Y" / "do you have a guide on Z" → \
search_blog_posts(X).
- Ambiguous ("anything on X" / "any content on Y") → call BOTH in parallel and merge.

REPLY FORMAT:
- If any post has `featured: true`: lead with it. Example: "Yes — here's Ahsan's AI Guide: \
<title> — <url>". Then optionally add the next 1–2 non-featured posts.
- If only non-featured posts: surface them normally.
- If `posts` is empty: say so honestly and link https://blog.codewithahsan.dev directly. \
Do NOT pad with unrelated YouTube hits.

RELEVANCE RULE (CRITICAL — community trust):
- The search tools already drop low-relevance results. Trust them.
- If a returned list is EMPTY, do NOT pad your reply with tangentially related results \
from a different query. Say "I couldn't find a match" honestly.
- NEVER list YouTube videos whose titles do not clearly relate to the user's topic, \
even if the tool returns them. When unsure, drop the result.

GUIDELINES:
- ALWAYS cite the URL in your reply — community trust is non-negotiable. \
Never fabricate a URL.
- If count is 0 for YouTube, say so honestly and suggest https://youtube.com/codewithahsan directly.
- If a tool returns status="error", tell the user the platform is temporarily unreachable.
- End every reply with a single concrete next action the user can take.""",
    tools=[search_blog_posts, search_youtube_videos],
)
