from google.adk.agents import LlmAgent


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


onboarding_agent = LlmAgent(
    name="onboarding_agent",
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
)
