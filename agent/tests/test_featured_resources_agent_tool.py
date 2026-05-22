"""Phase 06-03 — AgentTool wrap contract tests for featured_resources.

Pins the AGENT-TOOL-01 contract:
- featured_resources_agent (LlmAgent) exists and has lookup_featured_resource in tools.
- featured_resources_tool = AgentTool wrap of that agent.
- content_agent.tools[0] is featured_resources_tool (FIRST position).
- search_blog_posts no longer prepends curated items into its posts list.
- The status="partial" branch (ghost down BUT featured matched) is retired.
- content_agent.instruction references featured_resources_agent and instructs
  the LLM to call it FIRST for flagship-content queries.
- The _featured_as_post helper and lookup_featured_resource import are gone
  from content_agent.
"""
from __future__ import annotations

import community_assistant.sub_agents.content_agent as content_agent_mod
from community_assistant.sub_agents.content_agent import (
    content_agent,
    search_blog_posts,
    search_youtube_videos,
)
from community_assistant.sub_agents.featured_resources import (
    featured_resources_agent,
    featured_resources_tool,
    lookup_featured_resource,
)


# ---------------------------------------------------------------------------
# featured_resources_agent / featured_resources_tool surface
# ---------------------------------------------------------------------------

def test_featured_resources_agent_exists_and_is_llm_agent():
    assert type(featured_resources_agent).__name__ == "LlmAgent"
    assert featured_resources_agent.name == "featured_resources_agent"


def test_featured_resources_agent_has_lookup_function_in_tools():
    # ADK auto-wraps sync callables as FunctionTool; membership check tolerates
    # both raw-callable and wrapped-FunctionTool storage.
    tool_funcs = []
    for t in featured_resources_agent.tools:
        if callable(t) and not hasattr(t, "func"):
            tool_funcs.append(t)
        elif hasattr(t, "func"):
            tool_funcs.append(t.func)
    assert lookup_featured_resource in tool_funcs


def test_featured_resources_tool_wraps_agent():
    assert type(featured_resources_tool).__name__ == "AgentTool"
    assert featured_resources_tool.agent is featured_resources_agent


# ---------------------------------------------------------------------------
# content_agent.tools wiring
# ---------------------------------------------------------------------------

def test_content_agent_first_tool_is_featured_resources_agent_tool():
    assert content_agent.tools[0] is featured_resources_tool


def test_content_agent_tools_still_has_search_blog_posts_and_youtube():
    assert len(content_agent.tools) == 3
    # The two preserved tools are sync callables (not AgentTool-wrapped).
    remaining = content_agent.tools[1:]
    callables = [t for t in remaining if callable(t)]
    callable_names = [getattr(t, "__name__", "") for t in callables]
    assert "search_blog_posts" in callable_names
    assert "search_youtube_videos" in callable_names


# ---------------------------------------------------------------------------
# search_blog_posts contract changes (no more Python-side prepend)
# ---------------------------------------------------------------------------

def test_search_blog_posts_no_longer_prepends_featured(
    mock_platform_client, content_blog_payload
):
    mock_platform_client("/api/content/blog/search", content_blog_payload)
    result = search_blog_posts("AI guide")
    assert not any(p.get("featured") for p in result["posts"])


def test_search_blog_posts_no_longer_returns_partial_status(monkeypatch):
    monkeypatch.setattr(
        "community_assistant.platform_client._get",
        lambda path, params=None: {
            "ok": False,
            "error": "ghost down",
            "path": "/api/content/blog/search",
        },
    )
    result = search_blog_posts("AI guide")
    assert result["status"] == "error"


# ---------------------------------------------------------------------------
# content_agent instruction + module-level cleanup
# ---------------------------------------------------------------------------

def test_content_agent_instruction_references_featured_resources_agent():
    instr = content_agent.instruction
    assert "featured_resources_agent" in instr
    # Loose check — the directive to call it FIRST should appear somewhere in
    # the SEARCH STRATEGY block. Either casing accepted.
    assert ("FIRST" in instr) or ("first" in instr)


def test_content_agent_no_longer_imports_lookup_function():
    assert not hasattr(content_agent_mod, "lookup_featured_resource")


def test_content_agent_no_longer_has_featured_as_post_helper():
    assert not hasattr(content_agent_mod, "_featured_as_post")


# Reference search_youtube_videos so the import isn't flagged as unused.
assert callable(search_youtube_videos)
