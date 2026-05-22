"""Upstream-JSON → LLM-friendly dict shape helpers shared by the three external_knowledge researchers."""

from __future__ import annotations

import html


def _shape_github_repo(raw: dict) -> dict:
    return {
        "name": raw.get("full_name"),
        "url": raw.get("html_url"),
        "description": (raw.get("description") or "")[:300],
        "stars": raw.get("stargazers_count"),
        "language": raw.get("language"),
        "updated_at": raw.get("updated_at"),
        "topics": raw.get("topics", []),
    }


def _shape_devto_article(raw: dict) -> dict:
    user = raw.get("user") or {}
    return {
        "title": raw.get("title"),
        "url": raw.get("url"),
        "description": (raw.get("description") or "")[:300],
        "tags": raw.get("tag_list", []),
        "reactions": raw.get("public_reactions_count"),
        "published_at": raw.get("published_at"),
        "author": user.get("name") if user else None,
    }


def _shape_stackoverflow_question(raw: dict) -> dict:
    owner = raw.get("owner") or {}
    return {
        "title": html.unescape(raw.get("title") or ""),
        "url": raw.get("link"),
        "score": raw.get("score"),
        "answer_count": raw.get("answer_count"),
        "is_answered": raw.get("is_answered"),
        "tags": raw.get("tags", []),
        "asked": raw.get("creation_date"),
        "asker": owner.get("display_name") if owner else None,
    }
