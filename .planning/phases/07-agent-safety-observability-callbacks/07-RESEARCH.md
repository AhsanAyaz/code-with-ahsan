# Phase 07: Agent Safety + Observability Callbacks — Research

**Researched:** 2026-05-23
**Domain:** Google ADK Python callbacks — `before_model_callback`, `before_/after_tool_callback`, `before_/after_agent_callback`; PII regex; structured Cloud Logging
**Confidence:** HIGH (all callback API signatures verified against installed ADK 1.29.0 source in `agent/.venv`; example patterns verified against local tutorial repo at `/Users/amu1o5/personal/ai-agents-google-adk/7-agents-and-callbacks/`; ADK version pinned `>=1.29.0,<2.0`)

---

## Summary

Phase 07 adds three independent callback layers to the post-Phase-6 agent tree. None of these touches the structural topology (that is locked by Phase 6). The work is purely additive: (1) a PII-redacting `before_model_callback` wired to `root_agent`; (2) a `before_tool_callback` + `after_tool_callback` pair wiring a TTL-600s cache into `content_agent` (for `search_blog_posts` and `search_youtube_videos`); (3) `before_agent_callback` + `after_agent_callback` lifecycle loggers wired to every sub-agent that is an LlmAgent with a routable name.

All three callback layers work against `tool_context.state` / `callback_context.state` — the same `State` object (ADK 1.x unified `CallbackContext` and `ToolContext` into a single `Context` class). State mutations propagate to the session automatically via the `EventActions.state_delta` mechanism — no explicit flush required.

The key implementation risk is the async ordering: `before_tool_callback` and `after_tool_callback` accept both sync and async signatures (Union[Awaitable[Optional[dict]], Optional[dict]]). For the cache pattern, use `async def` so wall-clock reads (`datetime.now`) are non-blocking in the Discord asyncio event loop.

A secondary risk is that `before_agent_callback` on a `SequentialAgent` or `ParallelAgent` fires for the **wrapper** agent, not for each leaf. Lifecycle logging must therefore be attached to the individual LlmAgents (leaf-level), not to the `SequentialAgent`/`ParallelAgent` wrappers — except where coarse-grained entry/exit per composition node is also desired for dashboard drilldown.

**Primary recommendation:** Follow `example_01` (agent lifecycle), `example_02` (model PII), and `example_05` (tool cache) from the local tutorial repo exactly — all three patterns are already verified working in production-compatible ADK. Consolidate the three callbacks into a single `agent/community_assistant/callbacks.py` module so they are importable without circular-dependency risk.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AGENT-CB-MODEL-01 | `before_model_callback` redacts PII before LLM sees user content. | §3 — exact signature verified; example_02 is the canonical reference; regex catalog in §4. |
| AGENT-CB-TOOL-01 | `before_tool_callback` short-circuits repeat `search_blog_posts` / `search_youtube_videos` queries from `tool_context.state["app_cache"]` TTL 600s. | §3 — `before_tool_callback` signature verified; `tool_context.state` write/read semantics in §5; example_05 is canonical reference. |
| AGENT-CB-TOOL-02 | `after_tool_callback` writes results back to cache and emits `tool_cache_hit`/`tool_cache_miss` structured events. | §3 and §6 — after_tool_callback signature verified; event schema in §6. |
| AGENT-CB-AGENT-01 | `before_agent_callback` emits `agent.enter` with `correlation_id`. | §3 — before_agent_callback signature verified; `callback_context.agent_name` and `invocation_id` available on context; §6 documents event schema. |
| AGENT-CB-AGENT-02 | `after_agent_callback` emits `agent.exit` with `duration_ms`; HMAC privacy invariant preserved. | §3 — after_agent_callback signature verified; timing via state-stored start time; §7 documents which agents get which callbacks. |
| AGENT-TEST-02 | Unit tests for redaction true-positives + negatives, cache TTL boundary, lifecycle event emission. | §8 — test strategy with `freeze_time`, mock LlmRequest, log-capture. |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PII redaction | Agent layer (before_model_callback on root_agent) | — | Sits at the model invocation boundary; catches all content before any LLM sees it, regardless of which sub-agent the root routes to. |
| Tool-result cache | Agent layer (before/after_tool_callback on content_agent) | — | Cache is query-keyed and only meaningful for the two ISR-adjacent tools (search_blog_posts, search_youtube_videos). Leaf-attached because cache key includes tool_name. |
| Lifecycle logging | Agent layer (before/after_agent_callback on each named LlmAgent) | Cloud Logging (structured stdout JSON) | Per-agent enter/exit gives P95-per-agent breakdown needed for AGENT-PAR-02 deferred soak. |
| Correlation IDs | Agent layer (invocation_id from callback_context) | — | ADK `invocation_id` is per-Runner-invocation; use it as the correlation handle across all callbacks for one Discord turn. |
| HMAC privacy | Discord bot bridge (usage_metrics.py) | — | Stays in bot.py; callbacks MUST NOT duplicate or weaken this invariant. |

---

## §1. Post-Phase-6 Agent Tree (canonical state as of Phase 6 PARTIAL-SHIP)

```
root_agent (LlmAgent "community_assistant")            ← before_model_callback attaches here
├── onboarding_agent (SequentialAgent)                  ← before/after_agent_callback on children only
│   ├── onboarding_skill_level (LlmAgent)              ← before/after_agent_callback
│   ├── onboarding_goals (LlmAgent)                    ← before/after_agent_callback
│   └── onboarding_welcome (LlmAgent)                  ← before/after_agent_callback
├── mentorship_agent (LlmAgent)                         ← before/after_agent_callback
├── projects_agent (LlmAgent)                           ← before/after_agent_callback
├── roadmap_agent (LlmAgent)                            ← before/after_agent_callback
├── content_agent (LlmAgent)                            ← before/after_tool_callback + before/after_agent_callback
│   └── [AgentTool: featured_resources_agent (LlmAgent)]← before/after_agent_callback (within tool boundary)
└── external_knowledge_agent (SequentialAgent)          ← wrapper: skip lifecycle (double-logs with children)
    ├── ExternalFanOut (ParallelAgent)                  ← wrapper: skip lifecycle (double-logs with children)
    │   ├── gh_researcher (LlmAgent)                   ← before/after_agent_callback
    │   ├── devto_researcher (LlmAgent)                ← before/after_agent_callback
    │   └── so_researcher (LlmAgent)                   ← before/after_agent_callback
    └── external_knowledge_synthesizer (LlmAgent)      ← before/after_agent_callback
```

State keys locked in Phase 6 (do NOT write over these from callbacks):
- `user_skill_level`, `user_goals` (onboarding_agent output_key writes)
- `gh_result`, `devto_result`, `so_result` (fan-out output_key writes)
- Phase 8 reserves: `user_timezone`, `user_focus_area`, `next_clarifying_question`
- Phase 7 adds: `app_cache` (tool result cache dict, nested under this key)

---

## §2. Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| google-adk | >=1.29.0,<2.0 [VERIFIED: agent/.venv shows 1.29.0 installed] | Callback protocol definitions | Project-pinned; all callback types in this version |
| re (stdlib) | Python 3.12 | PII regex | No new dependency needed |
| json / logging (stdlib) | Python 3.12 | Structured event emission | Follows existing usage_metrics.py pattern |
| datetime (stdlib) | Python 3.12 | TTL wall-clock for cache | Standard; used in example_05 reference |
| hashlib / hmac (stdlib) | Python 3.12 | HMAC correlation_id hashing | Already present in usage_metrics.py; reuse |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| freezegun | Latest | TTL boundary tests (freeze_time decorator) | Tests only; already available or add to dev deps |

**Version verification:** ADK 1.29.0 is installed in `.venv`. Requirements pin `>=1.29.0,<2.0`. No new production packages required.

**Installation (dev only for tests):**
```bash
cd agent && .venv/bin/pip install freezegun
```

---

## §3. ADK Callback API Reference (VERIFIED from installed source)

All signatures verified against `agent/.venv/lib/python3.12/site-packages/google/adk/agents/base_agent.py` and `llm_agent.py`.

**Important:** In ADK >=1.29.0, `CallbackContext` and `ToolContext` are **both aliases** for the unified `google.adk.agents.context.Context` class. They are identical objects.

### 3.1 before_agent_callback / after_agent_callback

Defined on `BaseAgent` (so applies to LlmAgent, SequentialAgent, ParallelAgent).

```python
# TYPE ALIAS (from base_agent.py)
_SingleAgentCallback: TypeAlias = Callable[
    [CallbackContext],                           # positional arg named `callback_context`
    Union[Awaitable[Optional[types.Content]], Optional[types.Content]],
]
```

**Attach point:** `LlmAgent(..., before_agent_callback=fn, after_agent_callback=fn)`

**Short-circuit semantics:**
- `before_agent_callback`: If callback returns a non-None `types.Content`, ADK sets `ctx.end_invocation = True` and yields that content as an Event — the agent body does NOT run. Return `None` to let agent proceed normally.
- `after_agent_callback`: If callback returns a non-None `types.Content`, ADK yields it as an additional Event. Return `None` for side-effects only (logging).

**Available on `callback_context`:**
- `callback_context.agent_name` → `str` — the current agent's name [VERIFIED: readonly_context.py line 49]
- `callback_context.invocation_id` → `str` — unique per Runner.run_async() call [VERIFIED: readonly_context.py line 44]
- `callback_context.user_id` → `str` — raw Discord user ID (MUST NOT log raw) [VERIFIED: readonly_context.py line 64]
- `callback_context.session.id` → `str` — session UUID
- `callback_context.state` → mutable `State` object (read/write) [VERIFIED: context.py]

**Async note:** Callback may be sync or async (framework awaits if `inspect.isawaitable(result)`).

### 3.2 before_model_callback

Defined on `LlmAgent` only (not on SequentialAgent/ParallelAgent, which have no model call).

```python
# TYPE ALIAS (from llm_agent.py)
_SingleBeforeModelCallback: TypeAlias = Callable[
    [CallbackContext, LlmRequest],
    Union[Awaitable[Optional[LlmResponse]], Optional[LlmResponse]],
]
```

**Attach point:** `LlmAgent(..., before_model_callback=fn)`

**Short-circuit semantics:**
- Return `None` to let model call proceed (mutate `llm_request` in place for redaction).
- Return a `LlmResponse` to skip the model call entirely and return that response.
- For PII redaction: mutate `llm_request.contents[-1].parts[0].text` in-place and return `None`. [VERIFIED: example_02]

**Available on `llm_request`:**
- `llm_request.contents` → `list[types.Content]` — full conversation history
- Each `content.role` is `"user"` or `"model"`
- Each `content.parts[0].text` is the text

**Attach to root_agent:** Because `root_agent` is the gateway for all user content, a single `before_model_callback` here intercepts ALL LLM calls that go through the root coordinator. Sub-agents (mentorship_agent, etc.) each make their OWN model calls — their content is the LLM-rewritten/structured routing, NOT the raw user message. Redacting at root_agent catches raw user input. [ASSUMED: sub-agent instructions already have sanitised text; root is the PII entry point]

### 3.3 before_tool_callback / after_tool_callback

Defined on `LlmAgent` only.

```python
# TYPE ALIAS (from llm_agent.py)
_SingleBeforeToolCallback: TypeAlias = Callable[
    [BaseTool, dict[str, Any], ToolContext],
    Union[Awaitable[Optional[dict]], Optional[dict]],
]

_SingleAfterToolCallback: TypeAlias = Callable[
    [BaseTool, dict[str, Any], ToolContext, dict],          # extra arg: tool_response
    Union[Awaitable[Optional[dict]], Optional[dict]],
]
```

**Attach point:** `LlmAgent(..., before_tool_callback=fn, after_tool_callback=fn)`

**Short-circuit semantics:**
- `before_tool_callback`: Return a `dict` to skip the actual tool call and use that dict as the tool result. Return `None` to let the tool run normally. [VERIFIED: example_05 returns `{"cached_result": ...}` on cache hit]
- `after_tool_callback`: Return a modified `dict` to replace the tool result given to the LLM. Return `None` (or the original dict) to pass through. Typically return the (possibly cache-updated) result unchanged.

**Available on `tool_context`:**
- `tool_context.state` → same mutable `State` as `callback_context.state` [VERIFIED: tool_context.py is an alias for context.py]
- `tool.name` → `str` — tool function name
- `args` → `dict[str, Any]` — arguments the LLM passed to the tool

**State write semantics:** Assignments to `tool_context.state["app_cache"] = {...}` are automatically persisted via `EventActions.state_delta` — no flush call needed. [VERIFIED: context.py State.delta mechanism]

---

## §4. PII Redaction Patterns

Source: `example_02_model_input_sanitization/agent.py` [VERIFIED local]

### Regex Catalog

```python
# All patterns verified against ADK example_02 + extended for Discord context
import re

PII_PATTERNS = {
    # Visa/MC/Amex/Discover patterns (16-digit + 15-digit Amex)
    "CREDIT_CARD": re.compile(
        r"\b(?:\d[ -]?){13,16}\b"          # broad: 13-16 digits with optional separators
    ),
    # SSN (US Social Security — commonly posted in naive help requests)
    "SSN": re.compile(r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b"),
    # Discord mention: <@123456789012345678> or <@!123456789012345678>
    "DISCORD_MENTION": re.compile(r"<@!?\d{17,19}>"),
    # Raw Discord snowflake ID (17-19 digit integers NOT preceded by '@' already caught above)
    "DISCORD_SNOWFLAKE": re.compile(r"(?<![<@!])\b\d{17,19}\b"),
    # Email addresses
    "EMAIL": re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"),
    # Phone numbers (international E.164 style)
    "PHONE": re.compile(r"\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),
}

REDACTION_PLACEHOLDER = "[REDACTED PII]"
```

### Failure Modes and False-Positive Risks

| Pattern | False-Positive Risk | Mitigation |
|---------|--------------------|-----------| 
| `CREDIT_CARD` | Port numbers (`:8080`), API version strings (`v20221128`), large numeric IDs that aren't financial | Use word-boundary `\b`; example_02 uses same approach — [VERIFIED] accept small FP rate for safety |
| `DISCORD_SNOWFLAKE` | Year ranges, large numbers in technical questions ("Angular has 50000+ contributors") | The lookbehind `(?<![<@!])` prevents double-redacting mentions; bare 17-19-digit numbers in tech questions are rare [ASSUMED: acceptable FP rate] |
| `SSN` | Three-digit codes followed by two then four digits (e.g., version numbers like `3.12.04`) | Pattern requires `\b` anchors; version strings don't match because the digit-group sizes differ [ASSUMED: low FP rate] |
| `EMAIL` | None expected — email pattern is distinct | — |
| `PHONE` | None expected — E.164 pattern is distinct | — |

### Logging on Redaction

Emit a structured `pii_redacted` event (see §6). Log **count and type only** — never log the raw match or the pre-redaction text. The `before_model_callback` should `print(json.dumps(...))` to stdout so Cloud Logging captures it as `jsonPayload`.

---

## §5. Tool-Result Cache Pattern

Source: `example_05_tool_response_transformation_caching/agent.py` [VERIFIED local]

### Cache Key Derivation

```python
def _derive_cache_key(tool_name: str, args: dict) -> str:
    """Derive a stable cache key from tool name + normalized args."""
    # For search_blog_posts(query: str) and search_youtube_videos(query: str)
    # the only meaningful arg is `query` — normalize to lowercase stripped
    q = str(args.get("query", "")).lower().strip()
    # Remove punctuation that shouldn't affect result identity
    q_norm = re.sub(r"[^\w\s]", "", q).strip()
    return f"{tool_name}__{q_norm}"
```

**Why this works for the two target tools:** Both `search_blog_posts` and `search_youtube_videos` take a single `query: str` argument. A normalized lowercase key is sufficient. No locale arg currently exists on these tools [VERIFIED: content_agent.py].

**Namespace isolation:** The cache lives at `tool_context.state["app_cache"]` (a nested dict). This key does NOT collide with any Phase 6 output_key writes:
- `user_skill_level`, `user_goals`, `gh_result`, `devto_result`, `so_result` are top-level string keys
- `app_cache` is a top-level dict key — nested structure ensures zero collision [VERIFIED: Phase 6 state namespace lock in v7.0-ROADMAP.md]

### TTL Mechanism

Store `(iso_timestamp_str, result_dict)` as the value for each cache key (mirrors example_05 exactly):

```python
import copy
from datetime import datetime, timezone

CACHE_TTL_SECONDS = 600  # 10 minutes

def _is_cache_fresh(entry: tuple, now: datetime) -> bool:
    ts_str, _ = entry
    cached_at = datetime.fromisoformat(ts_str)
    return (now - cached_at).total_seconds() < CACHE_TTL_SECONDS
```

**Wall-clock vs request-time:** Use `datetime.now(timezone.utc)` (wall-clock). Request-time TTL is not a concept in ADK's session model. [ASSUMED: wall-clock TTL is correct; no server-side clock skew risk since the service runs on one Cloud Run instance]

### Eviction

No active LRU eviction needed for v7.0:
- The cache is session-scoped (lives in `InMemorySessionService` session state)
- Sessions are per-Discord-user and survive only until Cloud Run restart
- Each Discord user session will accumulate at most ~O(10) cached queries in a conversation
- Size cap is unnecessary complexity for Phase 7 [ASSUMED: acceptable for production scale; Phase 8 Firestore sessions will need revisiting]

### Cache Miss / Hit Event Emission

Emit to stdout as structured JSON (Cloud Logging picks up `jsonPayload` from stdout on Cloud Run) — same pattern as `usage_metrics.py`.

---

## §6. Structured Logging Shape

### Guiding Constraint
`usage_metrics.py` establishes the project's logging convention: single-line JSON to stdout, Cloud Run captures as `jsonPayload`. Phase 7 follows the same pattern. **Raw user content, raw user_id, and raw Discord IDs MUST NOT appear in any log payload.**

### Event Schemas

All events share these common fields:

```json
{
  "severity": "INFO",
  "event_type": "<event_name>",
  "agent": "<agent_name>",
  "invocation_id": "<adk_invocation_id>",
  "session_id_hash": "<hmac_16_hex_chars>"
}
```

`session_id_hash` uses `hash_user_id(callback_context.session.id, USAGE_HASH_SECRET)` from the existing `usage_metrics.py` — session IDs are UUIDs (not PII) but hashing is defensive and consistent with v6.0 HMAC convention. [ASSUMED: reusing `hash_user_id` for session ID is proportionate; UUID is not PII but the convention is established]

#### agent.enter

```json
{
  "severity": "INFO",
  "event_type": "agent.enter",
  "agent": "mentorship_agent",
  "invocation_id": "abc123",
  "session_id_hash": "deadbeef12345678",
  "enter_ts_ms": 1716432000123
}
```

`enter_ts_ms` is written to `callback_context.state[f"_cb_enter_{agent_name}"]` for duration calculation in `after_agent_callback`. Use a private key prefix `_cb_` to avoid colliding with output_key namespace. [VERIFIED: example_01 uses `callback_context.state["interaction_start_time"]` — same pattern]

#### agent.exit

```json
{
  "severity": "INFO",
  "event_type": "agent.exit",
  "agent": "mentorship_agent",
  "invocation_id": "abc123",
  "session_id_hash": "deadbeef12345678",
  "duration_ms": 1543
}
```

#### tool_cache_hit

```json
{
  "severity": "INFO",
  "event_type": "tool_cache_hit",
  "agent": "content_agent",
  "tool": "search_blog_posts",
  "invocation_id": "abc123",
  "session_id_hash": "deadbeef12345678",
  "age_s": 47
}
```

#### tool_cache_miss

```json
{
  "severity": "INFO",
  "event_type": "tool_cache_miss",
  "agent": "content_agent",
  "tool": "search_blog_posts",
  "invocation_id": "abc123",
  "session_id_hash": "deadbeef12345678"
}
```

#### pii_redacted

```json
{
  "severity": "INFO",
  "event_type": "pii_redacted",
  "agent": "community_assistant",
  "invocation_id": "abc123",
  "session_id_hash": "deadbeef12345678",
  "redacted_count": 1,
  "pii_types": ["CREDIT_CARD"]
}
```

**What never appears in any log:**
- Raw user message text
- Raw `user_id` (the Discord snowflake integer)
- Matched PII strings
- Raw session UUID (replace with HMAC hash)

### Correlation ID Source

Use `callback_context.invocation_id` as the correlation handle. This is ADK's own per-`run_async()` unique identifier — one Discord message = one `run_async()` call = one `invocation_id` value shared across all callback events for that turn. [VERIFIED: readonly_context.py `invocation_id` property]

This is preferable to generating a `uuid4()` inside the callback because ADK already provides it; using the ADK invocation_id means log entries cross-correlate with any ADK framework traces.

### Cloud Logging Severity Mapping

| Condition | Severity |
|-----------|----------|
| Normal operation (enter/exit, cache hit/miss) | `INFO` |
| PII redacted | `INFO` (not WARNING — redaction is expected normal operation) |
| Callback exception caught and swallowed | `WARNING` |
| Callback exception that would crash agent | `ERROR` (log before re-raise) |

---

## §7. Attachment Topology

Exhaustive list of which callbacks go on which agents. This is the canonical reference for the planner.

| Agent | Type | before_model_callback | before_tool_callback | after_tool_callback | before_agent_callback | after_agent_callback | Notes |
|-------|------|-----------------------|---------------------|--------------------|-----------------------|---------------------|-------|
| `community_assistant` (root_agent) | LlmAgent | pii_sanitizer | — | — | lifecycle_logger | lifecycle_logger | PII redaction at root catches all raw user content |
| `onboarding_agent` | SequentialAgent | — | — | — | — | — | Wrapper; skip to avoid double-logging with children |
| `onboarding_skill_level` | LlmAgent | — | — | — | lifecycle_logger | lifecycle_logger | Child LlmAgent; lifecycle useful for timing |
| `onboarding_goals` | LlmAgent | — | — | — | lifecycle_logger | lifecycle_logger | Child LlmAgent |
| `onboarding_welcome` | LlmAgent | — | — | — | lifecycle_logger | lifecycle_logger | User-facing final child |
| `mentorship_agent` | LlmAgent | — | — | — | lifecycle_logger | lifecycle_logger | Leaf specialist |
| `projects_agent` | LlmAgent | — | — | — | lifecycle_logger | lifecycle_logger | Leaf specialist |
| `roadmap_agent` | LlmAgent | — | — | — | lifecycle_logger | lifecycle_logger | Leaf specialist |
| `content_agent` | LlmAgent | — | cache_before | cache_after | lifecycle_logger | lifecycle_logger | Tool cache for blog/youtube + lifecycle |
| `featured_resources_agent` | LlmAgent (AgentTool) | — | — | — | lifecycle_logger | lifecycle_logger | Called within AgentTool boundary; lifecycle still fires |
| `external_knowledge_agent` | SequentialAgent | — | — | — | — | — | Wrapper; skip to avoid double-logging |
| `ExternalFanOut` | ParallelAgent | — | — | — | — | — | Wrapper; skip; children give per-branch timing |
| `gh_researcher` | LlmAgent | — | — | — | lifecycle_logger | lifecycle_logger | Parallel branch leaf |
| `devto_researcher` | LlmAgent | — | — | — | lifecycle_logger | lifecycle_logger | Parallel branch leaf |
| `so_researcher` | LlmAgent | — | — | — | lifecycle_logger | lifecycle_logger | Parallel branch leaf |
| `external_knowledge_synthesizer` | LlmAgent | — | — | — | lifecycle_logger | lifecycle_logger | Sequential tail; timing tells synthesis cost |

**Note on `featured_resources_agent` (AgentTool):** The `AgentTool` wrapper causes `featured_resources_agent` to be invoked as a tool call inside `content_agent`. The `before_agent_callback` on `featured_resources_agent` still fires when the agent runs — it runs inside the AgentTool execution path. [ASSUMED: ADK AgentTool invokes the underlying agent via the standard agent runner path so callbacks fire; needs confirming in smoke test]

**Note on SequentialAgent/ParallelAgent wrappers:** `before_agent_callback` CAN be attached to SequentialAgent and ParallelAgent (they inherit from BaseAgent). Attaching it to wrapper nodes AND their children would cause double-logging. Skip the wrappers; leaf LlmAgents provide sufficient granularity.

---

## §8. Test Strategy

### Test Framework (existing)
| Property | Value |
|----------|-------|
| Framework | pytest 9.0 + pytest-asyncio 1.3.0 [VERIFIED: .venv dist-info] |
| Config | `agent/pyproject.toml` `[tool.pytest.ini_options]` |
| asyncio_mode | `auto` — no `@pytest.mark.asyncio` decorators needed [VERIFIED: pyproject.toml] |
| Quick run | `cd agent && .venv/bin/pytest tests/test_callbacks.py -x` |
| Full suite | `cd agent && .venv/bin/pytest tests/ -x` |

### New test file: `agent/tests/test_callbacks.py`

#### Pattern: Mock LlmRequest for before_model_callback

```python
from google.adk.models import LlmRequest
from google.genai import types

def _make_llm_request(user_text: str) -> LlmRequest:
    return LlmRequest(
        contents=[
            types.Content(role="user", parts=[types.Part(text=user_text)])
        ]
    )
```

ADK `LlmRequest` is a simple Pydantic model — no special mocking needed. [VERIFIED: llm_agent.py imports]

#### Pattern: Mock CallbackContext / ToolContext

`CallbackContext` and `ToolContext` are both `Context` (the unified class). `Context` requires an `InvocationContext`. The simplest approach for unit tests is to patch `context.state` directly using a `MagicMock` or to instantiate the real class with a minimal stub InvocationContext.

The most reliable pattern for unit tests: **test the callback function directly** by constructing a minimal mock that satisfies the state read/write interface:

```python
from unittest.mock import MagicMock

def _make_mock_context(initial_state: dict | None = None):
    state = dict(initial_state or {})
    ctx = MagicMock()
    ctx.state.__getitem__ = lambda self, k: state[k]
    ctx.state.__setitem__ = lambda self, k, v: state.update({k: v})
    ctx.state.get = lambda k, default=None: state.get(k, default)
    ctx.agent_name = "test_agent"
    ctx.invocation_id = "test-inv-001"
    ctx.user_id = "999999999999999999"
    ctx.session.id = "test-session-001"
    return ctx, state
```

#### Pattern: freeze_time for TTL boundary

```python
from freezegun import freeze_time
from datetime import datetime, timezone

@freeze_time("2026-05-23 12:00:00")
def test_cache_miss_after_ttl():
    # Write a cache entry with timestamp = now
    # Advance time by 601s
    with freeze_time("2026-05-23 12:10:01"):
        # Assert cache returns None (expired)
        ...
```

#### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | File | Key Assertion |
|--------|----------|-----------|------|---------------|
| AGENT-CB-MODEL-01 | CC pattern redacted to `[REDACTED PII]` | unit | test_callbacks.py | `llm_request.contents[-1].parts[0].text` contains placeholder |
| AGENT-CB-MODEL-01 | Non-PII text passes through unchanged | unit | test_callbacks.py | text unchanged after callback |
| AGENT-CB-MODEL-01 | Discord mention `<@123456789012345678>` redacted | unit | test_callbacks.py | placeholder present |
| AGENT-CB-MODEL-01 | Multiple PII types in one message | unit | test_callbacks.py | all replaced, count=2 in emitted event |
| AGENT-CB-MODEL-01 | Negative: port numbers not redacted | unit | test_callbacks.py | `":8080"` string survives unmodified |
| AGENT-CB-TOOL-01 | Cache miss: before_tool_callback returns None | unit | test_callbacks.py | return value is None |
| AGENT-CB-TOOL-01 | Cache hit (fresh): before_tool_callback returns cached dict | unit | test_callbacks.py | return value is cached dict |
| AGENT-CB-TOOL-01 | Cache hit (expired by 1s): before_tool_callback returns None | unit + freeze_time | test_callbacks.py | return value is None after TTL+1s |
| AGENT-CB-TOOL-01 | Only target tools are cached (not search_github_repos) | unit | test_callbacks.py | non-target tool: return None regardless |
| AGENT-CB-TOOL-02 | after_tool_callback writes to state["app_cache"] | unit | test_callbacks.py | `state["app_cache"][key]` set after call |
| AGENT-CB-AGENT-01 | before_agent_callback emits JSON with event_type="agent.enter" | unit + log capture | test_callbacks.py | captured stdout contains `"agent.enter"` |
| AGENT-CB-AGENT-02 | after_agent_callback emits JSON with duration_ms > 0 | unit + log capture | test_callbacks.py | `duration_ms` field present and int |

#### Pattern: log capture for structured event assertion

```python
import io
import json
import sys

def _capture_stdout(fn, *args, **kwargs):
    buf = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = buf
    try:
        result = fn(*args, **kwargs)
    finally:
        sys.stdout = old_stdout
    output = buf.getvalue()
    events = [json.loads(line) for line in output.strip().splitlines() if line.strip()]
    return result, events
```

### Wave 0 Gaps (files that must be created before implementation)

- [ ] `agent/tests/test_callbacks.py` — covers all AGENT-CB-* requirements
- [ ] `agent/community_assistant/callbacks.py` — consolidates all 3 callback layers

No framework changes needed. `freezegun` may need adding to dev deps if not present:
```bash
cd agent && .venv/bin/pip install freezegun
# Add to pyproject.toml [dependency-groups].dev
```

---

## §9. Common Pitfalls

### Pitfall 1: Callback exceptions silently crashing vs. swallowing

**What goes wrong:** An unhandled exception inside a callback (e.g., a regex compile error, a state serialization failure) propagates up through ADK's `_handle_before_agent_callback`. ADK does NOT wrap callbacks in try/except — the exception escapes to the Runner, which propagates it to `bot.py`'s `on_message` handler. `on_message` has a top-level `except Exception` that sends the error reply and logs it, so the bot stays alive, but the user gets an error response.

**Why it happens:** ADK callbacks are invoked directly without defensive wrapping [VERIFIED: base_agent.py `_handle_before_agent_callback` — no try/except around the callback call].

**How to avoid:** Each callback function MUST have its own `try/except Exception` that logs the error (as a WARNING) and returns `None` (continue as if callback did nothing). Never let a monitoring callback kill a user interaction.

```python
def safe_before_agent_callback(callback_context):
    try:
        # ... actual logic
        return None
    except Exception:
        import logging
        logging.getLogger("cwa_callbacks").warning("before_agent_callback failed", exc_info=True)
        return None
```

### Pitfall 2: PII regex over-redacting legitimate numeric data

**What goes wrong:** A user asks "I have 150000 GitHub stars on my project" or "Angular version 19000001" — a naive 17-19-digit pattern redacts these.

**Why it happens:** Discord snowflakes are 17-19 digits; large natural numbers in technical English can also be 17-19 digits.

**How to avoid:** The `DISCORD_SNOWFLAKE` pattern has a lookbehind `(?<![<@!])` to skip mentions already caught. Accept a small FP rate: Discord snowflake-shaped numbers in user messages (outside of mentions) are genuinely rare in "help me with Angular" conversations. Log `pii_types` in the event so false-positive spikes are detectable.

**Warning signs:** `pii_redacted` events with `pii_types: ["DISCORD_SNOWFLAKE"]` appearing on queries that contain no mentions; user complaint that question was garbled.

### Pitfall 3: Cache key collision when two tools take similar-looking args

**What goes wrong:** `search_blog_posts(query="angular")` and `search_youtube_videos(query="angular")` would collide on a naive key of just the normalized query.

**Why it happens:** If the key derivation omits `tool_name`, the cache dict maps one result to both tools.

**How to avoid:** Cache key is `f"{tool_name}__{normalized_query}"` — tool_name is the first component, making it impossible for two different tools to share a key. [VERIFIED: example_05 `_generate_cache_key` uses `tool_name` as prefix]

### Pitfall 4: Lifecycle log volume on Cloud Logging quota

**What goes wrong:** A single Discord message with a complex routing chain fires enter/exit events for ~12 agents (root + 3 onboarding children + 4 specialists + 3 fan-out leaves + synthesizer). At 100 messages/day (conservative estimate for a 4600-member community), that's ~1200 log entries/day just from lifecycle events — negligible against Cloud Logging free tier (50 GiB/month ingestion).

**Why it happens:** Not a real risk at current scale. Document for awareness.

**How to avoid:** Add a `severity: INFO` guard — if structured lifecycle logging starts causing quota issues, downgrade to `DEBUG` and set a Cloud Logging exclusion filter. The current `usage_metrics.py` `bot_message` events are also `INFO` so this is consistent.

**Warning signs:** Cloud Logging costs increase unexpectedly; review with `gcloud logging metrics` after a week of production traffic.

### Pitfall 5: Async ordering in ParallelAgent — lifecycle enter/exit interleaving

**What goes wrong:** `gh_researcher`, `devto_researcher`, and `so_researcher` run concurrently inside `ExternalFanOut`. Their `before_agent_callback` / `after_agent_callback` may fire out-of-order relative to each other. If the lifecycle logger writes a shared state key (e.g., a per-invocation list of entered agents), concurrent writes may race.

**Why it happens:** `ParallelAgent` runs sub-agents concurrently. Each sub-agent's callback fires in its own coroutine. [ASSUMED: ADK ParallelAgent uses asyncio.gather semantics; concurrent state writes to the same dict key are not guaranteed to be atomic]

**How to avoid:** Each lifecycle callback uses an agent-scoped state key (`_cb_enter_{agent_name}`) — no shared mutable state across parallel branches. The `agent.enter` / `agent.exit` events are emitted to stdout (one `sys.stdout.write + flush` per event) — GIL ensures each write is atomic in CPython.

---

## §10. Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|-----------|
| R1 | Callback exception crashes user response | Medium — regex or state bugs are plausible | HIGH — user gets error reply | Wrap all callbacks in `try/except`; return `None` on any exception; log as WARNING |
| R2 | PII regex false-positives garble legitimate technical questions | Low-Medium — 17-19 digit numbers in general tech text | MEDIUM — degraded user experience | Accept low FP rate; monitor `pii_redacted` events; allow tuning per production data |
| R3 | Cache key collision corrupts results | Low — tool_name prefix prevents it | HIGH — user sees wrong content | `f"{tool_name}__{normalized_query}"` pattern; unit test specifically for same query / different tool |
| R4 | Cloud Logging quota / cost spike | Very Low at current scale | LOW | Monitor first week; INFO level is consistent with existing usage_metrics; easy to downgrade |
| R5 | `featured_resources_agent` (AgentTool) callbacks fire inside tool execution — unexpected double-logging | Medium — AgentTool wrapper behavior needs verification | LOW — just extra log lines | Verify in smoke test; if double-logging detected, omit lifecycle callbacks from featured_resources_agent |

---

## §11. Code Examples (Verified Patterns)

### before_model_callback — PII sanitizer

```python
# Source: verified local example_02 + extended with Discord patterns
import json
import re
import sys
from typing import Optional
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmRequest, LlmResponse

PII_PATTERNS = {
    "CREDIT_CARD": re.compile(r"\b(?:\d[ -]?){13,16}\b"),
    "SSN": re.compile(r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b"),
    "DISCORD_MENTION": re.compile(r"<@!?\d{17,19}>"),
    "DISCORD_SNOWFLAKE": re.compile(r"(?<![<@!])\b\d{17,19}\b"),
    "EMAIL": re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"),
}
REDACTION_PLACEHOLDER = "[REDACTED PII]"

def pii_sanitizer(
    callback_context: CallbackContext,
    llm_request: LlmRequest,
) -> Optional[LlmResponse]:
    try:
        if not llm_request.contents:
            return None
        for content in reversed(llm_request.contents):
            if content.role == "user" and content.parts:
                text = content.parts[0].text or ""
                redacted_types = []
                for pii_type, pattern in PII_PATTERNS.items():
                    if pattern.search(text):
                        text = pattern.sub(REDACTION_PLACEHOLDER, text)
                        redacted_types.append(pii_type)
                if redacted_types:
                    content.parts[0].text = text
                    sys.stdout.write(json.dumps({
                        "severity": "INFO",
                        "event_type": "pii_redacted",
                        "agent": callback_context.agent_name,
                        "invocation_id": callback_context.invocation_id,
                        "redacted_count": len(redacted_types),
                        "pii_types": redacted_types,
                    }) + "\n")
                    sys.stdout.flush()
                break  # Only process most recent user message
        return None  # Always proceed — never short-circuit
    except Exception:
        import logging
        logging.getLogger("cwa_callbacks").warning("pii_sanitizer error", exc_info=True)
        return None
```

### before_tool_callback — cache lookup

```python
# Source: verified local example_05 + adapted for project conventions
import copy
import json
import sys
from datetime import datetime, timezone
from typing import Any, Optional
from google.adk.tools import BaseTool
from google.adk.tools.tool_context import ToolContext

CACHEABLE_TOOLS = frozenset({"search_blog_posts", "search_youtube_videos"})
CACHE_TTL_SECONDS = 600

def _derive_cache_key(tool_name: str, args: dict) -> str:
    import re
    q = str(args.get("query", "")).lower().strip()
    q_norm = re.sub(r"[^\w\s]", "", q).strip()
    return f"{tool_name}__{q_norm}"

async def before_tool_cache(
    tool: BaseTool,
    args: dict[str, Any],
    tool_context: ToolContext,
) -> Optional[dict]:
    try:
        if tool.name not in CACHEABLE_TOOLS:
            return None
        cache_key = _derive_cache_key(tool.name, args)
        app_cache = tool_context.state.get("app_cache", {})
        entry = app_cache.get(cache_key)
        if entry:
            ts_str, cached_result = entry
            try:
                cached_at = datetime.fromisoformat(ts_str)
                now = datetime.now(timezone.utc)
                age_s = int((now - cached_at).total_seconds())
                if age_s < CACHE_TTL_SECONDS:
                    sys.stdout.write(json.dumps({
                        "severity": "INFO",
                        "event_type": "tool_cache_hit",
                        "tool": tool.name,
                        "age_s": age_s,
                    }) + "\n")
                    sys.stdout.flush()
                    return copy.deepcopy(cached_result)
            except ValueError:
                pass  # Malformed timestamp — treat as miss
        sys.stdout.write(json.dumps({
            "severity": "INFO",
            "event_type": "tool_cache_miss",
            "tool": tool.name,
        }) + "\n")
        sys.stdout.flush()
        return None
    except Exception:
        import logging
        logging.getLogger("cwa_callbacks").warning("before_tool_cache error", exc_info=True)
        return None
```

### after_tool_callback — cache write

```python
# Source: verified local example_05 + adapted
async def after_tool_cache(
    tool: BaseTool,
    args: dict[str, Any],
    tool_context: ToolContext,
    tool_response: dict,
) -> Optional[dict]:
    try:
        if tool.name not in CACHEABLE_TOOLS:
            return None
        # Only cache successful results
        if tool_response.get("status") == "error":
            return None
        cache_key = _derive_cache_key(tool.name, args)
        app_cache = dict(tool_context.state.get("app_cache", {}))
        app_cache[cache_key] = (
            datetime.now(timezone.utc).isoformat(),
            copy.deepcopy(tool_response),
        )
        tool_context.state["app_cache"] = app_cache
        return None  # Pass through original response unchanged
    except Exception:
        import logging
        logging.getLogger("cwa_callbacks").warning("after_tool_cache error", exc_info=True)
        return None
```

### before_agent_callback / after_agent_callback — lifecycle logger

```python
# Source: verified local example_01 + adapted with structured JSON output
import json
import sys
from datetime import datetime, timezone
from typing import Optional
from google.adk.agents.callback_context import CallbackContext
from google.genai import types

def _hmac_session_id(session_id: str, secret: str) -> str:
    """Reuse usage_metrics.hash_user_id convention for session IDs."""
    import hashlib, hmac
    if not session_id or not secret:
        return ""
    mac = hmac.new(secret.encode("utf-8"), session_id.encode("utf-8"), hashlib.sha256)
    return mac.hexdigest()[:16]

def make_lifecycle_callbacks(usage_hash_secret: str = ""):
    """Factory so USAGE_HASH_SECRET is captured in closure at bot startup."""

    def before_agent_callback(callback_context: CallbackContext) -> Optional[types.Content]:
        try:
            agent_name = callback_context.agent_name
            now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
            callback_context.state[f"_cb_enter_{agent_name}"] = now_ms
            sys.stdout.write(json.dumps({
                "severity": "INFO",
                "event_type": "agent.enter",
                "agent": agent_name,
                "invocation_id": callback_context.invocation_id,
                "session_id_hash": _hmac_session_id(callback_context.session.id, usage_hash_secret),
                "enter_ts_ms": now_ms,
            }) + "\n")
            sys.stdout.flush()
        except Exception:
            import logging
            logging.getLogger("cwa_callbacks").warning("before_agent_callback error", exc_info=True)
        return None

    def after_agent_callback(callback_context: CallbackContext) -> Optional[types.Content]:
        try:
            agent_name = callback_context.agent_name
            now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
            enter_ms = callback_context.state.get(f"_cb_enter_{agent_name}", now_ms)
            duration_ms = now_ms - enter_ms
            sys.stdout.write(json.dumps({
                "severity": "INFO",
                "event_type": "agent.exit",
                "agent": agent_name,
                "invocation_id": callback_context.invocation_id,
                "session_id_hash": _hmac_session_id(callback_context.session.id, usage_hash_secret),
                "duration_ms": duration_ms,
            }) + "\n")
            sys.stdout.flush()
        except Exception:
            import logging
            logging.getLogger("cwa_callbacks").warning("after_agent_callback error", exc_info=True)
        return None

    return before_agent_callback, after_agent_callback
```

**Wiring in agent.py and sub-agent files:**

```python
# In agent.py (root_agent construction)
import os
from .callbacks import pii_sanitizer, make_lifecycle_callbacks, before_tool_cache, after_tool_cache

_USAGE_HASH_SECRET = os.environ.get("USAGE_HASH_SECRET", "")
_before_lifecycle, _after_lifecycle = make_lifecycle_callbacks(_USAGE_HASH_SECRET)

root_agent = LlmAgent(
    name="community_assistant",
    ...
    before_model_callback=pii_sanitizer,
    before_agent_callback=_before_lifecycle,
    after_agent_callback=_after_lifecycle,
)

# In content_agent.py (add tool cache + lifecycle)
content_agent = LlmAgent(
    name="content_agent",
    ...
    before_tool_callback=before_tool_cache,
    after_tool_callback=after_tool_cache,
    before_agent_callback=_before_lifecycle,
    after_agent_callback=_after_lifecycle,
)
```

**Challenge:** `USAGE_HASH_SECRET` is read from env at `bot.py` startup, not at module import time. The `make_lifecycle_callbacks` factory pattern allows the secret to be captured at bot wiring time. However, agent objects are currently instantiated at module level (import time). 

**Resolution:** Two options:
- A1 (simpler): Use `os.environ.get("USAGE_HASH_SECRET", "")` directly inside the callback function at call time — same as `bot.py` does it. The env var is present when the process starts; late-binding is fine. [ASSUMED: env var is set before any import resolves; true for both Cloud Run and local `adk web`]
- A2 (factory): Use `make_lifecycle_callbacks` as a factory, but defer agent construction to a function called from `_wire_bot()`. More complex, not worth it for Phase 7.

**Recommendation:** Use A1 — read `USAGE_HASH_SECRET` from `os.environ` at callback-call time, not at construction time.

---

## §12. Talk-Demo Angle

The requirements specify two demo panes (Success Criterion 5):

### `before_model_callback` debug pane

**What to show on stage:**
1. Open `adk web` locally (`cd agent && .venv/bin/adk web`)
2. Send a message containing a fake credit card: `@bot my card is 4111-1111-1111-1111 and I need Angular mentors`
3. Click the `before_model_callback` event in the Events tab
4. Show the "Original:" vs "Sanitized:" side-by-side in the event details panel
5. The raw card number never appears in the Cloud Logging `pii_redacted` event (show the log line — only `"pii_types": ["CREDIT_CARD"]` visible)

**Staging note:** The current example_02 uses `print()` for debug output — Phase 7 replaces this with structured JSON to stdout, but the `adk web` Events tab still shows the callback being invoked and its state mutations. The "before model" event in the Events tab shows which callbacks fired; the structured log shows the sanitized form.

### `before_tool_callback` debug pane

**What to show on stage:**
1. Ask: `@bot do you have blog posts about Angular?`
2. In Events tab, see `tool_cache_miss` (first call hits the real API)
3. Ask the same question again (within 60 seconds): `@bot any Angular blog posts?`
4. In Events tab, see `tool_cache_hit` with `age_s: ~5`
5. The second response arrives faster (no HTTP round-trip to the Ghost CMS proxy)
6. Show the Cloud Logging filter for `event_type = "tool_cache_hit"` with the `age_s` field

**Staging note:** The `before_tool_callback` event in `adk web`'s Events tab shows the callback intercepting the tool call. When cache hit occurs, no `search_blog_posts` tool execution event appears — the callback short-circuits before the tool fires. This is the visual "wow" moment on stage.

---

## §13. Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| google-adk | All callbacks | ✓ | 1.29.0 (venv) | — |
| Python 3.12 | runtime | ✓ | 3.12.x | — |
| pytest | AGENT-TEST-02 | ✓ | 9.0.3 | — |
| pytest-asyncio | async callback tests | ✓ | 1.3.0 | — |
| freezegun | TTL boundary tests | needs check | — | Use manual datetime mock instead |

```bash
cd /Users/amu1o5/personal/code-with-ahsan/agent && .venv/bin/pip show freezegun 2>/dev/null | grep Version
```

If not installed: `cd agent && .venv/bin/pip install freezegun` and add to `pyproject.toml [dependency-groups].dev`.

---

## §14. Open Questions

1. **Does `before_agent_callback` fire for `featured_resources_agent` when invoked via AgentTool?**
   - What we know: AgentTool wraps the agent and calls it through the standard ADK runner path. `before_agent_callback` is defined on `BaseAgent` and fires via `run_async`. The AgentTool documentation does not explicitly confirm that callbacks on the wrapped agent fire.
   - What's unclear: Whether AgentTool execution uses the same `parent_context` and fires `_handle_before_agent_callback`.
   - Recommendation: Verify in the Phase 07 Wave 1 smoke test. If callbacks DO fire, `featured_resources_agent` gets lifecycle logging at no extra cost. If they DON'T, accept the gap — the `content_agent`'s own lifecycle callbacks already bracket the AgentTool call.
   - Risk if wrong: Extra unexpected log events (benign) or missing fine-grained timing for `featured_resources_agent` (low impact).

2. **Does `before_model_callback` on `root_agent` fire for ALL sub-agent model calls, or only for the root_agent's own model call?**
   - What we know: `before_model_callback` is defined on `LlmAgent` and fires inside that specific agent's `_run_async_impl`. Sub-agents have their own `_run_async_impl` calls with their own callback chains.
   - What's unclear: Confirmed by reading ADK source — `before_model_callback` on `root_agent` fires ONLY for `root_agent`'s own LLM call. Sub-agent calls fire their own (none, in Phase 7). Raw user content only passes through `root_agent`'s model call — sub-agents receive the conversation context which is the already-sanitized text.
   - Recommendation: Attaching `before_model_callback` only to `root_agent` is correct and sufficient. [VERIFIED: llm_agent.py callback handling is per-agent-instance; no propagation to sub-agents]
   - Risk if wrong: Sub-agents may receive PII in their instruction-expanded prompts if the LLM copies raw text from its context into a sub-agent prompt. Mitigation: verify with a smoke test containing PII + routing to a sub-agent.

3. **What is the performance overhead of 12+ callback invocations per Discord turn?**
   - What we know: Callbacks are pure Python + JSON string operations + a `sys.stdout.write` per event. No I/O, no network calls.
   - What's unclear: Whether multiple `sys.stdout.flush()` calls on a Cloud Run container have measurable latency.
   - Recommendation: Accept as negligible. Each callback invocation is O(microseconds). The dominating latency is LLM API calls (~500ms-2000ms per sub-agent). AGENT-PAR-02 deferred measurement will reveal whether callback overhead is detectable.
   - Risk if wrong: If flush overhead adds ~50ms per turn (12 agents × ~4ms), that's 600ms added latency — borderline for the P95 target. Monitor via lifecycle events themselves (their own `duration_ms`).

---

## §15. Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `before_model_callback` on `root_agent` only intercepts `root_agent`'s own model call; raw user content does NOT flow through sub-agent model calls | §3.2 | Sub-agent LLM calls could receive PII if user text is echoed into sub-agent context; requires adding `before_model_callback` to all LlmAgents |
| A2 | `featured_resources_agent`'s callbacks fire when called via AgentTool (same runner path) | §7 / §12 | Missing lifecycle logs for featured_resources_agent timing; low impact |
| A3 | Wall-clock TTL (600s) is sufficient for `InMemorySessionService` sessions (no server-side time sync issues) | §5 | Clock skew on Cloud Run could cause inconsistent TTL; in practice Cloud Run uses NTP so this is negligible |
| A4 | `os.environ.get("USAGE_HASH_SECRET", "")` at callback call-time is safe (env var present before any callback fires) | §11 | If env var is unset at callback time, session hashes are empty strings — metrics lose identity but don't crash; same degradation path as existing `bot.py` |
| A5 | Session-scoped `app_cache` in `InMemorySessionService` is sufficient for Phase 7 cache targets (≥30% hit rate) | §5 | If Discord users never ask the same question twice in one session, hit rate will be 0%; Phase 8 Firestore sessions will improve persistence across turns |
| A6 | Attaching lifecycle callbacks to SequentialAgent/ParallelAgent wrapper nodes causes double-logging | §7 | May be acceptable if only the wrapper fires (no children fire); needs smoke test |

**If table is empty:** No — A1-A6 require validation during Phase 7 Wave 1 smoke test.

---

## Sources

### Primary (HIGH confidence)
- `agent/.venv/lib/python3.12/site-packages/google/adk/agents/base_agent.py` — `BeforeAgentCallback`, `AfterAgentCallback` type aliases; `_handle_before/after_agent_callback` short-circuit semantics [VERIFIED]
- `agent/.venv/lib/python3.12/site-packages/google/adk/agents/llm_agent.py` — `BeforeModelCallback`, `BeforeToolCallback`, `AfterToolCallback` type aliases [VERIFIED]
- `agent/.venv/lib/python3.12/site-packages/google/adk/agents/context.py` — Unified `Context` class (== CallbackContext == ToolContext), `state` property, `EventActions.state_delta` persistence mechanism [VERIFIED]
- `agent/.venv/lib/python3.12/site-packages/google/adk/agents/readonly_context.py` — `agent_name`, `invocation_id`, `user_id`, `session` properties [VERIFIED]
- `/Users/amu1o5/personal/ai-agents-google-adk/7-agents-and-callbacks/example_01_agent_lifecycle_logging/agent.py` — lifecycle callback pattern [VERIFIED]
- `/Users/amu1o5/personal/ai-agents-google-adk/7-agents-and-callbacks/example_02_model_input_sanitization/agent.py` — model input PII pattern [VERIFIED]
- `/Users/amu1o5/personal/ai-agents-google-adk/7-agents-and-callbacks/example_05_tool_response_transformation_caching/agent.py` — tool cache pattern [VERIFIED]

### Secondary (MEDIUM confidence)
- `v7.0-ROADMAP.md` Cross-Phase Contracts — `output_key` namespace lock, HMAC convention, Cloud Logging event names [project-authoritative]
- `agent/discord_bot/usage_metrics.py` — structured logging convention, `hash_user_id` HMAC utility [project source]

---

## Metadata

**Confidence breakdown:**
- ADK callback API signatures: HIGH — read from installed source
- Example patterns: HIGH — read from verified local tutorial examples
- PII regex catalog: MEDIUM — patterns standard but false-positive rates are [ASSUMED]
- State namespace collision analysis: HIGH — Phase 6 namespace is documented in v7.0-ROADMAP.md
- Talk-demo staging: MEDIUM — based on `adk web` behavior observed in Phase 6 soak log

**Research date:** 2026-05-23
**Valid until:** 2026-06-23 for ADK stable patterns; check ADK release notes if updating beyond 1.32.0 (next-minor)
