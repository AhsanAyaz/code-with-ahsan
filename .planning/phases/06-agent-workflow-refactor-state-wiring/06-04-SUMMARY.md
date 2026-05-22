---
phase: 06-agent-workflow-refactor-state-wiring
plan: 04
subsystem: agent
tags:
  - adk-web
  - cloud-run
  - deploy
  - soak
  - partial-ship
  - agent-par-02-deferred
requires:
  - google-adk>=1.0.0 (installed 1.29.0)
  - Plans 06-01, 06-02, 06-03 all committed
provides:
  - deployed-revision: cwa-assistant-bot-00012-8x6 (us-central1, code-with-ahsan-45496)
  - verified-contract: SequentialAgent surfaces LAST child reply (welcome-last for onboarding, synthesizer-last for external_knowledge) — RESEARCH Open Question 2 resolved YES
  - verified-contract: root LlmAgent's transfer_to_agent routes to SequentialAgent targets (onboarding_agent AND external_knowledge_agent) — RESEARCH Open Question 3 resolved YES
  - verified-contract: AGENT-PAR-01 fail-fast guard handles leaf-level upstream failures gracefully (devto leaf error → synthesizer non-crashing) — verified LIVE in adk web
  - verified-contract: Plan 03 AgentTool wrap (featured_resources_agent) visible in adk web Events tab as a tool call
  - artifact: .planning/phases/06-agent-workflow-refactor-state-wiring/06-04-SOAK-LOG.md (soak log scaffold + deploy record + Final Decision = PARTIAL-SHIP)
affects:
  - cloud-run-service: cwa-assistant-bot (us-central1)
  - .planning/STATE.md (Position + Next Moves #1 handoff for deferred soak)
tech-stack:
  added: []
  patterns:
    - "Cloud Run deploy with --source=. + temp-copy of agent/discord_bot/Dockerfile to repo root (gcloud 533.0.0 dropped --dockerfile flag)"
    - ".gcloudignore restricting upload to agent/ only (avoids pre-1980 mtimes in codewithahsan-revamp/)"
key-files:
  created:
    - .planning/phases/06-agent-workflow-refactor-state-wiring/06-04-SOAK-LOG.md
    - .planning/phases/06-agent-workflow-refactor-state-wiring/06-04-SUMMARY.md
  modified:
    - .planning/STATE.md
decisions:
  - "PARTIAL-SHIP path elected — user override accepted soak deferral; AGENT-PAR-02 marked DEFERRED (not GREEN) per Plan 06-04 success criteria"
  - "STATE.md Next Moves #1 carries the soak handoff to Phase 7/8 (where lifecycle callbacks land — per-leaf timing instrumentation enables finer-grained P95 measurement)"
  - "Deploy procedure deviated from `agent/discord_bot/README.md` line 47 (--dockerfile flag absent in gcloud 533.0.0); workaround documented in SOAK-LOG.md"
  - "Repo unchanged post-deploy — temp Dockerfile + .gcloudignore at repo root removed after successful deploy; no committed artifacts at repo root"
self_check:
  - "✅ adk web 5-turn smoke PASS — all 5 turns produced expected events, no failure-mode symptom"
  - "✅ Cloud Run revision deployed + traffic 100% routed + bot ready log emitted"
  - "✅ SOAK-LOG.md contains all 3 grep-gate strings: 'Baseline P95' + 'T+24h' + 'Final Decision'"
  - "✅ STATE.md updated: Position reflects PARTIAL-SHIP, Next Moves #1 rewritten as Phase 7/8 soak handoff"
  - "✅ HMAC privacy invariant preserved — Phase 6 did not touch usage_metrics.py; USAGE_HASH_SECRET still wired via --set-secrets"
  - "✅ Cross-phase contract handoff documented for Phases 7 + 8 (output_key namespace lock + lifecycle-callback attachment points)"
status: PARTIAL-SHIP
---

# Phase 06 Plan 04 SUMMARY — adk web validate + Cloud Run deploy (24h soak DEFERRED)

## Objective recap

Final gate for Phase 6: validate the three-workstream refactor end-to-end against `adk web` locally, redeploy `cwa-assistant-bot` to Cloud Run, run a 24h soak on existing usage metrics, and ship-or-rollback based on AGENT-PAR-02's ≥40% P95 latency-drop target.

Plan was NOT autonomous — three human checkpoints (smoke verdict, deploy approval, soak decision).

## What landed

### Task 1 — `adk web` 5-turn smoke ✅ PASS

Single conversation, 5 turns. All produced expected events. Full evidence in `06-04-SOAK-LOG.md` Turn-by-turn table.

| Turn | Workstream | Verdict |
|------|-----------|---------|
| 1 | Onboarding (SequentialAgent split) | ✅ skill_level + goals + welcome wrote in order; welcome surfaces last |
| 2 | mentorship_agent state read | ✅ `{user_skill_level?}` + `{user_goals?}` substituted into resolved LLM prompt |
| 3 | projects_agent state read | ✅ same substitution confirmed |
| 4 | external_knowledge (ParallelAgent fan-out) | ✅ 3 interleaved branches under ExternalFanOut + synthesizer fires after; **AGENT-PAR-01 fail-fast guard verified LIVE** (devto leaf failed, synthesizer handled gracefully) |
| 5 | featured_resources AgentTool (Plan 03 surface) | ✅ AgentTool fires in Events tab (after rephrase to "Show me featured blog posts about AI" — initial "Do you have an AI guide?" routed to roadmap_agent; documented for tuning) |

**RESEARCH Open Questions resolved:**

- **Open Question 2 (SequentialAgent surfaces LAST child as user-visible reply)** — RESOLVED **YES**. Welcome-last works for `onboarding_agent`; synthesizer-last works for `external_knowledge_agent`. Pattern transfers across all SequentialAgents in the tree.
- **Open Question 3 (`transfer_to_agent` routes to SequentialAgent targets)** — RESOLVED **YES** for both `onboarding_agent` and `external_knowledge_agent`. No LlmAgent forwarder wrap needed.

**RESEARCH §5.4 talk-demo win confirmed:** three external_knowledge branches appear as separate, interleaved events in the adk web Events tab — not strictly sequential. (Visibility for the conference demo.)

### Task 2 — Cloud Run deploy ✅ DEPLOYED (baseline P95 DEFERRED)

**Baseline P95 pull from Cloud Logging:** DEFERRED per user Option (a) decision (see Decisions section + SOAK-LOG.md). The single observed `latency_ms=18933` from cfp-framing.md remains anecdotal.

**Deploy:**
- **Revision:** `cwa-assistant-bot-00012-8x6` (previous: `cwa-assistant-bot-00011-rdg`)
- **Service URL:** `https://cwa-assistant-bot-205504954450.us-central1.run.app`
- **Traffic:** 100% routed to new revision
- **Image registry:** `us-central1-docker.pkg.dev/code-with-ahsan-45496/cloud-run-source-deploy/cwa-assistant-bot` (Cloud Build server-side build via `--source=.`)
- **Startup log evidence:** `2026-05-22 23:11:22 cwa_assistant_bot INFO Bot ready as CWA Assistant#9755; listening on channel 1504452473056792668`
- **`cpu-throttling=false` annotation:** preserved across redeploy
- **Secrets wired:** `CWA_ASSISTANT_DISCORD_BOT_TOKEN`, `GOOGLE_API_KEY`, `PLATFORM_API_BASE_URL`, `USAGE_HASH_SECRET` (Phase 02.1 HMAC privacy invariant intact)

**Deploy-procedure deviations** (full detail in SOAK-LOG.md "Deploy procedure deviations" section):

1. `--dockerfile` flag rejected by gcloud 533.0.0 — workaround: temp-copied `agent/discord_bot/Dockerfile` to repo root pre-deploy (Dockerfile already expects build context = repo root).
2. First deploy attempt failed with `ZIP does not support timestamps before 1980` because `codewithahsan-revamp/` has files with mtime `312764400` (1979-12-04). Workaround: added `.gcloudignore` restricting upload to `agent/` only.
3. Both temp files removed post-deploy — repo unchanged at root.

### Task 3 — 24h soak ❌ DEFERRED (user override accepted)

User chose Option (a) per resume-signal: *"go with option a. but proceed with the rest of the stuff? we can always come back if something goes wrong."*

- T+1h / T+6h / T+24h observations: not collected
- Baseline P95: not pulled
- P95 drop %: N/A
- Error-rate delta: N/A

**AGENT-PAR-02 status: DEFERRED (NOT GREEN).** Carried over to Phase 7/8 latency investigation via `.planning/STATE.md` Next Moves #1.

## Final SHIP / PARTIAL-SHIP / ROLLBACK decision

**PARTIAL-SHIP (carry-over to next phase).** Recorded in `06-04-SOAK-LOG.md` Final Decision section.

Rationale: Plans 01-03 unit tests (10 + 11 + 10 + 4 contract tests respectively) plus the adk web 5-turn smoke verified all structural contracts (fan-out shape, state propagation, AgentTool wrap, fail-fast guard). User accepted soak risk to keep velocity on remaining Phase 6 close-out. Latency target deferred to Phase 7/8 where lifecycle callbacks instrument the same tree and provide finer-grained per-leaf timing.

## Cross-phase contract handoff to Phase 7

The post-Phase-6 agent tree is exactly what Phase 7's lifecycle callbacks will instrument. Attachment points:

- **`before_/after_agent_callback` per leaf researcher** — `gh_researcher`, `devto_researcher`, `so_researcher` (`agent/community_assistant/sub_agents/external_knowledge/`)
- **`before_/after_agent_callback` per onboarding child** — `skill_level_extractor`, `goals_extractor`, `welcome_agent` (`agent/community_assistant/sub_agents/onboarding_agent.py`)
- **`before_/after_agent_callback` on `external_knowledge_synthesizer`** — for synthesizer LLM-call timing
- **`before_/after_agent_callback` on `content_agent`** — to tag the AgentTool dispatch
- **`before_/after_tool_callback` on wrapped `featured_resources_agent`** — for AgentTool cache (RESEARCH Assumption A6: `skip_summarization=True` could land here too if soak shows token cost wins)

Phase 7's lifecycle logging also delivers the per-leaf timing data needed to close the deferred AGENT-PAR-02 P95 gate (Next Moves #1).

## Cross-phase contract handoff to Phase 8

`output_key` namespace lock from `.planning/milestones/v7.0-ROADMAP.md ## Cross-Phase Contracts` is now realized in production. Live `session.state` keys:

- `user_skill_level` (onboarding_agent → skill_level_extractor.output_key)
- `user_goals` (onboarding_agent → goals_extractor.output_key)
- `gh_result` (external_knowledge_agent → gh_researcher.output_key)
- `devto_result` (external_knowledge_agent → devto_researcher.output_key)
- `so_result` (external_knowledge_agent → so_researcher.output_key)

Phase 8's `mentor_intake_clarifier` will write `user_timezone`, `user_focus_area`, `next_clarifying_question` on top of this base.

## Cross-references

- `.planning/phases/06-agent-workflow-refactor-state-wiring/06-01-SUMMARY.md` — ParallelAgent fan-out
- `.planning/phases/06-agent-workflow-refactor-state-wiring/06-02-SUMMARY.md` — onboarding state split
- `.planning/phases/06-agent-workflow-refactor-state-wiring/06-03-SUMMARY.md` — featured_resources AgentTool wrap
- `.planning/phases/06-agent-workflow-refactor-state-wiring/06-04-SOAK-LOG.md` — soak log + deploy record + Final Decision
- `.planning/STATE.md` Next Moves #1 — Phase 7/8 soak handoff

## Self-Check — PASSED

- [x] adk web 5-turn smoke PASS — no failure-mode symptom
- [x] Cloud Run revision deployed + traffic 100% + bot ready confirmed in logs
- [x] SOAK-LOG.md contains the 3 grep-gate strings ('Baseline P95', 'T+24h', 'Final Decision')
- [x] STATE.md Position reflects PARTIAL-SHIP; Next Moves #1 carries Phase 7/8 soak handoff
- [x] HMAC privacy invariant preserved (Phase 6 did not touch `agent/discord_bot/usage_metrics.py`; USAGE_HASH_SECRET preserved on Cloud Run)
- [x] Cross-phase contract handoff documented for Phases 7 + 8
- [x] Plans 01 + 02 + 03 SUMMARYs are cross-referenced from this SUMMARY
- [x] User override resume-signal recorded verbatim in SOAK-LOG.md
