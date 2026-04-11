from google.adk.agents import LlmAgent

from ..platform_client import BASE_URL, fetch_projects

_PROJECT_LIMIT = 15


def _shape_project(raw: dict) -> dict:
    creator = raw.get("creatorProfile") or {}
    creator_username = creator.get("username")
    project_id = raw.get("id")
    return {
        "id": project_id,
        "title": raw.get("title"),
        "url": f"{BASE_URL}/projects/{project_id}" if project_id else None,
        "description": (raw.get("description") or "")[:300],
        "tech_stack": raw.get("techStack", []),
        "difficulty": raw.get("difficulty"),
        "status": raw.get("status"),
        "member_count": raw.get("memberCount", 0),
        "max_team_size": raw.get("maxTeamSize"),
        "github": raw.get("githubRepo"),
        "creator": creator.get("displayName") or creator_username,
        "creator_url": f"{BASE_URL}/mentors/{creator_username}" if creator_username else None,
    }


def list_open_projects(tag: str = "") -> dict:
    """Lists community projects currently open for collaboration.

    Fetches live data from the platform (active and completed projects only) and optionally
    filters by a technology tag or keyword (case-insensitive substring match on tech stack,
    title, or description).

    Args:
        tag: Optional filter (e.g., "python", "ai", "beginner"). Empty string returns all.

    Returns:
        A dict with status, tag, count, and a list of projects (id, title, description,
        tech_stack, difficulty, status, member_count, max_team_size, github, creator).
    """
    result = fetch_projects()
    if not result["ok"]:
        return {"status": "error", "message": result["error"], "projects": []}

    all_projects = result["data"].get("projects", [])
    if tag:
        needle = tag.lower().strip()
        filtered = [
            p
            for p in all_projects
            if needle in (p.get("title") or "").lower()
            or needle in (p.get("description") or "").lower()
            or any(needle in str(t).lower() for t in p.get("techStack", []))
        ]
    else:
        filtered = all_projects

    return {
        "status": "success",
        "tag": tag or "all",
        "count": len(filtered),
        "projects": [_shape_project(p) for p in filtered[:_PROJECT_LIMIT]],
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
        "understand how to contribute. Reads live project data from the platform."
    ),
    instruction="""You help community members find projects to contribute to and get started.

Use list_open_projects to browse or filter. The tool fetches live data from the platform.
Use get_contribution_guide once they've picked a specific project.

Match project difficulty to the user's stated skill level. If they're a beginner, don't recommend \
advanced projects without a clear warning. If no projects match, suggest they broaden the filter \
or visit https://codewithahsan.dev/projects. Always end with a single concrete next action.""",
    tools=[list_open_projects, get_contribution_guide],
)
