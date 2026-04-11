from collections import Counter

from google.adk.agents import LlmAgent

from ..platform_client import fetch_roadmaps

_ROADMAP_LIMIT = 10


def _shape_roadmap(raw: dict) -> dict:
    creator = raw.get("creatorProfile", {}) or {}
    return {
        "id": raw.get("id"),
        "title": raw.get("title"),
        "description": (raw.get("description") or "")[:300],
        "domain": raw.get("domain"),
        "difficulty": raw.get("difficulty"),
        "estimated_hours": raw.get("estimatedHours"),
        "author": creator.get("displayName") or creator.get("username"),
        "content_url": raw.get("contentUrl"),
    }


def list_roadmaps(domain: str = "", difficulty: str = "") -> dict:
    """Lists approved learning roadmaps from the platform, optionally filtered.

    Passes the filters through to the API as-is — the platform taxonomy is the source of truth.
    Call list_roadmap_domains first if you don't know which domain values exist.

    Args:
        domain: Optional domain filter (e.g., "ai", "frontend", "ml", "ai-agents"). Empty string
            returns all approved roadmaps.
        difficulty: Optional difficulty filter (e.g., "beginner", "intermediate", "advanced").
            Empty string returns all difficulty levels.

    Returns:
        A dict with status, filters applied, count, and a list of roadmaps (id, title,
        description, domain, difficulty, estimated_hours, author, content_url).
    """
    result = fetch_roadmaps(domain=domain or None, difficulty=difficulty or None)
    if not result["ok"]:
        return {"status": "error", "message": result["error"], "roadmaps": []}

    all_roadmaps = result["data"].get("roadmaps", [])
    return {
        "status": "success",
        "domain": domain or "all",
        "difficulty": difficulty or "all",
        "count": len(all_roadmaps),
        "roadmaps": [_shape_roadmap(r) for r in all_roadmaps[:_ROADMAP_LIMIT]],
    }


def list_roadmap_domains() -> dict:
    """Lists the distinct domains actually present in approved roadmaps on the platform.

    Call this when list_roadmaps returns zero for a specific domain filter, so you can see what's
    actually available and suggest the closest match to the user.

    Returns:
        A dict with status and a list of {domain, roadmap_count} entries.
    """
    result = fetch_roadmaps()
    if not result["ok"]:
        return {"status": "error", "message": result["error"], "domains": []}

    counter: Counter[str] = Counter()
    for roadmap in result["data"].get("roadmaps", []):
        d = roadmap.get("domain")
        if d:
            counter[d] += 1

    return {
        "status": "success",
        "domains": [
            {"domain": d, "roadmap_count": count}
            for d, count in counter.most_common()
        ],
    }


roadmap_agent = LlmAgent(
    name="roadmap_agent",
    model="gemini-2.5-flash",
    description=(
        "Provides live learning roadmaps from the Code with Ahsan platform, filtered by domain "
        "and difficulty."
    ),
    instruction="""You help community members navigate learning paths using real roadmaps \
authored by mentors on the platform.

TOOLS:
- list_roadmaps(domain, difficulty): lists approved roadmaps with optional filters
- list_roadmap_domains(): returns the distinct domains currently available

SEARCH STRATEGY:
1. Map the user's language to a likely domain: "react"/"angular"/"vue"/"nextjs" → frontend, \
"node"/"api" → backend, "machine learning" → ml, "llm"/"rag" → ai, "agents"/"agentic" → ai-agents, \
"mcp" → mcp-servers.
2. Call list_roadmaps with that domain.
3. If count=0, call list_roadmap_domains to see what's actually available, then suggest the \
closest one and offer to show it.
4. If the user asks broadly ("show me all roadmaps"), call list_roadmaps with no filters.

GUIDELINES:
- Roadmaps are guides, not contracts. Real learning is non-linear and time estimates are rough.
- Only show approved roadmaps (the tool already filters to status=approved).
- If a tool returns an error, tell the user the platform is temporarily unreachable and suggest \
https://codewithahsan.dev/roadmaps.
- Always end with a clear next action (e.g., "Want me to pull up the full content URL?").""",
    tools=[list_roadmaps, list_roadmap_domains],
)
