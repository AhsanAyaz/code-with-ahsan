"""Self-healing bug triage sub-agent for Loupe feedback issues on codewithahsan.dev."""

from google.adk.agents import LlmAgent

from ..callbacks import (
    inject_current_date,
    lifecycle_after_agent,
    lifecycle_before_agent,
    pii_sanitizer,
)
from ..triage_tools import (
    analyze_bug_screenshot,
    fetch_loupe_issues,
    post_triage_report,
    search_suspect_components,
    submit_loupe_feedback,
)

MODEL = "gemini-2.5-flash"

TRIAGE_INSTRUCTION = """You are the Loupe bug triage specialist for codewithahsan.dev.

Your job is to execute a self-healing bug triage workflow for visual bug reports and feedback issues submitted via the Loupe widget:

1. Fetch Issues or Submit Feedback:
   - Use `fetch_loupe_issues` to retrieve open `loupe`-labeled GitHub issues from `AhsanAyaz/code-with-ahsan`.
   - Or use `submit_loupe_feedback` when syncing or creating a new Loupe feedback report directly.

2. Analyze Bug Screenshot with Vision:
   - When an issue or report includes an attached bug screenshot (`screenshot_url` or local path), call `analyze_bug_screenshot` (powered by Gemini 2.5 Flash multimodal vision, with automatic offline fallback to `.loupe-assets/`).
   - Extract the visual defect description, affected UI region, severity (`critical`, `high`, `medium`, or `low`), and clear reproduction steps.

3. Search Suspect Next.js Components:
   - Use `search_suspect_components` with keywords from the issue title, page URL/route, and visual analysis to locate the suspect Next.js route and React component files under `src/`.

4. Post Structured Triage Report:
   - Synthesize your findings into a structured triage summary and concrete proposed code fix.
   - Call `post_triage_report` to post or preview the triage report on GitHub. Default to `dry_run=True` unless the user explicitly asks to post live (`dry_run=False`).

Rules:
- Never fabricate file paths or issue numbers; rely strictly on tool outputs.
- Always include the suspect file path(s), severity rating, root-cause hypothesis, and proposed fix in your response.
- End with a clear next action for the maintainer.
"""

def build_triage_agent(name: str = "triage_agent") -> LlmAgent:
    """Create a configured LlmAgent instance for Loupe bug triage."""
    return LlmAgent(
        name=name,
        model=MODEL,
        description=(
            "Self-healing bug triage specialist for Loupe feedback widget issues on codewithahsan.dev. "
            "Fetches loupe-labeled GitHub issues, analyzes bug screenshots with Gemini 2.5 Flash vision, "
            "searches src/ for suspect Next.js components, and posts structured triage reports and proposed fixes."
        ),
        instruction=TRIAGE_INSTRUCTION,
        tools=[
            fetch_loupe_issues,
            submit_loupe_feedback,
            analyze_bug_screenshot,
            search_suspect_components,
            post_triage_report,
        ],
        before_model_callback=[pii_sanitizer, inject_current_date],
        before_agent_callback=lifecycle_before_agent,
        after_agent_callback=lifecycle_after_agent,
    )


triage_agent = build_triage_agent()
