from google.adk.agents import LlmAgent

from .sub_agents.mentorship_agent import mentorship_agent
from .sub_agents.onboarding_agent import onboarding_agent
from .sub_agents.projects_agent import projects_agent
from .sub_agents.roadmap_agent import roadmap_agent

MODEL = "gemini-2.5-flash"

ROOT_INSTRUCTION = """You are the Code with Ahsan community assistant, helping fresh and \
early-career developers in a Discord community of 4,600+ members founded by Muhammad Ahsan Ayaz \
(Google Developer Expert in AI and Angular).

Your job is to understand what the developer needs and delegate to the right specialist:
- onboarding_agent: new members, community overview, channel guides, "where do I start?"
- mentorship_agent: finding mentors, mentor availability, the mentorship program
- projects_agent: open-source projects to contribute to or collaborate on
- roadmap_agent: learning paths for technologies or career directions

Rules:
- Be warm, concise, and practical. Developers are often intimidated when asking for help.
- Delegate to the most relevant sub-agent. If a question spans areas, start with the most specific.
- Never invent mentors, projects, or roadmaps. If a sub-agent returns nothing, say so honestly \
and suggest the next best step.
- Always end with a clear next action the user can take.
"""

root_agent = LlmAgent(
    name="community_assistant",
    model=MODEL,
    description=(
        "Root orchestrator for the Code with Ahsan community assistant. Delegates to specialized "
        "sub-agents for onboarding, mentorship, projects, and learning roadmaps."
    ),
    instruction=ROOT_INSTRUCTION,
    sub_agents=[
        onboarding_agent,
        mentorship_agent,
        projects_agent,
        roadmap_agent,
    ],
)
