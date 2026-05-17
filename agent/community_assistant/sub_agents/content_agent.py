from google.adk.agents import LlmAgent

from ..platform_client import BASE_URL, fetch_blog_posts

_BLOG_LIMIT = 5


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


content_agent = LlmAgent(
    name="content_agent",
    model="gemini-2.5-flash",
    description=(
        "Surfaces Code with Ahsan's owned content — blog posts from blog.codewithahsan.dev "
        "and YouTube videos (added in plan 02)."
    ),
    instruction="""You help community members discover content Ahsan has published.

When a user asks about a blog post or article Ahsan has written, call search_blog_posts(query) \
with the topic.

ALWAYS cite the post URL in your reply — community trust is non-negotiable.

If count is 0, say so honestly and suggest https://blog.codewithahsan.dev directly.

End every reply with a single concrete next action the user can take.""",
    tools=[search_blog_posts],
)
