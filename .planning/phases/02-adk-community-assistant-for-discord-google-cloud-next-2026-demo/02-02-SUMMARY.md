---
phase: 02-adk-community-assistant-for-discord-google-cloud-next-2026-demo
plan: "02"
subsystem: rag
tags: [firestore-vector-search, gemini-embedding-001, typescript, python, pytest, vitest, tdd, rag, semantic-search]

requires:
  - phase: 02-01
    provides: BASE_URL exported from platform_client.py, mock_platform_client fixture, semantic_mentors.json fixture, conftest.py with semantic_mentors_payload fixture

provides:
  - scripts/embed-mentor-bios.ts — one-shot embed script with --dry-run, reads mentorship_profiles, writes bioEmbedding (768-dim) + bioEmbeddingGeneratedAt
  - GET /api/mentorship/mentors/semantic-search?q=... — findNearest KNN over bioEmbedding, returns mentors with bio_excerpt + match_score + url
  - platform_client.fetch_mentors_semantic(query) — calls /semantic-search endpoint via existing _get wrapper
  - semantic_search_mentors tool in mentorship_agent — registered alongside search_mentors; agent instructions updated to prefer semantic for specific tech queries
  - 10 vitest tests (embed helpers) + 5 vitest tests (route) + 4 pytest tests (tool)

affects:
  - 02-03 (Discord bot — mentorship_agent now has semantic_search_mentors to use in live Discord conversations)

dependency_graph:
  requires:
    - 02-00 (pytest infra, conftest, fixtures)
    - 02-01 (BASE_URL, mock_platform_client, semantic_mentors.json fixture)
  provides:
    - semantic-search endpoint at /api/mentorship/mentors/semantic-search
    - semantic_search_mentors tool in mentorship_agent
  affects:
    - 02-03 Discord bot uses mentorship_agent with semantic search

tech_stack:
  added:
    - Firestore Vector Search (findNearest, COSINE, 768-dim, distanceResultField)
    - gemini-embedding-001 via @google/genai — RETRIEVAL_DOCUMENT for indexing, RETRIEVAL_QUERY for search
    - FieldValue.vector() from firebase-admin/firestore for writing and querying vectors
  patterns:
    - Lazy AI client singleton (_ai = null, initialized on first call) avoids credential leakage in tests
    - vi.hoisted() for mock variables accessed in vi.mock() factory functions
    - Regular function (not arrow) for GoogleGenAI mock so `new` constructor works
    - Fallback pattern: pre-filter role+status → findNearest; on FAILED_PRECONDITION, fallback to single where + JS post-filter

key_files:
  created:
    - scripts/embed-mentor-bios.ts
    - scripts/__tests__/embed-mentor-bios.test.ts
    - src/app/api/mentorship/mentors/semantic-search/route.ts
    - src/app/api/mentorship/mentors/semantic-search/__tests__/route.test.ts
    - agent/tests/test_semantic_search_mentors.py
  modified:
    - agent/community_assistant/platform_client.py (added fetch_mentors_semantic)
    - agent/community_assistant/sub_agents/mentorship_agent.py (added semantic_search_mentors tool, updated instruction, added to tools list)
    - .env.example (documented GOOGLE_API_KEY and PLATFORM_API_BASE_URL)

decisions:
  - outputDimensionality:768 hard-coded in both embed script and route — matches Firestore vector index created in Task 1 (768-dim COSINE flat)
  - count in semantic_search_mentors returns sliced length (after _SEMANTIC_LIMIT=5 cap), not raw API count
  - Route uses new URL(request.url) (synchronous) — correct for Route Handlers in Next.js 16; async searchParams applies to page.tsx/layout.tsx only
  - RETRIEVAL_DOCUMENT taskType for embed script (document side), RETRIEVAL_QUERY for search endpoint (query side) — asymmetric model
  - bio_excerpt = first 300 chars of bio/about — simple, LLM can quote it verbatim in Discord replies
  - Fallback to wider findNearest + JS post-filter when pre-filtered query hits FAILED_PRECONDITION index error

metrics:
  duration: "~45 minutes"
  completed: "2026-04-11"
  tasks_completed: 4
  tasks_total: 5
  files_created: 5
  files_modified: 3
  tests_added: 19
---

# Phase 2 Plan 02: RAG Semantic Search over Mentor Bios — Summary

**One-liner:** Firestore Vector Search end-to-end with gemini-embedding-001 at 768 dims — embed script, Next.js findNearest endpoint, Python tool, and updated agent instructions so "Angular mentor" returns bio-level matches the LLM can quote.

## What Was Built

| Layer | Artifact | Status |
|-------|----------|--------|
| Firestore index | 768-dim COSINE flat on `mentorship_profiles.bioEmbedding` | User-completed (Task 1) |
| Embed script | `scripts/embed-mentor-bios.ts` with `--dry-run` | Done (Task 2) |
| API endpoint | `GET /api/mentorship/mentors/semantic-search?q=...` | Done (Task 3) |
| Python tool | `semantic_search_mentors` + `fetch_mentors_semantic` | Done (Task 4) |
| E2E smoke test | adk web end-to-end "Angular mentor" conversation | Checkpoint pending (Task 5) |

## Test Results

- **Vitest (embed script):** 10/10 pass — `extractBioText`, `shouldEmbedMentor`, `EMBEDDING_DIM` constant
- **Vitest (route):** 5/5 pass — missing-q 400, shaped mentor result, FAILED_PRECONDITION fallback, 500 error, post-filter
- **Pytest (tool):** 4/4 pass — empty query guard, success shape, error propagation, limit cap
- **Full agent suite:** 23/23 pass (plan 00 + plan 01 + plan 02 tests all green)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.mock() variable hoisting failure**
- **Found during:** Task 3 RED→GREEN
- **Issue:** `const mockCollection = vi.fn()` accessed before initialization because `vi.mock()` factories are hoisted to top of file
- **Fix:** Wrapped all mock variables in `vi.hoisted()` so they are initialized before the factory runs
- **Files modified:** `src/app/api/mentorship/mentors/semantic-search/__tests__/route.test.ts`
- **Commit:** `664c2eb`

**2. [Rule 1 - Bug] GoogleGenAI mock not constructable with arrow function**
- **Found during:** Task 3 GREEN phase
- **Issue:** `vi.fn().mockImplementation(() => ...)` (arrow function) rejected by `new GoogleGenAI()` with "is not a constructor" error
- **Fix:** Changed mock to use regular `function()` syntax which `new` can invoke as a constructor
- **Files modified:** `src/app/api/mentorship/mentors/semantic-search/__tests__/route.test.ts`
- **Commit:** `664c2eb`

**3. [Rule 1 - Bug] semantic_search_mentors count reported pre-slice count**
- **Found during:** Task 4 GREEN phase (limit cap test)
- **Issue:** `count: len(mentors)` reported 10 (raw API count) but test expects 5 (post-limit count)
- **Fix:** Slice first into `sliced`, then `count: len(sliced)` — consistent with what the LLM sees
- **Files modified:** `agent/community_assistant/sub_agents/mentorship_agent.py`
- **Commit:** `b10b145`

## Skipped Validator Recommendation

The Vercel plugin validator flagged `searchParams` in the route as needing `await`. This is a false positive — the route uses `new URL(request.url).searchParams` (standard Web API, always synchronous in Route Handlers), not `request.nextUrl.searchParams`. The async `searchParams` requirement in Next.js 16 applies to page.tsx/layout.tsx Server Components only. The pattern matches the existing `/api/mentorship/mentors/route.ts` exactly.

## Task 5: Pending Checkpoint

Task 5 (human-verify) was returned as a structured checkpoint per plan. It requires:
1. Running the embed script against production Firestore: `npx tsx scripts/embed-mentor-bios.ts`
2. Starting the Next.js dev server and verifying `curl` against the semantic-search endpoint
3. Opening `adk web` and sending "Find me a mentor who knows Angular" — verifying the agent picks `semantic_search_mentors` and quotes the bio_excerpt

## Self-Check

Files created:
- scripts/embed-mentor-bios.ts — FOUND
- scripts/__tests__/embed-mentor-bios.test.ts — FOUND
- src/app/api/mentorship/mentors/semantic-search/route.ts — FOUND
- src/app/api/mentorship/mentors/semantic-search/__tests__/route.test.ts — FOUND
- agent/tests/test_semantic_search_mentors.py — FOUND

Commits:
- 1e213a2 — Task 2 embed script — FOUND
- 664c2eb — Task 3 route — FOUND
- b10b145 — Task 4 Python tool — FOUND
