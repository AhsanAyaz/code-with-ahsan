# Phase 6 Soak Log

Phase: `06-agent-workflow-refactor-state-wiring`
Plan: `06-04`
Owner: ahsan
Started: 2026-05-23

---

## Task 1 — Local `adk web` smoke verdict

**Date:** 2026-05-23
**Verdict:** ✅ **smoke green** — all 5 turns produced expected events, no failure-mode symptom appeared.

### Turn-by-turn results

| Turn | Query | Routed agent | Verdict | Evidence |
|------|-------|--------------|---------|----------|
| 1 | "Hi, I just joined! I'm a junior dev focused on React and want to break into AI engineering. Where should I start?" | `onboarding_agent` (SequentialAgent) | ✅ pass | Children `skill_level_extractor` → `goals_extractor` → `welcome_agent` fired in order. User-visible reply was the warm welcome (NOT the single-word "intermediate" / 40-word goals). State writes confirmed: `user_skill_level="intermediate"`, `user_goals` populated with React + AI engineering refs. |
| 2 | "Can you recommend mentors for me?" | `mentorship_agent` | ✅ pass | Resolved LLM prompt contained substituted `Skill level: intermediate` + `Goals: AI engineering` (verbatim) — proves `{user_skill_level?}` / `{user_goals?}` template substitution works. Initial backend 500 (semantic_search_mentors missing GOOGLE_API_KEY for Next.js) — retried after env set; succeeded. State substitution worked even when backend failed (URL contained `q=AI+engineering`). |
| 3 | "What projects can I contribute to?" | `projects_agent` | ✅ pass | Same skill+goals substitution confirmed in projects_agent's resolved prompt. |
| 4 | "Find me trending Angular repos on GitHub, any dev.to articles, and Stack Overflow questions about Angular signals." | `external_knowledge_agent` (SequentialAgent[ParallelAgent[gh,devto,so] → synthesizer]) | ✅ pass | **§5.4 visibility win confirmed.** Events tab showed three interleaved branches under `ExternalFanOut`, synthesizer fired after. State keys `gh_result`, `devto_result`, `so_result` all populated. **AGENT-PAR-01 fail-fast guard verified LIVE:** dev.to backend failed, leaf returned `{status: error}`, synthesizer handled gracefully without exception propagation. |
| 5 (retry) | "Show me featured blog posts about AI" | `content_agent` → `featured_resources_agent` AgentTool | ✅ pass | Events `#55/56` transfer → content_agent, `#57/58` `featured_resources_agent` tool call (the AgentTool wrap from 06-03), `#59/60` `search_blog_posts`, `#61` reply with 4 AI blog posts + URLs. **Plan 03 AgentTool visibility win confirmed live.** |

### RESEARCH Open Questions — resolved

- ✅ **Open Question 2 (welcome-last surfacing):** RESOLVED YES. SequentialAgent surfaces LAST child's response as user-visible reply. Welcome-last ordering committed by Plan 02 Task 4. Pattern transfers to all SequentialAgents in the tree — including `external_knowledge_agent` where the synthesizer (last child) is what user sees.

- ✅ **Open Question 3 (`transfer_to_agent` routes to SequentialAgent):** RESOLVED YES for both `onboarding_agent` AND `external_knowledge_agent`. Root LlmAgent's `transfer_to_agent` routes successfully to SequentialAgent targets — no LlmAgent forwarder wrap needed. Plan 01 + Plan 02 SequentialAgent shapes both unblocked.

### Initial Turn 5 (first attempt) — partial pass, not blocking

First Turn 5 attempted query "Do you have an AI guide?" routed to `roadmap_agent` instead of `content_agent` — agent read "guide" as roadmap intent. Reasonable routing, not a bug. Rephrased query ("Show me featured blog posts about AI") forced content_agent routing and exercised the AgentTool. Documenting here for future tuning of root coordinator's flagship-content routing instructions.

---

## Task 2 — Baseline P95 + Cloud Run deploy

### Baseline P95 — DEFERRED per user decision

**Date:** 2026-05-23
**Decision:** User picked Option (a) — deploy now, defer 24h soak. AGENT-PAR-02's ≥40% P95 latency-drop gate is NOT measured in this phase.

**Rationale (verbatim user):** *"go with option a. but proceed with the rest of the stuff? we can always come back if something goes wrong."*

**Implication:**
- AGENT-PAR-02 marked **DEFERRED** in the milestone tracker (NOT GREEN).
- Phase 6 ships under the **PARTIAL-SHIP (carry-over)** path per Plan 06-04 success criteria.
- A handoff entry to Phase 7/8 latency investigation must be added to `.planning/STATE.md` "Next Moves" before closing this phase.

**Baseline placeholder:** baseline P95 not pulled. Single observed `latency_ms=18933` from cfp-framing.md (RESEARCH §1.8) remains anecdotal. If user revisits soak, baseline pull procedure is documented in Plan 06-04 Task 2 Part A (Cloud Logging filter on last 7 days, `query_topic=external_knowledge`, `APPROX_QUANTILES(latency_ms, 100)[OFFSET(95)]`).

### Cloud Run deploy

**Service:** `cwa-assistant-bot`
**Region:** `us-central1`
**Build context:** repo root (`/Users/amu1o5/personal/code-with-ahsan`)
**Dockerfile:** `agent/discord_bot/Dockerfile`

**Pre-deploy import smoke (recommended):**
```bash
cd agent && docker build -f discord_bot/Dockerfile -t cwa-assistant-bot-phase6 ..
docker run --rm cwa-assistant-bot-phase6 python -c "from community_assistant.sub_agents.external_knowledge import external_knowledge_agent; from community_assistant.sub_agents.featured_resources import featured_resources_tool; print('imports OK')"
```

**Deploy command (from repo root):**
```bash
gcloud run deploy cwa-assistant-bot \
  --source=. \
  --dockerfile=agent/discord_bot/Dockerfile \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=1 \
  --cpu=1 \
  --memory=512Mi \
  --timeout=3600 \
  --no-allow-unauthenticated \
  --set-secrets="CWA_ASSISTANT_DISCORD_BOT_TOKEN=cwa-assistant-discord-bot-token:latest,GOOGLE_API_KEY=google-api-key:latest,PLATFORM_API_BASE_URL=platform-api-base-url:latest" \
  --set-env-vars="ASSISTANT_CHANNEL_ID=<current channel id from existing service>" \
  --project=$GOOGLE_CLOUD_PROJECT
```

To retrieve current `ASSISTANT_CHANNEL_ID` from running service:
```bash
gcloud run services describe cwa-assistant-bot --region=us-central1 --format="value(spec.template.spec.containers[0].env)"
```

**Post-deploy verification:**
```bash
gcloud run services describe cwa-assistant-bot --region=us-central1 --format="value(status.latestReadyRevisionName, status.url, status.conditions[0].status)"
gcloud run services logs tail cwa-assistant-bot --region=us-central1 | grep -m1 "Bot ready as CWA Assistant"
```

**Rollback (if needed):**
```bash
gcloud run revisions list --service=cwa-assistant-bot --region=us-central1 --limit=2
gcloud run services update-traffic cwa-assistant-bot --region=us-central1 --to-revisions=<previous-revision>=100
```

### Deploy status

**Status:** ✅ DEPLOYED
**Date:** 2026-05-23
**New revision name:** `cwa-assistant-bot-00012-8x6`
**Previous revision:** `cwa-assistant-bot-00011-rdg`
**Service URL:** https://cwa-assistant-bot-205504954450.us-central1.run.app
**Traffic:** 100% routed to new revision.
**Image:** `us-central1-docker.pkg.dev/code-with-ahsan-45496/cloud-run-source-deploy/cwa-assistant-bot` (Cloud Build server-side, source-deploy registry).
**Startup verification:** Cloud Run logs show `2026-05-22 23:11:22 cwa_assistant_bot INFO Bot ready as CWA Assistant#9755; listening on channel 1504452473056792668` — bot reconnected to Discord gateway successfully.
**CPU throttling annotation:** preserved (`run.googleapis.com/cpu-throttling=false`) — Discord gateway event loop not frozen by Cloud Run idle throttling.

### Deploy procedure deviations from documented Plan 06-04 Task 2 Part B

1. **`--dockerfile` flag not supported in gcloud 533.0.0.** The documented `gcloud run deploy --source=. --dockerfile=agent/discord_bot/Dockerfile` invocation from `agent/discord_bot/README.md` line 47 failed: `ERROR: unrecognized arguments: --dockerfile=...`. Workaround: temp-copied `agent/discord_bot/Dockerfile` to repo root before deploy (so `--source=.` auto-detects it). Dockerfile already expects build context = repo root (`COPY agent/discord_bot ...` / `COPY agent/community_assistant ...`). Temp Dockerfile removed post-deploy — repo unchanged.

2. **First attempt failed: `ZIP does not support timestamps before 1980`.** Repo's `codewithahsan-revamp/` subdirectory contains files with mtime `312764400` (1979-12-04 — likely from a `git checkout` that didn't restore mtimes, or a tar extraction). Workaround: added `.gcloudignore` excluding everything outside `agent/` (the Dockerfile only copies `agent/discord_bot/` and `agent/community_assistant/` anyway — no need to upload anything else). Temp `.gcloudignore` removed post-deploy.

3. **Recommendation for future redeploys:** Either (a) update `agent/discord_bot/README.md` deploy command to drop `--dockerfile` flag (replaced by temp-copy-Dockerfile-to-root convention), OR (b) add a permanent root `Dockerfile` that just symlinks/imports the real one + a permanent `.gcloudignore`. Tracked as a minor follow-up — does not block phase close.

---

## Soak T+1h / T+6h / T+24h — DEFERRED

Per user Option (a) decision above. Soak observations not collected in this phase. If user revisits, follow Plan 06-04 Task 3 procedure for the 3 checkpoint observations + Final Decision section.

---

## Final Decision (PARTIAL-SHIP carry-over)

**Date:** 2026-05-23
**P95 drop:** N/A — soak deferred.
**Error-rate delta:** N/A — soak deferred.
**Decision:** **PARTIAL-SHIP (carry-over to next phase)** per user Option (a).
**AGENT-PAR-02 status:** **DEFERRED** (NOT GREEN) — carried over to Phase 7/8 latency investigation.
**User override resume-signal (verbatim):** *"go with option a. but proceed with the rest of the stuff? we can always come back if something goes wrong."*
**Next action:** Add "Next Moves" entry to `.planning/STATE.md` pointing to a Phase 7/8 latency-investigation task (soak revisit). Commit `06-04-SOAK-LOG.md` atomically with the STATE.md handoff entry.
**STATE.md handoff entry path:** `.planning/STATE.md` "Next Moves" section, entry titled "Phase 6 deferred — 24h soak + AGENT-PAR-02 P95 gate (carry-over from 06-04)" — written before phase close.
**Rationale (1-3 sentences):** Plans 01-03 unit tests + adk web 5-turn smoke verified all structural contracts (fan-out, state propagation, AgentTool, fail-fast guard). User accepted soak risk to keep velocity on remaining Phase 6 close-out (code review, regression gate, phase verification, summary). Latency target deferred to Phase 7/8 where lifecycle callbacks (Phase 7) will instrument the same tree and provide finer-grained per-leaf timing.

