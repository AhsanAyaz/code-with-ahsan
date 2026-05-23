from google.adk.agents import LlmAgent

from ..callbacks import after_tool_cache, before_tool_cache, lifecycle_after_agent, lifecycle_before_agent
from ..platform_client import BASE_URL, fetch_blog_posts, fetch_youtube_videos
from ._relevance import is_relevant, query_tokens
from .featured_resources import featured_resources_tool

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

    Args:
        query: Topic or keyword to search for (e.g., "angular signals", "rxjs").

    Returns:
        A dict with status, query, count, and posts (title, slug, url, excerpt,
        published_at, reading_time). On Ghost upstream failure, returns
        status="error" and posts=[].
    """
    q = (query or "").strip()
    if not q:
        return {"status": "error", "message": "Query is empty", "posts": []}

    result = fetch_blog_posts(q)
    if not result["ok"]:
        return {"status": "error", "message": result["error"], "posts": []}

    all_posts = (result["data"] or {}).get("posts", [])
    posts = [_shape_blog_post(p) for p in all_posts[:_BLOG_LIMIT]]

    return {
        "status": "success",
        "query": q,
        "count": len(posts),
        "posts": posts,
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
- featured_resources_agent(request): call FIRST when the user asks about flagship \
content (AI guide, signature posts, "the developer guide"). Returns curated \
resources by topic match.
- search_blog_posts(query): searches blog.codewithahsan.dev for articles and tutorials \
matching the query (ISR-cached, 3600s). Returns a `posts` list.
- search_youtube_videos(query): searches Code With Ahsan's YouTube channel for videos \
matching the query (ISR-cached, 3600s). Returns video titles, youtube.com/watch?v= URLs, \
and thumbnails. Results are scoped to Ahsan's channel only.

SEARCH STRATEGY:
- "AI guide" / "developer guide" / any flagship keyword → call featured_resources_agent \
FIRST. If it returns matches, lead with them. Then optionally augment with search_blog_posts.
- "VIDEO / YouTube / watch a tutorial on X" → search_youtube_videos(X).
- Generic "BLOG / ARTICLE / WRITTEN on X" / "read about Y" / "do you have a guide on Z" → \
search_blog_posts(X).
- Ambiguous ("anything on X" / "any content on Y") → call search_blog_posts AND \
search_youtube_videos in parallel and merge.

REPLY FORMAT:
- When featured_resources_agent returns matches, lead with the featured resource: \
"Yes — here's Ahsan's AI Guide: <title> — <url>". Then optionally add 1–2 non-featured \
blog posts.
- If featured_resources_agent returns empty AND search_blog_posts returns posts, surface \
those normally.
- If both come back empty, say so honestly and link https://blog.codewithahsan.dev \
directly. Do NOT pad with unrelated YouTube hits.

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
    before_tool_callback=before_tool_cache,
    after_tool_callback=after_tool_cache,
    before_agent_callback=lifecycle_before_agent,
    after_agent_callback=lifecycle_after_agent,
    tools=[featured_resources_tool, search_blog_posts, search_youtube_videos],
)
