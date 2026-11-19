"""
pr_certainty.py — 5-Pillar PR Certainty & Graduated Autonomy Framework.

Placed directly in `agent/` (not in a subdirectory) so `uv run adk web` only sees
`community_assistant` as a selectable ADK agent package.

Combines:
  1. Deterministic Verification (CI check runs) — 30 pts
  2. Blast Radius & Risk Surface (fail-closed path tiers + diff size) — 25 pts
  3. Gemini Semantic Evaluation (ai_confidence + findings) — 25 pts
  4. Contributor & Collaborator Trust (association + merged PR history) — 10 pts
  5. Spec & Guardrail Hygiene (linked issue + secret/PII scan + advisory) — 10 pts

Plus 3-bucket Zero-Tolerance Hard Vetoes, Risk-Stratified Dynamic Lane A thresholds,
GitHub Native Squash Auto-Merge (with SHA-pinned REST fallback), HMAC-SHA256 webhook
verification, and Discord #moderators HITL alerts.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import re
import time
from fnmatch import fnmatch
from typing import Any

import httpx

logger = logging.getLogger("pr_certainty")

# ---------------------------------------------------------------------------
# Constants & Risk-Stratified Configuration
# ---------------------------------------------------------------------------

SCORECARD_MARKER = "<!-- cwa-pr-certainty-scorecard -->"
META_PREFIX = "<!-- pr-certainty-meta:"
META_SUFFIX = "-->"
PLACEHOLDER_PATCH_MARKER = "<!-- loupe-placeholder-patch -->"
REQUIRED_CI_CHECK_NAME = "PR Verify"
REQUIRED_CI_APP_SLUG = "github-actions"

MAX_HISTORY_ENTRIES = 10
DEFAULT_MODERATORS_CHANNEL_ID = "1572957623970562192"

MANAGED_CERTAINTY_LABELS = frozenset({
    "certainty:high",
    "certainty:medium",
    "certainty:low",
    "shadow-automerge",
    "needs-human-review",
    "changes-requested-by-ai",
    "auto-merged-by-ai",
})

# Dynamic Lane A thresholds per worst-file risk tier
LANE_A_THRESHOLDS: dict[str, int] = {
    "tier_0_docs": 75,
    "tier_1_ui": 85,
    "tier_2_backend": 92,
    "tier_3_critical": 101,  # Unreachable; Tier 3 also triggers HIGH_RISK_PATH veto
}

# Explicit Tier 3 critical patterns (checked BEFORE lower tiers; unmatched paths also default here)
_TIER_3_PATTERNS: tuple[str, ...] = (
    "firestore.rules",
    "storage.rules",
    "src/middleware.ts",
    "src/middleware.js",
    "src/proxy.ts",
    "src/proxy.js",
    "src/app/api/admin/*",
    "src/app/api/admin/**",
    "src/app/api/webhooks/*",
    "src/app/api/webhooks/**",
    "src/app/api/consulting/*",
    "src/app/api/consulting/**",
    "public/*.js",
    "public/**/*.js",
    "public/*.mjs",
    "public/**/*.mjs",
    "public/*.html",
    "public/**/*.html",
    "public/*.htm",
    "public/**/*.htm",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "next.config.*",
    "firebase.json",
    ".firebaserc",
    "tsconfig.json",
    "eslint.config.*",
    "vitest.config.*",
    "tailwind.config.*",
    "postcss.config.*",
    ".github/*",
    ".github/**",
    ".husky/*",
    ".husky/**",
    "agent/*",
    "agent/**",
    "functions/*",
    "functions/**",
    "Dockerfile*",
    "**/Dockerfile*",
    ".env*",
    "**/.env*",
    "cors.json",
    "firestore.indexes.json",
)

# Tier 0: Strictly non-executable plain Markdown documentation
_TIER_0_PATTERNS: tuple[str, ...] = (
    "docs/*.md",
    "docs/**/*.md",
    "README.md",
    "CONTRIBUTING.md",
    "RELEASE_NOTES*.md",
)

# Tier 1: Frontend UI, colocated App Router components/pages/constants, styles, hooks, utilities, tests, MDX, images
_TIER_1_PATTERNS: tuple[str, ...] = (
    "src/components/*",
    "src/components/**",
    "src/app/**/components/*",
    "src/app/**/components/**",
    "src/app/**/constants.ts",
    "src/app/**/constants.tsx",
    "src/app/**/page.tsx",
    "src/app/**/page.ts",
    "src/app/page.tsx",
    "src/app/**/loading.tsx",
    "src/app/**/not-found.tsx",
    "src/app/**/error.tsx",
    "src/app/**/*.tsx",
    "src/app/**/*.css",
    "src/app/globals.css",
    "src/css/*",
    "src/css/**",
    "src/hooks/*",
    "src/hooks/**",
    "src/utils/*",
    "src/utils/**",
    "src/__tests__/*",
    "src/__tests__/**",
    "src/content/*",
    "src/content/**",
    "src/data/*",
    "src/data/**",
    "public/*.png",
    "public/**/*.png",
    "public/*.jpg",
    "public/**/*.jpg",
    "public/*.jpeg",
    "public/**/*.jpeg",
    "public/*.webp",
    "public/**/*.webp",
    "public/*.svg",
    "public/**/*.svg",
    "public/*.ico",
    "public/**/*.ico",
)

# Tier 2 overrides inside src/app/ that must be checked BEFORE Tier 1 `src/app/**/*.tsx`
_TIER_2_APP_OVERRIDES: tuple[str, ...] = (
    "src/app/api/*",
    "src/app/api/**",
    "src/app/**/layout.tsx",
    "src/app/layout.tsx",
)

# Tier 2: Backend services, libs, types, contexts, layouts, non-admin API routes, scripts
_TIER_2_PATTERNS: tuple[str, ...] = (
    "src/services/*",
    "src/services/**",
    "src/lib/*",
    "src/lib/**",
    "src/types/*",
    "src/types/**",
    "src/contexts/*",
    "src/contexts/**",
    "src/layouts/*",
    "src/layouts/**",
    "src/classes/*",
    "src/classes/**",
    "src/app/api/*",
    "src/app/api/**",
    "src/app/**/layout.tsx",
    "src/app/layout.tsx",
    "scripts/*",
    "scripts/**",
)

_TIER_RANK: dict[str, int] = {
    "tier_0_docs": 0,
    "tier_1_ui": 1,
    "tier_2_backend": 2,
    "tier_3_critical": 3,
}

_TIER_BASE_POINTS: dict[str, int] = {
    "tier_0_docs": 25,
    "tier_1_ui": 20,
    "tier_2_backend": 12,
    "tier_3_critical": 0,
}

# Hard Veto Buckets
WAIT_VETO_CODES = frozenset({
    "CI_PENDING",
    "DRAFT_PR",
    "MERGEABILITY_UNKNOWN",
})

AUTHOR_ACTIONABLE_VETO_CODES = frozenset({
    "CI_FAILED",
    "MERGE_CONFLICT",
    "NEEDS_CHANGES",
    "DOES_NOT_ADDRESS_ISSUE",
    "HIGH_SEVERITY_FINDING",
    "PLACEHOLDER_PATCH",
    "PII_OR_SECRET_DETECTED",
})

HUMAN_REQUIRED_VETO_CODES = frozenset({
    "HIGH_RISK_PATH",
    "HOLD_LABEL",
    "FIRST_TIME_CONTRIBUTOR",
    "AI_FALLBACK",
    "LARGE_PR_UNSCANNED",
    "NON_MAIN_BASE",
})

# Secret detection regexes for added diff lines
_SECRET_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("GITHUB_TOKEN", re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b")),
    ("GOOGLE_API_KEY", re.compile(r"\bAIza[0-9A-Za-z\-_]{30,}\b")),
    ("STRIPE_LIVE_KEY", re.compile(r"\b(?:sk|rk)_live_[0-9A-Za-z]{20,}\b")),
    ("PRIVATE_KEY_BLOCK", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("AWS_ACCESS_KEY", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
)


# ---------------------------------------------------------------------------
# Pillar 2: Fail-Closed Path Risk Classifier
# ---------------------------------------------------------------------------

def _matches_any(path: str, patterns: tuple[str, ...]) -> bool:
    norm = path.strip().lstrip("/")
    if not norm:
        return False
    for pat in patterns:
        if fnmatch(norm, pat):
            return True
    return False


def _classify_single_path(path: str) -> tuple[str, int]:
    """Fail-closed classifier for a single repo-relative path."""
    norm = path.strip().lstrip("/")
    if not norm:
        return "tier_3_critical", 0
    # Check Tier 3 FIRST so critical overrides always win (e.g. src/app/api/admin/** before src/app/api/**)
    if _matches_any(norm, _TIER_3_PATTERNS):
        return "tier_3_critical", _TIER_BASE_POINTS["tier_3_critical"]
    if _matches_any(norm, _TIER_0_PATTERNS):
        return "tier_0_docs", _TIER_BASE_POINTS["tier_0_docs"]
    if _matches_any(norm, _TIER_2_APP_OVERRIDES):
        return "tier_2_backend", _TIER_BASE_POINTS["tier_2_backend"]
    if _matches_any(norm, _TIER_1_PATTERNS):
        return "tier_1_ui", _TIER_BASE_POINTS["tier_1_ui"]
    if _matches_any(norm, _TIER_2_PATTERNS):
        return "tier_2_backend", _TIER_BASE_POINTS["tier_2_backend"]
    # Fail-closed: any unrecognized file defaults to Tier 3 Critical
    return "tier_3_critical", _TIER_BASE_POINTS["tier_3_critical"]


def classify_path_risk(filename: str, previous_filename: str = "") -> tuple[str, int]:
    """Classify a changed file (and its previous name on rename) fail-closed.

    Returns the highest-risk (tier_name, base_points) between `filename` and `previous_filename`.
    """
    tier_curr, pts_curr = _classify_single_path(filename)
    if previous_filename:
        tier_prev, pts_prev = _classify_single_path(previous_filename)
        if _TIER_RANK[tier_prev] > _TIER_RANK[tier_curr]:
            return tier_prev, pts_prev
    return tier_curr, pts_curr


def detect_secrets_in_patch(patch: str) -> list[str]:
    """Scan added lines (`+...`) of a unified diff for hardcoded secret patterns."""
    if not patch:
        return []
    hits: list[str] = []
    for line in patch.splitlines():
        if not line.startswith("+") or line.startswith("+++"):
            continue
        for name, pattern in _SECRET_PATTERNS:
            if pattern.search(line) and name not in hits:
                hits.append(name)
    return hits


# ---------------------------------------------------------------------------
# Pillar 4: Contributor & Collaborator Trust Curve
# ---------------------------------------------------------------------------

def compute_contributor_trust(
    contributor_type: str,
    author_association: str,
    merged_pr_count: int,
) -> tuple[int, str]:
    """Compute Pillar 4 Contributor Trust (0-10 pts) and a human-readable tier label."""
    assoc = str(author_association or "NONE").upper().strip()
    if assoc in {"OWNER", "MEMBER", "COLLABORATOR"} or contributor_type == "maintainer":
        return 10, "Collaborator / Maintainer"
    count = max(0, int(merged_pr_count or 0))
    if count >= 5:
        return 8, f"Veteran Contributor ({count} merged PRs)"
    if count >= 2:
        return 6, f"Returning Contributor ({count} merged PRs)"
    if count == 1:
        return 4, "Proven Contributor (1 merged PR)"
    return 1, "First-Time Contributor (0 merged PRs)"


# ---------------------------------------------------------------------------
# Metadata Comment Helpers (Safe JSON Embedding & Extraction)
# ---------------------------------------------------------------------------

def _sanitize_meta_value(val: Any) -> Any:
    """Recursively ensure no embedded string contains `--` (which breaks HTML comments)."""
    if isinstance(val, str):
        return val.replace("--", "- -")
    if isinstance(val, list):
        return [_sanitize_meta_value(v) for v in val]
    if isinstance(val, dict):
        return {str(k).replace("--", "- -"): _sanitize_meta_value(v) for k, v in val.items()}
    return val


def encode_certainty_meta(meta: dict[str, Any]) -> str:
    """Serialize metadata dict into a safe HTML comment block."""
    safe = _sanitize_meta_value(meta)
    payload = json.dumps(safe, separators=(",", ":"), sort_keys=True)
    return f"{META_PREFIX} {payload} {META_SUFFIX}"


def extract_certainty_meta(comment_body: str) -> dict[str, Any] | None:
    """Extract and parse `<!-- pr-certainty-meta: {...} -->` from a bot comment body."""
    if not comment_body or META_PREFIX not in comment_body:
        return None
    start = comment_body.find(META_PREFIX)
    if start == -1:
        return None
    json_start = start + len(META_PREFIX)
    end = comment_body.find(META_SUFFIX, json_start)
    if end == -1:
        return None
    raw = comment_body[json_start:end].strip()
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Core 5-Pillar Certainty Engine
# ---------------------------------------------------------------------------

def get_auto_merge_mode() -> str:
    """Return 'live' or 'shadow' (defaults strictly to 'shadow')."""
    raw = str(os.environ.get("AUTO_MERGE_MODE", "shadow")).strip().lower()
    return "live" if raw == "live" else "shadow"


def compute_pr_certainty(
    pr_context: dict[str, Any],
    evaluation: dict[str, Any],
    ci_status: dict[str, Any] | None = None,
    auto_merge_mode: str | None = None,
    prior_meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compute the 5-Pillar PR Certainty Score (0-100), Hard Vetoes, and Autonomy Lane."""
    mode = auto_merge_mode if auto_merge_mode in {"shadow", "live"} else get_auto_merge_mode()
    ci = ci_status or pr_context.get("ci_status") or {"state": "pending", "checks": []}
    ci_state = str(ci.get("state") or "pending").lower()

    vetoes: list[dict[str, str]] = []

    def _add_veto(code: str, reason: str) -> None:
        if not any(v["code"] == code for v in vetoes):
            bucket = (
                "wait"
                if code in WAIT_VETO_CODES
                else ("author_actionable" if code in AUTHOR_ACTIONABLE_VETO_CODES else "human_required")
            )
            vetoes.append({"code": code, "bucket": bucket, "reason": reason})

    # --- Context Checks ---
    is_draft = bool(pr_context.get("draft", False))
    base_ref = str(pr_context.get("base_ref") or "main")
    mergeable_state = str(pr_context.get("mergeable_state") or "clean").lower()
    labels = {str(lbl).lower() for lbl in (pr_context.get("labels") or [])}
    pr_body = str(pr_context.get("body") or "")

    if is_draft:
        _add_veto("DRAFT_PR", "Pull request is still a draft.")
    if base_ref != "main":
        _add_veto("NON_MAIN_BASE", f"Target branch is `{base_ref}` rather than `main`.")
    if mergeable_state == "dirty":
        _add_veto("MERGE_CONFLICT", "PR has merge conflicts with `main`.")
    elif mergeable_state == "unknown":
        _add_veto("MERGEABILITY_UNKNOWN", "GitHub is still computing mergeability for this commit.")
    if "do-not-automerge" in labels:
        _add_veto("HOLD_LABEL", "Maintainer hold label (`do-not-automerge`) is active.")
    if PLACEHOLDER_PATCH_MARKER in pr_body:
        _add_veto("PLACEHOLDER_PATCH", "Loupe Draft PR contains only a placeholder fallback annotation.")

    # --- Pillar 1: Deterministic Verification (0-30 pts) ---
    if ci_state == "passed":
        p1_score = 30
        p1_note = f"`{REQUIRED_CI_CHECK_NAME}` passed with zero failed checks."
    elif ci_state == "failed":
        p1_score = 0
        p1_note = "One or more CI checks failed."
        _add_veto("CI_FAILED", "Deterministic CI checks failed for this commit.")
    else:
        p1_score = 0
        p1_note = f"Awaiting `{REQUIRED_CI_CHECK_NAME}` check completion."
        _add_veto("CI_PENDING", f"`{REQUIRED_CI_CHECK_NAME}` has not completed yet.")

    # --- Pillar 2: Blast Radius & Risk Surface (0-25 pts) ---
    changed_files = pr_context.get("changed_files") or []
    changed_files_total = int(pr_context.get("changed_files_total") or len(changed_files))
    files_truncated = bool(pr_context.get("files_truncated", False)) or (
        changed_files_total > 100 or len(changed_files) < changed_files_total
    )

    if files_truncated:
        _add_veto(
            "LARGE_PR_UNSCANNED",
            f"PR modifies {changed_files_total} files (>100 limit or truncated); full path audit requires human review.",
        )

    worst_tier = "tier_0_docs" if changed_files else "tier_3_critical"
    worst_rank = _TIER_RANK[worst_tier]
    tier3_files: list[str] = []
    total_lines = 0

    for cf in changed_files:
        fname = str(cf.get("filename") or "")
        prev_fname = str(cf.get("previous_filename") or "")
        total_lines += int(cf.get("additions") or 0) + int(cf.get("deletions") or 0)
        tier, _ = classify_path_risk(fname, prev_fname)
        rank = _TIER_RANK[tier]
        if rank > worst_rank:
            worst_rank = rank
            worst_tier = tier
        if tier == "tier_3_critical":
            tier3_files.append(fname)

    if worst_tier == "tier_3_critical":
        sample = ", ".join(f"`{f}`" for f in tier3_files[:3]) if tier3_files else "unrecognized/empty file set"
        _add_veto("HIGH_RISK_PATH", f"Touches Tier 3 critical or unrecognized path(s): {sample}.")

    base_blast_pts = _TIER_BASE_POINTS[worst_tier]
    file_count = max(len(changed_files), changed_files_total)
    if file_count > 15 or total_lines > 400:
        diff_modifier = -10
    elif file_count > 5 or total_lines > 150:
        diff_modifier = -5
    else:
        diff_modifier = 0

    p2_score = max(0, min(25, base_blast_pts + diff_modifier))
    p2_note = f"Worst tier: `{worst_tier}` ({base_blast_pts} base, {diff_modifier:+d} size mod across {file_count} files / {total_lines} lines)."

    # --- Pillar 3: Gemini Semantic Evaluation (0-25 pts) ---
    verdict = str(evaluation.get("verdict") or "needs_changes").lower().strip()
    fallback_used = bool(evaluation.get("fallback_used", False))
    findings = evaluation.get("findings") or []

    high_count = sum(1 for f in findings if str(f.get("severity") or "").lower() == "high")
    med_count = sum(1 for f in findings if str(f.get("severity") or "").lower() == "medium")
    low_count = sum(1 for f in findings if str(f.get("severity") or "").lower() == "low")

    raw_conf = evaluation.get("ai_confidence")
    if raw_conf is None:
        ai_confidence = 85 if (verdict == "looks_good" and not fallback_used) else 35
    else:
        try:
            ai_confidence = max(0, min(100, int(raw_conf)))
        except (TypeError, ValueError):
            ai_confidence = 50

    if fallback_used:
        p3_score = 0
        p3_note = "Heuristic fallback used (Gemini unavailable)."
        _add_veto("AI_FALLBACK", "Gemini evaluation fell back to heuristics; human review required.")
    elif verdict == "looks_good":
        p3_score = max(0, min(25, round(ai_confidence * 0.25) - (5 * med_count) - (2 * low_count)))
        p3_note = f"Verdict `looks_good`, confidence {ai_confidence}%, findings: {high_count}H/{med_count}M/{low_count}L."
    else:
        p3_score = 0
        p3_note = f"Verdict `{verdict}` (findings: {high_count}H/{med_count}M/{low_count}L)."
        if verdict == "does_not_address_issue":
            _add_veto("DOES_NOT_ADDRESS_ISSUE", "PR diff does not address the linked target issue.")
        else:
            _add_veto("NEEDS_CHANGES", "Gemini review requested changes before merge.")

    if high_count > 0:
        _add_veto("HIGH_SEVERITY_FINDING", f"Gemini flagged {high_count} high-severity code finding(s).")

    # --- Pillar 4: Contributor & Collaborator Trust (0-10 pts) ---
    contributor_type = str(pr_context.get("contributor_type") or "new_contributor")
    author_association = str(pr_context.get("author_association") or "NONE")
    merged_pr_count = int(pr_context.get("merged_pr_count") or 0)
    p4_score, p4_label = compute_contributor_trust(contributor_type, author_association, merged_pr_count)

    is_first_timer = (
        author_association.upper() not in {"OWNER", "MEMBER", "COLLABORATOR"}
        and contributor_type != "maintainer"
        and merged_pr_count == 0
    )
    if is_first_timer:
        _add_veto(
            "FIRST_TIME_CONTRIBUTOR",
            "First-time contributor (0 merged PRs) requires human review across all tiers.",
        )

    # --- Pillar 5: Spec & Guardrail Hygiene (0-10 pts) ---
    target_issues = pr_context.get("target_issues") or []
    addresses_issue = evaluation.get("addresses_target_issue")
    issue_pts = 4 if (target_issues and addresses_issue is True) else 0

    secret_hits = list(pr_context.get("secret_hits") or [])
    if not secret_hits:
        for cf in changed_files:
            for hit in detect_secrets_in_patch(str(cf.get("patch") or "")):
                if hit not in secret_hits:
                    secret_hits.append(hit)
    secret_pts = 0 if secret_hits else 3
    if secret_hits:
        _add_veto("PII_OR_SECRET_DETECTED", f"Potential secret/credential pattern in diff: {', '.join(secret_hits)}.")

    fs_warning = bool(pr_context.get("firestore_index_warning", False)) and ci_state != "passed"
    fs_pts = 0 if fs_warning else 3
    p5_score = max(0, min(10, issue_pts + secret_pts + fs_pts))
    p5_note = f"Issue link +{issue_pts}/4, Secrets +{secret_pts}/3, Firestore advisory +{fs_pts}/3."

    # --- Total Score & Dynamic Lane Routing ---
    certainty_score = max(0, min(100, p1_score + p2_score + p3_score + p4_score + p5_score))
    lane_a_threshold = LANE_A_THRESHOLDS.get(worst_tier, 92)

    buckets = {v["bucket"] for v in vetoes}
    if "author_actionable" in buckets:
        autonomy_lane = "lane_d_feedback_loop"
    elif "wait" in buckets and "human_required" not in buckets:
        autonomy_lane = "lane_pending_ci"
    elif "human_required" in buckets:
        autonomy_lane = "lane_c_human_review"
    elif not vetoes and certainty_score >= lane_a_threshold:
        autonomy_lane = "lane_a_automerge"
    elif not vetoes and certainty_score >= 65:
        autonomy_lane = "lane_b_fast_track_hitl"
    elif certainty_score >= 40:
        autonomy_lane = "lane_c_human_review"
    else:
        autonomy_lane = "lane_d_feedback_loop"

    shadow_would_automerge = autonomy_lane == "lane_a_automerge"

    # Managed labels (mutually exclusive set synced on every run)
    managed_labels: list[str] = []
    if certainty_score >= 80:
        managed_labels.append("certainty:high")
    elif certainty_score >= 55:
        managed_labels.append("certainty:medium")
    else:
        managed_labels.append("certainty:low")

    if autonomy_lane == "lane_a_automerge":
        managed_labels.append("shadow-automerge" if mode == "shadow" else "auto-merged-by-ai")
    elif autonomy_lane == "lane_c_human_review":
        managed_labels.append("needs-human-review")
    elif autonomy_lane == "lane_d_feedback_loop":
        managed_labels.append("changes-requested-by-ai")

    # Build immutable calibration metadata (preserving first_green_ci_prediction & append-only history)
    head_sha = str(pr_context.get("head_sha") or "")
    now_ts = int(time.time())
    snapshot = {
        "sha": head_sha[:12],
        "head_sha": head_sha,
        "ts": now_ts,
        "score": certainty_score,
        "tier": worst_tier,
        "threshold": lane_a_threshold,
        "lane": autonomy_lane,
        "ci": ci_state,
        "verdict": verdict,
        "ai_confidence": ai_confidence,
        "shadow_would_automerge": shadow_would_automerge,
        "vetoes": [v["code"] for v in vetoes],
        "contributor_trust": p4_score,
    }

    prior = prior_meta if isinstance(prior_meta, dict) else {}
    first_green = prior.get("first_green_ci_prediction")
    if first_green is None and ci_state == "passed":
        first_green = dict(snapshot)

    history = list(prior.get("history") or [])
    if head_sha:
        history = [h for h in history if isinstance(h, dict) and h.get("head_sha") != head_sha]
    history.append(snapshot)
    history = history[-MAX_HISTORY_ENTRIES:]

    telemetry_meta: dict[str, Any] = {
        "v": 2,
        "mode": mode,
        "head_sha": head_sha,
        "score": certainty_score,
        "tier": worst_tier,
        "threshold": lane_a_threshold,
        "lane": autonomy_lane,
        "ci": ci_state,
        "verdict": verdict,
        "ai_confidence": ai_confidence,
        "fallback_used": fallback_used,
        "shadow_would_automerge": shadow_would_automerge,
        "vetoes": [v["code"] for v in vetoes],
        "contributor_trust": p4_score,
        "first_green_ci_prediction": first_green,
        "last_notified_key": prior.get("last_notified_key", ""),
        "cached_eval": {
            "head_sha": head_sha,
            "verdict": verdict,
            "ai_confidence": ai_confidence,
            "fallback_used": fallback_used,
            "addresses_target_issue": evaluation.get("addresses_target_issue"),
            "findings_count": len(findings),
            "high_count": high_count,
            "med_count": med_count,
            "low_count": low_count,
        },
        "history": history,
    }

    return {
        "certainty_score": certainty_score,
        "risk_tier": worst_tier,
        "lane_a_threshold": lane_a_threshold,
        "autonomy_lane": autonomy_lane,
        "auto_merge_mode": mode,
        "shadow_would_automerge": shadow_would_automerge,
        "hard_vetoes": vetoes,
        "managed_labels": managed_labels,
        "pillars": {
            "ci": {"score": p1_score, "max": 30, "note": p1_note},
            "blast_radius": {"score": p2_score, "max": 25, "note": p2_note},
            "semantic_ai": {"score": p3_score, "max": 25, "note": p3_note},
            "contributor_trust": {"score": p4_score, "max": 10, "note": p4_label},
            "hygiene": {"score": p5_score, "max": 10, "note": p5_note},
        },
        "telemetry_meta": telemetry_meta,
    }


# ---------------------------------------------------------------------------
# GitHub Native Squash Auto-Merge (GraphQL + SHA-Pinned REST Fallback)
# ---------------------------------------------------------------------------

def _gh_headers(token: str | None = None) -> dict[str, str]:
    tok = token or os.environ.get("GITHUB_TOKEN", "")
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "cwa-loupe-triage-agent",
    }
    if tok:
        headers["Authorization"] = f"Bearer {tok}"
    return headers


def enable_github_automerge(
    repo: str,
    pr_number: int,
    pull_request_node_id: str,
    head_sha: str,
    merge_method: str = "SQUASH",
    token: str | None = None,
) -> dict[str, Any]:
    """Enable GitHub Native Auto-Merge pinned to `head_sha`.

    If GitHub rejects `enablePullRequestAutoMerge` because the PR is already in
    clean status (all required checks passed), falls back to REST `PUT /pulls/{n}/merge`
    pinned to exact `sha == head_sha`.
    """
    headers = _gh_headers(token)
    mutation = """
    mutation EnableAutoMerge($prId: ID!, $expectedHeadOid: GitObjectID!, $mergeMethod: PullRequestMergeMethod!) {
      enablePullRequestAutoMerge(input: {
        pullRequestId: $prId,
        expectedHeadOid: $expectedHeadOid,
        mergeMethod: $mergeMethod
      }) {
        pullRequest {
          number
          autoMergeRequest { enabledAt mergeMethod }
        }
      }
    }
    """
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            if pull_request_node_id:
                gql_resp = client.post(
                    "https://api.github.com/graphql",
                    headers=headers,
                    json={
                        "query": mutation,
                        "variables": {
                            "prId": pull_request_node_id,
                            "expectedHeadOid": head_sha,
                            "mergeMethod": merge_method.upper(),
                        },
                    },
                )
                gql_resp.raise_for_status()
                gql_data = gql_resp.json()
                errors = gql_data.get("errors") or []
                if not errors:
                    return {
                        "status": "success",
                        "action": "auto_merge_enabled",
                        "pr_number": pr_number,
                        "head_sha": head_sha,
                        "merge_method": merge_method.upper(),
                    }
                err_msg = "; ".join(str(e.get("message") or e) for e in errors)
                if "clean status" not in err_msg.lower() and "already mergeable" not in err_msg.lower():
                    return {
                        "status": "error",
                        "action": "auto_merge_failed",
                        "error": err_msg,
                        "pr_number": pr_number,
                        "head_sha": head_sha,
                    }

            # Fallback: PR is already clean/mergeable -> SHA-pinned REST squash merge
            merge_url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}/merge"
            rest_resp = client.put(
                merge_url,
                headers=headers,
                json={
                    "sha": head_sha,
                    "merge_method": merge_method.lower(),
                },
            )
            rest_resp.raise_for_status()
            rest_data = rest_resp.json()
            return {
                "status": "success",
                "action": "merged_directly",
                "pr_number": pr_number,
                "head_sha": head_sha,
                "merge_sha": rest_data.get("sha", ""),
                "merge_method": merge_method.upper(),
            }
    except Exception as exc:
        logger.warning("enable_github_automerge failed for PR #%s: %s", pr_number, exc)
        return {
            "status": "error",
            "action": "auto_merge_error",
            "error": str(exc),
            "pr_number": pr_number,
            "head_sha": head_sha,
        }


def disable_github_automerge(
    pull_request_node_id: str,
    token: str | None = None,
) -> dict[str, Any]:
    """Disable GitHub Native Auto-Merge via GraphQL (used by `/hold`)."""
    if not pull_request_node_id:
        return {"status": "skipped", "reason": "Missing pull_request_node_id"}
    headers = _gh_headers(token)
    mutation = """
    mutation DisableAutoMerge($prId: ID!) {
      disablePullRequestAutoMerge(input: { pullRequestId: $prId }) {
        pullRequest { number }
      }
    }
    """
    try:
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            resp = client.post(
                "https://api.github.com/graphql",
                headers=headers,
                json={"query": mutation, "variables": {"prId": pull_request_node_id}},
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("errors"):
                return {"status": "skipped", "reason": str(data["errors"][0].get("message", ""))}
            return {"status": "success", "action": "auto_merge_disabled"}
    except Exception as exc:
        logger.warning("disable_github_automerge failed: %s", exc)
        return {"status": "error", "error": str(exc)}


# ---------------------------------------------------------------------------
# HMAC-SHA256 Verification for Zero-Trust `/pr-command`
# ---------------------------------------------------------------------------

def verify_hmac_signature(
    raw_body: bytes,
    signature_header: str,
    timestamp_header: str,
    secret: str,
    max_age_seconds: int = 300,
) -> bool:
    """Verify `X-CWA-Signature-256: sha256=<hex>` over `<timestamp>.<raw_body>`."""
    if not secret or not signature_header or not timestamp_header:
        return False
    try:
        ts = int(timestamp_header.strip())
    except (TypeError, ValueError):
        return False
    if abs(int(time.time()) - ts) > max_age_seconds:
        return False

    sig = signature_header.strip()
    if sig.startswith("sha256="):
        sig = sig[len("sha256="):]

    signed_payload = f"{ts}.".encode("utf-8") + raw_body
    expected = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig.lower(), expected.lower())


# ---------------------------------------------------------------------------
# Discord #moderators HITL Notification (Safe `@here` + Mention Sanitization)
# ---------------------------------------------------------------------------

_UNTRUSTED_MENTION_RE = re.compile(r"@(?:everyone|here)|<@[!&]?\d+>", re.IGNORECASE)


def _sanitize_discord_text(text: str, max_len: int = 240) -> str:
    """Strip any untrusted @everyone/@here/user/role mentions and truncate."""
    if not text:
        return ""
    cleaned = _UNTRUSTED_MENTION_RE.sub("[mention-removed]", str(text))
    return cleaned[:max_len]


def notify_discord_maintainers(
    pr_context: dict[str, Any],
    certainty: dict[str, Any],
    already_notified_key: str = "",
) -> dict[str, Any]:
    """Send a deduplicated HITL notification to the Discord #moderators channel.

    Uses `@here` ONLY in the controlled top-level prefix while sanitizing all
    untrusted PR fields against mention injection.
    """
    lane = str(certainty.get("autonomy_lane") or "")
    ci_state = str((pr_context.get("ci_status") or {}).get("state") or "pending").lower()
    head_sha = str(pr_context.get("head_sha") or "")

    # Only ping maintainers on terminal CI state for Lane B (Fast-Track) or Lane C (Human Review)
    if ci_state not in {"passed", "failed"}:
        return {"status": "skipped", "reason": "ci_not_terminal"}
    if lane not in {"lane_b_fast_track_hitl", "lane_c_human_review"}:
        return {"status": "skipped", "reason": f"lane_{lane}_no_ping"}

    notify_key = f"{head_sha}:{lane}"
    if head_sha and already_notified_key == notify_key:
        return {"status": "skipped", "reason": "already_notified", "notified_key": notify_key}

    bot_token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    channel_id = (
        os.environ.get("DISCORD_PR_TRIAGE_CHANNEL_ID", "").strip()
        or os.environ.get("DISCORD_MODERATORS_CHANNEL_ID", "").strip()
        or DEFAULT_MODERATORS_CHANNEL_ID
    )
    webhook_url = os.environ.get("DISCORD_PR_TRIAGE_WEBHOOK_URL", "").strip()

    if not webhook_url and not (bot_token and channel_id):
        webhook_url = os.environ.get("DISCORD_WEBHOOK", "").strip()

    if not webhook_url and not (bot_token and channel_id):
        return {"status": "skipped", "reason": "discord_not_configured"}

    pr_number = pr_context.get("pr_number")
    pr_url = str(pr_context.get("html_url") or "")
    safe_title = _sanitize_discord_text(str(pr_context.get("title") or f"PR #{pr_number}"), 180)
    safe_author = _sanitize_discord_text(str(pr_context.get("author_login") or "unknown"), 60)
    score = certainty.get("certainty_score", 0)
    tier = certainty.get("risk_tier", "unknown")
    veto_codes = [v["code"] for v in (certainty.get("hard_vetoes") or [])]

    if lane == "lane_b_fast_track_hitl":
        lane_title = "⚡ Fast-Track HITL PR Ready"
        color = 0xF59E0B  # amber
        action_hint = "Reply `/merge` on GitHub to approve & squash-merge, or `/hold` to block."
    else:
        lane_title = "🛡️ PR Needs Deep Human Review"
        color = 0xEF4444  # red
        action_hint = "Inspect the flagged risk surface / vetoes on GitHub before merging."

    veto_line = ", ".join(f"`{v}`" for v in veto_codes) if veto_codes else "None"
    payload = {
        "content": f"@here **{lane_title}** — PR #{pr_number} scored **{score}/100** (`{tier}`)",
        "allowed_mentions": {"parse": ["everyone"]},
        "embeds": [
            {
                "title": f"PR #{pr_number}: {safe_title}",
                "url": pr_url,
                "color": color,
                "fields": [
                    {"name": "Author", "value": f"`@{safe_author}`", "inline": True},
                    {"name": "Certainty Score", "value": f"**{score}/100**", "inline": True},
                    {"name": "Risk Tier", "value": f"`{tier}`", "inline": True},
                    {"name": "Hard Vetoes", "value": veto_line, "inline": False},
                    {"name": "Next Step", "value": action_hint, "inline": False},
                ],
            }
        ],
    }

    try:
        with httpx.Client(timeout=5.0, follow_redirects=True) as client:
            if bot_token and channel_id and not os.environ.get("DISCORD_PR_TRIAGE_WEBHOOK_URL"):
                resp = client.post(
                    f"https://discord.com/api/v10/channels/{channel_id}/messages",
                    headers={
                        "Authorization": f"Bot {bot_token}",
                        "Content-Type": "application/json",
                        "User-Agent": "cwa-loupe-triage-agent",
                    },
                    json=payload,
                )
            else:
                resp = client.post(webhook_url, json=payload)
            resp.raise_for_status()
        return {"status": "success", "notified_key": notify_key}
    except Exception as exc:
        logger.warning("Discord maintainer notification failed (non-fatal): %s", exc)
        return {"status": "error", "error": str(exc)}
