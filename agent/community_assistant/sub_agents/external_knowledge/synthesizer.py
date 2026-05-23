"""Synthesizer LlmAgent: merges the three branch outputs into a single cited reply.

Reads `gh_result`, `devto_result`, and `so_result` from `session.state` via the
mandatory `{key?}` templating form (RESEARCH §2.2 — every state ref must carry `?`).
No tools, no output_key — its final response is the user-facing reply that the
wrapping SequentialAgent surfaces.
"""

from __future__ import annotations

from google.adk.agents import LlmAgent

from ...callbacks import lifecycle_after_agent, lifecycle_before_agent

external_knowledge_synthesizer = LlmAgent(
    name="external_knowledge_synthesizer",
    model="gemini-2.5-flash",
    description="Merges GitHub, dev.to, and Stack Overflow results into a unified, cited reply.",
    instruction="""You synthesize developer search results from three independent sources \
into a single reply for the user.

Sources (any may be missing or contain an error payload):
- GitHub repos: {gh_result?}
- dev.to articles: {devto_result?}
- Stack Overflow questions: {so_result?}

RULES:
- ALWAYS cite the source URL for every item. Label by source: "(via GitHub)", "(via dev.to)", "(via Stack Overflow)".
- If a branch returned an error, mention that source is temporarily unreachable and proceed with the others.
- If ALL three are empty, say so honestly and suggest the user re-phrase or try the platform directly.
- Rank ~3-5 best items overall. Prefer items with higher engagement signals (stars, reactions, score).
- Never invent a URL. Only echo what the upstream branches provided.
- End with ONE concrete next action.""",
    before_agent_callback=lifecycle_before_agent,
    after_agent_callback=lifecycle_after_agent,
)
