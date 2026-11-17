"""Unit test suite for the Loupe visual bug self-healing triage loop."""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

import loupe_triage_mcp
import triage_service
from community_assistant.callbacks import REDACTION_PLACEHOLDER


# ---------------------------------------------------------------------------
# 1. PII Redaction Guardrail Tests
# ---------------------------------------------------------------------------


def test_redact_pii_replaces_all_sensitive_patterns():
    """redact_pii redacts email, phone, Discord mention, SSN, and credit card while preserving signed screenshot URLs."""
    signed_url = "https://etdekhjnkevmrkgqixow.supabase.co/storage/v1/object/sign/screenshots/1794843860828.jpg?token=abc"
    raw = (
        f"Screenshot: {signed_url}\n"
        "Contact reporter at reporter@example.com or +1 (555) 234-5678, "
        "Discord <@!123456789012345678>, SSN 123-45-6789, "
        "card 4111-1111-1111-1111."
    )
    cleaned, pii_types = loupe_triage_mcp.redact_pii(raw)

    assert signed_url in cleaned
    assert "reporter@example.com" not in cleaned
    assert "555" not in cleaned
    assert "<@!123456789012345678>" not in cleaned
    assert "123-45-6789" not in cleaned
    assert "4111-1111-1111-1111" not in cleaned
    assert REDACTION_PLACEHOLDER in cleaned
    assert set(pii_types) >= {"EMAIL", "PHONE", "DISCORD_MENTION", "SSN", "CREDIT_CARD"}

    # Pure Loupe issue body with signed URL should report zero PII
    clean_only_url, url_pii = loupe_triage_mcp.redact_pii(f"![Screenshot]({signed_url})")
    assert url_pii == []
    assert signed_url in clean_only_url


# ---------------------------------------------------------------------------
# 2. fetch_loupe_issue Tests
# ---------------------------------------------------------------------------


def test_fetch_loupe_issue_parses_screenshots_route_and_redacts_pii(monkeypatch):
    """fetch_loupe_issue parses issue #379 title, body, markdown screenshot URLs, page URL/route, and redacts PII."""
    mock_issue_payload = {
        "number": 379,
        "title": "[Loupe] Navbar button overlap on mobile (user@test.dev)",
        "body": (
            "Reported from https://codewithahsan.dev/courses/nextjs-mastery\n\n"
            "Contact me at +1-800-555-0199 if needed.\n"
            "![Loupe Screenshot](https://github.com/user-attachments/assets/abc-123-def.png)\n"
            '<img src="https://raw.githubusercontent.com/AhsanAyaz/code-with-ahsan/main/public/snap.webp" />'
        ),
        "html_url": "https://github.com/AhsanAyaz/code-with-ahsan/issues/379",
        "state": "open",
        "labels": [{"name": "loupe"}, {"name": "bug"}],
    }

    class FakeResponse:
        status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
            return mock_issue_payload

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def get(self, url: str, headers: dict | None = None):
            assert url.endswith("/repos/AhsanAyaz/code-with-ahsan/issues/379")
            return FakeResponse()

    monkeypatch.setattr(loupe_triage_mcp.httpx, "Client", FakeClient)

    result = loupe_triage_mcp.fetch_loupe_issue(379, repo="AhsanAyaz/code-with-ahsan")

    assert result["status"] == "success"
    assert result["issue_number"] == 379
    assert "user@test.dev" not in result["title"]
    assert REDACTION_PLACEHOLDER in result["title"]
    assert "800-555-0199" not in result["body"]
    assert REDACTION_PLACEHOLDER in result["body"]
    assert result["pii_redacted"] is True
    assert "EMAIL" in result["pii_types"]
    assert "PHONE" in result["pii_types"]
    assert result["page_url"] == "https://codewithahsan.dev/courses/nextjs-mastery"
    assert result["route_hint"] == "/courses/nextjs-mastery"
    assert result["screenshot_urls"] == [
        "https://github.com/user-attachments/assets/abc-123-def.png",
        "https://raw.githubusercontent.com/AhsanAyaz/code-with-ahsan/main/public/snap.webp",
    ]


# ---------------------------------------------------------------------------
# 3. analyze_loupe_screenshot Tests
# ---------------------------------------------------------------------------


def test_analyze_loupe_screenshot_classifies_real_bug_and_non_bug(monkeypatch):
    """analyze_loupe_screenshot uses gemini-3.8-flash for both confirmed bugs and wontfix non-bugs."""
    called_models: list[str] = []

    class FakeImgResponse:
        status_code = 200
        content = b"\x89PNG\r\n\x1a\nfakeimagebytes"
        headers = {"content-type": "image/png"}

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def get(self, url: str, headers: dict | None = None):
            return FakeImgResponse()

    monkeypatch.setattr(loupe_triage_mcp.httpx, "Client", FakeClient)

    # Case A: Real visual bug
    def fake_gemini_bug(contents: Any, system_instruction: str = "", model: str = ""):
        called_models.append(model)
        return {
            "is_bug": True,
            "is_wontfix": False,
            "severity": "high",
            "visual_summary": "The CTA button overflows the Header container at 375px width.",
            "ui_elements": ["Header", "Navbar", "CTAButton"],
            "search_keywords": ["Header", "Navbar", "overflow"],
            "suspected_route": "/courses",
            "reasoning": "Clear horizontal overflow clipping the button text.",
        }

    monkeypatch.setattr(loupe_triage_mcp, "_call_gemini_json", fake_gemini_bug)

    bug_res = loupe_triage_mcp.analyze_loupe_screenshot(
        screenshot_url="https://github.com/user-attachments/assets/shot.png",
        issue_title="Header button overflow on mobile",
        issue_body="Happens on /courses page",
    )
    assert bug_res["status"] == "success"
    assert bug_res["model_used"] == "gemini-3.8-flash"
    assert called_models[-1] == "gemini-3.8-flash"
    assert bug_res["is_bug"] is True
    assert bug_res["is_wontfix"] is False
    assert bug_res["severity"] == "high"
    assert bug_res["screenshot_downloaded"] is True
    assert "Header" in bug_res["search_keywords"]

    # Case B: Non-bug (wontfix)
    def fake_gemini_non_bug(contents: Any, system_instruction: str = "", model: str = ""):
        called_models.append(model)
        return {
            "is_bug": False,
            "is_wontfix": True,
            "severity": "none",
            "visual_summary": "Normal homepage screenshot with test message.",
            "ui_elements": [],
            "search_keywords": [],
            "suspected_route": "/",
            "reasoning": "Test submission with no visual defect.",
        }

    monkeypatch.setattr(loupe_triage_mcp, "_call_gemini_json", fake_gemini_non_bug)

    non_bug_res = loupe_triage_mcp.analyze_loupe_screenshot(
        screenshot_url="",
        issue_title="Test ping ignore this",
        issue_body="Just testing Loupe integration",
    )
    assert non_bug_res["status"] == "success"
    assert non_bug_res["model_used"] == "gemini-3.8-flash"
    assert called_models[-1] == "gemini-3.8-flash"
    assert non_bug_res["is_bug"] is False
    assert non_bug_res["is_wontfix"] is True
    assert non_bug_res["severity"] == "none"


# ---------------------------------------------------------------------------
# 4. find_suspect_components Tests (Local + GitHub Tree API Fallback)
# ---------------------------------------------------------------------------


def test_find_suspect_components_local_and_github_fallback(monkeypatch, tmp_path: Path):
    """find_suspect_components searches local src/ first and falls back to GitHub tree API when local_src_dir is absent."""
    # Setup temporary local src directory
    src_dir = tmp_path / "src"
    comp_dir = src_dir / "components"
    comp_dir.mkdir(parents=True)
    header_file = comp_dir / "Header.tsx"
    header_file.write_text(
        "export default function Header() { return <nav className='navbar-cta'>Courses</nav>; }",
        encoding="utf-8",
    )

    monkeypatch.setattr(
        loupe_triage_mcp,
        "_call_gemini_json",
        lambda contents, system_instruction="", model="": {
            "suspects": [
                {
                    "file_path": "src/components/Header.tsx",
                    "component_name": "Header",
                    "confidence": "high",
                    "reason": "Contains navbar-cta class matching overflow report.",
                    "line_hint": "1-10",
                }
            ],
            "top_suspect_file": "src/components/Header.tsx",
            "root_cause": "Missing flex-wrap on navbar-cta.",
            "suggested_fix": "Add flex-wrap and min-w-0 to nav container.",
        },
    )

    local_result = loupe_triage_mcp.find_suspect_components(
        keywords=["Header", "navbar-cta"],
        route_hint="/courses",
        issue_context="Header CTA overflow",
        local_src_dir=str(src_dir),
    )
    assert local_result["status"] == "success"
    assert local_result["source"] == "local"
    assert local_result["top_suspect_file"] == "src/components/Header.tsx"
    assert len(local_result["suspects"]) == 1

    # Now test GitHub REST API fallback when local_src_dir does not exist
    encoded_tsx = base64.b64encode(
        b"export function CourseBanner() { return <div className='banner-grid'>Banner</div>; }"
    ).decode("ascii")

    class FakeGitHubClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def get(self, url: str, headers: dict | None = None):
            resp = MagicMock()
            resp.status_code = 200
            resp.raise_for_status = MagicMock()
            if "/git/trees/main" in url:
                resp.json.return_value = {
                    "tree": [
                        {"type": "blob", "path": "src/components/CourseBanner.tsx"},
                        {"type": "blob", "path": "README.md"},
                    ]
                }
            elif "/contents/src/components/CourseBanner.tsx" in url:
                resp.json.return_value = {"content": encoded_tsx}
            return resp

    monkeypatch.setattr(loupe_triage_mcp.httpx, "Client", FakeGitHubClient)
    monkeypatch.setattr(
        loupe_triage_mcp,
        "_call_gemini_json",
        lambda contents, system_instruction="", model="": {
            "suspects": [
                {
                    "file_path": "src/components/CourseBanner.tsx",
                    "component_name": "CourseBanner",
                    "confidence": "high",
                    "reason": "Matched CourseBanner in GitHub tree.",
                    "line_hint": "1",
                }
            ],
            "top_suspect_file": "src/components/CourseBanner.tsx",
            "root_cause": "Grid overflow in CourseBanner.",
            "suggested_fix": "Use responsive grid classes.",
        },
    )

    missing_dir = tmp_path / "does_not_exist_src"
    gh_result = loupe_triage_mcp.find_suspect_components(
        keywords=["CourseBanner", "banner-grid"],
        route_hint="/courses",
        issue_context="CourseBanner overflow",
        repo="AhsanAyaz/code-with-ahsan",
        local_src_dir=str(missing_dir),
    )
    assert gh_result["status"] == "success"
    assert gh_result["source"] == "github"
    assert gh_result["top_suspect_file"] == "src/components/CourseBanner.tsx"


# ---------------------------------------------------------------------------
# 5. create_fix_draft_pr Tests (Idempotent Branch & PR Creation/Reuse)
# ---------------------------------------------------------------------------


def test_create_fix_draft_pr_idempotent_branch_and_pr(monkeypatch):
    """create_fix_draft_pr updates existing branch on 422, commits patched file, and creates/reuses Draft PR."""
    original_code = "export default function Header() {\n  return <header className='flex'>Header</header>;\n}\n"
    encoded_original = base64.b64encode(original_code.encode("utf-8")).decode("ascii")

    monkeypatch.setattr(
        loupe_triage_mcp,
        "_call_gemini_json",
        lambda contents, system_instruction="", model="": {
            "patched_content": "export default function Header() {\n  return <header className='flex flex-wrap'>Header</header>;\n}\n",
            "patch_summary": "Added flex-wrap to header container to prevent mobile overflow.",
        },
    )

    recorded_calls: list[tuple[str, str]] = []

    class FakePRClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def get(self, url: str, headers: dict | None = None):
            recorded_calls.append(("GET", url))
            resp = MagicMock()
            resp.status_code = 200
            resp.raise_for_status = MagicMock()
            if "contents/src/components/Header.tsx?ref=main" in url:
                resp.json.return_value = {"content": encoded_original, "sha": "main-file-sha"}
            elif "git/ref/heads/main" in url:
                resp.json.return_value = {"object": {"sha": "base-main-sha-123"}}
            elif "contents/src/components/Header.tsx?ref=fix/loupe-379" in url:
                resp.json.return_value = {"sha": "branch-file-sha-456"}
            elif "/pulls?head=" in url:
                resp.json.return_value = []  # No existing open PR yet
            return resp

        def post(self, url: str, headers: dict | None = None, json: dict | None = None):
            recorded_calls.append(("POST", url))
            resp = MagicMock()
            if url.endswith("/git/refs"):
                # Simulate branch already exists -> 422 Unprocessable Entity
                resp.status_code = 422
                resp.raise_for_status = MagicMock()
                return resp
            if url.endswith("/pulls"):
                assert json is not None
                assert json["draft"] is True
                assert json["head"] == "fix/loupe-379"
                resp.status_code = 201
                resp.raise_for_status = MagicMock()
                resp.json.return_value = {
                    "html_url": "https://github.com/AhsanAyaz/code-with-ahsan/pull/401",
                    "number": 401,
                }
                return resp
            resp.status_code = 200
            resp.raise_for_status = MagicMock()
            return resp

        def patch(self, url: str, headers: dict | None = None, json: dict | None = None):
            recorded_calls.append(("PATCH", url))
            assert url.endswith("/git/refs/heads/fix/loupe-379")
            assert json == {"sha": "base-main-sha-123", "force": True}
            resp = MagicMock()
            resp.status_code = 200
            resp.raise_for_status = MagicMock()
            return resp

        def put(self, url: str, headers: dict | None = None, json: dict | None = None):
            recorded_calls.append(("PUT", url))
            assert url.endswith("/contents/src/components/Header.tsx")
            assert json is not None
            assert json["branch"] == "fix/loupe-379"
            assert json["sha"] == "branch-file-sha-456"
            resp = MagicMock()
            resp.status_code = 200
            resp.raise_for_status = MagicMock()
            return resp

    monkeypatch.setattr(loupe_triage_mcp.httpx, "Client", FakePRClient)

    pr_res = loupe_triage_mcp.create_fix_draft_pr(
        issue_number=379,
        file_path="src/components/Header.tsx",
        issue_summary="Header overflow on mobile",
        root_cause="Missing flex-wrap",
        suggested_fix="Add flex-wrap",
        repo="AhsanAyaz/code-with-ahsan",
    )

    assert pr_res["status"] == "success"
    assert pr_res["branch"] == "fix/loupe-379"
    assert pr_res["pr_url"] == "https://github.com/AhsanAyaz/code-with-ahsan/pull/401"
    assert pr_res["pr_number"] == 401
    assert any(method == "PATCH" and "git/refs/heads/fix/loupe-379" in u for method, u in recorded_calls)
    assert any(method == "PUT" and "contents/src/components/Header.tsx" in u for method, u in recorded_calls)


# ---------------------------------------------------------------------------
# 6. post_triage_report Tests
# ---------------------------------------------------------------------------


def test_post_triage_report_redacts_pii_and_applies_wontfix_label(monkeypatch):
    """post_triage_report redacts PII in comment markdown, applies 'wontfix' label when is_wontfix=True, and posts comment."""
    posted_labels: list[str] = []
    posted_bodies: list[str] = []

    class FakeReportClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def post(self, url: str, headers: dict | None = None, json: dict | None = None):
            resp = MagicMock()
            resp.status_code = 200
            resp.raise_for_status = MagicMock()
            if url.endswith("/issues/379/labels"):
                posted_labels.extend(json.get("labels", []))
                resp.json.return_value = [{"name": lbl} for lbl in posted_labels]
            elif url.endswith("/issues/379/comments"):
                posted_bodies.append(json.get("body", ""))
                resp.json.return_value = {
                    "html_url": "https://github.com/AhsanAyaz/code-with-ahsan/issues/379#issuecomment-999"
                }
            return resp

    monkeypatch.setattr(loupe_triage_mcp.httpx, "Client", FakeReportClient)

    res = loupe_triage_mcp.post_triage_report(
        issue_number=379,
        triage_markdown="Triage report for secret@example.com — Non-bug test submission.",
        is_wontfix=True,
        repo="AhsanAyaz/code-with-ahsan",
    )

    assert res["status"] == "success"
    assert "wontfix" in res["labels_applied"]
    assert "wontfix" in posted_labels
    assert res["pii_redacted"] is True
    assert "EMAIL" in res["pii_types"]
    assert len(posted_bodies) == 1
    assert "secret@example.com" not in posted_bodies[0]
    assert REDACTION_PLACEHOLDER in posted_bodies[0]


# ---------------------------------------------------------------------------
# 7. triage_loupe_issue End-to-End Orchestration Tests
# ---------------------------------------------------------------------------


def test_triage_loupe_issue_end_to_end_bug_and_wontfix(monkeypatch):
    """triage_loupe_issue orchestrates bug flow (creates Draft PR + posts comment) and non-bug flow (skips PR + labels wontfix)."""
    monkeypatch.setattr(
        loupe_triage_mcp,
        "fetch_loupe_issue",
        lambda issue_number, repo="": {
            "status": "success",
            "issue_number": issue_number,
            "repo": repo,
            "title": "Navbar overlap on mobile",
            "body": f"Reported by {REDACTION_PLACEHOLDER}",
            "html_url": f"https://github.com/{repo}/issues/{issue_number}",
            "state": "open",
            "labels": ["loupe"],
            "screenshot_urls": ["https://github.com/user-attachments/assets/shot.png"],
            "page_url": "https://codewithahsan.dev/courses",
            "route_hint": "/courses",
            "pii_redacted": True,
            "pii_types": ["EMAIL"],
        },
    )

    monkeypatch.setattr(
        loupe_triage_mcp,
        "find_suspect_components",
        lambda keywords, route_hint="", issue_context="", repo="": {
            "status": "success",
            "source": "local",
            "suspects": [
                {
                    "file_path": "src/components/Header.tsx",
                    "component_name": "Header",
                    "confidence": "high",
                    "reason": "Matches mobile navbar layout",
                    "line_hint": "15-42",
                }
            ],
            "top_suspect_file": "src/components/Header.tsx",
            "root_cause": "Flex items do not wrap on narrow screens",
            "suggested_fix": "Add flex-wrap to Header nav",
        },
    )

    pr_calls: list[int] = []

    def fake_create_pr(issue_number: int, file_path: str, issue_summary: str, **kwargs):
        pr_calls.append(issue_number)
        return {
            "status": "success",
            "branch": f"fix/loupe-{issue_number}",
            "file_path": file_path,
            "pr_url": f"https://github.com/AhsanAyaz/code-with-ahsan/pull/500",
            "pr_number": 500,
            "patch_summary": "Added flex-wrap to Header.tsx",
        }

    monkeypatch.setattr(loupe_triage_mcp, "create_fix_draft_pr", fake_create_pr)

    post_calls: list[dict[str, Any]] = []

    def fake_post_report(issue_number: int, triage_markdown: str, is_wontfix: bool = False, **kwargs):
        post_calls.append(
            {
                "issue_number": issue_number,
                "triage_markdown": triage_markdown,
                "is_wontfix": is_wontfix,
            }
        )
        return {
            "status": "success",
            "issue_number": issue_number,
            "comment_url": f"https://github.com/AhsanAyaz/code-with-ahsan/issues/{issue_number}#issuecomment-1",
            "labels_applied": ["wontfix"] if is_wontfix else ["triaged"],
            "is_wontfix": is_wontfix,
        }

    monkeypatch.setattr(loupe_triage_mcp, "post_triage_report", fake_post_report)

    # Flow 1: Real visual bug -> creates Draft PR and posts report with PR link
    monkeypatch.setattr(
        loupe_triage_mcp,
        "analyze_loupe_screenshot",
        lambda **kwargs: {
            "status": "success",
            "model_used": "gemini-3.8-flash",
            "is_bug": True,
            "is_wontfix": False,
            "severity": "high",
            "visual_summary": "Navbar links overlap logo at 375px",
            "ui_elements": ["Header"],
            "search_keywords": ["Header", "Navbar"],
            "suspected_route": "/courses",
            "reasoning": "Visual overlap confirmed in screenshot.",
            "pii_redacted": False,
            "pii_types": [],
        },
    )

    bug_outcome = loupe_triage_mcp.triage_loupe_issue(379, post_to_github=True, create_pr=True)
    assert bug_outcome["status"] == "success"
    assert bug_outcome["is_wontfix"] is False
    assert bug_outcome["draft_pr"] is not None
    assert bug_outcome["draft_pr"]["pr_url"] == "https://github.com/AhsanAyaz/code-with-ahsan/pull/500"
    assert "https://github.com/AhsanAyaz/code-with-ahsan/pull/500" in bug_outcome["triage_markdown"]
    assert pr_calls == [379]
    assert post_calls[-1]["is_wontfix"] is False

    # Flow 2: Non-bug -> skips Draft PR and labels wontfix
    pr_calls.clear()
    monkeypatch.setattr(
        loupe_triage_mcp,
        "analyze_loupe_screenshot",
        lambda **kwargs: {
            "status": "success",
            "model_used": "gemini-3.8-flash",
            "is_bug": False,
            "is_wontfix": True,
            "severity": "none",
            "visual_summary": "No visual bug present.",
            "ui_elements": [],
            "search_keywords": [],
            "suspected_route": "/",
            "reasoning": "Informational test ping.",
            "pii_redacted": False,
            "pii_types": [],
        },
    )

    wontfix_outcome = loupe_triage_mcp.triage_loupe_issue(380, post_to_github=True, create_pr=True)
    assert wontfix_outcome["status"] == "success"
    assert wontfix_outcome["is_wontfix"] is True
    assert wontfix_outcome["draft_pr"] is None
    assert pr_calls == []
    assert post_calls[-1]["is_wontfix"] is True
    assert wontfix_outcome["github_post"]["labels_applied"] == ["wontfix"]


# ---------------------------------------------------------------------------
# 8. ADK triage_agent & root_agent Registration Tests
# ---------------------------------------------------------------------------


def test_triage_agent_uses_gemini_3_8_flash_and_is_registered_on_root_agent():
    """triage_agent uses model == 'gemini-3.8-flash' and is registered in root_agent.sub_agents."""
    from community_assistant.agent import root_agent
    from community_assistant.sub_agents.triage_agent import triage_agent

    assert triage_agent.name == "triage_agent"
    assert triage_agent.model == "gemini-3.8-flash"
    sub_agent_names = [sa.name for sa in root_agent.sub_agents]
    assert "triage_agent" in sub_agent_names


# ---------------------------------------------------------------------------
# 9. FastAPI Cloud Run triage_service Endpoint Tests
# ---------------------------------------------------------------------------


def test_triage_service_health_and_post_triage_endpoints(monkeypatch):
    """FastAPI GET /health and POST /triage support both direct and GitHub webhook payloads."""
    client = TestClient(triage_service.app)

    # Health check
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json() == {
        "status": "ok",
        "service": "cwa-loupe-triage",
        "model": "gemini-3.8-flash",
    }

    captured_calls: list[dict[str, Any]] = []

    def fake_triage_loupe_issue(
        issue_number: int,
        repo: str = "AhsanAyaz/code-with-ahsan",
        post_to_github: bool = True,
        create_pr: bool = True,
    ) -> dict[str, Any]:
        call_info = {
            "issue_number": issue_number,
            "repo": repo,
            "post_to_github": post_to_github,
            "create_pr": create_pr,
        }
        captured_calls.append(call_info)
        return {"status": "success", **call_info}

    monkeypatch.setattr(loupe_triage_mcp, "triage_loupe_issue", fake_triage_loupe_issue)

    # Direct / workflow_dispatch payload
    direct_resp = client.post(
        "/triage",
        json={"issue_number": 379, "repo": "AhsanAyaz/code-with-ahsan"},
    )
    assert direct_resp.status_code == 200
    assert direct_resp.json()["issue_number"] == 379
    assert captured_calls[-1]["issue_number"] == 379

    # GitHub issues webhook payload
    webhook_resp = client.post(
        "/triage",
        json={
            "action": "opened",
            "issue": {"number": 379, "title": "Visual bug from Loupe"},
            "repository": {"full_name": "AhsanAyaz/code-with-ahsan"},
        },
    )
    assert webhook_resp.status_code == 200
    assert webhook_resp.json()["issue_number"] == 379
    assert webhook_resp.json()["repo"] == "AhsanAyaz/code-with-ahsan"

    # Missing issue_number -> 400
    bad_resp = client.post("/triage", json={"action": "opened"})
    assert bad_resp.status_code == 400
