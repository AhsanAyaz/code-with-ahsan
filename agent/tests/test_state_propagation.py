"""Phase 06 Plan 02 — output_key state propagation tests.

Pins the SequentialAgent topology of `onboarding_agent` (skill_level + goals
extractors writing `user_skill_level` / `user_goals` to session.state, plus a
welcome LlmAgent that produces the user-visible reply) and the downstream
templating contract on mentorship/projects/roadmap agents (`{user_skill_level?}`
and `{user_goals?}` using the silent-empty `?` form — RESEARCH §2.2).

RED→GREEN: at the start of Plan 02 these tests MUST fail (the refactor has not
landed). They become green after Task 2 (onboarding refactor) and Task 3
(downstream instruction prepend).
"""

from __future__ import annotations

import re

from community_assistant.sub_agents.mentorship_agent import mentorship_agent
from community_assistant.sub_agents.onboarding_agent import onboarding_agent
from community_assistant.sub_agents.projects_agent import projects_agent
from community_assistant.sub_agents.roadmap_agent import roadmap_agent


def _child_by_name(parent, name: str):
    """Locate a child sub_agent by `.name`. Returns None if not present."""
    for child in getattr(parent, "sub_agents", []) or []:
        if getattr(child, "name", None) == name:
            return child
    return None


# ---------------------------------------------------------------------------
# Topology — onboarding_agent is a SequentialAgent of 3 children
# ---------------------------------------------------------------------------


def test_onboarding_is_sequential_with_three_children():
    """`onboarding_agent` is now a SequentialAgent wrapping three children.

    Order is checked separately (test_onboarding_welcome_is_last_child); here we
    just lock the type + set of child names.
    """
    assert type(onboarding_agent).__name__ == "SequentialAgent"
    assert len(onboarding_agent.sub_agents) == 3
    names = {child.name for child in onboarding_agent.sub_agents}
    assert names == {
        "onboarding_welcome",
        "onboarding_skill_level",
        "onboarding_goals",
    }


def test_onboarding_routable_name_preserved():
    """`name == 'onboarding_agent'` — root_agent.sub_agents routes by this string
    (RESEARCH §2.3 lines 347-349; CONTEXT.md `## Implementation Decisions > Topology`).
    """
    assert onboarding_agent.name == "onboarding_agent"


# ---------------------------------------------------------------------------
# output_key writes — locked namespace from v7.0-ROADMAP cross-phase contracts
# ---------------------------------------------------------------------------


def test_onboarding_skill_level_extractor_writes_correct_output_key():
    """`onboarding_skill_level` writes `user_skill_level`."""
    child = _child_by_name(onboarding_agent, "onboarding_skill_level")
    assert child is not None, "expected child named 'onboarding_skill_level'"
    assert child.output_key == "user_skill_level"


def test_onboarding_goals_extractor_writes_correct_output_key():
    """`onboarding_goals` writes `user_goals`."""
    child = _child_by_name(onboarding_agent, "onboarding_goals")
    assert child is not None, "expected child named 'onboarding_goals'"
    assert child.output_key == "user_goals"


def test_onboarding_welcome_has_no_output_key():
    """`onboarding_welcome` produces the user-visible reply — its text is the
    answer, not a state value. Therefore it MUST NOT have an output_key.
    """
    child = _child_by_name(onboarding_agent, "onboarding_welcome")
    assert child is not None, "expected child named 'onboarding_welcome'"
    assert not getattr(child, "output_key", None)


def test_onboarding_welcome_is_last_child():
    """Welcome agent runs LAST so the SequentialAgent's final response is the
    warm welcome (RESEARCH §Open Question 2 recommendation, lines 829-830).

    If the framework instead surfaces the FIRST child's output as the parent
    response, Plan 02 Task 5 Branch B flips the order and renames this test
    (`test_onboarding_welcome_is_first_child`). Until the `adk web` smoke
    confirms otherwise, the welcome-LAST convention is in effect.
    """
    assert onboarding_agent.sub_agents[-1].name == "onboarding_welcome"


# ---------------------------------------------------------------------------
# Downstream agents read the state via `{key?}` optional templating
# ---------------------------------------------------------------------------


def test_mentorship_instruction_reads_state_keys():
    """Mentorship agent's instruction now templates the two onboarding keys.

    Also pins the existing TOOLS section so an accidental truncation of the
    instruction body is caught (the USER CONTEXT block must be PREPENDED, not
    replace the rest of the prompt).
    """
    assert "{user_skill_level?}" in mentorship_agent.instruction
    assert "{user_goals?}" in mentorship_agent.instruction
    assert "TOOLS:" in mentorship_agent.instruction


def test_projects_instruction_reads_state_keys():
    """Projects agent's instruction templates both onboarding keys; the existing
    `list_open_projects` mention guards against an accidental block replacement.
    """
    assert "{user_skill_level?}" in projects_agent.instruction
    assert "{user_goals?}" in projects_agent.instruction
    assert "list_open_projects" in projects_agent.instruction


def test_roadmap_instruction_reads_state_keys():
    """Roadmap agent's instruction templates both onboarding keys; the existing
    TOOLS header pins the rest of the prompt.
    """
    assert "{user_skill_level?}" in roadmap_agent.instruction
    assert "{user_goals?}" in roadmap_agent.instruction
    assert "TOOLS:" in roadmap_agent.instruction


def test_no_non_optional_state_refs_in_downstream_instructions():
    """Defensive: NO downstream instruction may use the non-`?` form
    (`{user_skill_level}` / `{user_goals}`) because the keys do not exist on
    first turn and the bare form raises (RESEARCH §2.2). The regex uses a
    negative-lookahead to allow `{user_skill_level?}` and `{user_goals?}` while
    rejecting `{user_skill_level}` and `{user_goals}`.
    """
    bad_skill_re = re.compile(r"\{user_skill_level(?!\?)")
    bad_goals_re = re.compile(r"\{user_goals(?!\?)")

    for agent in (mentorship_agent, projects_agent, roadmap_agent):
        instruction = agent.instruction
        assert bad_skill_re.search(instruction) is None, (
            f"{agent.name}.instruction contains non-optional {{user_skill_level}} reference"
            " — must use the `?` form (RESEARCH §2.2)."
        )
        assert bad_goals_re.search(instruction) is None, (
            f"{agent.name}.instruction contains non-optional {{user_goals}} reference"
            " — must use the `?` form (RESEARCH §2.2)."
        )
