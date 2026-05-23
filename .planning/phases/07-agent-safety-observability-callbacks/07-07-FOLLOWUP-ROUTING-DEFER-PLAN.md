---
plan: 07-07
phase: 07-agent-safety-observability-callbacks
title: Follow-up — Routing miss + leaf-refusal hijack (sub-agent should defer to siblings)
status: PROPOSED
owner: ahsan
created: 2026-05-23
type: follow-up
gap_closure: false
priority: P2
estimated_effort: S (≤ 2h)
parent_observation: Phase 7 Plan 05 sidequest — Discord screenshot showed bot returning so_researcher's "I can only search Stack Overflow" refusal for "find any repo" query.
---

# Plan 07-07 — Routing miss + leaf-refusal hijack

## Why this plan exists

User reported a Discord turn where they asked `"is there any repo for X"` and
got back something like:
> "I can only search Stack Overflow questions. Please ask me about questions on Stack Overflow."

Two related problems:

1. **Routing miss** — `root_agent` delegated a "repo" query to `so_researcher`
   (or `so_researcher` got reached somehow) instead of fanning out via
   `external_knowledge_agent` (which owns gh + devto + so in parallel).
2. **Leaf refusal hijack** — `so_researcher`'s LlmAgent instruction caused it
   to refuse and emit a hard "I can only..." reply. With the now-fixed
   bot drain (Plan 07-06), the LAST final_response wins — but the synthesizer
   surfaces the refusal text verbatim if all three leaves returned similar
   negative replies. More importantly: a leaf should NOT refuse — it should
   call its tool with what it has and let the synthesizer narrate the gap.

This is **off-scope for Phase 7** (safety/observability callbacks). Filed as
a Phase 7 carry-over because the symptom surfaced during Wave 4 / Wave 5
Discord smoke and is a routing-layer fix, not a callback fix.

## Goal

Two-pronged correction:

1. Tighten `root_agent` instruction so "repo / GitHub / open source" queries
   never reach `so_researcher` directly. Owner: `external_knowledge_agent`
   (which then fans out).
2. Soften the three external_knowledge leaf instructions so they:
   - Always call their tool (no LLM-side refusal).
   - On empty / error, return a SHORT structured signal that the synthesizer
     can paraphrase, instead of a hard "I can only..." sentence.

## Scope

**In scope:**
- Edit `community_assistant/agent.py` root instruction: explicit "GitHub repos
  → external_knowledge_agent (NOT so_researcher / NOT gh_researcher directly)".
- Edit `gh_researcher.py`, `devto_researcher.py`, `so_researcher.py`
  instructions: remove any "I can only search X" refusal wording. Standardize:
  "Always call your tool. If the tool returns status='error' or count=0,
  return a one-line status (e.g., 'No matches.' / 'GitHub temporarily
  unavailable.') — never refuse on the LLM side."
- Edit `external_knowledge/synthesizer.py` instruction to absorb single-source
  successes (e.g., "GitHub had 5 hits, dev.to + SO returned nothing relevant —
  here are the GitHub results").
- Add 1–2 unit/integration tests:
  - `test_routing_repo_query_reaches_external_knowledge` — runner trace shows
    `transfer_to_agent("external_knowledge_agent")` for "find me a repo for X".
  - `test_leaf_does_not_refuse_on_irrelevant_query` — stub tool returns
    empty; assert leaf reply contains the structured short-form (no
    "I can only..." phrase).

**Out of scope:**
- Rewriting the routing logic to a router-style sub-agent (overkill for now).
- Adding fuzzy / semantic intent classification.
- Phase 7 retroactive Discord-soak re-validation (covered by Plan 07-06 OQ3).

## Pre-work — capture the failing turn

Before editing instructions, pin down the actual root-agent transfer that
caused the issue. Steps:

```bash
# Filter Cloud Logging for the failing turn (approximate window of the
# user-reported screenshot — adjust timestamp based on Discord message time)
gcloud logging read 'resource.type="cloud_run_revision" \
  AND resource.labels.service_name="cwa-assistant-bot" \
  AND timestamp>="2026-05-23T17:30:00Z" \
  AND timestamp<="2026-05-23T18:00:00Z" \
  AND jsonPayload.event_type="agent.enter"' \
  --limit=50 --project=code-with-ahsan-45496 \
  --format="value(timestamp,jsonPayload.agent,jsonPayload.invocation_id)"
```

Expected diagnosis: either `so_researcher` was entered directly (root
delegation bug), or fan-out happened but so_researcher's reply hijacked the
drain because synthesizer wasn't fired (which is the Plan 07-06 latent bug —
NOW FIXED, so part of the symptom may already be gone).

## Implementation sketch

### root_agent instruction patch (community_assistant/agent.py)

Append to ROOT_INSTRUCTION (under the existing "Disambiguation" section):

```
- "find me a repo / GitHub project / open source code for X" / any single-source
  external content query → external_knowledge_agent (the fan-out, NOT the
  individual gh_researcher / devto_researcher / so_researcher leaves —
  those are internal to the fan-out and must never be addressed directly).
```

### Leaf instruction patches (gh / devto / so researchers)

Standardize the tail of each:

```
NEVER refuse or say "I can only search X". ALWAYS call your tool with the
user query as-is. If the tool returns status='error', return exactly:
"<source> temporarily unavailable.". If count=0, return exactly:
"No <source> matches for this query.". The synthesizer will paraphrase.
```

### Synthesizer instruction patch (external_knowledge/synthesizer.py)

Add explicit guidance for mixed-success/partial-failure:

```
If 1–2 sources returned matches and the others returned "No <source>
matches for this query." or "<source> temporarily unavailable.", lead with
the matches. Mention the gap in ONE sentence at the end (e.g.,
"dev.to and Stack Overflow turned up nothing relevant"). NEVER surface the
exact leaf refusal text verbatim — paraphrase.
```

## Verification

**Pre-deploy:**
1. `pytest -q` — 180 + 2 new tests pass = 182 total.
2. Local `adk web` re-smoke:
   - Turn A: "find me a repo for an AI coding assistant"
     → expect routing to external_knowledge_agent, GitHub repos surfaced.
   - Turn B: "stack overflow answers on RxJS subjects"
     → expect routing to external_knowledge_agent (still), SO surfaced.
   - Turn C: "popular Rust web frameworks on GitHub"
     → expect synthesizer reply not to start with "I can only search X".

**Post-deploy:**
- Repeat Discord screenshot scenario, confirm no leaf-refusal phrase appears.

## Risks

| Risk | Mitigation |
|------|------------|
| Tightening leaf instructions changes well-tested LLM behavior — leaves might start hallucinating data when tools return empty. | Standardized exact strings ("No <source> matches for this query.") give the synthesizer a deterministic gap marker. Add a regression test that the leaf reply for an empty tool result contains the exact string. |
| Synthesizer paraphrasing could drop the SO match URL when SO is the only success. | Add a positive test: stub gh + devto to return empty + so to return 1 result; assert synthesizer reply contains the SO URL. |
| Future addition of a 4th leaf (e.g., Reddit) requires touching all the standardized strings. | Document the contract in a single docstring at `external_knowledge/__init__.py` so the fan-out leaf contract has one home. |

## Effort / Sequencing

- **Effort:** S (≤ 2 h including tests + local smoke).
- **Wave:** standalone — file as Phase 7 carry-over OR roll into Phase 8 prelude.
- **Blockers:** none — independent of Plan 07-06 hotfix (which is already shipped).
- **Suggested timing:** after Plan 07-04 24h soak (reset T0 to 2026-05-23T20:33Z, completes 2026-05-24T20:33Z) so the routing-tighten doesn't perturb soak metrics.

## Open Questions

1. Should `external_knowledge_agent` (the SequentialAgent wrapper) become
   addressable by name from root, OR keep root delegating to its current
   public-facing name? **Default: keep current naming; only tighten instructions.**
2. Should leaf instructions also enforce a `max_words` on their reply to
   reduce drain-time noise? **Default: defer — the synthesizer is the
   bottleneck, not leaf verbosity.**
3. Do we need a router-style LLM (top-level "intent classifier") instead of
   instruction-tuning the root? **Default: no — instruction-tuning has been
   sufficient for every prior routing miss; revisit only if 07-07 itself
   misfires post-ship.**

## Status

PROPOSED — file as Phase 7 carry-over. Promote to active after Plan 07-04
soak completes (2026-05-24T20:33Z) and before Phase 8 kick-off.
