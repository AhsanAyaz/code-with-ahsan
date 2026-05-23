"""dev.to specialist leaf for the external_knowledge ParallelAgent fan-out.

Owns the `_DEVTO_CLIENT` module-level httpx singleton and the `search_devto_articles`
tool — including the multi-word tag→top=7 fallback (CONTEXT.md mandate: this stays
internal to the dev.to specialist; no separate fallback agent).
"""

from __future__ import annotations

import logging

import httpx
from google.adk.agents import LlmAgent

from ...callbacks import inject_current_date, lifecycle_after_agent, lifecycle_before_agent
from ._shapes import _shape_devto_article

_logger = logging.getLogger(__name__)

_DEVTO_CLIENT = httpx.Client(base_url="https://dev.to", timeout=10.0)

_RESULT_LIMIT = 5


def search_devto_articles(query: str) -> dict:
    """Searches dev.to for articles matching a query by tag.

    Primary: GETs /api/articles?per_page=5&tag={query} (tag-scoped search).
    Fallback (when tag returns 0 and query contains spaces): GETs top articles of last
    7 days and filters client-side by title/tag_list substring match.
    No authentication required.

    Args:
        query: Topic or tag to search for (e.g., "typescript", "react signals").
            Must be non-empty.

    Returns:
        A dict with status, query, count, and a list of articles (title, url, description,
        tags, reactions, published_at, author). Always cite the url in your reply.
        On error, returns status="error", message, and articles=[].
    """
    q = (query or "").strip()
    if not q:
        return {"status": "error", "message": "Query is empty", "articles": []}

    try:
        response = _DEVTO_CLIENT.get("/api/articles", params={"per_page": _RESULT_LIMIT, "tag": q})
        response.raise_for_status()
        arr = response.json()
    except (httpx.HTTPStatusError, httpx.RequestError) as exc:
        return {
            "status": "error",
            "message": f"dev.to API error: {exc.__class__.__name__}: {exc}",
            "articles": [],
        }

    # Fallback: tag-scoped returned nothing AND query looks like a multi-word phrase
    if not arr and " " in q:
        try:
            fallback_response = _DEVTO_CLIENT.get(
                "/api/articles", params={"per_page": 20, "top": "7"}
            )
            fallback_response.raise_for_status()
            all_articles = fallback_response.json()
            needle = q.lower()
            arr = [
                a
                for a in all_articles
                if needle in (a.get("title") or "").lower()
                or any(needle in tag.lower() for tag in (a.get("tag_list") or []))
            ]
        except (httpx.HTTPStatusError, httpx.RequestError) as fallback_exc:
            # Primary tag search succeeded with 0 results, so dev.to is reachable.
            # Fallback blip is non-fatal: degrade to empty rather than turning a
            # successful zero-result query into an error. Log so it surfaces in Cloud Run.
            _logger.warning(
                "dev.to top=7 fallback failed for q=%r: %s",
                q,
                fallback_exc,
            )
            arr = []

    sliced = arr[:_RESULT_LIMIT]
    return {
        "status": "success",
        "query": q,
        "count": len(sliced),
        "articles": [_shape_devto_article(a) for a in sliced],
    }


devto_researcher = LlmAgent(
    name="devto_researcher",
    model="gemini-2.5-flash",
    description="Searches dev.to for articles matching the user query.",
    instruction="""Call search_devto_articles with the user query as-is.
Return a concise summary of the top community articles.
ALWAYS cite the article URL for each result.
If the tool returns status='error', return a brief 'dev.to temporarily unavailable' acknowledgement so the synthesizer can narrate the partial result.""",
    tools=[search_devto_articles],
    output_key="devto_result",
    before_model_callback=inject_current_date,
    before_agent_callback=lifecycle_before_agent,
    after_agent_callback=lifecycle_after_agent,
)
