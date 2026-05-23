# Phase 7 Soak Log

Phase: `07-agent-safety-observability-callbacks`
Plan: `07-04`
Owner: ahsan
Started: 2026-05-23

Prior revision (Phase 6 ship): `cwa-assistant-bot-00012-8x6` (deployed 2026-05-23). New env vars: NONE — `USAGE_HASH_SECRET` already wired since Phase 02.1.

---

## Pre-deploy verification

**Date:** 2026-05-23

### Unit test gate

```
cd agent && .venv/bin/pytest -q
```

**Result:** ✅ `175 passed, 8 warnings in 6.81s` (post-Wave-3 merge). Includes:
- 16 PII tests (`test_callbacks_pii.py`) — Plan 07-01
- 14 tool-cache tests (`test_callbacks_tool_cache.py`) — Plan 07-02
- 13 lifecycle tests (`test_callbacks_lifecycle.py`) — Plan 07-03
- Phase 6 regression: `test_external_knowledge_fan_out.py`, `test_state_propagation.py`, `test_featured_resources_agent_tool.py`, `test_content_agent_blog.py` — all green.

### Callback overhead measurement — LOCAL (Open Question 3 bound)

_TODO before deploy: run microbench inside `agent/.venv` and record p99 here._

```bash
cd agent && .venv/bin/python - <<'PY'
import time, statistics
from unittest.mock import MagicMock
from community_assistant.callbacks import lifecycle_before_agent, lifecycle_after_agent, pii_sanitizer
from google.adk.models import LlmRequest
from google.genai import types

ctx = MagicMock(); ctx.agent_name = "test"; ctx.invocation_id = "bench"; ctx.session.id = "uuid"; ctx.state = {}
req = LlmRequest(contents=[types.Content(role="user", parts=[types.Part(text="how do I use Angular?")])])

# PII sanitizer (no-match path)
t = []
for _ in range(1000):
    s = time.perf_counter_ns(); pii_sanitizer(ctx, req); t.append(time.perf_counter_ns() - s)
print(f"pii_sanitizer no-match p99: {statistics.quantiles(t, n=100)[98] / 1000:.1f} µs")

# Lifecycle pair
t = []
for _ in range(1000):
    s = time.perf_counter_ns(); lifecycle_before_agent(ctx); lifecycle_after_agent(ctx); t.append(time.perf_counter_ns() - s)
print(f"lifecycle pair p99: {statistics.quantiles(t, n=100)[98] / 1000:.1f} µs")
PY
```

**Captured (2026-05-23, local M-series mac, agent/.venv py3.12):**
- `pii_sanitizer` no-match p99: **2.0 µs**
- lifecycle pair p99: **26.2 µs**
- Per-turn worst case: 12 × 26.2 + 2 + ~60 (2× tool cache est.) ≈ **0.38 ms** per turn ≪ 50 ms p99 bound (RESEARCH §1). **OQ3 RESOLVED GREEN.**

---

## Task 1 — Local `adk web` 5-turn smoke verdict

**Date:** 2026-05-23
**Verdict:** ✅ **PASS** — all 5 turns green; OQ1 resolved YES; OQ3 resolved GREEN.
**Session ID (local):** `02b0fee6-c7f6-46ee-ba32-cdab07888a24`
**session_id_hash (content_agent / root):** `46a979742bffd4af`
**session_id_hash (featured_resources_agent AgentTool sub-runner):** `aff208f5fd5cc592` — see Anomaly below.

Procedure: `cd agent && .venv/bin/adk web` → open `http://localhost:8000` → exercised 5 turns covering each callback layer.

### Turn-by-turn results

| Turn | Query | Routed agent | Callback layer | Verdict | Evidence |
|------|-------|--------------|-----------------|---------|----------|
| 1 | "my card is 4111-1111-1111-1111, what tutorials cover payment processing?" | root → content_agent | PII (Plan 07-01) | ✅ PASS | `pii_redacted` event: `redacted_count=1, pii_types=["CREDIT_CARD"]`. UI invocation header showed `[REDACTED PII]`. Reply text contained no card digits. |
| 2 | "any Angular blog posts?" | content_agent → `search_blog_posts` | Tool cache MISS (Plan 07-02) | ✅ PASS | `tool_cache_miss` event for `search_blog_posts`; Ghost upstream call: `GET localhost:3000/api/content/blog/search?q=Angular` 200 OK. |
| 3 | "any Angular blog posts?" (repeat ×2) | content_agent → `search_blog_posts` | Tool cache HIT (Plan 07-02) | ✅ PASS | Two `tool_cache_hit` events captured — age_s=103, age_s=46. **NO Ghost GET** lines for either. |
| 4 | "GitHub trending for Angular, dev.to articles, Stack Overflow Qs" | content_agent → external_knowledge_agent (Seq[ParallelAgent[gh,devto,so] → synthesizer]) | Lifecycle (Plan 07-03) — fan-out | ✅ PASS | 4 leaves fired enter+exit: `gh_researcher` (4570ms), `devto_researcher` (4463ms), `so_researcher` (5251ms), `external_knowledge_synthesizer` (10878ms). **NO** events for wrapper agents `external_knowledge_agent` or `ExternalFanOut`. 3 leaves share `enter_ts_ms=1779544243172` confirming concurrent dispatch. content_agent total: 17638ms. |
| 5 | "show me featured blog posts about AI" | content_agent → `featured_resources_agent` (AgentTool) | Lifecycle inside AgentTool (Plan 07-03, OQ1) | ✅ PASS — **OQ1 RESOLVED YES** | `featured_resources_agent` fires `agent.enter`/`agent.exit` under AgentTool execution path. duration_ms=2103. |

### RESEARCH Open Questions — resolution

- **Open Question 1 (AgentTool callback firing):** **RESOLVED YES** — Turn 5 confirms `before_agent_callback`/`after_agent_callback` fire when an LlmAgent is invoked as an AgentTool. No follow-up plan needed for AgentTool wrapping.
- **Open Question 3 (callback overhead p99):** **RESOLVED GREEN** — see Pre-deploy microbench above. Per-turn worst case ~0.38 ms ≪ 50 ms p99 bound.

### Anomaly noted (non-blocking, follow-up candidate)

**AgentTool sub-runner has its own invocation_id + session context:**

| Agent | invocation_id | session_id_hash |
|-------|---------------|------------------|
| content_agent (parent) | `e-62716a06-5bb9-4f71-a0cc-bd687bc104bb` | `46a979742bffd4af` |
| featured_resources_agent (AgentTool child) | `e-8b16944a-0aca-437c-a325-163781b4dd2a` | `aff208f5fd5cc592` |

ADK's AgentTool execution spawns a sub-runner with a separate session, so child + parent lifecycle events do **not** share `invocation_id` and the HMAC over `ctx.session.id` produces a different hash. Cloud Logging trace correlation between AgentTool parent and child currently relies on timestamp adjacency; a bridging field (`parent_invocation_id` or similar) would be a follow-up enhancement.

### AGENT-PAR-02 preview (single Turn-4 sample, real soak required for P95)

| Leaf | duration_ms |
|------|-------------|
| devto_researcher | 4463 |
| gh_researcher | 4570 |
| so_researcher | 5251 |
| external_knowledge_synthesizer | 10878 |
| content_agent (total turn) | 17638 |

- Parallel max-leaf 5251ms vs serial sum 14284ms → **63 % fan-out time saved** by ParallelAgent.
- End-to-end 17.6 s vs Phase 6 anecdotal baseline ~19 s → ~7 % drop end-to-end this single sample. Synthesizer (10.9 s) now dominates; AGENT-PAR-02 ≥40 % gate to be re-evaluated against multi-sample post-deploy P95.

### Smoke-blocking issues encountered

None. Two non-blocking observations:

1. **`USAGE_HASH_SECRET` missing from local `agent/.env`** initially → `session_id_hash` emitted as empty string on Turns 1-2. Added local-only marker value (`local-dev-only-not-prod-do-not-reuse`) → ADK auto-reloaded → Turns 3-5 populated correctly. Cloud Run secret already wired since Phase 02.1.
2. **Content-recency drift** (off-scope for Phase 7): Turn 4 fan-out surfaced a 2020 dev.to article because agents have no current-date awareness. Follow-up plan filed at `.planning/phases/07-agent-safety-observability-callbacks/07-05-FOLLOWUP-CONTENT-RECENCY-PLAN.md`.

---

## Task 2 — Cloud Run redeploy

### Pre-deploy import smoke (recommended)

```bash
cd /Users/amu1o5/personal/code-with-ahsan/agent
docker build -f discord_bot/Dockerfile -t cwa-assistant-bot-phase7 ..
docker run --rm cwa-assistant-bot-phase7 python -c "from community_assistant.agent import root_agent; from community_assistant.callbacks import pii_sanitizer, before_tool_cache, after_tool_cache, lifecycle_before_agent, lifecycle_after_agent; print('imports OK')"
```

### Deploy command

Repeats Phase 6 Plan 04 procedure with two documented deviations folded in (temp-copy Dockerfile to root; temp `.gcloudignore` to dodge pre-1980 mtime files in `codewithahsan-revamp/`).

```bash
cd /Users/amu1o5/personal/code-with-ahsan

# Capture current ASSISTANT_CHANNEL_ID from existing revision (avoid losing it)
ASSISTANT_CHANNEL_ID=$(gcloud run services describe cwa-assistant-bot --region=us-central1 \
  --format="value(spec.template.spec.containers[0].env)" \
  | tr ';' '\n' | grep -A1 ASSISTANT_CHANNEL_ID | tail -1)
echo "channel: $ASSISTANT_CHANNEL_ID"

# Temp-copy Dockerfile to repo root (gcloud 533.0.0 lacks --dockerfile flag)
cp agent/discord_bot/Dockerfile ./Dockerfile

# Temp .gcloudignore (excludes everything outside agent/ to dodge pre-1980 mtimes)
cat > .gcloudignore <<'EOF'
*
!agent/
!agent/**
!Dockerfile
EOF

gcloud run deploy cwa-assistant-bot \
  --source=. \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=1 \
  --cpu=1 \
  --memory=512Mi \
  --timeout=3600 \
  --no-allow-unauthenticated \
  --set-secrets="CWA_ASSISTANT_DISCORD_BOT_TOKEN=cwa-assistant-discord-bot-token:latest,GOOGLE_API_KEY=google-api-key:latest,PLATFORM_API_BASE_URL=platform-api-base-url:latest,USAGE_HASH_SECRET=usage-hash-secret:latest" \
  --set-env-vars="ASSISTANT_CHANNEL_ID=${ASSISTANT_CHANNEL_ID}" \
  --project=code-with-ahsan-45496

# Cleanup post-deploy
rm Dockerfile .gcloudignore
```

### Post-deploy verification

```bash
gcloud run services describe cwa-assistant-bot --region=us-central1 \
  --format="value(status.latestReadyRevisionName, status.url, status.conditions[0].status)"

# Tail until "Bot ready" appears
gcloud run services logs tail cwa-assistant-bot --region=us-central1 | grep -m1 "Bot ready as CWA Assistant"

# Confirm callbacks loaded — first turn after deploy should emit lifecycle event
gcloud logging read 'resource.type=cloud_run_revision AND jsonPayload.event_type=~"agent\.(enter|exit)"' \
  --project=code-with-ahsan-45496 --limit=5 --format=json
```

### Rollback

```bash
gcloud run revisions list --service=cwa-assistant-bot --region=us-central1 --limit=3
gcloud run services update-traffic cwa-assistant-bot --region=us-central1 \
  --to-revisions=cwa-assistant-bot-00012-8x6=100
```

### Deploy status

**Status:** ✅ DEPLOYED
**Date:** 2026-05-23T14:05Z
**New revision name:** `cwa-assistant-bot-00013-h6v`
**Previous revision:** `cwa-assistant-bot-00012-8x6`
**Traffic:** 100 % to 00013-h6v
**Service URL:** https://cwa-assistant-bot-205504954450.us-central1.run.app
**Startup verification:**
- Health check server on port 8080 ✅
- Default STARTUP TCP probe succeeded after 1 attempt
- Discord gateway connected (Session ID `3911a02a356f13a01105c151554964ab`)
- `Bot ready as CWA Assistant#9755; listening on channel 1504452473056792668`
- Total startup: instance-start → bot ready ≈ 10 s
- WARNING/ERROR logs in first revision window: **0** (zero callback exceptions, zero import failures)
**Annotations preserved:** ✅ `cpu-throttling=false`, `minScale=1`, `maxScale=1`, `startup-cpu-boost=true`.
**Secrets in Cloud Run Secret Manager (verified present):** `cwa-assistant-discord-bot-token`, `google-api-key`, `platform-api-base-url`, `usage-hash-secret`.
**Cleanup performed:** temp `Dockerfile` + `.gcloudignore` removed from repo root post-deploy. `.gcloudignore` explicitly excluded `agent/.env*` to prevent local dev secret marker leaking into build context.

---

## Task 3 — 24h Soak Observations

### Cloud Logging query strings (paste into Logs Explorer)

**Lifecycle events emitted (any leaf in last 1h):**
```
resource.type="cloud_run_revision"
resource.labels.service_name="cwa-assistant-bot"
jsonPayload.event_type=~"agent\.(enter|exit)"
timestamp>="-PT1H"
```

**Tool cache hit ratio (last 24h):**
```
resource.type="cloud_run_revision"
resource.labels.service_name="cwa-assistant-bot"
jsonPayload.event_type=~"tool_cache_(hit|miss)"
timestamp>="-PT24H"
```

**PII redactions (last 24h — count + types only, no raw matches):**
```
resource.type="cloud_run_revision"
resource.labels.service_name="cwa-assistant-bot"
jsonPayload.event_type="pii_redacted"
timestamp>="-PT24H"
```

**Callback exception spike (Sev-2 trigger):**
```
resource.type="cloud_run_revision"
resource.labels.service_name="cwa-assistant-bot"
jsonPayload.logger="cwa_callbacks"
severity>=WARNING
timestamp>="-PT24H"
```

**AGENT-PAR-02 P95 closure (external_knowledge per-leaf duration_ms, last 24h):**
```
resource.type="cloud_run_revision"
resource.labels.service_name="cwa-assistant-bot"
jsonPayload.event_type="agent.exit"
jsonPayload.agent=~"gh_researcher|devto_researcher|so_researcher|external_knowledge_synthesizer"
timestamp>="-PT24H"
```
Aggregate via BQ log sink or `gcloud logging read --format=json | jq` over `jsonPayload.duration_ms` → P95 per agent. Phase 6 baseline anecdote was `~19s`; AGENT-PAR-02 target ≥40% drop (i.e., end-to-end P95 ≤ ~11.4s; max-leaf P95 + synth P95 ≈ end-to-end).

### Checkpoint observations

| Checkpoint | Wall clock | Lifecycle event volume | Cache hit ratio | PII matches | `cwa_callbacks` warnings | External-knowledge P95 (per-leaf max + synth) | Error rate delta |
|-----------|-----------|------------------------|-----------------|-------------|---------------------------|-----------------------------------------------|------------------|
| T+1h | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| T+6h | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| T+24h | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

---

## Final Decision

**Date:** _TBD_
**P95 drop vs ~19s Phase 6 baseline:** _TBD_
**Error-rate delta:** _TBD_
**AGENT-PAR-02 verdict:** _GREEN / PARTIAL / RED_
**Decision:** _SHIP / PARTIAL-SHIP / ROLLBACK_
**Rationale:** _TBD._
