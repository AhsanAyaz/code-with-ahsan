"""Curated featured resources surfaced before falling back to fuzzy content search.

Acts as the deterministic first-hit layer so flagship URLs (e.g., the AI Guide)
are not lost to Ghost NQL substring matching limits.

Phase 06-03: the lookup is wrapped in an `LlmAgent` (`featured_resources_agent`)
and exposed to `content_agent` via `agent_tool.AgentTool` (`featured_resources_tool`)
so the invocation is visible in `adk web`'s Events tab instead of happening
silently inside `search_blog_posts`'s return dict.
"""
from __future__ import annotations

from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool

from ..callbacks import inject_current_date, lifecycle_after_agent, lifecycle_before_agent

FEATURED_RESOURCES: list[dict] = [
    {
        "id": "ai-guide",
        "keywords": [
            "ai guide",
            "developer ai guide",
            "developers ai guide",
            "developer's ai guide",
            "ahsan's ai guide",
            "developer guide",
            "developers guide",
            "developer's guide",
            "dev guide",
            "ai era",
            "stay relevant",
            "staying relevant",
            "build smarter",
        ],
        "title": "Build Smarter: The Developer's Guide to Staying Relevant in the AI Era",
        "url": "https://blog.codewithahsan.dev/build-smarter-the-developers-guide-to-staying-relevant-in-the-ai-era/",
        "description": (
            "Ahsan's flagship guide for developers on adapting workflow, learning, "
            "and career to the AI era."
        ),
    },
]


def lookup_featured_resource(topic: str) -> list[dict]:
    """Return curated resources whose keywords appear in the topic (case-insensitive)."""
    q = (topic or "").lower().strip()
    if not q:
        return []
    hits: list[dict] = []
    for resource in FEATURED_RESOURCES:
        for keyword in resource["keywords"]:
            if keyword in q:
                hits.append(
                    {
                        "id": resource["id"],
                        "title": resource["title"],
                        "url": resource["url"],
                        "description": resource["description"],
                    }
                )
                break
    return hits


featured_resources_agent = LlmAgent(
    name="featured_resources_agent",
    model="gemini-2.5-flash",
    description=(
        "Returns curated flagship resources (e.g., Ahsan's AI Guide) whose keywords match "
        "the user query. Always call this BEFORE search_blog_posts when the user asks about "
        "flagship content (AI guide, signature posts)."
    ),
    instruction=(
        "Given the user's topic/query, call lookup_featured_resource(topic) "
        "and return the matched curated resources (title, url, description) as a structured reply. "
        "If no matches, reply with an empty list and \"No featured resources match this query.\" "
        "Never invent a URL — only echo what the tool returned."
    ),
    tools=[lookup_featured_resource],
    before_model_callback=inject_current_date,
    before_agent_callback=lifecycle_before_agent,
    after_agent_callback=lifecycle_after_agent,
)

featured_resources_tool = AgentTool(agent=featured_resources_agent)
