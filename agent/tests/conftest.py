from __future__ import annotations

import json
from pathlib import Path
from typing import Callable

import httpx
import pytest

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


@pytest.fixture
def mentors_payload() -> dict:
    return _load("mentors.json")


@pytest.fixture
def projects_payload() -> dict:
    return _load("projects.json")


@pytest.fixture
def roadmaps_payload() -> dict:
    return _load("roadmaps.json")


@pytest.fixture
def semantic_mentors_payload() -> dict:
    return _load("semantic_mentors.json")


@pytest.fixture
def mock_platform_client(monkeypatch) -> Callable[[str, dict], None]:
    """Patch community_assistant.platform_client._get to return a fixed payload by path prefix."""
    routes: dict[str, dict] = {}

    def _patched(path: str, params: dict | None = None) -> dict:
        for prefix, payload in routes.items():
            if path.startswith(prefix):
                return {"ok": True, "data": payload}
        return {"ok": False, "error": f"no fixture for {path}", "path": path}

    monkeypatch.setattr(
        "community_assistant.platform_client._get", _patched
    )

    def register(path_prefix: str, payload: dict) -> None:
        routes[path_prefix] = payload

    return register
