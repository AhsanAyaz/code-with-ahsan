#!/usr/bin/env python3
"""
pr_certainty_report.py — Shadow Mode Calibration & Keynote Telemetry Report.

Usage:
  agent/.venv/bin/python scripts/pr_certainty_report.py --repo AhsanAyaz/code-with-ahsan --limit 50

Scans recent PRs, parses bot-authored `<!-- pr-certainty-meta: {...} -->` blocks
(using immutable `first_green_ci_prediction` to prevent hindsight bias), checks
human review outcomes and 7-day post-merge `Revert` commits on `main`, and prints
a Markdown calibration report ready for Live-Mode promotion and keynote slides.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import dotenv
import httpx

_REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_REPO_ROOT / "agent"))
dotenv.load_dotenv(_REPO_ROOT / ".env.local", override=False)

import pr_certainty  # noqa: E402

MINUTES_SAVED_LANE_A = 15
MINUTES_SAVED_LANE_B = 8
REVERT_PR_RE = re.compile(r"revert.*#(\d+)", re.IGNORECASE)


def _headers() -> dict[str, str]:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    h = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "cwa-pr-certainty-report",
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def _collect_reverted_prs(client: httpx.Client, repo: str, headers: dict[str, str]) -> dict[int, datetime]:
    """Scan recent `main` commits for `Revert "... (#N)"` messages."""
    reverted: dict[int, datetime] = {}
    try:
        resp = client.get(
            f"https://api.github.com/repos/{repo}/commits?sha=main&per_page=100",
            headers=headers,
        )
        if resp.status_code != 200 or not isinstance(resp.json(), list):
            return reverted
        for commit in resp.json():
            msg = str((commit.get("commit") or {}).get("message") or "")
            date_str = ((commit.get("commit") or {}).get("committer") or {}).get("date")
            dt = _parse_iso(date_str)
            if not dt:
                continue
            for match in REVERT_PR_RE.finditer(msg):
                pr_num = int(match.group(1))
                if pr_num not in reverted:
                    reverted[pr_num] = dt
    except Exception:
        pass
    return reverted


def generate_report(repo: str, limit: int = 50) -> str:
    headers = _headers()
    with httpx.Client(timeout=25.0, follow_redirects=True) as client:
        bot_login = ""
        try:
            u_resp = client.get("https://api.github.com/user", headers=headers)
            if u_resp.status_code == 200:
                bot_login = str(u_resp.json().get("login") or "")
        except Exception:
            pass

        reverted_prs = _collect_reverted_prs(client, repo, headers)

        prs_resp = client.get(
            f"https://api.github.com/repos/{repo}/pulls?state=all&sort=updated&direction=desc&per_page={min(limit, 100)}",
            headers=headers,
        )
        prs_resp.raise_for_status()
        prs = prs_resp.json()

        scored_records: list[dict[str, Any]] = []
        lane_counts: Counter[str] = Counter()
        veto_counts: Counter[str] = Counter()
        trust_counts: Counter[str] = Counter()

        shadow_tp = 0
        shadow_fp = 0
        shadow_pending = 0

        for pr in prs[:limit]:
            pr_num = int(pr["number"])
            cmts_resp = client.get(
                f"https://api.github.com/repos/{repo}/issues/{pr_num}/comments?per_page=100",
                headers=headers,
            )
            if cmts_resp.status_code != 200 or not isinstance(cmts_resp.json(), list):
                continue

            meta: dict[str, Any] | None = None
            for cmt in cmts_resp.json():
                body = str(cmt.get("body") or "")
                if pr_certainty.META_PREFIX not in body:
                    continue
                cmt_user = str((cmt.get("user") or {}).get("login") or "")
                if bot_login and cmt_user and cmt_user.lower() != bot_login.lower():
                    continue
                meta = pr_certainty.extract_certainty_meta(body)
                if meta:
                    break
            if not meta:
                continue

            pred = meta.get("first_green_ci_prediction") or meta
            lane = str(pred.get("lane") or "unknown")
            lane_counts[lane] += 1
            for v in pred.get("vetoes") or []:
                veto_counts[str(v)] += 1

            trust_pts = int(pred.get("contributor_trust") or 0)
            trust_bucket = (
                "Collaborator/Maintainer" if trust_pts >= 10
                else ("Returning/Veteran" if trust_pts >= 4 else "First-Time")
            )
            trust_counts[trust_bucket] += 1

            would_auto = bool(pred.get("shadow_would_automerge"))
            if would_auto:
                merged_at = _parse_iso(pr.get("merged_at"))
                state = str(pr.get("state") or "open")
                if state == "open":
                    shadow_pending += 1
                else:
                    # Check reviews for CHANGES_REQUESTED
                    rev_resp = client.get(
                        f"https://api.github.com/repos/{repo}/pulls/{pr_num}/reviews?per_page=100",
                        headers=headers,
                    )
                    had_changes_req = False
                    if rev_resp.status_code == 200 and isinstance(rev_resp.json(), list):
                        had_changes_req = any(
                            str(r.get("state") or "").upper() == "CHANGES_REQUESTED"
                            for r in rev_resp.json()
                        )

                    # Check 7-day post-merge revert on main
                    reverted_within_7d = False
                    if merged_at and pr_num in reverted_prs:
                        delta = reverted_prs[pr_num] - merged_at
                        if timedelta(0) <= delta <= timedelta(days=7):
                            reverted_within_7d = True

                    # Check follow-up commits pushed after first_green_ci_prediction
                    final_head_sha = str((pr.get("head") or {}).get("sha") or "")
                    scored_sha = str(pred.get("head_sha") or "")
                    pushed_after = bool(scored_sha and final_head_sha and scored_sha != final_head_sha)

                    if merged_at and not had_changes_req and not reverted_within_7d and not pushed_after:
                        shadow_tp += 1
                    else:
                        shadow_fp += 1

            scored_records.append({"pr_number": pr_num, "pred": pred})

    total_scored = len(scored_records)
    evaluated_shadow = shadow_tp + shadow_fp
    agreement_rate = (shadow_tp / evaluated_shadow * 100.0) if evaluated_shadow else 0.0
    fp_rate = (shadow_fp / evaluated_shadow * 100.0) if evaluated_shadow else 0.0
    live_ready = evaluated_shadow >= 15 and agreement_rate >= 95.0 and fp_rate < 2.0

    hours_saved = (
        lane_counts["lane_a_automerge"] * MINUTES_SAVED_LANE_A
        + lane_counts["lane_b_fast_track_hitl"] * MINUTES_SAVED_LANE_B
    ) / 60.0

    lines = [
        f"# PR Certainty Shadow Calibration Report — `{repo}`",
        "",
        f"- **PRs Scored:** `{total_scored}` (scanned last `{limit}` updated PRs)",
        f"- **Live-Mode Promotion Gate:** {'🟢 READY TO PROMOTE' if live_ready else '🟡 CALIBRATING (need ≥15 Shadow Lane A PRs, ≥95% agreement, <2% FP)'}",
        f"- **Shadow Lane A Evaluated:** `{evaluated_shadow}` (`{shadow_tp}` True Positives · `{shadow_fp}` False Positives · `{shadow_pending}` Open/Pending)",
        f"- **Shadow Agreement Rate:** `{agreement_rate:.1f}%`",
        f"- **False-Positive Rate (incl. 7-day post-merge reverts):** `{fp_rate:.1f}%`",
        f"- **Estimated Maintainer Time Saved:** `{hours_saved:.2f} hours` (`15 min`/Lane A + `8 min`/Lane B)",
        "",
        "## Autonomy Lane Distribution",
        "| Lane | Count |",
        "| :--- | :---: |",
    ]
    for lane_name, cnt in lane_counts.most_common():
        lines.append(f"| `{lane_name}` | `{cnt}` |")

    lines.extend([
        "",
        "## Contributor Trust Breakdown",
        "| Tier | Count |",
        "| :--- | :---: |",
    ])
    for tier_name, cnt in trust_counts.most_common():
        lines.append(f"| {tier_name} | `{cnt}` |")

    if veto_counts:
        lines.extend([
            "",
            "## Top Hard Vetoes Triggered",
            "| Veto Code | Count |",
            "| :--- | :---: |",
        ])
        for veto_code, cnt in veto_counts.most_common(10):
            lines.append(f"| `{veto_code}` | `{cnt}` |")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate PR Certainty Shadow Calibration & Keynote Report")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPO", "AhsanAyaz/code-with-ahsan"))
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()
    print(generate_report(repo=args.repo, limit=args.limit))


if __name__ == "__main__":
    main()
