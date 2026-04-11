from google.adk.agents import LlmAgent

_MOCK_MENTORS = {
    "angular": [
        {
            "name": "Muhammad Ahsan Ayaz",
            "expertise": ["Angular", "AI", "RxJS"],
            "availability": "2 slots/month",
            "focus": "Senior Angular developers moving into AI",
        },
    ],
    "react": [
        {
            "name": "Jane Doe",
            "expertise": ["React", "Next.js", "TypeScript"],
            "availability": "1 slot/month",
            "focus": "Juniors building their first production app",
        },
    ],
    "ai": [
        {
            "name": "Muhammad Ahsan Ayaz",
            "expertise": ["LLMs", "RAG", "Agents"],
            "availability": "2 slots/month",
            "focus": "Developers shipping their first AI feature",
        },
    ],
}


def search_mentors(topic: str) -> dict:
    """Searches for available mentors by topic or technology.

    Args:
        topic: Technology, skill, or career area to find a mentor for (e.g., "angular", "ai").

    Returns:
        A dict with a list of mentor profiles matching the topic and a count.
    """
    matches = _MOCK_MENTORS.get(topic.lower(), [])
    return {
        "status": "success",
        "topic": topic,
        "mentors": matches,
        "count": len(matches),
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


mentorship_agent = LlmAgent(
    name="mentorship_agent",
    model="gemini-2.5-flash",
    description=(
        "Handles mentorship-related questions: finding mentors by topic, explaining the mentorship "
        "program, and matching mentees to available mentors."
    ),
    instruction="""You help community members find mentors and understand the mentorship program.

Use search_mentors when someone asks about a specific technology, skill, or career area.
Use get_mentorship_process when they ask how mentorship works, how to apply, or what to expect.

Be honest about availability. If no mentors match, say so and suggest they:
1. Join the mentorship waitlist, or
2. Explore projects to build experience while waiting.

Never invent mentors. Only return what the tools give you.""",
    tools=[search_mentors, get_mentorship_process],
)
