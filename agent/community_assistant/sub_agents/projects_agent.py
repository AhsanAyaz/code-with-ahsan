from google.adk.agents import LlmAgent

_MOCK_PROJECTS = [
    {
        "name": "Voice Cloner",
        "tags": ["ai", "python", "audio"],
        "difficulty": "intermediate",
        "seeking": ["contributors", "testers"],
        "repo": "https://github.com/codewithahsan/voice-cloner",
    },
    {
        "name": "Community Assistant",
        "tags": ["ai", "python", "adk", "discord"],
        "difficulty": "advanced",
        "seeking": ["contributors"],
        "repo": "https://github.com/codewithahsan/community-assistant",
    },
    {
        "name": "Starter Portfolio Template",
        "tags": ["nextjs", "typescript", "beginner-friendly"],
        "difficulty": "beginner",
        "seeking": ["contributors", "design help"],
        "repo": "https://github.com/codewithahsan/starter-portfolio",
    },
    {
        "name": "Learning Roadmap Viewer",
        "tags": ["react", "typescript", "beginner-friendly"],
        "difficulty": "beginner",
        "seeking": ["contributors"],
        "repo": "https://github.com/codewithahsan/roadmap-viewer",
    },
]


def list_open_projects(tag: str = "") -> dict:
    """Lists community open-source projects available for collaboration.

    Args:
        tag: Optional filter by technology or label (e.g., "python", "beginner-friendly").
            Pass an empty string to list all projects.

    Returns:
        A dict with projects matching the tag and a count.
    """
    if tag:
        matched = [
            p for p in _MOCK_PROJECTS if tag.lower() in [t.lower() for t in p["tags"]]
        ]
    else:
        matched = _MOCK_PROJECTS
    return {
        "status": "success",
        "tag": tag or "all",
        "projects": matched,
        "count": len(matched),
    }


def get_contribution_guide(project_name: str) -> dict:
    """Returns how to start contributing to a specific project.

    Args:
        project_name: The name of the project.

    Returns:
        A dict with contribution steps for the project.
    """
    return {
        "status": "success",
        "project": project_name,
        "steps": [
            f"Clone the {project_name} repo and run it locally",
            "Check README.md and CONTRIBUTING.md for setup",
            "Pick an issue labeled 'good-first-issue'",
            "Open a draft PR early and ask for feedback in #help",
        ],
    }


projects_agent = LlmAgent(
    name="projects_agent",
    model="gemini-2.5-flash",
    description=(
        "Helps developers discover open-source projects in the Code with Ahsan community and "
        "understand how to contribute."
    ),
    instruction="""You help community members find projects to contribute to and get started.

Use list_open_projects to browse or filter by tag.
Use get_contribution_guide once they've picked a specific project.

Match project difficulty to the user's stated skill level. If they're a beginner, don't recommend \
advanced projects without a clear warning. Always end with a single concrete next action.""",
    tools=[list_open_projects, get_contribution_guide],
)
