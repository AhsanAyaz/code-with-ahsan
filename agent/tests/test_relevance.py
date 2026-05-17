from __future__ import annotations

from community_assistant.sub_agents._relevance import (
    is_relevant,
    query_tokens,
)


# ---------------------------------------------------------------------------
# query_tokens
# ---------------------------------------------------------------------------

def test_query_tokens_strips_stopwords():
    assert query_tokens("do you have a developer guide") == {"developer", "guide"}


def test_query_tokens_lowercases():
    assert query_tokens("Angular Signals") == {"angular", "signals"}


def test_query_tokens_drops_single_char_and_punctuation():
    assert query_tokens("a, b, signals!") == {"signals"}


def test_query_tokens_empty_input():
    assert query_tokens("") == set()
    assert query_tokens("the and or") == set()


def test_query_tokens_dedupes():
    assert query_tokens("angular angular signals") == {"angular", "signals"}


# ---------------------------------------------------------------------------
# is_relevant
# ---------------------------------------------------------------------------

def test_is_relevant_all_tokens_in_title():
    tokens = {"angular", "signals"}
    assert is_relevant(tokens, "Mastering Angular Signals: A Deep Dive") is True


def test_is_relevant_missing_token():
    tokens = {"angular", "signals"}
    assert is_relevant(tokens, "Mastering Angular Observables") is False


def test_is_relevant_case_insensitive():
    assert is_relevant({"angular"}, "ANGULAR Tutorial") is True


def test_is_relevant_empty_tokens_passthrough():
    # No meaningful tokens → don't filter, accept everything.
    assert is_relevant(set(), "anything") is True


def test_is_relevant_empty_title():
    assert is_relevant({"x"}, None) is False
    assert is_relevant({"x"}, "") is False


def test_is_relevant_developer_guide_filter():
    # Real cases from the regression that motivated this filter.
    tokens = query_tokens("do you have a developer guide")
    assert tokens == {"developer", "guide"}
    assert is_relevant(tokens, "How to become a sole developer to code without the internet") is False
    assert is_relevant(tokens, "So you're a senior JavaScript developer ?!!") is False
    assert is_relevant(tokens, "Mastering Angular Signals") is False
    assert is_relevant(tokens, "The Developer's Guide to Staying Relevant") is True
