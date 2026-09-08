"""Regression tests for the Discord bot's event-drain loop (postmortem 07-06).

THE OLD BUG (07-06-HOTFIX-DISCORD-EVENT-DRAIN): the handler did
`break` on the first `event.is_final_response()`. But ADK fires
is_final_response() once PER participating agent (see the Event docstring:
"when multiple agents participate in one invocation, there could be one
event has is_final_response() as True for each participating agent"). In a
ParallelAgent fan-out the fastest leaf won the race — e.g. devto_researcher's
"dev.to temporarily unavailable." was surfaced to the user instead of the
synthesizer's merged answer — and the early break cancelled the ParallelAgent
TaskGroup mid-flight (GeneratorExit cascade; root/synthesizer
after_agent_callbacks never fired).

THE FIX (bot.py `drain_final_response`): drain the FULL stream and keep the
LATEST non-empty final text, so the orchestrator/synthesizer wins.

These tests fabricate real `google.adk.events.Event` streams — no LLM, no
Runner — and drive the extracted helper directly.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Make agent/discord_bot importable (same pattern as test_discord_bot_message_handler)
AGENT_ROOT = Path(__file__).resolve().parent.parent
if str(AGENT_ROOT) not in sys.path:
    sys.path.insert(0, str(AGENT_ROOT))

from google.adk.events import Event
from google.genai import types

from discord_bot.bot import drain_final_response


def _final(author: str, text: str) -> Event:
    """A final-response event: plain model text, no function calls, not partial."""
    return Event(
        author=author,
        content=types.Content(role="model", parts=[types.Part(text=text)]),
    )


def _partial(author: str, text: str) -> Event:
    """A streaming chunk — is_final_response() is False."""
    return Event(
        author=author,
        partial=True,
        content=types.Content(role="model", parts=[types.Part(text=text)]),
    )


def _tool_call(author: str) -> Event:
    """A function-call event — is_final_response() is False."""
    return Event(
        author=author,
        content=types.Content(
            role="model",
            parts=[types.Part(function_call=types.FunctionCall(name="search", args={}))],
        ),
    )


async def _stream(events: list[Event], yielded: list[Event]):
    """Scripted event stream that records exactly how far it was consumed."""
    for event in events:
        yielded.append(event)
        yield event


async def test_synthesizer_beats_fastest_leaf_in_fan_out_race():
    """The fan-out race from postmortem 07-06: leaf A finals first with an
    error string; the synthesizer finals last with the real answer. The
    surfaced text must be the synthesizer's — the old `break`-on-first-final
    code returned leaf A's "dev.to temporarily unavailable." instead."""
    synthesizer_answer = "Here are 3 great Angular resources: ..."
    events = [
        _tool_call("devto_researcher"),
        _final("devto_researcher", "dev.to temporarily unavailable."),  # fastest leaf
        _final("gh_researcher", "Found 5 GitHub repos."),
        _final("so_researcher", "Found 4 Stack Overflow questions."),
        _final("external_knowledge_synthesizer", synthesizer_answer),
    ]
    events_seen: list = []
    text = await drain_final_response(_stream(events, []), events_seen)

    assert text == synthesizer_answer
    assert text != "dev.to temporarily unavailable."


async def test_full_stream_is_consumed_no_early_break():
    """Every event after the first final must still be pulled from the stream.
    The old code broke at index 1, leaving the sentinel (and the TaskGroup
    behind the generator) cancelled mid-flight."""
    sentinel = _final("external_knowledge_synthesizer", "real answer")
    events = [
        _final("devto_researcher", "dev.to temporarily unavailable."),  # old break point
        _partial("gh_researcher", "streaming..."),
        _tool_call("so_researcher"),
        sentinel,
    ]
    yielded: list[Event] = []
    events_seen: list = []
    text = await drain_final_response(_stream(events, yielded), events_seen)

    assert len(yielded) == len(events), "stream not fully drained — early break regressed"
    assert yielded[-1] is sentinel
    assert events_seen == events  # telemetry sink saw the whole stream too
    assert text == "real answer"


async def test_empty_text_final_does_not_clobber_previous_answer():
    """A later final with empty/None text (e.g. a state-only synthesizer event)
    must not wipe out an earlier non-empty final."""
    events = [
        _final("external_knowledge_synthesizer", "the actual answer"),
        _final("root_agent", ""),
        Event(author="root_agent", content=types.Content(role="model", parts=[types.Part()])),
    ]
    text = await drain_final_response(_stream(events, []), [])

    assert text == "the actual answer"


async def test_partial_and_tool_call_events_never_surface():
    """Non-final events (streaming chunks, function calls) carry text or parts
    but must never be treated as the reply."""
    events = [
        _partial("gh_researcher", "half a sent"),
        _tool_call("gh_researcher"),
    ]
    text = await drain_final_response(_stream(events, []), [])

    assert text == ""  # handler maps this to the "couldn't generate" fallback


async def test_empty_stream_returns_empty_text():
    events_seen: list = []
    text = await drain_final_response(_stream([], []), events_seen)

    assert text == ""
    assert events_seen == []
