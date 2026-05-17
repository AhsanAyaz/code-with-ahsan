from __future__ import annotations

from community_assistant.sub_agents.featured_resources import (
    FEATURED_RESOURCES,
    lookup_featured_resource,
)


AI_GUIDE_URL = (
    "https://blog.codewithahsan.dev/"
    "build-smarter-the-developers-guide-to-staying-relevant-in-the-ai-era/"
)


def test_featured_resources_well_formed():
    assert len(FEATURED_RESOURCES) >= 1
    for r in FEATURED_RESOURCES:
        assert {"id", "keywords", "title", "url", "description"}.issubset(r.keys())
        assert isinstance(r["keywords"], list) and r["keywords"]
        assert r["url"].startswith("https://")


def test_lookup_ai_guide_exact():
    hits = lookup_featured_resource("AI guide")
    assert len(hits) == 1
    assert hits[0]["url"] == AI_GUIDE_URL
    assert hits[0]["id"] == "ai-guide"


def test_lookup_ai_guide_case_insensitive():
    assert lookup_featured_resource("ai GUIDE")[0]["id"] == "ai-guide"


def test_lookup_developer_ai_guide_phrase():
    hits = lookup_featured_resource("Ahsan's developer AI guide")
    assert any(h["id"] == "ai-guide" for h in hits)


def test_lookup_staying_relevant_phrase():
    hits = lookup_featured_resource("how do I stay relevant as a dev?")
    assert any(h["id"] == "ai-guide" for h in hits)


def test_lookup_developer_guide_phrase():
    # "developer guide" alone (no AI) should still map to the AI Guide since the post
    # title literally is "The Developer's Guide to Staying Relevant in the AI Era".
    hits = lookup_featured_resource("do you have a developer guide")
    assert any(h["id"] == "ai-guide" for h in hits)


def test_lookup_devs_guide_phrase():
    hits = lookup_featured_resource("Ahsan's developer's guide")
    assert any(h["id"] == "ai-guide" for h in hits)


def test_lookup_empty_returns_empty():
    assert lookup_featured_resource("") == []
    assert lookup_featured_resource("   ") == []
    assert lookup_featured_resource(None) == []  # type: ignore[arg-type]


def test_lookup_unrelated_returns_empty():
    assert lookup_featured_resource("postgres tuning") == []


def test_lookup_deduplicates_per_resource():
    # "ai guide" matches two keywords ("ai guide" + "developer ai guide" substring overlap);
    # each resource should appear at most once.
    hits = lookup_featured_resource("developer ai guide ai guide")
    ids = [h["id"] for h in hits]
    assert ids.count("ai-guide") == 1
