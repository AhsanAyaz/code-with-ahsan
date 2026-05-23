---
plan: 07-06
phase: 07-agent-safety-observability-callbacks
title: Hotfix postmortem — Discord bot early-break on first is_final_response()
status: SHIPPED
owner: ahsan
created: 2026-05-23
type: hotfix
gap_closure: false
priority: P0
severity: CRITICAL (silent: partial replies + cancelled fan-out + missing lifecycle exits in prod)
estimated_effort: XS (~30min including verification)
parent_observation: Phase 7 Plan 05 post-deploy Discord smoke (revision 00014-l5k)
fix_commit: 31cb6cb
fix_revision: cwa-assistant-bot-00015-bqv
---

# Plan 07-06 — Hotfix postmortem: Discord bot drained only first leaf event

## TL;DR

`discord_bot/bot.py` broke its `async for event in runner.run_async(...)` loop
on the FIRST `event.is_final_response() and event.content`. ADK's
`is_final_response()` returns True for **every participating agent** (per ADK
`Event.is_final_response` docstring), so in any delegated or fan-out turn the
bot surfaced whichever leaf's final event arrived first — and the loop's `break`
cancelled the ADK runner mid-flight, throwing a `GeneratorExit` cascade through
`google.adk.agents.parallel_agent._merge_agent_run` and the OpenTelemetry
context-detach plumbing, while leaving `after_agent_callback` on the root and
synthesizer unable to fire.

**Latent since:** Phase 6 (external_knowledge ParallelAgent fan-out shipped).
**Surfaced today:** 2026-05-23 ~17:48Z, when a Discord user asked about
"Google's Antigravity CLI" and `devto_researcher` 404'd fastest (1.2s vs
gh's 2.4s vs so's 2.6s), winning the race to first `is_final_response()`.

## Timeline (2026-05-23 UTC)

| Time | Event |
|------|-------|
| 17:35 | Local `adk web` smoke for antigravity CLI — PASS (synthesizer reply, 5 current-dated repos). `adk web` UI drains the full event stream, so the latent bot bug was invisible there. |
| 17:44 | Wave 5 (Plan 05) shipped: revision `cwa-assistant-bot-00014-l5k` deployed. Bot ready, no ERROR on startup. |
| 17:48:48 | User pings bot in Discord. `devto_researcher` 404s on tag `Antigravity+CLI`. Its `is_final_response()` event fires first; bot grabs `"dev.to temporarily unavailable."` and `break`s the iterator. |
| 17:48:48–17:48:49 | `GeneratorExit` propagates through ParallelAgent's `asyncio.TaskGroup`; OpenTelemetry emits multiple `Failed to detach context` ERRORs. Root + synthesizer `after_agent_callback` never fire — no `agent.exit` for `community_assistant` or `external_knowledge_synthesizer` for this turn. |
| 19:55 | User reports incomplete Discord reply with screenshot. Cloud Logging confirms truncation + GeneratorExit cascade. |
| 20:01 | Root cause located in `discord_bot/bot.py:213-215`. |
| 20:05 | Fix applied: drain full stream, take latest final-response. Local pytest 180/180 GREEN. |
| 20:11 | Commit `31cb6cb` pushed; redeploy started. |
| 20:32 | Revision `cwa-assistant-bot-00015-bqv` serving 100%. Bot ready, zero ERROR on boot. |
| 20:33 | User retries Discord query. Full synthesizer reply lands (5 GitHub repos dated 2026-05-23, dev.to + SO failures narrated gracefully). Full lifecycle chain confirmed in Cloud Logging: enter+exit on community_assistant, gh_researcher, devto_researcher, so_researcher, external_knowledge_synthesizer. |

## Root cause

```python
# discord_bot/bot.py (PRE-FIX)
async for event in runner.run_async(...):
    events_seen.append(event)
    if event.is_final_response() and event.content:
        response_text = event.content.parts[0].text or ""
        break  # <-- BUG: ADK docstring states this fires per-agent
```

From `google.adk.events.event.Event.is_final_response`:
> Note that when multiple agents participate in one invocation, there could be
> one event has `is_final_response()` as True for each participating agent.

Phase 7 added `output_key="gh_result" / "devto_result" / "so_result"` to the
three leaves (research §2.2), which marks each leaf's terminal event as a
final response. The synthesizer also emits a final response after merging.
The bot was supposed to wait for the synthesizer's reply; instead it took
whoever finished first.

## Fix

```python
# discord_bot/bot.py (POST-FIX, commit 31cb6cb)
async for event in runner.run_async(...):
    events_seen.append(event)
    if event.is_final_response() and event.content and event.content.parts:
        text = event.content.parts[0].text or ""
        if text:
            response_text = text  # keep latest; synthesizer/orchestrator wins
```

Drain the full stream; the LAST final-response event with text becomes the
user-facing reply. The ADK runner's iterator naturally terminates after the
orchestrator considers the turn complete, so latency is unchanged in the
happy path (root agent's reply already arrives last). In delegated flows
the cost is one extra await per leaf event (negligible).

## Verification

**Pre-deploy:**
- `pytest -q` → 180/180 pass (no test directly covers the loop logic; see
  Open Question 1 below).

**Post-deploy (revision 00015-bqv, Discord turn 2026-05-23T20:33Z):**

```
agent.enter community_assistant       20:33:40.812
agent.enter gh_researcher             20:33:43.220
agent.enter devto_researcher          20:33:43.220
agent.enter so_researcher             20:33:43.221
agent.exit  devto_researcher    1365ms 20:33:44.586
agent.exit  so_researcher       5009ms 20:33:48.229
agent.exit  gh_researcher       7025ms 20:33:50.246
agent.enter external_knowledge_synthesizer    20:33:50.248
agent.exit  external_knowledge_synthesizer 3637ms 20:33:53.883
agent.exit  community_assistant 13072ms 20:33:53.884
```

Zero ERROR / zero GeneratorExit / zero OpenTelemetry context-detach errors.
Bot reply contained full synthesizer output with 5 GitHub repos dated
2026-05-23 plus graceful dev.to/SO failure narration.

## Impact assessment

**Affected user-visible behavior (latent since Phase 6 ship of fan-out):**

| Turn type | Pre-fix prod behavior | Post-fix |
|-----------|-----------------------|----------|
| Single-agent (greeting, mentorship query, etc.) | OK — only one final_response, break fires at the right one. | OK (no regression). |
| Sequential delegation (e.g., root → onboarding SequentialAgent) | Probably OK by luck — last child's reply arrives last; break catches it only if no earlier child marked a final. Likely truncated when skill_level_extractor's terminal event fired first. **(Needs Discord soak verification.)** | Full SequentialAgent reply surfaces. |
| External-knowledge fan-out | Surfaced whichever leaf finished first. Synthesizer reply NEVER reached the user. ParallelAgent TaskGroup cancelled mid-flight every turn. | Synthesizer reply surfaces; TaskGroup completes cleanly. |

**Why this slipped through all prior smokes:**
- Local `adk web` UI drains the entire event stream, so synthesizer output
  always rendered — Plan 07-04 5-turn smoke was a false positive for the
  fan-out turn.
- No unit/integration test exercises the bot's runner-loop logic against a
  multi-agent event stream — discord_bot tests cover utility helpers only.
- Phase 6 production smoke used a query that hit only one agent.

## Open Questions / follow-ups

1. **OQ1 — Add a regression test for the bot's run_async loop.**
   A pytest with a stub runner yielding `[leaf_A_final, leaf_B_final, root_final]`
   should assert `response_text == root_final.content.parts[0].text`. Effort: XS.
   **Owner: open. Recommend before Phase 8 kick-off.**

2. **OQ2 — Audit other ADK runner integrations.**
   Any caller of `runner.run_async()` that breaks on `is_final_response()` has
   the same bug. Currently bot.py is the only caller in this repo. ✅

3. **OQ3 — Phase 7 Plan 04 soak metrics validity.**
   The soak window opened at 2026-05-23T15:05Z under revision 00013-h6v (with
   the latent bug). All AGENT-PAR-02 P95 data collected before 20:32Z is
   tainted by missing root + synthesizer exits. **Reset soak T0 to
   2026-05-23T20:33Z (revision 00015-bqv).** Soak completes 2026-05-24T20:33Z.

## Status

SHIPPED 2026-05-23T20:32Z — revision `cwa-assistant-bot-00015-bqv` live. Discord retry verified. Postmortem filed.
