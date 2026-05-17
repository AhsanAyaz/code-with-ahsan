"""Curated featured resources surfaced before falling back to fuzzy content search.

Acts as the deterministic first-hit layer so flagship URLs (e.g., the AI Guide)
are not lost to Ghost NQL substring matching limits.
"""
from __future__ import annotations

FEATURED_RESOURCES: list[dict] = [
    {
        "id": "ai-guide",
        "keywords": [
            "ai guide",
            "developer ai guide",
            "developers ai guide",
            "developer's ai guide",
            "ahsan's ai guide",
            "ai era",
            "stay relevant",
            "staying relevant",
            "build smarter",
        ],
        "title": "Build Smarter: The Developer's Guide to Staying Relevant in the AI Era",
        "url": "https://blog.codewithahsan.dev/build-smarter-the-developers-guide-to-staying-relevant-in-the-ai-era/",
        "description": (
            "Ahsan's flagship guide for developers on adapting workflow, learning, "
            "and career to the AI era."
        ),
    },
]


def lookup_featured_resource(topic: str) -> list[dict]:
    """Return curated resources whose keywords appear in the topic (case-insensitive)."""
    q = (topic or "").lower().strip()
    if not q:
        return []
    hits: list[dict] = []
    for resource in FEATURED_RESOURCES:
        for keyword in resource["keywords"]:
            if keyword in q:
                hits.append(
                    {
                        "id": resource["id"],
                        "title": resource["title"],
                        "url": resource["url"],
                        "description": resource["description"],
                    }
                )
                break
    return hits
