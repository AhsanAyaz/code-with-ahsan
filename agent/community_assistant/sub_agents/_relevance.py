"""Title-overlap relevance filter for content search results.

YouTube's search.list scores are opaque and frequently surface tangential videos.
This module enforces a deterministic filter: all non-stopword query tokens must
appear (case-insensitive substring) in the candidate title.
"""
from __future__ import annotations

import re

_STOPWORDS: frozenset[str] = frozenset(
    {
        "a", "an", "the",
        "of", "for", "to", "on", "in", "at", "by", "from", "with", "without",
        "and", "or", "but", "not", "no",
        "is", "are", "was", "were", "be", "been", "being",
        "do", "does", "did", "doing",
        "i", "you", "we", "they", "he", "she", "it", "my", "your", "our",
        "have", "has", "had", "having",
        "any", "all", "some", "this", "that", "these", "those",
        "what", "how", "where", "when", "why", "who", "which",
        "can", "could", "would", "should", "will", "shall", "may", "might", "must",
        "get", "got", "make", "made",
        "please", "thanks", "thank",
        "show", "give", "tell",
    }
)


_TOKEN_RE = re.compile(r"[a-z0-9]+")


def query_tokens(query: str) -> set[str]:
    """Lowercase, strip stopwords + 1-char fragments, return distinct meaningful tokens."""
    if not query:
        return set()
    return {
        t for t in _TOKEN_RE.findall(query.lower())
        if len(t) >= 2 and t not in _STOPWORDS
    }


def is_relevant(tokens: set[str], title: str | None) -> bool:
    """True if EVERY query token appears as substring of the title (case-insensitive).

    Returns True if tokens is empty (no meaningful query → don't filter).
    Returns False if title is empty/None and tokens is non-empty.
    """
    if not tokens:
        return True
    if not title:
        return False
    t = title.lower()
    return all(tok in t for tok in tokens)
