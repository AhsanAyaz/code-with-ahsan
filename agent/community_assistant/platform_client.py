"""HTTP client for the codewithahsan.dev platform API.

Tools call the Next.js API endpoints directly, which keeps all business logic
(permissions, validation, status filtering) in one place.
"""

from __future__ import annotations

import os

import httpx

BASE_URL = os.getenv("PLATFORM_API_BASE_URL", "http://localhost:3000").rstrip("/")
TIMEOUT_SECONDS = 10.0

_client = httpx.Client(
    base_url=BASE_URL,
    timeout=TIMEOUT_SECONDS,
    follow_redirects=True,
)


def _get(path: str, params: dict | None = None) -> dict:
    try:
        response = _client.get(path, params=params or {})
        response.raise_for_status()
        return {"ok": True, "data": response.json()}
    except httpx.HTTPStatusError as exc:
        return {
            "ok": False,
            "error": f"Platform API returned {exc.response.status_code}",
            "path": path,
        }
    except httpx.RequestError as exc:
        return {
            "ok": False,
            "error": (
                f"Could not reach the platform API at {BASE_URL}. "
                f"Is the Next.js dev server running? ({exc.__class__.__name__})"
            ),
            "path": path,
        }


def fetch_mentors() -> dict:
    """Fetch all accepted mentors from /api/mentorship/mentors."""
    return _get("/api/mentorship/mentors", {"public": "true"})


def fetch_projects() -> dict:
    """Fetch all publicly visible projects from /api/projects (active + completed)."""
    return _get("/api/projects")


def fetch_roadmaps(domain: str | None = None, difficulty: str | None = None) -> dict:
    """Fetch roadmaps from /api/roadmaps with optional domain/difficulty filters."""
    params: dict[str, str] = {"status": "approved"}
    if domain:
        params["domain"] = domain
    if difficulty:
        params["difficulty"] = difficulty
    return _get("/api/roadmaps", params)
