from __future__ import annotations
import importlib
import pytest


def _reload_module():
    import community_assistant.platform_client as mod
    importlib.reload(mod)
    return mod


def test_base_url_default_is_production(monkeypatch):
    monkeypatch.delenv("PLATFORM_API_BASE_URL", raising=False)
    mod = _reload_module()
    assert mod.BASE_URL == "https://codewithahsan.dev"


def test_base_url_env_override(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_BASE_URL", "http://localhost:3000")
    mod = _reload_module()
    assert mod.BASE_URL == "http://localhost:3000"


def test_base_url_trailing_slash_stripped(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_BASE_URL", "https://staging.example.com/")
    mod = _reload_module()
    assert mod.BASE_URL == "https://staging.example.com"


def test_get_handles_connection_error(monkeypatch):
    """Regression guard: _get must return {ok: False} not raise."""
    import httpx
    import community_assistant.platform_client as mod

    def _raise(*args, **kwargs):
        raise httpx.ConnectError("dns failed")

    monkeypatch.setattr(mod._client, "get", _raise)
    result = mod._get("/api/test")
    assert result["ok"] is False
    assert "error" in result
    assert result["path"] == "/api/test"
