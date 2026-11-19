"""Shared Gemini model settings for the community assistant agents.

Kept in its own leaf module (no package imports) so `agent.py` and every
`sub_agents/**` module can import it without circular imports.

`gemini-2.5-flash` retires on 2026-12-01; this is its replacement. On
gemini-3.5-flash-lite, `temperature` / `top_p` / `top_k` are ignored and a
numeric `thinking_budget` is replaced by `thinking_level` (default "minimal").
Put determinism and tone guidance in the agent instructions instead.
"""

from google.genai import types

MODEL = "gemini-3.5-flash-lite"

# Agents that call tools (including root's transfer_to_agent delegation) need
# more than the "minimal" default to plan tool calls reliably.
TOOL_AGENT_CONFIG = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(thinking_level=types.ThinkingLevel.MEDIUM),
)
