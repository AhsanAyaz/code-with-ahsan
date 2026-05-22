"""Phase 06-01 RED tests: external_knowledge fan-out topology + per-leaf tool tests + Runner-driven concurrency proof.

Mirrors the v6.0 RED/GREEN pattern (RESEARCH §4 Validation Architecture). All imports use the NEW
package path `community_assistant.sub_agents.external_knowledge.*`; the package does not exist on
this commit, so test collection fails at the imports — that is the RED state.

Test 12 (`test_fan_out_executes_three_leaves_concurrently`) is the AGENT-TEST-01 concurrent-invocation
gate per RESEARCH §4.4 lines 601-611 — it drives the SequentialAgent via Runner +
InMemorySessionService, monkeypatches each leaf's httpx client with a timestamp-recording stub, and
asserts both (a) all three result keys land in session.state and (b) the three branch dispatch
timestamps are within 100ms of each other (proving parallel dispatch).
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import httpx
import pytest

from google.adk.agents import LlmAgent, ParallelAgent, SequentialAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from community_assistant.sub_agents.external_knowledge import (
    external_knowledge_agent,
)
from community_assistant.sub_agents.external_knowledge.gh_researcher import (
    gh_researcher,
    search_github_repos,
)
from community_assistant.sub_agents.external_knowledge.devto_researcher import (
    devto_researcher,
    search_devto_articles,
)
from community_assistant.sub_agents.external_knowledge.so_researcher import (
    so_researcher,
    search_stackoverflow_questions,
)
from community_assistant.sub_agents.external_knowledge.synthesizer import (
    external_knowledge_synthesizer,
)
from community_assistant.sub_agents.external_knowledge import (
    gh_researcher as gh_mod,
    devto_researcher as devto_mod,
    so_researcher as so_mod,
)

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> dict | list:
    return json.loads((FIXTURES / name).read_text())


def _ok_response(json_data, url: str = "https://example.com/") -> httpx.Response:
    """Build an httpx.Response that can call raise_for_status (requires request set)."""
    request = httpx.Request("GET", url)
    return httpx.Response(200, json=json_data, request=request)


# ---------------------------------------------------------------------------
# 1. Topology: SequentialAgent[ParallelAgent[gh, devto, so], synthesizer]
# ---------------------------------------------------------------------------


def test_topology_is_sequential_of_parallel_then_synthesizer():
    assert isinstance(external_knowledge_agent, SequentialAgent)
    assert external_knowledge_agent.name == "external_knowledge_agent"
    assert len(external_knowledge_agent.sub_agents) == 2

    fan_out = external_knowledge_agent.sub_agents[0]
    assert isinstance(fan_out, ParallelAgent)
    assert fan_out.name == "ExternalFanOut"
    assert len(fan_out.sub_agents) == 3

    fan_out_names = [a.name for a in fan_out.sub_agents]
    assert "gh_researcher" in fan_out_names
    assert "devto_researcher" in fan_out_names
    assert "so_researcher" in fan_out_names

    synthesizer = external_knowledge_agent.sub_agents[1]
    assert synthesizer.name == "external_knowledge_synthesizer"


# ---------------------------------------------------------------------------
# 2. Distinct + correct output_keys per leaf
# ---------------------------------------------------------------------------


def test_leaf_output_keys_are_distinct_and_correct():
    assert gh_researcher.output_key == "gh_result"
    assert devto_researcher.output_key == "devto_result"
    assert so_researcher.output_key == "so_result"


# ---------------------------------------------------------------------------
# 3. Synthesizer reads all three state keys via {key?} templating
# ---------------------------------------------------------------------------


def test_synthesizer_instruction_reads_all_three_state_keys():
    instr = external_knowledge_synthesizer.instruction
    assert "{gh_result?}" in instr
    assert "{devto_result?}" in instr
    assert "{so_result?}" in instr
    # Non-`?` forms must NOT appear standalone — every state ref must carry `?`.
    # We check by ensuring `{gh_result}` (without ?) is not a substring.
    assert "{gh_result}" not in instr
    assert "{devto_result}" not in instr
    assert "{so_result}" not in instr


# ---------------------------------------------------------------------------
# 4-6. Per-leaf happy-path shape tests via fixtures
# ---------------------------------------------------------------------------


def test_gh_shape_via_fixture(monkeypatch):
    fixture = _load("external_github.json")

    def _mock_get(url, **kwargs):
        return _ok_response(fixture, "https://api.github.com/search/repositories")

    monkeypatch.setattr(gh_mod._GITHUB_CLIENT, "get", _mock_get)
    result = search_github_repos("angular")

    assert result["status"] == "success"
    assert result["count"] >= 1
    for repo in result["repos"]:
        assert repo["url"] is not None
        assert repo["url"].startswith("https://github.com/")


def test_devto_shape_via_fixture(monkeypatch):
    fixture = _load("external_devto.json")

    def _mock_get(url, **kwargs):
        return _ok_response(fixture, "https://dev.to/api/articles")

    monkeypatch.setattr(devto_mod._DEVTO_CLIENT, "get", _mock_get)
    result = search_devto_articles("angular")

    assert result["status"] == "success"
    assert result["count"] >= 1
    for article in result["articles"]:
        assert article["url"] is not None
        assert "dev.to" in article["url"]


def test_so_shape_via_fixture(monkeypatch):
    fixture = _load("external_stackoverflow.json")

    def _mock_get(url, **kwargs):
        return _ok_response(fixture, "https://api.stackexchange.com/2.3/search/advanced")

    monkeypatch.setattr(so_mod._STACKOVERFLOW_CLIENT, "get", _mock_get)
    result = search_stackoverflow_questions("async await deadlock")

    assert result["status"] == "success"
    assert result["count"] >= 1
    for question in result["questions"]:
        assert question["url"] is not None
        assert "stackoverflow.com" in question["url"]


# ---------------------------------------------------------------------------
# 7-9. Each leaf swallows httpx errors and returns status='error'
# (AGENT-PAR-01 fail-fast pitfall guard — RESEARCH §1.5)
# ---------------------------------------------------------------------------


def test_gh_swallows_httpx_error_returns_status_error(monkeypatch):
    def _raise(*args, **kwargs):
        raise httpx.ConnectError("dns failed")

    monkeypatch.setattr(gh_mod._GITHUB_CLIENT, "get", _raise)
    result = search_github_repos("angular")

    assert result["status"] == "error"
    assert result["repos"] == []
    assert "message" in result


def test_devto_swallows_httpx_error_returns_status_error(monkeypatch):
    def _raise(*args, **kwargs):
        raise httpx.ConnectError("dns failed")

    monkeypatch.setattr(devto_mod._DEVTO_CLIENT, "get", _raise)
    result = search_devto_articles("angular")

    assert result["status"] == "error"
    assert result["articles"] == []
    assert "message" in result


def test_so_swallows_httpx_error_returns_status_error(monkeypatch):
    def _raise(*args, **kwargs):
        raise httpx.ConnectError("dns failed")

    monkeypatch.setattr(so_mod._STACKOVERFLOW_CLIENT, "get", _raise)
    result = search_stackoverflow_questions("async await")

    assert result["status"] == "error"
    assert result["questions"] == []
    assert "message" in result


# ---------------------------------------------------------------------------
# 10. dev.to multi-word fallback preserved inside devto_researcher (CONTEXT.md mandate)
# ---------------------------------------------------------------------------


def test_devto_multi_word_fallback_preserved(monkeypatch):
    """Multi-word query with no tag hits triggers top=7 fallback + client-side filter."""
    fixture = _load("external_devto.json")
    call_log: list[dict] = []

    def _mock_get(url, **kwargs):
        params = kwargs.get("params", {})
        call_log.append(dict(params))
        if "tag" in params:
            return _ok_response([], "https://dev.to/api/articles")
        return _ok_response(fixture, "https://dev.to/api/articles")

    monkeypatch.setattr(devto_mod._DEVTO_CLIENT, "get", _mock_get)
    result = search_devto_articles("angular signals")

    assert len(call_log) == 2, f"Expected primary + fallback call, got {len(call_log)}"
    assert call_log[0].get("tag") == "angular signals"
    assert call_log[1].get("top") == "7"
    assert result["status"] == "success"
    assert result["count"] == 1
    assert "angular-signals" in result["articles"][0]["url"]


# ---------------------------------------------------------------------------
# 11. GH leaf reads GITHUB_TOKEN env var and attaches Authorization header
# ---------------------------------------------------------------------------


def test_gh_uses_github_token_when_set(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "test_token_abc")
    captured_headers: dict = {}

    def _mock_get(url, **kwargs):
        captured_headers.update(kwargs.get("headers", {}))
        return _ok_response(
            {"total_count": 0, "items": []},
            "https://api.github.com/search/repositories",
        )

    monkeypatch.setattr(gh_mod._GITHUB_CLIENT, "get", _mock_get)
    search_github_repos("angular")

    assert "Authorization" in captured_headers
    assert captured_headers["Authorization"] == "Bearer test_token_abc"


# ---------------------------------------------------------------------------
# 12. AGENT-TEST-01 concurrent-invocation gate — Runner-driven proof
# Pattern: RESEARCH §4.4 lines 601-611 (Side-effect ordering test, formalized).
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fan_out_executes_three_leaves_concurrently(monkeypatch):
    """Drives SequentialAgent via Runner; asserts (a) all 3 result keys populated
    AND (b) the three branch dispatch timestamps spread within <100ms (parallel)."""

    timestamps: dict[str, float] = {}

    def _make_stub(label: str, payload):
        def _stub(path, params=None, headers=None):
            timestamps[label] = time.monotonic()
            # Tiny sleep simulates I/O: a sequential dispatcher would space these ≥50ms apart.
            time.sleep(0.05)
            return _ok_response(payload, "https://example.test/")
        return _stub

    monkeypatch.setattr(gh_mod._GITHUB_CLIENT, "get", _make_stub("gh", {"items": []}))
    monkeypatch.setattr(devto_mod._DEVTO_CLIENT, "get", _make_stub("devto", []))
    monkeypatch.setattr(so_mod._STACKOVERFLOW_CLIENT, "get", _make_stub("so", {"items": []}))

    session_service = InMemorySessionService()
    runner = Runner(
        agent=external_knowledge_agent,
        app_name="test_app",
        session_service=session_service,
    )
    await session_service.create_session(
        app_name="test_app", user_id="u1", session_id="s1"
    )
    content = types.Content(
        role="user",
        parts=[types.Part(text="trending angular repos and articles")],
    )

    async for _event in runner.run_async(
        user_id="u1", session_id="s1", new_message=content
    ):
        pass  # drain the event stream

    # (a) all three branches populated session.state
    updated = await session_service.get_session(
        app_name="test_app", user_id="u1", session_id="s1"
    )
    assert "gh_result" in updated.state
    assert "devto_result" in updated.state
    assert "so_result" in updated.state

    # (b) concurrent dispatch — the three stub calls fired within 100ms of each other.
    assert len(timestamps) == 3, (
        f"expected 3 branch timestamps, got {sorted(timestamps)}"
    )
    spread_ms = (max(timestamps.values()) - min(timestamps.values())) * 1000
    assert spread_ms < 100, (
        f"branches dispatched {spread_ms:.1f}ms apart (>100ms = sequential, not parallel)"
    )
