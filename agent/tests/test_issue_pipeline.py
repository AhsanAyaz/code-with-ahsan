"""Unit tests for unified issue_pipeline (/issue-action, /triage, /implement)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any

from fastapi.testclient import TestClient

import issue_pipeline
import loupe_triage_mcp
import triage_service
from community_assistant.callbacks import REDACTION_PLACEHOLDER


def _sign(payload_bytes: bytes, secret: str) -> dict[str, str]:
    ts = str(int(time.time()))
    sig = hmac.new(
        secret.encode("utf-8"),
        f"{ts}.".encode("utf-8") + payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    return {
        "Content-Type": "application/json",
        "X-CWA-Timestamp": ts,
        "X-CWA-Signature-256": f"sha256={sig}",
    }


class _FakeResponse:
    def __init__(self, status_code: int = 200, payload: Any = None):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self) -> Any:
        return self._payload


# ---------------------------------------------------------------------------
# 1. Endpoint HMAC & Validation
# ---------------------------------------------------------------------------


def test_issue_action_endpoint_enforces_hmac_and_validation(monkeypatch):
    client = TestClient(triage_service.app)
    body = json.dumps({"issue_number": 42, "mode": "implement", "trigger": "manual"}).encode("utf-8")

    # 503 when secret unset
    monkeypatch.delenv("TRIAGE_WEBHOOK_SECRET", raising=False)
    r503 = client.post("/issue-action", content=body, headers={"Content-Type": "application/json"})
    assert r503.status_code == 503

    # 401 when signature invalid
    monkeypatch.setenv("TRIAGE_WEBHOOK_SECRET", "test-secret")
    r401 = client.post(
        "/issue-action",
        content=body,
        headers={"Content-Type": "application/json", "X-CWA-Timestamp": str(int(time.time())), "X-CWA-Signature-256": "sha256=bad"},
    )
    assert r401.status_code == 401

    # 403 when repo not allowed
    bad_repo_body = json.dumps({"issue_number": 42, "repo": "evil/repo"}).encode("utf-8")
    r403 = client.post("/issue-action", content=bad_repo_body, headers=_sign(bad_repo_body, "test-secret"))
    assert r403.status_code == 403

    # 200 when valid signed request
    monkeypatch.setattr(
        issue_pipeline,
        "handle_issue_action",
        lambda **kwargs: {"status": "success", "http_status": 200, "mode": kwargs["mode"], "issue_number": kwargs["issue_number"]},
    )
    r200 = client.post("/issue-action", content=body, headers=_sign(body, "test-secret"))
    assert r200.status_code == 200
    assert r200.json()["mode"] == "implement"


# ---------------------------------------------------------------------------
# 2. Comment Trigger Pull-Verification & Rocket Idempotency
# ---------------------------------------------------------------------------


def test_comment_trigger_pull_verification_and_idempotency(monkeypatch):
    monkeypatch.setattr(loupe_triage_mcp, "_AUTH_LOGIN_CACHE", {"login": "cwa-bot", "fetched": True})
    reactions_posted: list[dict[str, Any]] = []
    state = {"assoc": "NONE", "actor": "random-user", "body": "/implement use tailwind", "already_reacted": False}

    class FakeClient:
        def get(self, url: str, headers: dict | None = None):
            if url.endswith("/issues/comments/900"):
                return _FakeResponse(200, {
                    "issue_url": "https://api.github.com/repos/AhsanAyaz/code-with-ahsan/issues/55",
                    "author_association": state["assoc"],
                    "user": {"login": state["actor"]},
                    "body": state["body"],
                })
            if "/reactions" in url:
                return _FakeResponse(
                    200,
                    [{"user": {"login": "cwa-bot"}, "content": "rocket"}] if state["already_reacted"] else [],
                )
            raise AssertionError(f"Unexpected GET {url}")

        def post(self, url: str, headers: dict | None = None, json: Any = None):
            reactions_posted.append(json)
            return _FakeResponse(201, {"id": 1})

    c = FakeClient()

    # Unauthorized non-collaborator
    res_403 = issue_pipeline.verify_issue_action_trigger(
        c, "AhsanAyaz/code-with-ahsan", 55, "implement", "comment", comment_id=900, whitelist_users=set()
    )
    assert res_403["http_status"] == 403

    # Whitelisted user succeeds and extracts trailing instructions
    res_ok = issue_pipeline.verify_issue_action_trigger(
        c, "AhsanAyaz/code-with-ahsan", 55, "implement", "comment", comment_id=900, whitelist_users={"random-user"}
    )
    assert res_ok["status"] == "ok"
    assert res_ok["extra_instructions"] == "use tailwind"
    assert reactions_posted == [{"content": "rocket"}]

    # Duplicate comment skipped via bot rocket reaction
    state["already_reacted"] = True
    res_skip = issue_pipeline.verify_issue_action_trigger(
        c, "AhsanAyaz/code-with-ahsan", 55, "implement", "comment", comment_id=900, whitelist_users={"random-user"}
    )
    assert res_skip["status"] == "skipped"


# ---------------------------------------------------------------------------
# 3. Label Trigger Verification
# ---------------------------------------------------------------------------


def test_label_trigger_rejects_missing_label():
    class FakeClient:
        def get(self, url: str, headers: dict | None = None):
            return _FakeResponse(200, {"number": 77, "labels": [{"name": "enhancement"}]})

    res = issue_pipeline.verify_issue_action_trigger(
        FakeClient(), "AhsanAyaz/code-with-ahsan", 77, "implement", "label"
    )
    assert res["http_status"] == 403


# ---------------------------------------------------------------------------
# 4. Multi-File Implementation + Git Data API Atomic Commit + Idempotent Draft PR
# ---------------------------------------------------------------------------


def test_implement_mode_multi_file_git_data_api_and_draft_pr(monkeypatch):
    monkeypatch.setattr(loupe_triage_mcp, "_AUTH_LOGIN_CACHE", {"login": "cwa-bot", "fetched": True})
    calls: list[tuple[str, str]] = []
    existing_pr = {"open": False}
    upserted: dict[str, Any] = {}

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def get(self, url: str, headers: dict | None = None):
            calls.append(("GET", url))
            if url.endswith("/issues/101"):
                return _FakeResponse(200, {
                    "number": 101,
                    "title": "Add dark mode badge helper",
                    "body": "Please add a helper in src/lib/badge.ts and unit tests.",
                    "labels": [{"name": "enhancement"}],
                })
            if "/issues/101/comments" in url:
                return _FakeResponse(200, [])
            if "/git/trees/main?recursive=1" in url:
                return _FakeResponse(200, {
                    "tree": [
                        {"type": "blob", "path": "src/lib/badge.ts"},
                        {"type": "blob", "path": "src/__tests__/permissions.test.ts"},
                    ]
                })
            if "/contents/src/lib/badge.ts?ref=main" in url:
                encoded = base64.b64encode(b"export const badge = () => 'light';\n").decode("ascii")
                return _FakeResponse(200, {"content": encoded})
            if url.endswith("/git/ref/heads/main"):
                return _FakeResponse(200, {"object": {"sha": "base-commit-sha"}})
            if url.endswith("/git/commits/base-commit-sha"):
                return _FakeResponse(200, {"tree": {"sha": "base-tree-sha"}})
            if "/pulls?head=AhsanAyaz:feat/issue-101&state=open" in url:
                if existing_pr["open"]:
                    return _FakeResponse(200, [{"number": 501, "html_url": "https://github.com/AhsanAyaz/code-with-ahsan/pull/501"}])
                return _FakeResponse(200, [])
            raise AssertionError(f"Unexpected GET {url}")

        def post(self, url: str, headers: dict | None = None, json: Any = None):
            calls.append(("POST", url))
            if url.endswith("/git/blobs"):
                return _FakeResponse(201, {"sha": f"blob-{len(calls)}"})
            if url.endswith("/git/trees"):
                assert len(json["tree"]) == 2
                return _FakeResponse(201, {"sha": "new-tree-sha"})
            if url.endswith("/git/commits"):
                return _FakeResponse(201, {"sha": "new-commit-sha"})
            if url.endswith("/git/refs"):
                if existing_pr["open"]:
                    return _FakeResponse(422, {"message": "Reference already exists"})
                return _FakeResponse(201, {"ref": "refs/heads/feat/issue-101"})
            if url.endswith("/pulls"):
                assert json["draft"] is True
                assert "Closes #101" in json["body"]
                return _FakeResponse(201, {"number": 501, "html_url": "https://github.com/AhsanAyaz/code-with-ahsan/pull/501"})
            raise AssertionError(f"Unexpected POST {url}")

        def patch(self, url: str, headers: dict | None = None, json: Any = None):
            calls.append(("PATCH", url))
            return _FakeResponse(200, {"ok": True})

    monkeypatch.setattr(issue_pipeline.httpx, "Client", FakeClient)

    gemini_responses = iter([
        # Run 1: plan
        {
            "can_implement": True,
            "issue_type": "feature",
            "reason": "Clear scope",
            "summary": "Add dark mode variant to badge helper + test.",
            "implementation_plan": ["Update src/lib/badge.ts", "Add src/__tests__/badge.test.ts"],
            "files_to_read": ["src/lib/badge.ts"],
        },
        # Run 1: generate
        {
            "pr_title": "feat: add dark mode badge helper",
            "pr_summary": "Adds dark mode support to badge() and unit test.",
            "test_notes": "Added Vitest test in src/__tests__/badge.test.ts",
            "changes": [
                {"path": "src/lib/badge.ts", "action": "modify", "content": "export const badge = (dark = false) => dark ? 'dark' : 'light';\n", "summary": "Add dark param"},
                {"path": "src/__tests__/badge.test.ts", "action": "create", "content": "import { expect, test } from 'vitest';\ntest('dark', () => expect(true).toBe(true));\n", "summary": "Add unit test"},
            ],
        },
        # Run 2 (idempotent): plan
        {
            "can_implement": True,
            "issue_type": "feature",
            "reason": "Clear scope",
            "summary": "Refine dark mode helper.",
            "implementation_plan": ["Update src/lib/badge.ts"],
            "files_to_read": ["src/lib/badge.ts"],
        },
        # Run 2 (idempotent): generate
        {
            "pr_title": "feat: add dark mode badge helper",
            "pr_summary": "Updated dark mode helper.",
            "test_notes": "Vitest",
            "changes": [
                {"path": "src/lib/badge.ts", "action": "modify", "content": "export const badge = (dark = false) => (dark ? 'dark' : 'light');\n", "summary": "Refine"},
                {"path": "src/__tests__/badge.test.ts", "action": "create", "content": "import { expect, test } from 'vitest';\ntest('dark', () => expect(true).toBe(true));\n", "summary": "Test"},
            ],
        },
    ])
    monkeypatch.setattr(loupe_triage_mcp, "_call_gemini_json", lambda **kwargs: next(gemini_responses))

    def fake_upsert(**kwargs):
        upserted.update(kwargs)
        return "https://github.com/AhsanAyaz/code-with-ahsan/issues/101#issuecomment-1"

    monkeypatch.setattr(loupe_triage_mcp, "_upsert_issue_comment_and_labels", fake_upsert)

    # First run creates branch + Draft PR
    res1 = issue_pipeline.handle_issue_action(issue_number=101, mode="implement", trigger="manual")
    assert res1["status"] == "success"
    assert res1["draft_pr"]["branch"] == "feat/issue-101"
    assert res1["draft_pr"]["pr_number"] == 501
    assert len(res1["draft_pr"]["files_changed"]) == 2
    assert upserted["labels_to_apply"] == ["ai-implemented"]

    # Second run force-updates branch on 422 and PATCHes existing PR
    existing_pr["open"] = True
    res2 = issue_pipeline.handle_issue_action(issue_number=101, mode="implement", trigger="manual")
    assert res2["status"] == "success"
    assert any(m == "PATCH" and "/git/refs/heads/feat/issue-101" in u for m, u in calls)
    assert any(m == "PATCH" and "/pulls/501" in u for m, u in calls)


# ---------------------------------------------------------------------------
# 5. Forbidden Path Blocking & Tier-3 Risk Surfacing
# ---------------------------------------------------------------------------


def test_implement_mode_blocks_forbidden_paths_and_flags_tier3(monkeypatch):
    assert issue_pipeline.is_forbidden_path(".github/workflows/pr-verify.yml") is True
    assert issue_pipeline.is_forbidden_path(".env.local") is True
    assert issue_pipeline.is_forbidden_path("firestore.rules") is True
    assert issue_pipeline.is_forbidden_path("package-lock.json") is True
    assert issue_pipeline.is_forbidden_path("../escape.ts") is True
    assert issue_pipeline.is_forbidden_path("src/app/api/admin/route.ts") is False
    assert issue_pipeline.is_sensitive_path("src/app/api/admin/route.ts") is True

    monkeypatch.setattr(
        loupe_triage_mcp,
        "_call_gemini_json",
        lambda **kwargs: {
            "pr_title": "feat: admin endpoint tweak",
            "pr_summary": "Updates admin route.",
            "changes": [
                {"path": ".github/workflows/pr-verify.yml", "action": "modify", "content": "evil", "summary": "bad"},
                {"path": "src/app/api/admin/route.ts", "action": "modify", "content": "export async function GET() { return new Response('ok'); }", "summary": "ok"},
            ],
        },
    )

    class FakeClient:
        def get(self, url: str, headers: dict | None = None):
            return _FakeResponse(404, {})

    gen = issue_pipeline.generate_multi_file_changes(
        FakeClient(),
        "AhsanAyaz/code-with-ahsan",
        {"issue_number": 88, "title": "Admin tweak", "body": "Update admin"},
        {"issue_type": "feature", "files_to_read": [], "implementation_plan": []},
    )
    assert [c["path"] for c in gen["changes"]] == ["src/app/api/admin/route.ts"]
    assert gen["blocked_paths"] == [".github/workflows/pr-verify.yml"]
    assert gen["sensitive_paths"] == ["src/app/api/admin/route.ts"]


# ---------------------------------------------------------------------------
# 6. Cannot-Implement Graceful Handling
# ---------------------------------------------------------------------------


def test_implement_mode_handles_cannot_implement_gracefully(monkeypatch):
    upserted: dict[str, Any] = {}

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def get(self, url: str, headers: dict | None = None):
            if url.endswith("/issues/102"):
                return _FakeResponse(200, {"number": 102, "title": "Make it better", "body": "Just improve things", "labels": []})
            if "/comments" in url:
                return _FakeResponse(200, [])
            if "/git/trees/main" in url:
                return _FakeResponse(200, {"tree": []})
            raise AssertionError(f"Unexpected GET {url}")

    monkeypatch.setattr(issue_pipeline.httpx, "Client", FakeClient)
    monkeypatch.setattr(
        loupe_triage_mcp,
        "_call_gemini_json",
        lambda **kwargs: {
            "can_implement": False,
            "issue_type": "feature",
            "reason": "Requirements are underspecified; please clarify target page and behavior.",
            "summary": "",
            "implementation_plan": [],
            "files_to_read": [],
        },
    )
    monkeypatch.setattr(
        loupe_triage_mcp,
        "_upsert_issue_comment_and_labels",
        lambda **kwargs: (upserted.update(kwargs) or "https://github.com/AhsanAyaz/code-with-ahsan/issues/102#issuecomment-2"),
    )

    res = issue_pipeline.handle_issue_action(issue_number=102, mode="implement", trigger="manual")
    assert res["status"] == "cannot_implement"
    assert upserted["labels_to_apply"] == ["ai-implement-failed"]
    assert "underspecified" in upserted["clean_markdown"]


# ---------------------------------------------------------------------------
# 7. Triage Mode Feature Classification (Never Wontfix)
# ---------------------------------------------------------------------------


def test_triage_mode_classifies_feature_request_without_wontfix(monkeypatch):
    posted: dict[str, Any] = {}
    pr_called = {"called": False}

    monkeypatch.setattr(
        loupe_triage_mcp,
        "fetch_loupe_issue",
        lambda **kwargs: {
            "status": "success",
            "issue_number": 200,
            "title": "Feature request: Add RSS feed for blog posts",
            "body": "It would be nice to have an RSS feed at /rss.xml.",
            "screenshot_urls": [],
            "route_hint": "/blog",
            "pii_types": [],
        },
    )
    monkeypatch.setattr(
        loupe_triage_mcp,
        "_call_gemini_json",
        lambda **kwargs: {
            "issue_type": "feature",
            "is_bug": False,
            "is_wontfix": False,
            "severity": "none",
            "visual_summary": "Feature request for an RSS feed.",
            "ui_elements": [],
            "search_keywords": ["blog", "rss"],
            "suspected_route": "/blog",
            "reasoning": "User is requesting a new capability.",
        },
    )
    monkeypatch.setattr(
        loupe_triage_mcp,
        "find_suspect_components",
        lambda **kwargs: {"status": "success", "suspects": [], "top_suspect_file": ""},
    )
    monkeypatch.setattr(
        loupe_triage_mcp,
        "create_fix_draft_pr",
        lambda **kwargs: pr_called.__setitem__("called", True),
    )
    monkeypatch.setattr(
        loupe_triage_mcp,
        "post_triage_report",
        lambda **kwargs: (posted.update(kwargs) or {"status": "success"}),
    )

    res = loupe_triage_mcp.triage_loupe_issue(issue_number=200, post_to_github=True, create_pr=True)
    assert res["issue_type"] == "feature"
    assert res["is_wontfix"] is False
    assert pr_called["called"] is False
    assert posted["is_wontfix"] is False
    assert posted["labels"] == ["triaged", "enhancement"]
    assert "/implement" in posted["triage_markdown"]


# ---------------------------------------------------------------------------
# 8. PII Redaction Before Gemini & GitHub
# ---------------------------------------------------------------------------


def test_implement_mode_redacts_pii_before_gemini_and_github(monkeypatch):
    seen_prompts: list[str] = []

    class FakeClient:
        def get(self, url: str, headers: dict | None = None):
            if url.endswith("/issues/300"):
                return _FakeResponse(200, {
                    "number": 300,
                    "title": "Contact user@secret.dev for feature",
                    "body": "Call +1 (555) 999-8888 about this feature.",
                    "labels": [],
                })
            if "/comments" in url:
                return _FakeResponse(200, [
                    {"user": {"login": "alice"}, "body": "My email is alice@secret.dev"},
                ])
            if "/git/trees/main" in url:
                return _FakeResponse(200, {"tree": []})
            raise AssertionError(f"Unexpected GET {url}")

    c = FakeClient()
    ctx = issue_pipeline.fetch_issue_with_comments(c, "AhsanAyaz/code-with-ahsan", 300)
    assert "user@secret.dev" not in ctx["title"]
    assert "555" not in ctx["body"]
    assert "alice@secret.dev" not in ctx["comments"][0]["body"]
    assert REDACTION_PLACEHOLDER in ctx["title"]

    def capture_gemini(**kwargs):
        seen_prompts.append(str(kwargs.get("contents", "")))
        return {
            "can_implement": False,
            "issue_type": "feature",
            "reason": "Need more info",
            "summary": "",
            "implementation_plan": [],
            "files_to_read": [],
        }

    monkeypatch.setattr(loupe_triage_mcp, "_call_gemini_json", capture_gemini)
    issue_pipeline.plan_implementation(c, "AhsanAyaz/code-with-ahsan", ctx, extra_instructions="Ping bob@secret.dev")
    assert seen_prompts
    assert "bob@secret.dev" not in seen_prompts[0]
    assert "user@secret.dev" not in seen_prompts[0]
