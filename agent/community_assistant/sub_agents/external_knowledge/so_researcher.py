"""Stack Overflow specialist leaf for the external_knowledge ParallelAgent fan-out.

Owns the `_STACKOVERFLOW_CLIENT` module-level httpx singleton and the
`search_stackoverflow_questions` tool. The leaf LlmAgent writes its final response
into `session.state["so_result"]` for the downstream synthesizer to consume.
"""

from __future__ import annotations

import httpx
from google.adk.agents import LlmAgent

from ...callbacks import lifecycle_after_agent, lifecycle_before_agent
from ._shapes import _shape_stackoverflow_question

_STACKOVERFLOW_CLIENT = httpx.Client(base_url="https://api.stackexchange.com", timeout=10.0)

_RESULT_LIMIT = 5


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


so_researcher = LlmAgent(
    name="so_researcher",
    model="gemini-2.5-flash",
    description="Searches Stack Overflow for answered questions matching the user query.",
    instruction="""Call search_stackoverflow_questions with the user query as-is.
Return a concise summary of the top voted, answered questions.
ALWAYS cite the question URL for each result.
If the tool returns status='error', return a brief 'Stack Overflow temporarily unavailable' acknowledgement so the synthesizer can narrate the partial result.""",
    tools=[search_stackoverflow_questions],
    output_key="so_result",
    before_agent_callback=lifecycle_before_agent,
    after_agent_callback=lifecycle_after_agent,
)
