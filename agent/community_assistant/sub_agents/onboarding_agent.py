from google.adk.agents import LlmAgent, SequentialAgent

from ..callbacks import lifecycle_after_agent, lifecycle_before_agent


def get_community_overview() -> dict:
    """Returns a high-level overview of the Code with Ahsan community and how to get started.

    Returns:
        A dict with community description, getting-started steps, and key links.
    """
    return {
        "status": "success",
        "overview": (
            "Code with Ahsan is a 4,600+ member Discord community for fresh and early-career "
            "developers. Founded by Muhammad Ahsan Ayaz, Google Developer Expert in AI and Angular."
        ),
        "getting_started": [
            "Introduce yourself in #introductions",
            "Share a weekly learning goal in #goals",
            "Join the weekly community call",
            "Explore the mentorship program or open projects",
        ],
        "links": {
            "discord": "https://codewithahsan.dev/discord",
            "site": "https://codewithahsan.dev",
        },
    }


def get_channel_guide() -> dict:
    """Returns the main Discord channels and what they're for.

    Returns:
        A dict mapping channel names to their purpose.
    """
    return {
        "status": "success",
        "channels": {
            "#introductions": "Say hi and share your background",
            "#goals": "Post your weekly learning goals",
            "#help": "Ask technical questions — include what you tried",
            "#showcase": "Share what you're building",
            "#mentorship": "Discuss the mentorship program",
            "#jobs": "Job leads and career advice",
        },
    }


# --- onboarding sub-agents (RESEARCH §2.3, Plan 06-02) ---------------------
#
# `output_key` is scalar (one LlmAgent writes one key). To get BOTH
# `user_skill_level` AND `user_goals` into session.state, onboarding is split
# into a SequentialAgent of two silent extractors plus a user-facing welcome.
# Child order is [skill_level, goals, welcome] — welcome runs LAST so the
# SequentialAgent's final response is the warm welcome (RESEARCH Open
# Question 2 recommendation). Plan 06-02 Task 4's `adk web` smoke test
# verifies the surfacing behavior; if welcome-first is required, Task 5
# Branch B flips the order atomically.

skill_level_extractor = LlmAgent(
    name="onboarding_skill_level",
    model="gemini-2.5-flash",
    description="Asks/identifies the user's current skill level.",
    instruction="""From the conversation so far, identify the user's developer skill level \
("beginner" / "intermediate" / "advanced" / "unknown"). Reply with JUST that single word. \
If you cannot tell, reply "unknown".""",
    output_key="user_skill_level",
    before_agent_callback=lifecycle_before_agent,
    after_agent_callback=lifecycle_after_agent,
)


goals_extractor = LlmAgent(
    name="onboarding_goals",
    model="gemini-2.5-flash",
    description="Asks/identifies the user's stated goals.",
    instruction="""From the conversation so far, summarize the user's stated goals in <40 words. \
If no goals are clear, reply "unknown".""",
    output_key="user_goals",
    before_agent_callback=lifecycle_before_agent,
    after_agent_callback=lifecycle_after_agent,
)


welcome_agent = LlmAgent(
    name="onboarding_welcome",
    model="gemini-2.5-flash",
    description=(
        "Welcomes new members to the Code with Ahsan community and helps them navigate channels, "
        "community norms, and first steps."
    ),
    instruction="""You welcome new members to the Code with Ahsan community.

Use get_community_overview for big-picture intros.
Use get_channel_guide when they ask where to post things.

Be warm and genuinely welcoming. Many new members feel intimidated — reassure them this \
community is for all levels. Always end with one clear next step (e.g., "Start by introducing \
yourself in #introductions").""",
    tools=[get_community_overview, get_channel_guide],
    before_agent_callback=lifecycle_before_agent,
    after_agent_callback=lifecycle_after_agent,
)


onboarding_agent = SequentialAgent(
    name="onboarding_agent",  # PRESERVED routable name — root_agent.sub_agents references this string.
    description=(
        "Welcomes new members and captures their skill level + goals into session state "
        "for downstream agents to consume."
    ),
    sub_agents=[skill_level_extractor, goals_extractor, welcome_agent],
)
