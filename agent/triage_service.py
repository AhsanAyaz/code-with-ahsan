"""FastAPI Cloud Run service for Loupe Visual Bug Auto-Triage."""

from __future__ import annotations

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

import loupe_triage_mcp  # noqa: E402

logger = logging.getLogger("triage_service")

MODEL = "gemini-3.8-flash"
DEFAULT_REPO = os.environ.get("GITHUB_REPO", "AhsanAyaz/code-with-ahsan")

app = FastAPI(title="Code with Ahsan — Loupe Triage Service")


@app.get("/")
@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint for Cloud Run."""
    return {
        "status": "ok",
        "service": "cwa-loupe-triage",
        "model": MODEL,
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

    # Extract repo from direct payload or GitHub webhook payload
    repo = payload.get("repo")
    if not repo and isinstance(payload.get("repository"), dict):
        repo = payload["repository"].get("full_name")
    repo = str(repo or DEFAULT_REPO)

    post_to_github = bool(payload.get("post_to_github", True))
    create_pr = bool(payload.get("create_pr", True))

    result = loupe_triage_mcp.triage_loupe_issue(
        issue_number=issue_number,
        repo=repo,
        post_to_github=post_to_github,
        create_pr=create_pr,
    )
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "triage_service:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8080")),
    )
