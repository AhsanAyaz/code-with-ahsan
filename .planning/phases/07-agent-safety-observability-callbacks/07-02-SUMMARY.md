---
phase: "07-agent-safety-observability-callbacks"
plan: "02"
subsystem: agent
tags: [adk, callbacks, tool-cache, before-tool-callback, after-tool-callback, content-agent, ttl, freezegun]
provides:
  - tool-cache-callbacks
  - app-cache-state-key
requires:
  - google-adk>=1.29.0
  - freezegun>=1.5
  - 07-01-callbacks-py-scaffold
affects:
  - "agent/community_assistant/sub_agents/content_agent.py — before_/after_tool_callback wiring"
key-decisions:
  - "Extended Plan 07-01's callbacks.py in-place (not a new module) — _hmac_session_id is reused directly from same module per RESEARCH §11"
  - "Cache key prefix tool_name__{normalized_query} prevents search_blog_posts/search_youtube_videos collision (T-07-08)"
  - "Error responses (status='error') NOT cached — prevents transient Ghost/YouTube 5xx from poisoning cache for 10 min (T-07-10)"
  - "featured_resources_agent (AgentTool) excluded from CACHEABLE_TOOLS — microsecond dict lookup, no latency benefit from caching"
  - "Cache key normalization: lowercase + strip + punctuation-removal collapses 'Angular Signals!', 'angular signals', '  angular signals  ' to same key"
  - "_StateProxy class (not MagicMock dunder assignment) — lambda-on-MagicMock pattern from plan's <interfaces> example throws TypeError on dunder methods because MagicMock auto-injects self [Rule 1 fix]"
  - "Both callbacks return None on internal exception (logged WARNING) — RESEARCH §9 Pitfall 1; bug never crashes a user turn"
key-files:
  created:
    - agent/tests/test_callbacks_tool_cache.py
  modified:
    - agent/community_assistant/callbacks.py
    - agent/community_assistant/sub_agents/content_agent.py
    - agent/pyproject.toml
    - agent/uv.lock
metrics:
  duration: "~36 minutes"
  completed: "2026-05-23"
  tasks: 2
  files: 5
---

# Phase 07 Plan 02: Tool-Cache before_/after_tool_callback on content_agent Summary

**One-liner:** Tool-result caching layer for content_agent's two ISR-adjacent search tools, keyed by `tool_name__{normalized_query}` with a 600s TTL and full deepcopy-on-read/write isolation, plus 12 cache-behavior tests including freezegun-driven TTL boundary assertions and a privacy gate (raw session UUID never serialized).

## What Was Built

### `agent/community_assistant/callbacks.py` (extended in-place)

Plan 07-01's PII layer is untouched. Four new public exports + one private helper appended:

- `CACHEABLE_TOOLS: frozenset[str]` — `{"search_blog_posts", "search_youtube_videos"}`
- `CACHE_TTL_SECONDS: int = 600` (10 minutes)
- `_derive_cache_key(tool_name, args) -> str` — normalization helper (lowercase + strip + punctuation removal); tool_name prefix prevents cross-tool key collision (T-07-08)
- `async def before_tool_cache(tool, args, tool_context)` — short-circuits on warm cache hit (returns deepcopy of cached dict) and emits structured `tool_cache_hit` / `tool_cache_miss` events
- `async def after_tool_cache(tool, args, tool_context, tool_response)` — copy-on-write `state['app_cache']` write-back; gates error responses (T-07-10)

Both callbacks wrap the entire body in `try/except Exception` (RESEARCH §9 Pitfall 1) — an internal bug never crashes a user turn; failures are logged WARNING to the `cwa_callbacks` logger and the callbacks return `None` (proceed semantics).

### `agent/community_assistant/sub_agents/content_agent.py` (1 import + 2 kwargs)

Single targeted edit — preserves Phase 6 Plan 03 invariants exactly:

```python
from ..callbacks import after_tool_cache, before_tool_cache
…
content_agent = LlmAgent(
    name="content_agent",
    model="gemini-2.5-flash",
    …,
    instruction="""…""",
    before_tool_callback=before_tool_cache,
    after_tool_callback=after_tool_cache,
    tools=[featured_resources_tool, search_blog_posts, search_youtube_videos],
)
```

Tools list ordering preserved (`featured_resources_tool` at index 0 — Phase 6 Plan 03 T-06-10 invariant). Instruction text, `_shape_blog_post`, `_shape_youtube_video`, and the two search functions themselves unchanged.

`grep -l "before_tool_callback" agent/community_assistant/sub_agents/*.py | wc -l` returns 1 — only `content_agent.py` carries the wiring.

### `agent/tests/test_callbacks_tool_cache.py` (new, 388 lines)

14 async tests (12 behaviors + 2 constant sanity checks):

1. `test_before_tool_cache_miss_returns_none_and_emits_event_with_common_fields` — cold cache → 6-field `tool_cache_miss`
2. `test_after_tool_cache_writes_entry_to_state` — populates `(iso_ts, deepcopy(response))` 2-tuple
3. `test_after_tool_cache_does_not_cache_error_response` (T-07-10) — error response NOT cached
4. `test_before_tool_cache_hit_returns_cached_dict_and_emits_event_with_common_fields` — warm cache → 7-field `tool_cache_hit` w/ `age_s` int; **mutation isolation assert**: mutating returned dict does NOT poison cache
5. `test_cache_hit_at_ttl_boundary_599s` — freezegun boundary HIT, `age_s == 599`
6. `test_cache_miss_at_ttl_boundary_601s` — freezegun boundary MISS
7. `test_tool_name_isolation` (T-07-08) — same query, different tool → MISS
8. `test_non_cacheable_tool_returns_none_immediately` — `featured_resources_agent` silent pass-through (no event, no state write)
9. `test_cache_key_normalization_case_and_whitespace` — `"Angular Signals"` / `"  angular signals  "` / `"angular signals!"` collapse to same key
10. `test_multi_key_cache_does_not_collide` — two distinct queries return their own seeded payloads
11. `test_before_tool_cache_malformed_timestamp_treated_as_miss` — defensive `datetime.fromisoformat` fail → treat as miss, no crash
12. `test_exception_swallow_returns_none` — `state.get` raises → returns None + WARNING logged
13. `test_cacheable_tools_exact_set` — exports the exact frozenset
14. `test_cache_ttl_seconds_value` — exports `600`

### `agent/pyproject.toml` + `agent/uv.lock`

Added `freezegun>=1.5` to `[dependency-groups].dev` (via `uv add --dev`).

## Cache Hit Savings (Anecdotal Estimate)

Plan 07-02 verifies via unit + freezegun tests only — the live smoke is deferred to Plan 07-04 Task 1. Expected impact (per RESEARCH §11 — to be confirmed live on `adk web`):

- Cold ("any Angular blog posts?", T=0s): full Ghost-API round-trip via ISR proxy, ~1.5–2.5s (Next.js ISR cache HIT post-warmup; cold ISR upstream rebuild can be ~3–5s).
- Warm (same query, T=5s): `before_tool_cache` returns the cached dict from session state. No HTTP, no tool dispatch event. Expected end-to-end LLM round-trip dominates (~500–800ms for the post-tool synthesis turn).

Estimated savings on a warm hit: ~1.0–1.8s per repeat query (the ISR proxy round-trip + JSON serialization both elided). To be measured live in Plan 07-04 via Cloud Logging `jsonPayload.event_type="tool_cache_hit"` filter.

## Talk-Demo Readiness (Plan 07-04 hook)

The cache_hit Cloud Logging filter ready for live demo:

```
jsonPayload.event_type="tool_cache_hit"
```

Combined with `invocation_id` correlation, this surfaces the "second Angular query" as a single log entry with `age_s: ~5` and NO accompanying `search_blog_posts` tool dispatch event — the visible "no-second-call" moment for the conference talk.

## Confirmation: `featured_resources_agent` is NOT cached

Verified at three layers:

1. **Constant:** `CACHEABLE_TOOLS = frozenset({"search_blog_posts", "search_youtube_videos"})` — `featured_resources_agent` absent.
2. **Code path:** Both `before_tool_cache` and `after_tool_cache` return `None` immediately when `tool.name not in CACHEABLE_TOOLS` (no event emission, no state write).
3. **Test:** `test_non_cacheable_tool_returns_none_immediately` asserts `before_result is None`, `after_result is None`, `"tool_cache_hit"` and `"tool_cache_miss"` absent from captured stdout, and `"app_cache" not in state`.

Rationale (RESEARCH §5): `featured_resources.py` lookups are microsecond-fast dict lookups; caching would add complexity for zero latency benefit.

## Cross-Phase Contract

The `app_cache` state key is now LIVE in production session state for `content_agent` invocations. It joins the locked Phase 6 output_key namespace alongside:

| State key | Owner | Shape |
|-----------|-------|-------|
| `user_skill_level` | Phase 6 onboarding | str |
| `user_goals` | Phase 6 onboarding | str |
| `gh_result` | Phase 6 external_knowledge | dict |
| `devto_result` | Phase 6 external_knowledge | dict |
| `so_result` | Phase 6 external_knowledge | dict |
| `app_cache` | **Phase 7-02 (this plan)** | dict[str, tuple[str, dict]] — `{ "<tool>__<query>": (iso_ts, response) }` |

Phase 8 reserves: `user_timezone`, `user_focus_area`, `next_clarifying_question`. No collision. `grep -c "app_cache" agent/community_assistant/sub_agents/external_knowledge/*.py agent/community_assistant/sub_agents/onboarding_agent.py` returns 0 across the locked Phase 6 modules.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test helper `_make_tool_context` MagicMock dunder-lambda pattern broken**

- **Found during:** Task 2 (GREEN run — 4 tests failed initially: `test_after_tool_cache_writes_entry_to_state`, `test_cache_hit_at_ttl_boundary_599s`, `test_cache_miss_at_ttl_boundary_601s`, `test_cache_key_normalization_case_and_whitespace`).
- **Issue:** The plan's `<interfaces>` example helper assigned `ctx.state.__setitem__ = lambda self, k, v: state.__setitem__(k, v)` to a `MagicMock`. MagicMock wraps assigned callables as bound methods (passing `self` as the mock instance), so calling `state["app_cache"] = ...` invokes the lambda with `(self_mock, "app_cache", value)` — three args, but the lambda is declared with three params including `self`, which collides with MagicMock's auto-injected `self`, throwing `TypeError: lambda takes 2 positional arguments but 3 were given`. Dropping `self` from the lambda signature would only delay the bug (MagicMock STILL injects self at the start, regardless of the lambda's declared signature, so the lambda would receive `(mock_self, k, v)` and would need to be `lambda mock_self, k, v: ...` — but at that point any signature shift breaks symmetry with `__getitem__` and `__contains__`).
- **Fix:** Replaced the lambda-on-MagicMock pattern with a plain `_StateProxy` class that implements `get`, `__getitem__`, `__setitem__`, `__contains__` as proper instance methods over a backing dict. Cleaner, type-correct, and consistent across all dunder methods.
- **Files modified:** `agent/tests/test_callbacks_tool_cache.py` (helper section only; all 12+2 test bodies untouched).
- **Commit:** `1068a52` (bundled with the GREEN implementation commit because the helper fix is necessary for any of the state-write tests to pass).

### Other Notes

- **Plan's `_capture(coro_or_fn)` helper sketch was unused.** The plan's `<action>` block sketches a `_capture(...)` helper for stdout capture, but pytest's built-in `capsys` fixture handles this idiomatically inside async tests with `asyncio_mode = "auto"`. The actual test file uses `capsys` directly — simpler and consistent with how `test_callbacks_pii.py` (Plan 07-01) captures structured events.
- **Test count: 14 instead of 12.** The plan defines 12 behavioral tests; I added 2 trivial sanity tests (`test_cacheable_tools_exact_set` + `test_cache_ttl_seconds_value`) that assert the exported constants directly. These are not deviations — they are the plan's "Sanity: exported constants" footnote made explicit.

No architectural changes. No new dependencies beyond `freezegun>=1.5` (already specified in the plan).

## Self-Check (Self-Verified Before Commit)

- [x] `agent/community_assistant/callbacks.py` has 4 new public exports (`CACHEABLE_TOOLS`, `CACHE_TTL_SECONDS`, `before_tool_cache`, `after_tool_cache`) + 1 new private helper (`_derive_cache_key`).
- [x] `grep -nE "^(PII_PATTERNS|REDACTION_PLACEHOLDER|CACHEABLE_TOOLS|CACHE_TTL_SECONDS|def pii_sanitizer|async def before_tool_cache|async def after_tool_cache)\b" agent/community_assistant/callbacks.py` returns 7 lines.
- [x] `_hmac_session_id` helper still present in `callbacks.py` (Plan 07-01's PII surface preserved).
- [x] `content_agent` LlmAgent constructor has `before_tool_callback=before_tool_cache` AND `after_tool_callback=after_tool_cache` (grep count = 2).
- [x] Only `content_agent.py` carries `before_tool_callback` under `sub_agents/` (grep -l count = 1).
- [x] `tools=[featured_resources_tool, search_blog_posts, search_youtube_videos]` unchanged — Phase 6 Plan 03 T-06-10 invariant intact.
- [x] `freezegun>=1.5` in `agent/pyproject.toml` `[dependency-groups].dev`.
- [x] 14/14 cache tests pass (`agent/tests/test_callbacks_tool_cache.py`).
- [x] 16/16 PII tests still pass (Plan 07-01 regression gate — `agent/tests/test_callbacks_pii.py`).
- [x] **Full agent suite passes: 162 passed in 6.73s.**
- [x] `app_cache` state key absent from Phase 6 modules (`external_knowledge/*.py`, `onboarding_agent.py`) — namespace isolation confirmed.
- [x] Raw session UUID NEVER appears in serialized event JSON (Tests 1 + 4 assert `"test-session-uuid-002" not in captured.out`).
- [x] `session_id_hash` matches `^[0-9a-f]{16}$` on both `tool_cache_hit` and `tool_cache_miss` events (Tests 1 + 4).
- [x] Two commits land: `d77eff8` (RED) and `1068a52` (GREEN).

## Self-Check: PASSED

## TDD Gate Compliance

- [x] RED gate: commit `d77eff8` — `test(07-02): RED — tool cache callback test suite (12 tests) + freezegun dev dep`
- [x] GREEN gate: commit `1068a52` — `feat(07-02): GREEN — tool cache before_/after_tool_callback on content_agent`
- [x] No REFACTOR commit needed — the GREEN code is minimal and idiomatic (matches RESEARCH §11 verbatim).

## Known Stubs

None.

## Threat Flags

No new threat surface beyond what the plan's threat model documents. All in-register threats addressed:

- **T-07-08** (cache key collision) — mitigated by `tool_name__{normalized_query}` prefix; Test 7 is the regression sentinel.
- **T-07-09** (cached PII bleed-through) — defense-in-depth via Plan 07-01's upstream `pii_sanitizer`; no raw user PII reaches tool args.
- **T-07-10** (cache poisoning via error response) — `after_tool_cache` skips `status="error"`; Test 3 is the regression sentinel.
- **T-07-12** (event leaks query content) — hit/miss events contain ONLY the 5 common fields + `tool` + (hit only) `age_s` — no query string, no response body, no raw session UUID. Tests 1 + 4 assert the exact field sets.
- **T-07-13** (missing event on miss/hit) — emission co-located with return statements; Tests 1 + 4 assert event presence.
- **T-07-15** (cross-user cache leak) — each Discord user has a distinct session → distinct `state` → distinct `app_cache` (inherited Phase 02.1 guarantee).
