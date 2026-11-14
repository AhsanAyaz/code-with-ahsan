"""Cloud Run FastAPI worker for the Loupe autonomous bug triage agent."""

from __future__ import annotations

import hashlib
import hmac
import inspect
import json
import os
import uuid
from typing import Any, Optional

from fastapi import FastAPI, Header, HTTPException, Query, Request
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

try:
    from community_assistant.sub_agents.triage_agent import triage_agent
except ImportError:  # pragma: no cover
    from community_assistant.triage_agent import triage_agent  # type: ignore[no-redef]
from community_assistant.triage_tools import run_triage_loop_for_issue

SERVICE_NAME = "loupe-triage-worker"
MODEL_NAME = "gemini-2.5-flash"
RELEVANT_GITHUB_ACTIONS = frozenset(
    {"opened", "labeled", "reopened", "edited", "synchronize"}
)

app = FastAPI(
    title="Loupe Triage Worker",
    description="Cloud Run FastAPI worker for autonomous Loupe bug triage.",
    version="0.1.0",
)


def _verify_github_signature(raw_body: bytes, signature_header: Optional[str]) -> None:
    """Verify HMAC-SHA256 GitHub webhook signature when GITHUB_WEBHOOK_SECRET is set."""
    secret = os.environ.get("GITHUB_WEBHOOK_SECRET", "").strip()
    if not secret:
        return
    if not signature_header or not signature_header.startswith("sha256="):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    expected_digest = hmac.new(
        secret.encode("utf-8"), raw_body, hashlib.sha256
    ).hexdigest()
    expected_sig = f"sha256={expected_digest}"
    if not hmac.compare_digest(expected_sig, signature_header.strip()):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")


def _has_loupe_label(payload: dict[str, Any]) -> bool:
    """Return True if the webhook issue or label payload carries the 'loupe' label."""
    label_obj = payload.get("label")
    if isinstance(label_obj, dict) and str(label_obj.get("name", "")).lower() == "loupe":
        return True
    if isinstance(label_obj, str) and label_obj.lower() == "loupe":
        return True

    issue = payload.get("issue") or {}
    labels = issue.get("labels") or []
    for item in labels:
        if isinstance(item, dict) and str(item.get("name", "")).lower() == "loupe":
            return True
        if isinstance(item, str) and item.lower() == "loupe":
            return True
    return False


async def _invoke_triage_loop(
    issue_number: int,
    dry_run: bool,
    issue_payload: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Call run_triage_loop_for_issue supporting both sync and async implementations."""
    sig = inspect.signature(run_triage_loop_for_issue)
    kwargs: dict[str, Any] = {
        "issue_number": issue_number,
        "dry_run": dry_run,
    }
    if "issue_payload" in sig.parameters:
        kwargs["issue_payload"] = issue_payload
    elif issue_payload is not None and any(
        p.kind == inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values()
    ):
        kwargs["issue_payload"] = issue_payload

    result = run_triage_loop_for_issue(**kwargs)
    if inspect.isawaitable(result):
        result = await result
    if isinstance(result, dict):
        return result
    return {"result": result}


async def _run_adk_triage_agent(
    issue_number: int,
    dry_run: bool,
    issue_payload: Optional[dict[str, Any]] = None,
) -> str:
    """Run the ADK triage_agent via Runner + InMemorySessionService."""
    session_service = InMemorySessionService()
    app_name = SERVICE_NAME
    user_id = "github-webhook"
    session_id = f"triage-{issue_number}-{uuid.uuid4().hex[:8]}"

    create_res = session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id,
    )
    if inspect.isawaitable(create_res):
        await create_res

    runner = Runner(
        agent=triage_agent,
        app_name=app_name,
        session_service=session_service,
    )
    prompt = (
        f"Triage GitHub issue #{issue_number} (dry_run={dry_run}). "
        f"Issue payload: {json.dumps(issue_payload or {})}"
    )
    content = types.Content(
        role="user",
        parts=[types.Part.from_text(text=prompt)],
    )
    collected_texts: list[str] = []
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=content,
    ):
        event_content = getattr(event, "content", None)
        parts = getattr(event_content, "parts", None) or []
        for part in parts:
            text = getattr(part, "text", None)
            if text:
                collected_texts.append(text)
    return "\n".join(collected_texts).strip()


@app.get("/health")
async def health() -> dict[str, str]:
    """Cloud Run health check endpoint."""
    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "model": MODEL_NAME,
    }


@app.api_route("/triage/{issue_number}", methods=["GET", "POST"])
async def triage_issue_endpoint(
    issue_number: int,
    request: Request,
    dry_run: Optional[bool] = Query(default=None),
) -> dict[str, Any]:
    """Run the autonomous Loupe triage pipeline for a specific GitHub issue."""
    body_data: dict[str, Any] = {}
    if request.method == "POST":
        raw = await request.body()
        if raw.strip():
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    body_data = parsed
            except json.JSONDecodeError as exc:
                raise HTTPException(
                    status_code=400, detail=f"Invalid JSON body: {exc}"
                ) from exc

    if isinstance(body_data.get("dry_run"), bool):
        effective_dry_run = body_data["dry_run"]
    elif dry_run is not None:
        effective_dry_run = bool(dry_run)
    else:
        effective_dry_run = True

    use_agent = bool(body_data.get("use_agent", False))
    issue_payload = body_data.get("issue_payload")
    if issue_payload is not None and not isinstance(issue_payload, dict):
        issue_payload = None

    loop_result = await _invoke_triage_loop(
        issue_number=issue_number,
        dry_run=effective_dry_run,
        issue_payload=issue_payload,
    )

    response: dict[str, Any] = {
        **loop_result,
        "status": loop_result.get("status", "ok"),
        "issue_number": loop_result.get("issue_number", issue_number),
        "dry_run": effective_dry_run,
        "analysis": loop_result.get("analysis", {}),
        "suspect_components": loop_result.get("suspect_components", []),
        "report": loop_result.get("report", {}),
    }

    if use_agent:
        try:
            agent_text = await _run_adk_triage_agent(
                issue_number=issue_number,
                dry_run=effective_dry_run,
                issue_payload=issue_payload,
            )
            response["agent_output"] = agent_text
        except Exception as exc:
            response["agent_error"] = str(exc)

    return response


@app.post("/webhook/github")
async def github_webhook(
    request: Request,
    dry_run: Optional[bool] = Query(default=None),
    x_hub_signature_256: Optional[str] = Header(
        default=None, alias="X-Hub-Signature-256"
    ),
    x_github_event: Optional[str] = Header(default=None, alias="X-GitHub-Event"),
) -> dict[str, Any]:
    """Receive GitHub issue webhooks and trigger Loupe triage for 'loupe'-labeled issues."""
    raw_body = await request.body()
    _verify_github_signature(raw_body, x_hub_signature_256)

    if (x_github_event or "").lower() == "ping":
        return {"status": "pong"}

    try:
        payload = json.loads(raw_body.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400, detail=f"Invalid webhook JSON: {exc}"
        ) from exc

    if not isinstance(payload, dict):
        return {"status": "ignored", "reason": "not a loupe-labeled issue event"}

    action = str(payload.get("action", "")).lower()
    issue = payload.get("issue")
    if (
        not isinstance(issue, dict)
        or action not in RELEVANT_GITHUB_ACTIONS
        or not _has_loupe_label(payload)
    ):
        return {"status": "ignored", "reason": "not a loupe-labeled issue event"}

    issue_number = int(issue.get("number", 0))
    if issue_number <= 0:
        return {"status": "ignored", "reason": "not a loupe-labeled issue event"}

    if isinstance(payload.get("dry_run"), bool):
        effective_dry_run = payload["dry_run"]
    elif dry_run is not None:
        effective_dry_run = bool(dry_run)
    else:
        effective_dry_run = (
            os.environ.get("TRIAGE_DRY_RUN", "true").strip().lower() != "false"
        )

    result = await _invoke_triage_loop(
        issue_number=issue_number,
        dry_run=effective_dry_run,
        issue_payload=issue,
    )
    return {
        "status": "triaged",
        "issue_number": issue_number,
        "dry_run": effective_dry_run,
        "triage": result,
    }
