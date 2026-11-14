"""Unit and integration tests for the Loupe autonomous bug triage system."""

from __future__ import annotations

import hashlib
import hmac
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import httpx
import pytest

from community_assistant.agent import root_agent
from community_assistant.callbacks import (
    REDACTION_PLACEHOLDER,
    inject_current_date,
    lifecycle_after_agent,
    lifecycle_before_agent,
    pii_sanitizer,
)
from community_assistant.sub_agents.triage_agent import triage_agent
from community_assistant.triage_tools import (
    GITHUB_REPO,
    LOUPE_ASSETS_DIR,
    LOUPE_FEEDBACK_ENDPOINT,
    REPO_ROOT,
    analyze_bug_screenshot,
    fetch_loupe_issues,
    list_offline_screenshots,
    load_loupe_config,
    post_triage_report,
    resolve_screenshot_bytes,
    run_triage_loop_for_issue,
    search_suspect_components,
    submit_loupe_feedback,
)
from mcp_server import loupe_triage_mcp
from triage_worker.app import app


# ---------------------------------------------------------------------------
# 1. Configuration loading
# ---------------------------------------------------------------------------


def test_load_loupe_config_reads_env_local_and_constants(monkeypatch: pytest.MonkeyPatch) -> None:
    """load_loupe_config reads NEXT_PUBLIC_LOUPE_API_KEY from ../.env.local and exposes constants."""
    monkeypatch.delenv("NEXT_PUBLIC_LOUPE_API_KEY", raising=False)
    cfg = load_loupe_config()

    assert cfg["repo"] == "AhsanAyaz/code-with-ahsan"
    assert cfg["repo"] == GITHUB_REPO
    assert (
        cfg["loupe_endpoint"]
        == "https://etdekhjnkevmrkgqixow.supabase.co/functions/v1/submit-sdk-feedback"
    )
    assert cfg["loupe_endpoint"] == LOUPE_FEEDBACK_ENDPOINT
    assert cfg["loupe_api_key"].startswith("lp_")


def test_load_loupe_config_custom_env_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """load_loupe_config parses a custom dotenv file when env vars are unset."""
    monkeypatch.delenv("NEXT_PUBLIC_LOUPE_API_KEY", raising=False)
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    env_file = tmp_path / ".env.local"
    env_file.write_text(
        'NEXT_PUBLIC_LOUPE_API_KEY="lp_test_custom_key"\nGITHUB_TOKEN=ghp_test_token\n',
        encoding="utf-8",
    )

    cfg = load_loupe_config(env_path=env_file)
    assert cfg["loupe_api_key"] == "lp_test_custom_key"
    assert cfg["github_token"] == "ghp_test_token"


# ---------------------------------------------------------------------------
# 2. Offline screenshot fallback (.loupe-assets/)
# ---------------------------------------------------------------------------


def test_list_offline_screenshots_and_resolve_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    """list_offline_screenshots finds .loupe-assets PNGs and resolve_screenshot_bytes falls back."""
    screenshots = list_offline_screenshots()
    assert len(screenshots) >= 1
    assert all(p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"} for p in screenshots)
    assert screenshots[0].parent == LOUPE_ASSETS_DIR

    # Empty source falls back to first offline asset
    resolved_empty = resolve_screenshot_bytes("")
    assert resolved_empty["ok"] is True
    assert resolved_empty["source"] == "offline_fallback"
    assert resolved_empty["mime_type"] == "image/png"
    assert len(resolved_empty["bytes"]) > 100

    # Remote URL failure falls back to .loupe-assets/
    def _failing_get(*args: object, **kwargs: object) -> httpx.Response:
        raise httpx.ConnectError("Network unreachable in test")

    monkeypatch.setattr(httpx, "get", _failing_get)
    resolved_remote = resolve_screenshot_bytes("https://example.com/broken-screenshot.png")
    assert resolved_remote["ok"] is True
    assert resolved_remote["source"] == "offline_fallback"
    assert Path(resolved_remote["path"]).is_file()


# ---------------------------------------------------------------------------
# 3. fetch_loupe_issues
# ---------------------------------------------------------------------------


def test_fetch_loupe_issues_extracts_screenshots_and_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """fetch_loupe_issues queries GitHub for loupe-labeled issues and extracts image URLs."""
    captured: dict[str, object] = {}

    def _mock_get(url: str, headers: dict | None = None, params: dict | None = None, **kwargs: object) -> MagicMock:
        captured["url"] = url
        captured["params"] = params
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = [
            {
                "number": 42,
                "title": "[Loupe] Floating widget overlaps toast notification",
                "body": (
                    "User reported overlap on /mentorship.\n"
                    "![bug screenshot](https://cdn.loupe.dev/shots/issue-42.png)\n"
                ),
                "state": "open",
                "html_url": "https://github.com/AhsanAyaz/code-with-ahsan/issues/42",
                "labels": [{"name": "loupe"}, {"name": "bug"}],
            }
        ]
        return resp

    monkeypatch.setattr(httpx, "get", _mock_get)
    result = fetch_loupe_issues(state="open", limit=5)

    assert result["status"] == "success"
    assert result["repo"] == "AhsanAyaz/code-with-ahsan"
    assert result["count"] == 1
    assert "AhsanAyaz/code-with-ahsan/issues" in str(captured["url"])
    assert captured["params"] == {"labels": "loupe", "state": "open", "per_page": 5}

    issue = result["issues"][0]
    assert issue["number"] == 42
    assert "loupe" in issue["labels"]
    assert issue["screenshot_urls"] == ["https://cdn.loupe.dev/shots/issue-42.png"]
    assert issue["fallback_screenshot"] is not None
    assert Path(issue["fallback_screenshot"]).is_file()


# ---------------------------------------------------------------------------
# 4. submit_loupe_feedback (dry_run=True and dry_run=False)
# ---------------------------------------------------------------------------


def test_submit_loupe_feedback_dry_run_and_live(monkeypatch: pytest.MonkeyPatch) -> None:
    """submit_loupe_feedback supports dry_run=True and sends X-API-Key to Loupe endpoint when live."""
    monkeypatch.setenv("NEXT_PUBLIC_LOUPE_API_KEY", "lp_unit_test_key")

    dry = submit_loupe_feedback(
        title="Widget overlaps footer",
        description="On mobile viewports the bottom-right widget covers footer links.",
        page_url="https://codewithahsan.dev/mentorship",
        dry_run=True,
    )
    assert dry["status"] == "dry_run"
    assert dry["endpoint"] == LOUPE_FEEDBACK_ENDPOINT
    assert dry["has_api_key"] is True
    assert dry["payload"]["repository"] == "AhsanAyaz/code-with-ahsan"
    assert dry["payload"]["labels"] == ["loupe"]

    posted: dict[str, object] = {}

    def _mock_post(url: str, headers: dict | None = None, json: dict | None = None, **kwargs: object) -> MagicMock:
        posted["url"] = url
        posted["headers"] = headers
        posted["json"] = json
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = {"id": "fb_123", "ok": True}
        return resp

    monkeypatch.setattr(httpx, "post", _mock_post)
    live = submit_loupe_feedback(
        title="Widget overlaps footer",
        description="On mobile viewports the bottom-right widget covers footer links.",
        page_url="https://codewithahsan.dev/mentorship",
        dry_run=False,
    )
    assert live["status"] == "success"
    assert posted["url"] == "https://etdekhjnkevmrkgqixow.supabase.co/functions/v1/submit-sdk-feedback"
    assert posted["headers"]["X-API-Key"] == "lp_unit_test_key"
    assert live["loupe_response"] == {"id": "fb_123", "ok": True}


# ---------------------------------------------------------------------------
# 5. analyze_bug_screenshot (Gemini 2.5 Flash vision + offline fallback)
# ---------------------------------------------------------------------------


def test_analyze_bug_screenshot_with_mocked_gemini_and_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """analyze_bug_screenshot parses Gemini 2.5 Flash JSON and falls back cleanly on error."""
    import community_assistant.triage_tools as tools_mod

    called_models: list[str] = []

    class _FakeModels:
        def generate_content(self, model: str, contents: list) -> SimpleNamespace:
            called_models.append(model)
            return SimpleNamespace(
                text=json.dumps(
                    {
                        "visual_defect": "Loupe feedback button overlaps bottom-right toast stack",
                        "repro_steps": [
                            "Open /mentorship on desktop",
                            "Trigger a toast notification while LoupeFeedback is mounted",
                        ],
                        "suspect_keywords": ["LoupeFeedback", "bottom-right", "offset"],
                        "severity": "high",
                        "page_route": "/mentorship",
                    }
                )
            )

    class _FakeClient:
        def __init__(self, api_key: str | None = None) -> None:
            self.api_key = api_key
            self.models = _FakeModels()

    monkeypatch.setattr(tools_mod.genai, "Client", _FakeClient)

    res = analyze_bug_screenshot(
        screenshot_source="",
        issue_title="[Loupe] Overlap on mentorship page",
        issue_body="Happens on https://codewithahsan.dev/mentorship",
    )
    assert res["status"] == "success"
    assert res["model"] == "gemini-2.5-flash"
    assert called_models == ["gemini-2.5-flash"]
    assert res["visual_defect"] == "Loupe feedback button overlaps bottom-right toast stack"
    assert res["severity"] == "high"
    assert res["page_route"] == "/mentorship"
    assert "LoupeFeedback" in res["suspect_keywords"]

    # Now verify offline heuristic fallback when Gemini raises an exception
    class _RaisingClient:
        def __init__(self, api_key: str | None = None) -> None:
            raise RuntimeError("Gemini quota or network unavailable")

    monkeypatch.setattr(tools_mod.genai, "Client", _RaisingClient)
    fallback_res = analyze_bug_screenshot(
        screenshot_source="",
        issue_title="[Loupe] Header banner overlap on /courses",
        issue_body="Observed at https://codewithahsan.dev/courses/angular",
    )
    assert fallback_res["status"] == "success"
    assert fallback_res["page_route"] == "/courses/angular"
    assert isinstance(fallback_res["repro_steps"], list)
    assert len(fallback_res["repro_steps"]) >= 2
    assert len(fallback_res["suspect_keywords"]) >= 1


# ---------------------------------------------------------------------------
# 6. search_suspect_components against real ../src/
# ---------------------------------------------------------------------------


def test_search_suspect_components_finds_loupe_feedback_in_src() -> None:
    """search_suspect_components scans ../src/ and pinpoints src/components/analytics/LoupeFeedback.tsx."""
    res = search_suspect_components(
        keywords="LoupeFeedback bottom-right showDelayMs",
        route_hint="/",
        max_results=5,
    )
    assert res["status"] == "success"
    assert res["count"] >= 1
    file_paths = [item["file_path"] for item in res["suspect_components"]]
    assert "src/components/analytics/LoupeFeedback.tsx" in file_paths
    top = res["suspect_components"][0]
    assert top["file_path"] == "src/components/analytics/LoupeFeedback.tsx"
    assert "init(" in top["snippet"] or "bottom-right" in top["snippet"]


# ---------------------------------------------------------------------------
# 7. post_triage_report (dry_run, live GitHub comment, PII redaction, no em-dashes)
# ---------------------------------------------------------------------------


def test_post_triage_report_redacts_pii_and_has_no_em_dashes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """post_triage_report redacts PII in dry_run and live modes and never emits em-dashes."""
    dry_report = post_triage_report(
        issue_number=42,
        visual_defect="Bug reported by reporter@example.com with phone 415-555-2671",
        repro_steps="1. Contact user <@123456789012345678>\n2. Open /mentorship",
        suspect_component="src/components/analytics/LoupeFeedback.tsx:13",
        proposed_fix="Adjust offset y token in LoupeFeedback.tsx",
        severity="high",
        dry_run=True,
    )
    assert dry_report["status"] == "dry_run"
    assert dry_report["dry_run"] is True
    body = dry_report["comment_body"]
    assert "reporter@example.com" not in body
    assert "415-555-2671" not in body
    assert "<@123456789012345678>" not in body
    assert REDACTION_PLACEHOLDER in body
    assert "\u2014" not in body
    assert "\u2013" not in body

    # Live mode with mocked httpx.post
    monkeypatch.setenv("GITHUB_TOKEN", "ghp_mock_token_for_test")
    captured_post: dict[str, object] = {}

    def _mock_gh_post(url: str, headers: dict | None = None, json: dict | None = None, **kwargs: object) -> MagicMock:
        captured_post["url"] = url
        captured_post["headers"] = headers
        captured_post["json"] = json
        resp = MagicMock()
        resp.status_code = 201
        resp.json.return_value = {
            "html_url": "https://github.com/AhsanAyaz/code-with-ahsan/issues/42#issuecomment-999"
        }
        return resp

    monkeypatch.setattr(httpx, "post", _mock_gh_post)
    live_report = post_triage_report(
        issue_number=42,
        visual_defect="Overlap in header reported by alice@example.org",
        repro_steps="1. Open page",
        suspect_component="src/components/Header.tsx:10",
        proposed_fix="Use flex-wrap",
        severity="medium",
        dry_run=False,
    )
    assert live_report["status"] == "success"
    assert live_report["dry_run"] is False
    assert (
        live_report["comment_url"]
        == "https://github.com/AhsanAyaz/code-with-ahsan/issues/42#issuecomment-999"
    )
    assert (
        captured_post["url"]
        == "https://api.github.com/repos/AhsanAyaz/code-with-ahsan/issues/42/comments"
    )
    assert "alice@example.org" not in live_report["comment_body"]
    assert "\u2014" not in live_report["comment_body"]


# ---------------------------------------------------------------------------
# 8. triage_agent ADK configuration and callbacks
# ---------------------------------------------------------------------------


def test_triage_agent_adk_wiring_and_lifecycle_callbacks(
    capsys: pytest.CaptureFixture[str],
) -> None:
    """triage_agent is wired into root_agent with gemini-2.5-flash and Phase 7 callbacks."""
    assert triage_agent.name == "triage_agent"
    assert triage_agent.model == "gemini-2.5-flash"
    assert triage_agent in root_agent.sub_agents

    before_model_cbs = triage_agent.before_model_callback
    assert isinstance(before_model_cbs, list)
    assert pii_sanitizer in before_model_cbs
    assert inject_current_date in before_model_cbs
    assert triage_agent.before_agent_callback is lifecycle_before_agent
    assert triage_agent.after_agent_callback is lifecycle_after_agent

    # Verify lifecycle callbacks emit agent.enter and agent.exit JSON events when invoked
    fake_ctx = SimpleNamespace(
        agent_name="triage_agent",
        invocation_id="inv-test-123",
        session=SimpleNamespace(id="sess-test-456"),
        state={},
    )
    triage_agent.before_agent_callback(fake_ctx)
    triage_agent.after_agent_callback(fake_ctx)

    captured_lines = [
        json.loads(line)
        for line in capsys.readouterr().out.strip().splitlines()
        if line.strip()
    ]
    event_types = [evt["event_type"] for evt in captured_lines]
    assert "agent.enter" in event_types
    assert "agent.exit" in event_types
    assert all(evt["agent"] == "triage_agent" for evt in captured_lines)


# ---------------------------------------------------------------------------
# 9. FastMCP server registration
# ---------------------------------------------------------------------------


def test_fastmcp_server_registers_triage_tools() -> None:
    """loupe_triage_mcp exposes FastMCP instance and all 6 triage tool functions."""
    assert loupe_triage_mcp.mcp is not None
    expected_tools = {
        "fetch_loupe_issues",
        "submit_loupe_feedback",
        "analyze_bug_screenshot",
        "search_suspect_components",
        "post_triage_report",
        "triage_issue",
    }
    for name in expected_tools:
        fn = getattr(loupe_triage_mcp, name, None)
        assert callable(fn), f"Expected callable tool '{name}' on loupe_triage_mcp"

    tool_manager = getattr(loupe_triage_mcp.mcp, "_tool_manager", None)
    if tool_manager is not None and hasattr(tool_manager, "_tools"):
        registered = set(tool_manager._tools.keys())
        assert expected_tools.issubset(registered)


# ---------------------------------------------------------------------------
# 10. FastAPI Cloud Run worker endpoints
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fastapi_worker_health_triage_and_webhook(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """FastAPI worker serves /health, /triage/{issue_number}, and /webhook/github with HMAC check."""
    monkeypatch.delenv("GITHUB_WEBHOOK_SECRET", raising=False)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. GET /health
        health_resp = await client.get("/health")
        assert health_resp.status_code == 200
        health_data = health_resp.json()
        assert health_data == {
            "status": "ok",
            "service": "loupe-triage-worker",
            "model": "gemini-2.5-flash",
        }

        # 2. POST /triage/42?dry_run=true
        triage_resp = await client.post(
            "/triage/42?dry_run=true",
            json={
                "issue_payload": {
                    "number": 42,
                    "title": "[Loupe] LoupeFeedback bottom-right button overlap",
                    "body": "Happens on https://codewithahsan.dev/mentorship with LoupeFeedback",
                    "labels": ["loupe"],
                }
            },
        )
        assert triage_resp.status_code == 200
        triage_data = triage_resp.json()
        assert triage_data["issue_number"] == 42
        assert triage_data["dry_run"] is True
        assert "analysis" in triage_data
        assert "suspect_components" in triage_data
        assert "report" in triage_data
        assert "\u2014" not in triage_data["report"]["comment_body"]

        # 3. POST /webhook/github ignores non-loupe issues
        ignored_resp = await client.post(
            "/webhook/github",
            json={
                "action": "opened",
                "issue": {
                    "number": 10,
                    "title": "Documentation typo",
                    "body": "Fix typo in README",
                    "labels": [{"name": "documentation"}],
                },
            },
        )
        assert ignored_resp.status_code == 200
        assert ignored_resp.json()["status"] == "ignored"

        # 4. POST /webhook/github triages loupe-labeled issue
        webhook_payload = {
            "action": "labeled",
            "dry_run": True,
            "issue": {
                "number": 77,
                "title": "[Loupe] LoupeFeedback offset overlap",
                "body": "Widget overlaps toast on https://codewithahsan.dev/",
                "labels": [{"name": "loupe"}],
            },
        }
        wh_resp = await client.post("/webhook/github", json=webhook_payload)
        assert wh_resp.status_code == 200
        wh_data = wh_resp.json()
        assert wh_data["status"] == "triaged"
        assert wh_data["issue_number"] == 77
        assert wh_data["dry_run"] is True
        assert wh_data["triage"]["report"]["status"] == "dry_run"

        # 5. Enforce X-Hub-Signature-256 when GITHUB_WEBHOOK_SECRET is configured
        secret = "top_secret_webhook_hmac"
        monkeypatch.setenv("GITHUB_WEBHOOK_SECRET", secret)
        raw_bytes = json.dumps(webhook_payload).encode("utf-8")

        unauth_resp = await client.post(
            "/webhook/github",
            content=raw_bytes,
            headers={"Content-Type": "application/json"},
        )
        assert unauth_resp.status_code == 401

        bad_sig_resp = await client.post(
            "/webhook/github",
            content=raw_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": "sha256=deadbeef",
            },
        )
        assert bad_sig_resp.status_code == 401

        valid_digest = hmac.new(secret.encode("utf-8"), raw_bytes, hashlib.sha256).hexdigest()
        valid_sig_resp = await client.post(
            "/webhook/github",
            content=raw_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": f"sha256={valid_digest}",
            },
        )
        assert valid_sig_resp.status_code == 200
        assert valid_sig_resp.json()["status"] == "triaged"


# ---------------------------------------------------------------------------
# 11. Sentinel test: zero em-dashes in all new Loupe triage files
# ---------------------------------------------------------------------------


def test_no_em_dashes_in_triage_files() -> None:
    """Ensure none of the Loupe triage source files contain an em-dash character."""
    agent_dir = REPO_ROOT / "agent"
    files_to_check = [
        agent_dir / "community_assistant" / "triage_tools.py",
        agent_dir / "community_assistant" / "sub_agents" / "triage_agent.py",
        agent_dir / "mcp_server" / "loupe_triage_mcp.py",
        agent_dir / "triage_worker" / "__init__.py",
        agent_dir / "triage_worker" / "app.py",
        agent_dir / "triage_worker" / "Dockerfile",
        agent_dir / "tests" / "test_triage_agent.py",
    ]
    optional_alias = agent_dir / "community_assistant" / "triage_agent.py"
    if optional_alias.is_file():
        files_to_check.append(optional_alias)

    for file_path in files_to_check:
        assert file_path.is_file(), f"Expected file to exist: {file_path}"
        content = file_path.read_text(encoding="utf-8")
        assert "\u2014" not in content, f"Found forbidden em-dash in {file_path}"
        assert "\u2013" not in content, f"Found forbidden en-dash in {file_path}"
