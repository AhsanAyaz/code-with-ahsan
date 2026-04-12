from collections import Counter

from google.adk.agents import LlmAgent

from ..platform_client import BASE_URL, fetch_mentors, fetch_mentors_semantic

_MENTOR_LIMIT = 10
_CATEGORY_LIMIT = 25
_SEMANTIC_LIMIT = 5


def _shape_mentor(raw: dict) -> dict:
    active = raw.get("activeMenteeCount", 0)
    max_mentees = raw.get("maxMentees", 0)
    at_capacity = raw.get("isAtCapacity", False)
    availability = (
        "At capacity"
        if at_capacity
        else f"Accepting mentees ({active}/{max_mentees} slots used)"
    )
    username = raw.get("username")
    return {
        "name": raw.get("displayName") or username or "Unknown",
        "username": username,
        "url": f"{BASE_URL}/mentors/{username}" if username else None,
        "expertise": raw.get("expertise", []),
        "availability": availability,
        "rating": raw.get("avgRating") or None,
        "completed_sessions": raw.get("completedMentorships", 0),
    }


def search_mentors(topic: str) -> dict:
    """Searches the live platform for mentors whose expertise matches a topic.

    Args:
        topic: Technology, skill, or career area (e.g., "angular", "ai", "react").
            Matching is case-insensitive and matches any expertise tag containing the topic.

    Returns:
        A dict with status, topic, count, and a list of matching mentors
        (name, username, expertise, availability, rating, completed_sessions).
    """
    result = fetch_mentors()
    if not result["ok"]:
        return {"status": "error", "message": result["error"], "mentors": []}

    all_mentors = result["data"].get("mentors", [])
    needle = topic.lower().strip()
    matches = [
        m
        for m in all_mentors
        if any(needle in str(tag).lower() for tag in m.get("expertise", []))
    ]
    return {
        "status": "success",
        "topic": topic,
        "count": len(matches),
        "mentors": [_shape_mentor(m) for m in matches[:_MENTOR_LIMIT]],
    }


def list_expertise_categories() -> dict:
    """Lists the distinct expertise tags used by mentors on the platform, with counts.

    Call this when search_mentors returns zero results so you can map the user's term to the
    actual tag vocabulary (e.g., "angular" → "Web Development", "llm" → "AI").

    Returns:
        A dict with status and a list of {tag, mentor_count} entries sorted by count desc.
    """
    result = fetch_mentors()
    if not result["ok"]:
        return {"status": "error", "message": result["error"], "categories": []}

    counter: Counter[str] = Counter()
    for mentor in result["data"].get("mentors", []):
        for tag in mentor.get("expertise", []) or []:
            counter[tag] += 1

    return {
        "status": "success",
        "categories": [
            {"tag": tag, "mentor_count": count}
            for tag, count in counter.most_common(_CATEGORY_LIMIT)
        ],
    }


def get_mentorship_process() -> dict:
    """Returns how the Code with Ahsan mentorship program works.

    Returns:
        A dict describing the mentorship process and application link.
    """
    return {
        "status": "success",
        "process": (
            "Mentorship is 1:1 and goal-driven. Mentees apply via the platform, get matched based "
            "on goals and mentor availability, and meet weekly over a 4-8 week cycle."
        ),
        "apply_url": "https://codewithahsan.dev/mentorship",
        "cost": "Free for active community members",
    }


def semantic_search_mentors(query: str) -> dict:
    """Searches mentor BIOS using vector similarity (RAG over Firestore Vector Search).

    Use this for SPECIFIC tech queries where bios contain details that high-level
    expertise tags don't capture: "Angular", "RAG agents", "iOS Swift", "NgRx",
    "LangChain", "shadcn", "GraphQL federation", "WebGL".

    Prefer search_mentors() for broad areas: "Web Development", "Backend",
    "Career Growth", "Mobile Development".

    Args:
        query: A specific technology, library, framework, or skill to search bios for.

    Returns:
        A dict with status, query, count, and a ranked list of mentors. Each mentor
        includes a `bio_excerpt` (first 300 chars of their bio) which you should QUOTE
        in your reply to the user, and a `match_score` (lower = closer match).
    """
    q = (query or "").strip()
    if not q:
        return {"status": "error", "message": "Query is empty", "mentors": []}

    result = fetch_mentors_semantic(q)
    if not result["ok"]:
        return {"status": "error", "message": result["error"], "mentors": []}

    mentors = (result["data"] or {}).get("mentors", [])
    sliced = mentors[:_SEMANTIC_LIMIT]
    return {
        "status": "success",
        "query": q,
        "count": len(sliced),
        "mentors": sliced,
    }


mentorship_agent = LlmAgent(
    name="mentorship_agent",
    model="gemini-2.5-flash",
    description=(
        "Handles mentorship-related questions: finding mentors by topic, explaining the mentorship "
        "program, and matching mentees to available mentors."
    ),
    instruction="""You help community members find mentors and understand the mentorship program.

TOOLS:
- search_mentors(topic): substring match over expertise TAGS. Use for broad categories \
like "Web Development", "Career Growth", "Backend".
- semantic_search_mentors(query): vector similarity over mentor BIOS. Use for SPECIFIC \
technologies, libraries, or skills like "Angular", "React", "RAG agents", "iOS Swift", \
"GraphQL", "LangChain". Returns bio_excerpt — quote it in your reply.
- list_expertise_categories(): returns the actual vocabulary of tags used on the platform.
- get_mentorship_process(): explains how mentorship works and how to apply.

SEARCH STRATEGY:
1. If the user asks for a specific tech (Angular, React, NgRx, RAG, LangChain, ...), call \
semantic_search_mentors(<that exact term>) FIRST. When you find matches, quote the \
relevant phrase from the bio_excerpt to show the user why this mentor is a fit.
2. If semantic_search_mentors returns count=0 OR if the user is asking for a broad category, \
fall back to search_mentors(<term>).
3. If search_mentors also returns 0, call list_expertise_categories to see the real \
vocabulary, then map and retry. Mentors are tagged with high-level categories like \
"Web Development", "Backend Development", "Machine Learning", "Career Growth".
4. If still zero, say so honestly and suggest joining the waitlist.

GUIDELINES:
- Be honest about availability (at capacity vs. accepting mentees).
- Never invent mentors. Only return what the tools give you.
- If a tool returns an error status, tell the user the platform is temporarily unreachable and \
suggest they visit https://codewithahsan.dev/mentorship directly.
- Always end with a clear next action.""",
    tools=[search_mentors, semantic_search_mentors, list_expertise_categories, get_mentorship_process],
)
