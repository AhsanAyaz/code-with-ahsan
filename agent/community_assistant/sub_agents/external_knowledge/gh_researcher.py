"""GitHub specialist leaf for the external_knowledge ParallelAgent fan-out.

Owns the `_GITHUB_CLIENT` module-level httpx singleton and the `search_github_repos`
tool. The leaf LlmAgent writes its final response into `session.state["gh_result"]`
via `output_key="gh_result"` for the downstream synthesizer to consume.
"""

from __future__ import annotations

import os

import httpx
from google.adk.agents import LlmAgent

from ._shapes import _shape_github_repo

_GITHUB_CLIENT = httpx.Client(base_url="https://api.github.com", timeout=10.0)

_RESULT_LIMIT = 5


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


gh_researcher = LlmAgent(
    name="gh_researcher",
    model="gemini-2.5-flash",
    description="Searches GitHub for repos matching the user query.",
    instruction="""Call search_github_repos with the user query as-is.
Return a concise summary of the top results.
ALWAYS cite the html_url of each repo.
If the tool returns status='error', return a brief 'GitHub temporarily unavailable' acknowledgement so the synthesizer can narrate the partial result.""",
    tools=[search_github_repos],
    output_key="gh_result",
)
