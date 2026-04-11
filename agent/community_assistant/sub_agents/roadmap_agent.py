from google.adk.agents import LlmAgent

_MOCK_ROADMAPS = {
    "frontend": {
        "stages": [
            "HTML, CSS, and responsive layouts",
            "JavaScript ES6+ and the DOM",
            "One framework (React or Angular) deeply",
            "State management and testing",
            "Build 3 real projects and deploy them",
        ],
        "estimated_weeks": 16,
    },
    "ai-engineer": {
        "stages": [
            "Python fundamentals and data tooling",
            "ML basics: supervised and unsupervised learning",
            "LLMs and prompt engineering",
            "RAG, vector stores, and agents",
            "Ship a production AI feature end-to-end",
        ],
        "estimated_weeks": 24,
    },
    "angular": {
        "stages": [
            "TypeScript fundamentals",
            "Angular components, signals, and routing",
            "RxJS and reactive patterns",
            "Testing with Jest and Cypress",
            "Build and deploy a production Angular app",
        ],
        "estimated_weeks": 14,
    },
}


def get_roadmap(path: str) -> dict:
    """Returns a learning roadmap for a technology or career direction.

    Args:
        path: The technology or career direction (e.g., "frontend", "ai-engineer", "angular").

    Returns:
        A dict with the roadmap stages and estimated duration, or a not_found status.
    """
    roadmap = _MOCK_ROADMAPS.get(path.lower())
    if not roadmap:
        return {
            "status": "not_found",
            "requested": path,
            "available": list(_MOCK_ROADMAPS.keys()),
        }
    return {
        "status": "success",
        "path": path,
        "stages": roadmap["stages"],
        "estimated_weeks": roadmap["estimated_weeks"],
    }


def list_available_roadmaps() -> dict:
    """Lists all available learning roadmap paths.

    Returns:
        A dict with the list of available paths.
    """
    return {
        "status": "success",
        "paths": list(_MOCK_ROADMAPS.keys()),
    }


roadmap_agent = LlmAgent(
    name="roadmap_agent",
    model="gemini-2.5-flash",
    description=(
        "Provides learning roadmaps for technologies and career directions, with stages and "
        "realistic time estimates."
    ),
    instruction="""You help community members navigate learning paths.

Use list_available_roadmaps if they don't know what's available.
Use get_roadmap once they've named a specific path.

If a requested path doesn't exist, suggest the closest available one from the tool's response. \
Always remind users that roadmaps are guides, not contracts — real learning is non-linear and \
time estimates assume ~10 hours per week.""",
    tools=[get_roadmap, list_available_roadmaps],
)
