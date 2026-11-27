"""FastAPI Cloud Run service for Loupe Visual Bug Auto-Triage."""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request

# Load environment variables from repo root .env.local and agent/.env
_AGENT_DIR = Path(__file__).resolve().parent
load_dotenv(_AGENT_DIR.parent / ".env.local", override=False)
load_dotenv(_AGENT_DIR / ".env", override=False)

if os.environ.get("GEMINI_API_KEY") and not os.environ.get("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

import issue_pipeline  # noqa: E402
import loupe_triage_mcp  # noqa: E402
import pr_certainty  # noqa: E402

logger = logging.getLogger("triage_service")

MODEL = "gemini-3.8-flash"
DEFAULT_REPO = os.environ.get("GITHUB_REPO", "AhsanAyaz/code-with-ahsan")
ALLOWED_REPOS = frozenset({
    r.strip()
    for r in os.environ.get("ALLOWED_GITHUB_REPOS", DEFAULT_REPO).split(",")
    if r.strip()
} | {DEFAULT_REPO})

app = FastAPI(title="Code with Ahsan — Loupe & PR Triage Service")


def _resolve_repo(payload: dict[str, Any]) -> str:
    repo = payload.get("repo")
    if not repo and isinstance(payload.get("repository"), dict):
        repo = payload["repository"].get("full_name")
    repo_str = str(repo or DEFAULT_REPO).strip()
    if repo_str not in ALLOWED_REPOS:
        raise HTTPException(
            status_code=403,
            detail=f"Repository '{repo_str}' is not in ALLOWED_REPOS",
        )
    return repo_str


@app.get("/")
@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint for Cloud Run."""
    return {
        "status": "ok",
        "service": "cwa-loupe-triage",
        "model": MODEL,
    }


@app.get("/health/details")
async def health_details() -> dict[str, Any]:
    """Detailed health & certainty configuration status."""
    return {
        "status": "ok",
        "service": "cwa-loupe-triage",
        "model": MODEL,
        "auto_merge_mode": pr_certainty.get_auto_merge_mode(),
        "hmac_configured": bool(os.environ.get("TRIAGE_WEBHOOK_SECRET", "").strip()),
        "discord_configured": bool(
            os.environ.get("DISCORD_BOT_TOKEN", "").strip()
            or os.environ.get("DISCORD_PR_TRIAGE_WEBHOOK_URL", "").strip()
            or os.environ.get("DISCORD_WEBHOOK", "").strip()
        ),
    }


@app.post("/triage")
async def triage(request: Request) -> dict[str, Any]:
    """Trigger Loupe visual bug triage from either direct API call or GitHub webhook/Action."""
    try:
        payload: dict[str, Any] = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {exc}") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Payload must be a JSON object")

    # Extract issue_number from direct payload or GitHub webhook payload
    raw_issue_number = payload.get("issue_number")
    if raw_issue_number is None and isinstance(payload.get("issue"), dict):
        raw_issue_number = payload["issue"].get("number")

    if raw_issue_number is None:
        raise HTTPException(
            status_code=400,
            detail="Missing 'issue_number' (or 'issue.number') in request payload",
        )

    try:
        issue_number = int(raw_issue_number)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid issue_number: {raw_issue_number!r}",
        ) from exc

    repo = _resolve_repo(payload)

    post_to_github = bool(payload.get("post_to_github", True))
    create_pr = bool(payload.get("create_pr", True))

    result = await asyncio.to_thread(
        loupe_triage_mcp.triage_loupe_issue,
        issue_number=issue_number,
        repo=repo,
        post_to_github=post_to_github,
        create_pr=create_pr,
    )
    return result


@app.post("/issue-action")
async def issue_action(request: Request) -> dict[str, Any]:
    """Zero-trust HMAC-verified unified endpoint for issue actions (`triage` and `implement`)."""
    raw_body = await request.body()
    secret = os.environ.get("TRIAGE_WEBHOOK_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="TRIAGE_WEBHOOK_SECRET is not configured on server")

    sig_header = request.headers.get("X-CWA-Signature-256", "")
    ts_header = request.headers.get("X-CWA-Timestamp", "")
    if not pr_certainty.verify_hmac_signature(raw_body, sig_header, ts_header, secret):
        raise HTTPException(status_code=401, detail="Invalid or expired HMAC signature")

    try:
        payload: dict[str, Any] = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {exc}") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Payload must be a JSON object")

    repo = _resolve_repo(payload)
    try:
        issue_number = int(payload["issue_number"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Missing or invalid 'issue_number'") from exc

    mode = str(payload.get("mode") or "triage").strip().lower()
    trigger = str(payload.get("trigger") or "manual").strip().lower()
    raw_comment_id = payload.get("comment_id")
    comment_id: int | None = None
    if raw_comment_id is not None and str(raw_comment_id).strip() != "":
        try:
            comment_id = int(raw_comment_id)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="Invalid 'comment_id'") from exc

    instructions = str(payload.get("instructions") or "")
    raw_whitelist = payload.get("whitelist_users") or []
    whitelist_users = (
        [str(u).strip() for u in raw_whitelist if str(u).strip()]
        if isinstance(raw_whitelist, list)
        else [u.strip() for u in str(raw_whitelist).split(",") if u.strip()]
    )
    post_to_github = bool(payload.get("post_to_github", True))

    result = await asyncio.to_thread(
        issue_pipeline.handle_issue_action,
        issue_number=issue_number,
        mode=mode,
        repo=repo,
        trigger=trigger,
        comment_id=comment_id,
        instructions=instructions,
        whitelist_users=whitelist_users,
        post_to_github=post_to_github,
    )
    http_status = int(result.get("http_status", 200))
    if http_status >= 400:
        raise HTTPException(status_code=http_status, detail=result.get("error") or result.get("status"))
    return result


@app.post("/triage-pr")
async def triage_pr(request: Request) -> dict[str, Any]:
    """Trigger Pull Request auto-triage from direct API call, pull_request, or workflow_run (head_sha)."""
    try:
        payload: dict[str, Any] = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {exc}") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Payload must be a JSON object")

    repo = _resolve_repo(payload)
    pr_obj = payload.get("pull_request") if isinstance(payload.get("pull_request"), dict) else {}
    raw_pr_number = payload.get("pr_number")
    if raw_pr_number is None and pr_obj:
        raw_pr_number = pr_obj.get("number")

    is_draft = bool(pr_obj.get("draft") is True)
    if raw_pr_number is None:
        head_sha = str(payload.get("head_sha") or "").strip()
        if head_sha:
            resolved = await asyncio.to_thread(
                loupe_triage_mcp.resolve_pr_number_from_sha,
                head_sha=head_sha,
                repo=repo,
            )
            if not resolved:
                return {
                    "status": "skipped",
                    "reason": "No open PR targeting main found for head_sha",
                    "head_sha": head_sha,
                }
            raw_pr_number = resolved["pr_number"]
            is_draft = bool(resolved.get("draft", False))

    if raw_pr_number is None:
        raise HTTPException(
            status_code=400,
            detail="Missing 'pr_number' (or 'pull_request.number' / 'head_sha') in request payload",
        )

    try:
        pr_number = int(raw_pr_number)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid pr_number: {raw_pr_number!r}",
        ) from exc

    if is_draft and not payload.get("force", False):
        return {
            "status": "skipped",
            "reason": "Pull request is a draft",
            "pr_number": pr_number,
        }

    post_to_github = bool(payload.get("post_to_github", True))
    force_rescore = bool(payload.get("force_rescore", False))

    triage_kwargs: dict[str, Any] = {
        "pr_number": pr_number,
        "repo": repo,
        "post_to_github": post_to_github,
    }
    if force_rescore:
        triage_kwargs["force_rescore"] = True

    result = await asyncio.to_thread(
        loupe_triage_mcp.triage_pull_request,
        **triage_kwargs,
    )
    return result


@app.post("/pr-command")
async def pr_command(request: Request) -> dict[str, Any]:
    """Zero-trust HMAC-verified endpoint for maintainer PR slash commands (`/merge`, `/hold`, `/rescore`).

    Pull-verifies the comment author, association, and body directly from GitHub API via `comment_id`.
    """
    raw_body = await request.body()
    secret = os.environ.get("TRIAGE_WEBHOOK_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="TRIAGE_WEBHOOK_SECRET is not configured on server")

    sig_header = request.headers.get("X-CWA-Signature-256", "")
    ts_header = request.headers.get("X-CWA-Timestamp", "")
    if not pr_certainty.verify_hmac_signature(raw_body, sig_header, ts_header, secret):
        raise HTTPException(status_code=401, detail="Invalid or expired HMAC signature")

    try:
        payload: dict[str, Any] = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {exc}") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Payload must be a JSON object")

    repo = _resolve_repo(payload)
    try:
        pr_number = int(payload["pr_number"])
        comment_id = int(payload["comment_id"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Missing or invalid 'pr_number' / 'comment_id'") from exc

    result = await asyncio.to_thread(
        loupe_triage_mcp.handle_pr_hil_command,
        pr_number=pr_number,
        comment_id=comment_id,
        repo=repo,
    )
    http_status = int(result.get("http_status", 200))
    if http_status >= 400:
        raise HTTPException(status_code=http_status, detail=result.get("error") or result.get("status"))
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "triage_service:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8080")),
    )
