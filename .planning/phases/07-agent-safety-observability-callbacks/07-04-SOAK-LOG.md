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

**Captured:**
- `pii_sanitizer` no-match p99: _TODO µs_
- lifecycle pair p99: _TODO µs_
- 12 agents × lifecycle pair + 1× pii_sanitizer + 2× tool cache = _TODO µs_ per turn ≪ 50ms p99 bound (RESEARCH §1).

---

## Task 1 — Local `adk web` 5-turn smoke verdict

**Date:** _TBD_
**Verdict:** _PENDING_

Procedure: `cd agent && .venv/bin/adk web` → open `http://localhost:8000` → exercise 5 turns covering each callback layer.

### Turn-by-turn results

| Turn | Query | Routed agent | Callback layer exercised | Expected event(s) | Verdict | Evidence |
|------|-------|--------------|--------------------------|-------------------|---------|----------|
| 1 | "my card is 4111-1111-1111-1111, what tutorials cover payment processing?" | `root_agent` then routes | PII (Plan 07-01) | `pii_redacted` event with `pii_types=["CREDIT_CARD"]`; user-visible reply must NOT echo back `4111-1111-1111-1111` | _PENDING_ | _stdout JSON capture_ |
| 2 | "any Angular blog posts?" | `content_agent` → `search_blog_posts` | Tool cache MISS (Plan 07-02) | `tool_cache_miss` with `tool=search_blog_posts`; Ghost upstream HIT | _PENDING_ | _Events tab screenshot_ |
| 3 | "any Angular blog posts?" (repeat) | `content_agent` → `search_blog_posts` | Tool cache HIT (Plan 07-02) | `tool_cache_hit` with `tool=search_blog_posts`, `age_s≈5`; NO Ghost upstream call | _PENDING_ | _Events tab screenshot_ |
| 4 | "GitHub trending for Angular, dev.to articles, Stack Overflow Qs" | `external_knowledge_agent` (Seq[ParallelAgent[gh,devto,so] → synthesizer]) | Lifecycle (Plan 07-03) — fan-out leaves | `agent.enter` + `agent.exit` for `gh_researcher`, `devto_researcher`, `so_researcher`, `external_knowledge_synthesizer`; **NO** lifecycle events for `external_knowledge_agent` (SequentialAgent wrapper) or `ExternalFanOut` (ParallelAgent wrapper) | _PENDING_ | _stdout JSON capture; verify wrapper-skip rule_ |
| 5 | "show me featured blog posts about AI" | `content_agent` → `featured_resources_agent` (AgentTool) | Lifecycle inside AgentTool (Plan 07-03, Open Question 1) | `agent.enter` + `agent.exit` for `featured_resources_agent` (RESEARCH §14 Open Question 1 — DOES the callback fire under AgentTool execution?) | _PENDING_ | _If events fire: OQ1 RESOLVED YES. If not: OQ1 RESOLVED NO — escalate to follow-up plan_ |

### RESEARCH Open Questions — resolution

- **Open Question 1 (AgentTool callback firing):** _PENDING_ Turn 5 verdict.
- **Open Question 3 (callback overhead p99):** _PENDING_ pre-deploy microbench.

### Smoke-blocking issues encountered

_TBD._

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

**Status:** _PENDING_
**Date:** _TBD_
**New revision name:** _TBD_
**Previous revision:** `cwa-assistant-bot-00012-8x6`
**Traffic:** _TBD_
**Startup verification:** _TBD_
**Annotations preserved:** _TBD — verify `cpu-throttling=false`, `minScale=1`, `maxScale=1`, `startup-cpu-boost=true`._

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
