"""Unit test suite for the 5-Pillar PR Certainty & Graduated Autonomy Framework."""
from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any

import pytest
from fastapi.testclient import TestClient

import loupe_triage_mcp
import pr_certainty
import triage_service


# ---------------------------------------------------------------------------
# 1. Fail-Closed Path Risk Classifier & Secret Scanner Tests
# ---------------------------------------------------------------------------

def test_classify_path_risk_tiers_and_fail_closed():
    assert pr_certainty.classify_path_risk("docs/mentorship.md") == ("tier_0_docs", 25)
    assert pr_certainty.classify_path_risk("README.md") == ("tier_0_docs", 25)

    assert pr_certainty.classify_path_risk("src/components/Footer.tsx") == ("tier_1_ui", 20)
    assert pr_certainty.classify_path_risk("src/app/events/cwa-tech-summit/2027/components/HeroSection.tsx") == ("tier_1_ui", 20)
    assert pr_certainty.classify_path_risk("src/app/events/cwa-tech-summit/2027/constants.ts") == ("tier_1_ui", 20)
    assert pr_certainty.classify_path_risk("src/content/courses/angular/intro.mdx") == ("tier_1_ui", 20)
    assert pr_certainty.classify_path_risk("public/images/logo.png") == ("tier_1_ui", 20)

    assert pr_certainty.classify_path_risk("src/services/mentorship.ts") == ("tier_2_backend", 12)
    assert pr_certainty.classify_path_risk("src/app/api/roadmaps/route.ts") == ("tier_2_backend", 12)
    assert pr_certainty.classify_path_risk("src/app/layout.tsx") == ("tier_2_backend", 12)

    # Critical Tier 3 paths (including executable files in public/ and admin/webhooks)
    assert pr_certainty.classify_path_risk("firestore.rules") == ("tier_3_critical", 0)
    assert pr_certainty.classify_path_risk("src/middleware.ts") == ("tier_3_critical", 0)
    assert pr_certainty.classify_path_risk("src/app/api/admin/users/route.ts") == ("tier_3_critical", 0)
    assert pr_certainty.classify_path_risk("src/app/api/webhooks/stripe/route.ts") == ("tier_3_critical", 0)
    assert pr_certainty.classify_path_risk("public/sw.js") == ("tier_3_critical", 0)
    assert pr_certainty.classify_path_risk("public/phishing.html") == ("tier_3_critical", 0)
    assert pr_certainty.classify_path_risk(".github/workflows/pr-verify.yml") == ("tier_3_critical", 0)
    assert pr_certainty.classify_path_risk("agent/pr_certainty.py") == ("tier_3_critical", 0)

    # Fail-closed on unrecognized files
    assert pr_certainty.classify_path_risk("unknown_root_script.sh") == ("tier_3_critical", 0)

    # Anti-rename bypass: renaming a Tier 3 file into docs/ still triggers Tier 3
    assert pr_certainty.classify_path_risk("docs/harmless.md", previous_filename="firestore.rules") == (
        "tier_3_critical",
        0,
    )


def test_detect_secrets_in_patch():
    clean_patch = "+const title = 'Hello World';\n-const old = 'x';"
    assert pr_certainty.detect_secrets_in_patch(clean_patch) == []

    # Removed line with a key should not trigger
    removed_only = "-const k = 'ghp_1234567890abcdefghij123456';"
    assert pr_certainty.detect_secrets_in_patch(removed_only) == []

    leaked_patch = "+const token = 'ghp_1234567890abcdefghij123456';\n+const key = 'AIzaSyA123456789012345678901234567890123';"
    hits = pr_certainty.detect_secrets_in_patch(leaked_patch)
    assert "GITHUB_TOKEN" in hits
    assert "GOOGLE_API_KEY" in hits


# ---------------------------------------------------------------------------
# 2. Contributor Trust Curve Tests
# ---------------------------------------------------------------------------

def test_contributor_trust_curve():
    assert pr_certainty.compute_contributor_trust("maintainer", "OWNER", 0)[0] == 10
    assert pr_certainty.compute_contributor_trust("active_contributor", "COLLABORATOR", 1)[0] == 10
    assert pr_certainty.compute_contributor_trust("active_contributor", "CONTRIBUTOR", 7)[0] == 8
    assert pr_certainty.compute_contributor_trust("active_contributor", "CONTRIBUTOR", 3)[0] == 6
    assert pr_certainty.compute_contributor_trust("active_contributor", "CONTRIBUTOR", 1)[0] == 4
    assert pr_certainty.compute_contributor_trust("new_contributor", "FIRST_TIME_CONTRIBUTOR", 0)[0] == 1


# ---------------------------------------------------------------------------
# 3. 5-Pillar Scoring, Dynamic Thresholds & 3-Bucket Hard Vetoes
# ---------------------------------------------------------------------------

def _make_base_pr(
    files: list[dict[str, Any]] | None = None,
    author_association: str = "OWNER",
    contributor_type: str = "maintainer",
    merged_pr_count: int = 10,
    ci_state: str = "passed",
    labels: list[str] | None = None,
    body: str = "Fixes #100",
    mergeable_state: str = "clean",
) -> dict[str, Any]:
    f_list = files if files is not None else [
        {"filename": "src/components/Footer.tsx", "additions": 10, "deletions": 4, "patch": "+<span>ok</span>"}
    ]
    return {
        "pr_number": 401,
        "repo": "AhsanAyaz/code-with-ahsan",
        "title": "Fix footer spacing",
        "body": body,
        "html_url": "https://github.com/AhsanAyaz/code-with-ahsan/pull/401",
        "draft": False,
        "base_ref": "main",
        "head_sha": "abc1234567890def",
        "node_id": "PR_kwDO_test",
        "mergeable_state": mergeable_state,
        "labels": labels or [],
        "author_login": "AhsanAyaz",
        "author_association": author_association,
        "contributor_type": contributor_type,
        "merged_pr_count": merged_pr_count,
        "target_issues": [{"issue_number": 100, "title": "Footer bug", "html_url": "https://github.com/x/100"}],
        "changed_files": f_list,
        "changed_files_total": len(f_list),
        "files_truncated": False,
        "firestore_index_warning": False,
        "ci_status": {"state": ci_state, "checks": []},
    }


def _make_base_eval(
    verdict: str = "looks_good",
    ai_confidence: int = 92,
    fallback_used: bool = False,
    findings: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    return {
        "verdict": verdict,
        "ai_confidence": ai_confidence,
        "fallback_used": fallback_used,
        "addresses_target_issue": True,
        "findings": findings or [],
    }


def test_lane_a_shadow_and_live_scoring():
    pr_ctx = _make_base_pr()
    ev = _make_base_eval()
    res = pr_certainty.compute_pr_certainty(pr_ctx, ev, auto_merge_mode="shadow")

    # CI 30 + Tier1 20 + AI round(92*0.25)=23 + Maintainer 10 + Hygiene 10 = 93
    assert res["certainty_score"] == 93
    assert res["risk_tier"] == "tier_1_ui"
    assert res["lane_a_threshold"] == 85
    assert res["hard_vetoes"] == []
    assert res["autonomy_lane"] == "lane_a_automerge"
    assert res["shadow_would_automerge"] is True
    assert "shadow-automerge" in res["managed_labels"]
    assert res["telemetry_meta"]["first_green_ci_prediction"]["score"] == 93

    res_live = pr_certainty.compute_pr_certainty(pr_ctx, ev, auto_merge_mode="live")
    assert "auto-merged-by-ai" in res_live["managed_labels"]


def test_dynamic_threshold_blocks_tier2_backend_into_lane_b():
    # Tier 2 backend (12 pts) + CI 30 + AI 23 + Returning (6 pts) + Hygiene 10 = 81 (< 92 cutoff, >= 65 -> Lane B)
    pr_ctx = _make_base_pr(
        files=[{"filename": "src/services/mentorship.ts", "additions": 20, "deletions": 5, "patch": "+export const x = 1;"}],
        author_association="CONTRIBUTOR",
        contributor_type="active_contributor",
        merged_pr_count=3,
    )
    res = pr_certainty.compute_pr_certainty(pr_ctx, _make_base_eval(), auto_merge_mode="shadow")
    assert res["certainty_score"] == 81
    assert res["risk_tier"] == "tier_2_backend"
    assert res["lane_a_threshold"] == 92
    assert res["autonomy_lane"] == "lane_b_fast_track_hitl"
    assert res["shadow_would_automerge"] is False


def test_hard_vetoes_override_high_score():
    # 93-point Tier 1 PR with HOLD_LABEL -> Lane C
    pr_hold = _make_base_pr(labels=["do-not-automerge"])
    res_hold = pr_certainty.compute_pr_certainty(pr_hold, _make_base_eval())
    assert res_hold["certainty_score"] == 93
    assert res_hold["autonomy_lane"] == "lane_c_human_review"
    assert any(v["code"] == "HOLD_LABEL" for v in res_hold["hard_vetoes"])

    # First-time contributor even on Tier 0 docs -> FIRST_TIME_CONTRIBUTOR -> Lane C
    pr_first = _make_base_pr(
        files=[{"filename": "docs/guide.md", "additions": 2, "deletions": 1, "patch": "+typo fix"}],
        author_association="FIRST_TIME_CONTRIBUTOR",
        contributor_type="new_contributor",
        merged_pr_count=0,
    )
    res_first = pr_certainty.compute_pr_certainty(pr_first, _make_base_eval())
    assert res_first["autonomy_lane"] == "lane_c_human_review"
    assert any(v["code"] == "FIRST_TIME_CONTRIBUTOR" for v in res_first["hard_vetoes"])

    # Tier 3 critical path -> HIGH_RISK_PATH -> Lane C
    pr_rules = _make_base_pr(
        files=[{"filename": "firestore.rules", "additions": 2, "deletions": 1, "patch": "+allow read: if true;"}]
    )
    res_rules = pr_certainty.compute_pr_certainty(pr_rules, _make_base_eval())
    assert res_rules["pillars"]["blast_radius"]["score"] == 0
    assert res_rules["autonomy_lane"] == "lane_c_human_review"
    assert any(v["code"] == "HIGH_RISK_PATH" for v in res_rules["hard_vetoes"])

    # Heuristic fallback -> AI_FALLBACK -> Lane C
    res_fb = pr_certainty.compute_pr_certainty(_make_base_pr(), _make_base_eval(fallback_used=True))
    assert res_fb["pillars"]["semantic_ai"]["score"] == 0
    assert res_fb["autonomy_lane"] == "lane_c_human_review"
    assert any(v["code"] == "AI_FALLBACK" for v in res_fb["hard_vetoes"])

    # Placeholder patch marker -> PLACEHOLDER_PATCH -> Lane D
    pr_placeholder = _make_base_pr(body=f"Closes #100\n{pr_certainty.PLACEHOLDER_PATCH_MARKER}")
    res_ph = pr_certainty.compute_pr_certainty(pr_placeholder, _make_base_eval())
    assert res_ph["autonomy_lane"] == "lane_d_feedback_loop"
    assert any(v["code"] == "PLACEHOLDER_PATCH" for v in res_ph["hard_vetoes"])

    # CI Pending -> lane_pending_ci (silent wait bucket)
    pr_pending = _make_base_pr(ci_state="pending")
    res_pend = pr_certainty.compute_pr_certainty(pr_pending, _make_base_eval())
    assert res_pend["autonomy_lane"] == "lane_pending_ci"
    assert any(v["code"] == "CI_PENDING" for v in res_pend["hard_vetoes"])

    # CI Failed -> Lane D
    pr_failed = _make_base_pr(ci_state="failed")
    res_fail = pr_certainty.compute_pr_certainty(pr_failed, _make_base_eval())
    assert res_fail["autonomy_lane"] == "lane_d_feedback_loop"
    assert any(v["code"] == "CI_FAILED" for v in res_fail["hard_vetoes"])


def test_metadata_roundtrip_and_preserves_first_green_prediction():
    pr_ctx = _make_base_pr()
    first = pr_certainty.compute_pr_certainty(pr_ctx, _make_base_eval())
    encoded = pr_certainty.encode_certainty_meta(first["telemetry_meta"])
    assert "--" not in encoded[len(pr_certainty.META_PREFIX) : -len(pr_certainty.META_SUFFIX)]

    decoded = pr_certainty.extract_certainty_meta(f"hello\n{encoded}\nworld")
    assert decoded is not None
    assert decoded["first_green_ci_prediction"]["score"] == 93

    # Subsequent commit fails CI — first_green_ci_prediction must remain immutable!
    pr_ctx2 = _make_base_pr(ci_state="failed")
    pr_ctx2["head_sha"] = "def9876543210abc"
    second = pr_certainty.compute_pr_certainty(pr_ctx2, _make_base_eval(), prior_meta=decoded)
    assert second["telemetry_meta"]["first_green_ci_prediction"]["score"] == 93
    assert len(second["telemetry_meta"]["history"]) == 2


# ---------------------------------------------------------------------------
# 4. GitHub Auto-Merge GraphQL + Clean-Status REST Fallback Tests
# ---------------------------------------------------------------------------

def test_enable_github_automerge_clean_status_rest_fallback(monkeypatch):
    calls: list[tuple[str, str, dict[str, Any]]] = []

    class FakeResp:
        def __init__(self, payload: dict[str, Any]):
            self._payload = payload
            self.status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
            return self._payload

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def post(self, url: str, headers=None, json=None):
            calls.append(("POST", url, json))
            return FakeResp({"errors": [{"message": "Pull request is in clean status"}]})

        def put(self, url: str, headers=None, json=None):
            calls.append(("PUT", url, json))
            return FakeResp({"sha": "merged_commit_sha_123", "merged": True})

    monkeypatch.setattr(pr_certainty.httpx, "Client", FakeClient)

    result = pr_certainty.enable_github_automerge(
        repo="AhsanAyaz/code-with-ahsan",
        pr_number=401,
        pull_request_node_id="PR_kwDO_test",
        head_sha="abc1234567890def",
        merge_method="SQUASH",
    )
    assert result["status"] == "success"
    assert result["action"] == "merged_directly"
    assert calls[0][0] == "POST" and "graphql" in calls[0][1]
    assert calls[1][0] == "PUT" and calls[1][2] == {"sha": "abc1234567890def", "merge_method": "squash"}


# ---------------------------------------------------------------------------
# 5. Zero-Trust HMAC Verification & `/pr-command` Endpoint Tests
# ---------------------------------------------------------------------------

def test_hmac_signature_verification():
    secret = "test-super-secret"
    body = b'{"repo":"AhsanAyaz/code-with-ahsan","pr_number":401,"comment_id":999}'
    ts = str(int(time.time()))
    sig = hmac.new(secret.encode(), f"{ts}.".encode() + body, hashlib.sha256).hexdigest()

    assert pr_certainty.verify_hmac_signature(body, f"sha256={sig}", ts, secret) is True
    assert pr_certainty.verify_hmac_signature(body, "sha256=deadbeef", ts, secret) is False
    # Expired timestamp (> 300s) rejected
    old_ts = str(int(time.time()) - 600)
    old_sig = hmac.new(secret.encode(), f"{old_ts}.".encode() + body, hashlib.sha256).hexdigest()
    assert pr_certainty.verify_hmac_signature(body, f"sha256={old_sig}", old_ts, secret) is False


def test_pr_command_endpoint_rejects_unauthenticated_and_dispatches_signed(monkeypatch):
    monkeypatch.setenv("TRIAGE_WEBHOOK_SECRET", "unit-test-secret")
    called: list[dict[str, Any]] = []

    def fake_handler(pr_number: int, comment_id: int, repo: str):
        called.append({"pr_number": pr_number, "comment_id": comment_id, "repo": repo})
        return {"status": "success", "http_status": 200, "command": "/hold"}

    monkeypatch.setattr(loupe_triage_mcp, "handle_pr_hil_command", fake_handler)

    client = TestClient(triage_service.app)
    payload_bytes = json.dumps({
        "repo": "AhsanAyaz/code-with-ahsan",
        "pr_number": 401,
        "comment_id": 777,
    }).encode()

    # Unsigned request must be rejected with 401
    r_unauth = client.post("/pr-command", content=payload_bytes, headers={"Content-Type": "application/json"})
    assert r_unauth.status_code == 401

    # Valid HMAC request succeeds
    ts = str(int(time.time()))
    sig = hmac.new(b"unit-test-secret", f"{ts}.".encode() + payload_bytes, hashlib.sha256).hexdigest()
    r_ok = client.post(
        "/pr-command",
        content=payload_bytes,
        headers={
            "Content-Type": "application/json",
            "X-CWA-Timestamp": ts,
            "X-CWA-Signature-256": f"sha256={sig}",
        },
    )
    assert r_ok.status_code == 200
    assert called == [{"pr_number": 401, "comment_id": 777, "repo": "AhsanAyaz/code-with-ahsan"}]


def test_handle_pr_hil_command_blocks_non_collaborator_and_stale_sha(monkeypatch):
    class FakeResp:
        def __init__(self, payload: Any, status_code: int = 200):
            self._payload = payload
            self.status_code = status_code

        def raise_for_status(self):
            pass

        def json(self):
            return self._payload

    # 1. Non-collaborator attempting /merge -> 403
    class NonCollabClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def get(self, url: str, headers=None):
            if "/issues/comments/888" in url:
                return FakeResp({
                    "id": 888,
                    "issue_url": "https://api.github.com/repos/AhsanAyaz/code-with-ahsan/issues/401",
                    "author_association": "NONE",
                    "user": {"login": "random-attacker"},
                    "body": "/merge",
                })
            return FakeResp({})

    monkeypatch.setattr(loupe_triage_mcp.httpx, "Client", NonCollabClient)
    res_403 = loupe_triage_mcp.handle_pr_hil_command(pr_number=401, comment_id=888)
    assert res_403["http_status"] == 403

    # 2. Maintainer /merge when live head_sha differs from scored head_sha -> 409
    meta_comment = pr_certainty.SCORECARD_MARKER + "\n" + pr_certainty.encode_certainty_meta({"head_sha": "scored_sha_111"})

    class StaleShaClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def get(self, url: str, headers=None):
            if "/issues/comments/889/reactions" in url:
                return FakeResp([])
            if "/issues/comments/889" in url:
                return FakeResp({
                    "id": 889,
                    "issue_url": "https://api.github.com/repos/AhsanAyaz/code-with-ahsan/issues/401",
                    "author_association": "OWNER",
                    "user": {"login": "AhsanAyaz"},
                    "body": "/merge",
                })
            if "/pulls/401" in url:
                return FakeResp({
                    "number": 401,
                    "node_id": "PR_node",
                    "mergeable_state": "clean",
                    "head": {"sha": "newer_unscored_sha_222"},
                })
            if "/issues/401/comments" in url:
                return FakeResp([{"id": 1, "user": {"login": "bot"}, "body": meta_comment}])
            if "/user" in url:
                return FakeResp({"login": "bot"})
            return FakeResp({})

        def post(self, url: str, headers=None, json=None):
            return FakeResp({"id": 99})

    monkeypatch.setattr(loupe_triage_mcp, "_AUTH_LOGIN_CACHE", {"login": "bot", "fetched": True})
    monkeypatch.setattr(loupe_triage_mcp.httpx, "Client", StaleShaClient)
    res_409 = loupe_triage_mcp.handle_pr_hil_command(pr_number=401, comment_id=889)
    assert res_409["http_status"] == 409


# ---------------------------------------------------------------------------
# 6. Discord #moderators Notification & Mention Sanitization Tests
# ---------------------------------------------------------------------------

def test_discord_notification_sanitizes_untrusted_mentions_and_deduplicates(monkeypatch):
    posted: list[tuple[str, dict[str, Any]]] = []

    class FakeResp:
        status_code = 200

        def raise_for_status(self):
            pass

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def post(self, url: str, headers=None, json=None):
            posted.append((url, json))
            return FakeResp()

    monkeypatch.setenv("DISCORD_BOT_TOKEN", "fake-bot-token")
    monkeypatch.setenv("DISCORD_MODERATORS_CHANNEL_ID", "1572957623970562192")
    monkeypatch.delenv("DISCORD_PR_TRIAGE_WEBHOOK_URL", raising=False)
    monkeypatch.setattr(pr_certainty.httpx, "Client", FakeClient)

    pr_ctx = _make_base_pr(
        files=[{"filename": "firestore.rules", "additions": 2, "deletions": 1, "patch": "+x"}],
    )
    pr_ctx["title"] = "Fix @everyone <@&99999> rules"
    certainty = pr_certainty.compute_pr_certainty(pr_ctx, _make_base_eval())

    res = pr_certainty.notify_discord_maintainers(pr_ctx, certainty, already_notified_key="")
    assert res["status"] == "success"
    assert len(posted) == 1
    assert "1572957623970562192/messages" in posted[0][0]
    assert posted[0][1]["content"].startswith("@here ")
    embed_title = posted[0][1]["embeds"][0]["title"]
    assert "@everyone" not in embed_title
    assert "<@&99999>" not in embed_title

    # Duplicate call with same notified_key is skipped
    res_dup = pr_certainty.notify_discord_maintainers(pr_ctx, certainty, already_notified_key=res["notified_key"])
    assert res_dup["status"] == "skipped"
    assert len(posted) == 1
