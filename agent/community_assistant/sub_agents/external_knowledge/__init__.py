"""external_knowledge composite: SequentialAgent[ParallelAgent[gh, devto, so], synthesizer].

The outer SequentialAgent preserves the name `external_knowledge_agent` so root_agent's
coordinator instruction (which routes "trending repos / dev.to / Stack Overflow" queries
to this name) does not need to change. The inner ParallelAgent fans out the three
upstream API calls concurrently; the synthesizer then reads {gh_result?} / {devto_result?}
/ {so_result?} from session.state and produces a single cited reply.

Pattern mirrors `/Users/amu1o5/personal/ai-agents-google-adk/3-multi-model/agent.py:61-89`
(RESEARCH §1.2).
"""

from __future__ import annotations

from google.adk.agents import ParallelAgent, SequentialAgent

from .devto_researcher import devto_researcher
from .gh_researcher import gh_researcher
from .so_researcher import so_researcher
from .synthesizer import external_knowledge_synthesizer

external_knowledge_fan_out = ParallelAgent(
    name="ExternalFanOut",
    description="Fans out a single user query across GitHub, dev.to, and Stack Overflow.",
    sub_agents=[gh_researcher, devto_researcher, so_researcher],
)

external_knowledge_agent = SequentialAgent(
    name="external_knowledge_agent",  # PRESERVED routable name (RESEARCH §1.3).
    description=(
        "Surfaces third-party developer knowledge from GitHub (trending repos), dev.to "
        "(community articles), and Stack Overflow (answered questions). "
        "This is a FALLBACK agent — use mentorship_agent, projects_agent, roadmap_agent, "
        "and content_agent first when the query fits their domain."
    ),
    sub_agents=[external_knowledge_fan_out, external_knowledge_synthesizer],
)

__all__ = ["external_knowledge_agent"]
