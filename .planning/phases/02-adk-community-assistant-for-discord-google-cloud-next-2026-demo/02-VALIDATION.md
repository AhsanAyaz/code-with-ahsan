---
phase: 2
slug: adk-community-assistant-for-discord-google-cloud-next-2026-demo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Hybrid strategy: pytest for the Python agent side, vitest for the Next.js side, manual smoke test for the Discord bridge end-to-end.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Python framework** | pytest 8.x (Wave 0 installs into `agent/.venv`) |
| **Python config file** | `agent/pyproject.toml` (add `[tool.pytest.ini_options]`) |
| **Python quick run command** | `cd agent && uv run pytest -x --tb=short` |
| **Python full suite command** | `cd agent && uv run pytest` |
| **Next.js framework** | vitest 1.x (already present — `vitest.config.ts`) |
| **Next.js quick run command** | `npx vitest run --changed` |
| **Next.js full suite command** | `npx vitest run` |
| **Estimated runtime (Python)** | ~10 seconds |
| **Estimated runtime (Next.js)** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the relevant quick command (Python or Next.js based on files touched).
- **After every plan wave:** Run both full suites in parallel.
- **Before `/gsd:verify-work`:** All full suites green + manual Discord smoke test passed.
- **Max feedback latency:** 45 seconds.

---

## Per-Task Verification Map

Filled in during planning. Each plan's tasks should map to entries here.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-00-01 | 00 | 0 | Wave 0 | infra | `cd agent && uv sync && uv run pytest --collect-only` | ❌ W0 | ⬜ pending |
| 2-01-01 | 01 | 1 | LINKS-01 | unit | `cd agent && uv run pytest tests/test_platform_client.py::test_url_fields` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | LINKS-02 | unit | `cd agent && uv run pytest tests/test_mentorship_agent.py::test_mentor_url_shape` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | LINKS-03 | unit | `cd agent && uv run pytest tests/test_projects_agent.py::test_project_url_and_creator_link` | ❌ W0 | ⬜ pending |
| 2-01-04 | 01 | 1 | LINKS-04 | unit | `cd agent && uv run pytest tests/test_roadmap_agent.py::test_roadmap_url_and_creator_link` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | RAG-01 | unit | `npx vitest run scripts/__tests__/embed-mentor-bios.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | RAG-02 | integration | `npx vitest run src/app/api/mentorship/mentors/semantic-search/__tests__/route.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 2 | RAG-03 | unit | `cd agent && uv run pytest tests/test_semantic_search_mentors.py` | ❌ W0 | ⬜ pending |
| 2-02-04 | 02 | 2 | RAG-04 | manual | see Manual-Only Verifications | n/a | ⬜ pending |
| 2-03-01 | 03 | 3 | BOT-01 | unit | `cd agent && uv run pytest tests/test_discord_bot_message_handler.py` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 3 | BOT-02 | unit | `cd agent && uv run pytest tests/test_discord_bot_session_mapping.py` | ❌ W0 | ⬜ pending |
| 2-03-03 | 03 | 3 | BOT-03 | manual | see Manual-Only Verifications | n/a | ⬜ pending |
| 2-03-04 | 03 | 3 | BOT-04 | manual | see Manual-Only Verifications | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Requirement IDs are provisional — final IDs get assigned by the planner in PLAN.md files.*

---

## Wave 0 Requirements

- [ ] `agent/tests/__init__.py` — empty package marker
- [ ] `agent/tests/conftest.py` — shared fixtures (httpx MockTransport, Firestore mock, fake LLM client)
- [ ] `agent/tests/fixtures/mentors.json` — realistic mentor response payloads mirroring `/api/mentorship/mentors?public=true` shape
- [ ] `agent/tests/fixtures/projects.json` — realistic project payloads mirroring `/api/projects` shape
- [ ] `agent/tests/fixtures/roadmaps.json` — realistic roadmap payloads mirroring `/api/roadmaps?status=approved` shape
- [ ] `agent/tests/fixtures/semantic_mentors.json` — ranked vector-search fixture with bio_excerpt + match_score
- [ ] `agent/pyproject.toml` — add `pytest>=8.0`, `pytest-asyncio>=0.23` to `[dependency-groups].dev` and `[tool.pytest.ini_options]` section
- [ ] `scripts/__tests__/` directory and vitest glob entry for scripts/ if not already covered by `vitest.config.ts`
- [ ] Verify `.env.example` has placeholders for `PLATFORM_API_BASE_URL`, `CWA_ASSISTANT_DISCORD_BOT_TOKEN`, `GOOGLE_API_KEY` (already present)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end Discord @mention → agent reply with real mentor data | BOT-03 | Requires a live Discord server, live Discord token, real Gemini API call, real Firestore data. Cannot be reliably mocked in CI. | (1) Deploy bot to Cloud Run with min-instances=1. (2) @mention the bot in `#ask-the-assistant` in private test server: "Find me an Angular mentor". (3) Assert within 15s the bot replies with ≥1 mentor whose bio contains "angular" (case-insensitive), with a clickable https://codewithahsan.dev/mentors/... link. |
| Bot handles concurrent @mentions without crashing | BOT-04 | Concurrent-load behavior is hard to unit-test meaningfully; relies on live Discord gateway. | (1) Have 3 users @mention the bot within 10s in the test server. (2) Assert all 3 get replies, no gateway disconnect in Cloud Run logs, no 500s in agent service. |
| Firestore Vector Search returns live results over real 28-mentor dataset | RAG-04 | Firebase Emulator does not support vector fields (confirmed in 02-RESEARCH.md §3). Must be tested against real Firestore. | (1) Run `npx tsx scripts/embed-mentor-bios.ts` against prod Firebase project. (2) Verify all 28 `mentorship_profiles` docs now have `bioEmbedding` (768 dims) and `bioEmbeddingGeneratedAt`. (3) `curl "https://codewithahsan.dev/api/mentorship/mentors/semantic-search?q=angular"` returns ranked mentors with bio_excerpt + match_score. (4) Confirm Muhammad Ali ranks in top 3 for "angular" query. |
| Cloud Run bot reconnects to Discord gateway after restart | BOT-05 | Requires triggering a real restart and watching logs. | (1) `gcloud run services update cwa-assistant-bot --region=us-central1 --min-instances=1`. (2) Force a restart. (3) Tail logs — assert gateway reconnect within 30s and a subsequent @mention in the test server gets a reply. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or are listed in Manual-Only Verifications with clear instructions
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (pytest install, fixtures, conftest)
- [ ] No watch-mode flags in automated commands
- [ ] Feedback latency < 45s for per-task quick runs
- [ ] Manual verifications have concrete, reproducible instructions (not vague "check the bot works")
- [ ] `nyquist_compliant: true` set in frontmatter after planner fills in final task IDs

**Approval:** pending
