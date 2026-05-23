---
plan: 07-05
phase: 07-agent-safety-observability-callbacks
title: Follow-up — Inject current date into agent context to fix content-recency drift
status: SHIPPED
owner: ahsan
created: 2026-05-23
type: follow-up
gap_closure: false
priority: P2
estimated_effort: S (≤ 2h)
parent_observation: Phase 7 Plan 04 smoke (07-04-SOAK-LOG.md Turn 4)
---

# Plan 07-05 — Content-recency callback (current-date injection)

## Why this plan exists

During Phase 7 Wave 4 smoke (Turn 4: "GitHub trending for Angular, dev.to articles, Stack Overflow Qs"), `devto_researcher` surfaced a **2020** article (`Front-end Weekly News Week - 18 by Anna Coding`) as the top community result. Root cause: ADK agents have no built-in awareness of today's date, so they cannot apply "prefer recent content" filters or rank by recency. Gemini's training cutoff gives the model some sense of time, but no per-request "today" value.

This is **off-scope for Phase 7** (which covers safety/observability callbacks), but the cheapest fix happens to be a callback — so it lives naturally as a Phase 7 follow-up.

## Goal

Ensure every LlmAgent in the community_assistant agent tree receives the current ISO date in its model context on every turn, so the LLM can:

1. Prefer recent articles / repos / SO answers over stale ones.
2. Disambiguate references like "the latest Angular release" or "this year's roadmap".
3. Surface explicitly-dated context that downstream agents can pass through to the user.

## Scope

**In scope:**
- Single callback `inject_current_date` registered as `before_model_callback` on the same agents that already have `pii_sanitizer` wired (root_agent at minimum; optionally per-leaf).
- Light update to a small number of agent `instruction` strings telling the LLM how to use the injected date (e.g., "Prefer results published in the last 12 months unless asked for historical content.").
- Unit tests: `test_callbacks_current_date.py` (≤ 5 tests).

**Out of scope:**
- New `get_current_date` tool (rejected during plan discussion — adds tool-call latency without benefit; system-prompt injection is sufficient).
- Date math beyond ISO date (no time-of-day, no day-of-week).
- Recency filtering at the tool layer (e.g., adding `since=` query params to Ghost / dev.to / SO). Could be a separate Phase 8 plan.

## Implementation sketch

### Callback shape

```python
# agent/community_assistant/callbacks.py — add at module bottom

from datetime import datetime, timezone
from google.adk.models import LlmRequest
from google.genai import types

def inject_current_date(
    callback_context, llm_request: LlmRequest
) -> None:
    """Prepend a single-line `Today is YYYY-MM-DD (UTC).` system note to the
    outgoing LLM request so every model call has current-date awareness.

    Runs AFTER pii_sanitizer (callback registration order matters)."""
    today = datetime.now(timezone.utc).date().isoformat()
    note = types.Content(
        role="user",
        parts=[types.Part(text=f"(Context note) Today is {today} (UTC).")],
    )
    # Insert before first content message
    if llm_request.contents is None:
        llm_request.contents = []
    llm_request.contents.insert(0, note)
```

### Wiring

`agent/community_assistant/agent.py`:

```python
from .callbacks import inject_current_date, pii_sanitizer, ...

root_agent = LlmAgent(
    ...,
    before_model_callback=[pii_sanitizer, inject_current_date],  # ordered list
    ...,
)
```

If ADK's `before_model_callback` accepts only one callable, wrap them into a composed function:

```python
def _root_before_model(ctx, req):
    pii_sanitizer(ctx, req)
    inject_current_date(ctx, req)
```

(Investigate ADK API during execution — Phase 7 used a single callable. Multi-callback support may need a thin composer.)

### Test sketch

`agent/tests/test_callbacks_current_date.py`:

1. `test_date_injected_at_position_zero` — first content part contains `(Context note) Today is`.
2. `test_date_iso_format` — regex matches `YYYY-MM-DD`.
3. `test_date_utc_not_local` — freezegun: pin local TZ ≠ UTC, assert UTC date emitted.
4. `test_empty_contents_initialised` — `llm_request.contents = None` handled.
5. `test_idempotent_within_turn` — calling twice in a row only injects once (or accepts twice; pick one and document).

### Instruction nudge (optional but recommended)

Append one line to root_agent + external_knowledge synthesizer instructions:

> "If results have publish dates, prefer the most recent ones unless the user asks for historical / classic content."

## Verification

**Pre-deploy:**
1. `pytest -q` — 5 new tests pass + existing 175 still green = 180 total.
2. Local `adk web` repeat of Phase 7 Turn 4 ("GitHub trending for Angular, dev.to articles, Stack Overflow Qs") — confirm dev.to article surfaced is from current year (or model explicitly notes age).

**Post-deploy:** No new observability needed; piggybacks on existing lifecycle logging. Confirm via 24h Cloud Run sample that surfaced dev.to / SO content skews recent.

## Risks

| Risk | Mitigation |
|------|------------|
| Token bloat — injecting date on every turn adds ~10 tokens per call × 12 agents | Negligible at current scale (~thousand turns/day × 10 tokens = 10k tokens/day; ~$0.0003/day at gemini-2.5-flash rates). |
| LLM ignores the date hint | Verify via smoke turn that surfaced content is recent. If LLM still ignores it, fold into per-agent instruction (stronger steering). |
| Race with `pii_sanitizer` ordering | Document `[pii_sanitizer, inject_current_date]` as required order in callback registration. PII must run first so any redacted PII does not leak into the date-injected message. |

## Effort / Sequencing

- **Effort:** S (estimated ≤ 2 h including tests).
- **Wave:** can be a standalone Wave 5 of Phase 7 (if shipped before Phase 8), OR roll into Phase 8 as a small prereq.
- **Blockers:** none — independent of Phase 7 Plan 04 deploy.

## Open Questions

1. Inject at root only, or at every leaf? Root-only is cheaper; per-leaf guarantees external_knowledge synthesizer + fan-out leaves see the date. **Default: root + external_knowledge_synthesizer + content_agent.**
2. Does ADK `before_model_callback` accept a list, or only one callable? Verify against current `google-adk` version before merging.

## Status

SHIPPED (2026-05-23) — Cloud Run revision **cwa-assistant-bot-00014-l5k** serving 100% traffic; bot ready on channel 1504452473056792668; zero ERROR logs on startup. Code merged (commit `0175dbb`), 180/180 tests pass, local `adk web` smoke passed.

**Smoke result (Turn: "Any GitHub repos, dev.to articles, or Stack Overflow questions about Google's Antigravity CLI?"):**
- All 5 surfaced GitHub repos dated 2026-05-22 or 2026-05-23 (zero pre-2025 drift). Antigravity CLI was announced ~2 days ago, so recency steering visibly worked.
- Lifecycle clean: all 5 agents fired enter+exit; concurrent fan-out (1ms spread); session_id_hash populated locally.
- Routing clean: root → transfer_to_agent → external_knowledge_agent. No so_researcher hijack from the Discord-bug report.

**Open Questions resolved:**
1. Wired to root + every LlmAgent (12 total: root + content + 3× onboarding + mentorship + projects + roadmap + featured_resources + gh + devto + so + synthesizer). Per-leaf wiring needed because AgentTool sub-runners don't inherit root callbacks.
2. `before_model_callback` accepts a list (per `LlmAgent.canonical_before_model_callbacks` source); root wired as `[pii_sanitizer, inject_current_date]`. Leaves wired with single callable.

**Production smoke (post-deploy) — Discord verification:** PENDING — owner @ahsan to repeat antigravity CLI / recency query in Discord and confirm 2026-dated content.
