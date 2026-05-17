"""External knowledge sub-agent: surfaces third-party developer content from GitHub, dev.to, and Stack Overflow.

All three tools call upstream APIs DIRECTLY from Python (no Next.js wrapper) per locked
decision D-CONTEXT-caching-split. Quotas are generous for the demo use-case:
GitHub unauth 60/hr (5000/hr with token), dev.to ~1000/hr, SO ~10k/day.
"""

from __future__ import annotations

import html
import os

import httpx
from google.adk.agents import LlmAgent

_GITHUB_CLIENT = httpx.Client(base_url="https://api.github.com", timeout=10.0)
_DEVTO_CLIENT = httpx.Client(base_url="https://dev.to", timeout=10.0)
_STACKOVERFLOW_CLIENT = httpx.Client(base_url="https://api.stackexchange.com", timeout=10.0)

_RESULT_LIMIT = 5


# ---------------------------------------------------------------------------
# Shape helpers — map upstream JSON to LLM-friendly dicts with a url field
# ---------------------------------------------------------------------------


def _shape_github_repo(raw: dict) -> dict:
    return {
        "name": raw.get("full_name"),
        "url": raw.get("html_url"),
        "description": (raw.get("description") or "")[:300],
        "stars": raw.get("stargazers_count"),
        "language": raw.get("language"),
        "updated_at": raw.get("updated_at"),
        "topics": raw.get("topics", []),
    }


def _shape_devto_article(raw: dict) -> dict:
    user = raw.get("user") or {}
    return {
        "title": raw.get("title"),
        "url": raw.get("url"),
        "description": (raw.get("description") or "")[:300],
        "tags": raw.get("tag_list", []),
        "reactions": raw.get("public_reactions_count"),
        "published_at": raw.get("published_at"),
        "author": user.get("name") if user else None,
    }


def _shape_stackoverflow_question(raw: dict) -> dict:
    owner = raw.get("owner") or {}
    return {
        "title": html.unescape(raw.get("title") or ""),
        "url": raw.get("link"),
        "score": raw.get("score"),
        "answer_count": raw.get("answer_count"),
        "is_answered": raw.get("is_answered"),
        "tags": raw.get("tags", []),
        "asked": raw.get("creation_date"),
        "asker": owner.get("display_name") if owner else None,
    }


# ---------------------------------------------------------------------------
# Tool functions
# ---------------------------------------------------------------------------


def search_github_repos(query: str) -> dict:
    """Searches GitHub for repositories matching a query, sorted by stars.

    Calls the GitHub Search API directly (api.github.com/search/repositories).
    If GITHUB_TOKEN is set in the environment, it is added as a Bearer token to raise
    the unauthenticated rate limit from 60 req/hr to 5000 req/hr.

    Args:
        query: Search query (e.g., "angular signals", "React hooks", "RAG python").
            Must be non-empty.

    Returns:
        A dict with status, query, count, and a list of repos (name, url, description,
        stars, language, updated_at, topics). Always cite the url in your reply.
        On error, returns status="error", message, and repos=[].
    """
    q = (query or "").strip()
    if not q:
        return {"status": "error", "message": "Query is empty", "repos": []}

    headers: dict[str, str] = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = _GITHUB_CLIENT.get(
            "/search/repositories",
            params={"q": q, "sort": "stars", "order": "desc", "per_page": _RESULT_LIMIT},
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPStatusError, httpx.RequestError) as exc:
        return {
            "status": "error",
            "message": f"GitHub API error: {exc.__class__.__name__}: {exc}",
            "repos": [],
        }

    items = data.get("items", [])[:_RESULT_LIMIT]
    return {
        "status": "success",
        "query": q,
        "count": len(items),
        "repos": [_shape_github_repo(r) for r in items],
    }


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
        except (httpx.HTTPStatusError, httpx.RequestError):
            arr = []  # silently fallback to empty list

    sliced = arr[:_RESULT_LIMIT]
    return {
        "status": "success",
        "query": q,
        "count": len(sliced),
        "articles": [_shape_devto_article(a) for a in sliced],
    }


def search_stackoverflow_questions(query: str) -> dict:
    """Searches Stack Overflow for answered questions matching a query, sorted by votes.

    Calls the Stack Exchange API directly (api.stackexchange.com/2.3/search/advanced).
    Only returns questions that have at least one answer (answers=1 filter).

    Args:
        query: Search query (e.g., "async await deadlock C#", "TypeScript inference").
            Must be non-empty.

    Returns:
        A dict with status, query, count, and a list of questions (title, url, score,
        answer_count, is_answered, tags, asked, asker). Always cite the url in your reply.
        On error, returns status="error", message, and questions=[].
    """
    q = (query or "").strip()
    if not q:
        return {"status": "error", "message": "Query is empty", "questions": []}

    try:
        response = _STACKOVERFLOW_CLIENT.get(
            "/2.3/search/advanced",
            params={
                "order": "desc",
                "sort": "votes",
                "q": q,
                "site": "stackoverflow",
                "pagesize": _RESULT_LIMIT,
                "answers": 1,
                "filter": "withbody",
            },
        )
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPStatusError, httpx.RequestError) as exc:
        return {
            "status": "error",
            "message": f"Stack Overflow API error: {exc.__class__.__name__}: {exc}",
            "questions": [],
        }

    items = data.get("items", [])[:_RESULT_LIMIT]
    return {
        "status": "success",
        "query": q,
        "count": len(items),
        "questions": [_shape_stackoverflow_question(item) for item in items],
    }


# ---------------------------------------------------------------------------
# Agent instantiation
# ---------------------------------------------------------------------------

external_knowledge_agent = LlmAgent(
    name="external_knowledge_agent",
    model="gemini-2.5-flash",
    description=(
        "Surfaces third-party developer knowledge from GitHub (trending repos), dev.to "
        "(community articles), and Stack Overflow (answered questions). "
        "This is a FALLBACK agent — use mentorship_agent, projects_agent, roadmap_agent, "
        "and content_agent first when the query fits their domain. Only delegate here for "
        "external/trending/third-party queries that don't belong to any specialized agent."
    ),
    instruction="""You help community members discover third-party developer content from \
GitHub, dev.to, and Stack Overflow.

TOOLS:
- search_github_repos(query): searches GitHub for repos sorted by stars. Best for \
"trending repo", "open source library", "GitHub project on X".
- search_devto_articles(query): searches dev.to articles by tag. Best for \
"article on X", "dev.to post about Y", "blog post on Z" (UNLESS the user specifically \
asks for Ahsan's blog — that's content_agent's job).
- search_stackoverflow_questions(query): searches Stack Overflow for answered questions \
sorted by votes. Best for "how to X", "Stack Overflow answer for Y", "error message Z".

SEARCH STRATEGY:
- "trending repo" / "open source" / "github project" → search_github_repos.
- "article on / dev.to / blog post about" (not Ahsan's blog) → search_devto_articles.
- "how to / Stack Overflow / answer to / error: ..." → search_stackoverflow_questions.
- If user says "anything on X" or "find me anything about Y" → call ALL THREE in \
parallel and merge the top results into a single reply.

CITATION MANDATE:
- ALWAYS include the source URL in your reply. Label results by source: \
"(via GitHub)", "(via dev.to)", "(via Stack Overflow)". \
Trust is non-negotiable in a community context.
- Never fabricate a URL. Only return what the tools give you.

GUIDELINES:
- If a tool returns count=0, say so honestly — do not invent results.
- If a tool returns status=error, mention that source is temporarily unreachable and \
surface results from the other sources.
- Always end with ONE concrete next action the user can take.""",
    tools=[search_github_repos, search_devto_articles, search_stackoverflow_questions],
)
