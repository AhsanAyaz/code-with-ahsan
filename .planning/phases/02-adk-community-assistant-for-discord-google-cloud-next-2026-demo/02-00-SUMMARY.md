---
phase: 02-adk-community-assistant-for-discord-google-cloud-next-2026-demo
plan: "00"
subsystem: testing
tags: [pytest, pytest-asyncio, vitest, fixtures, gemini-embedding-001, google-genai]

requires: []

provides:
  - pytest 9.0.3 + pytest-asyncio 1.3.0 installed in agent/.venv via uv dependency-groups
  - agent/tests/ package with conftest.py (mock_platform_client fixture + 4 JSON loaders)
  - Realistic fixture JSON files mirroring live API response shapes for mentors, projects, roadmaps, semantic search
  - vitest config extended to cover scripts/**/*.test.ts and scripts/**/__tests__/**/*.test.ts
  - scripts/verify-embed-api.ts probe confirming outputDimensionality:768 is valid in @google/genai 1.33.0 SDK types

affects:
  - 02-01 (link polish — can now write pytest unit tests for _shape_mentor, _shape_project, _shape_roadmap)
  - 02-02 (RAG — can now write vitest tests for embed-mentor-bios.ts in scripts/__tests__/)
  - 02-03 (Discord bot — can now write pytest tests for bot message handler)

tech-stack:
  added:
    - pytest==9.0.3 (via uv dependency-groups.dev)
    - pytest-asyncio==1.3.0 (via uv dependency-groups.dev)
  patterns:
    - "uv dependency-groups for dev-only Python dependencies (not polluting runtime deps)"
    - "httpx MockTransport pattern via monkeypatch on platform_client._get for unit testing"
    - "JSON fixture files under agent/tests/fixtures/ mirror exact live API response shapes"

key-files:
  created:
    - agent/tests/__init__.py
    - agent/tests/conftest.py
    - agent/tests/fixtures/mentors.json
    - agent/tests/fixtures/projects.json
    - agent/tests/fixtures/roadmaps.json
    - agent/tests/fixtures/semantic_mentors.json
    - scripts/__tests__/.gitkeep
    - scripts/verify-embed-api.ts
  modified:
    - agent/pyproject.toml
    - agent/uv.lock
    - vitest.config.ts

key-decisions:
  - "pytest-asyncio asyncio_mode=auto chosen so async test functions need no decorator"
  - "mock_platform_client fixture uses monkeypatch.setattr on _get (not httpx MockTransport) — keeps tests decoupled from transport layer"
  - "outputDimensionality:768 confirmed valid in @google/genai 1.33.0 at TypeScript type level (genai.d.ts contains outputDimensionality?: number); live API probe requires GOOGLE_API_KEY which is not yet in .env"
  - "Pre-existing firestore.test.ts failure in vitest is out of scope (confirmed pre-dates this plan)"

patterns-established:
  - "Python tests: cd agent && uv run pytest --collect-only (zero errors = infra healthy)"
  - "Fixture loading: _load() helper + per-fixture pytest fixture returning dict"
  - "Mock API injection: mock_platform_client(path_prefix, payload) pattern for agent unit tests"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, INFRA-04]

duration: 6min
completed: 2026-04-11
---

# Phase 02 Plan 00: Wave 0 Test Infrastructure Summary

**pytest 9.0.3 + pytest-asyncio installed in agent/.venv, 4 API-shape-accurate JSON fixtures created, vitest extended to scripts/, and @google/genai 1.33.0 outputDimensionality:768 confirmed valid at TypeScript type level**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-11T22:57:55Z
- **Completed:** 2026-04-11T23:03:37Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- pytest 9.0.3 + pytest-asyncio 1.3.0 installed into agent/.venv via `uv sync --all-groups`; `[tool.pytest.ini_options]` added to pyproject.toml with `asyncio_mode = "auto"` and `testpaths = ["tests"]`
- 4 realistic JSON fixture files created mirroring live API shapes: mentors (3 entries, one at capacity, one with null username), projects (one with creatorProfile, one without), roadmaps (ai + frontend domains), semantic_mentors (ranked by match_score with bio_excerpt and url)
- conftest.py created with `mock_platform_client` fixture using `monkeypatch.setattr` on `_get` — downstream tests register `(path_prefix, payload)` pairs
- vitest.config.ts extended with `scripts/**/*.test.ts` and `scripts/**/__tests__/**/*.test.ts` globs — no regressions (pre-existing firestore.test.ts failure unchanged)
- scripts/verify-embed-api.ts probe created; `outputDimensionality?: number` confirmed in `node_modules/@google/genai/dist/genai.d.ts` — SDK supports the field at type level

## embedContent Verification Result

**CONFIRMED (type-level): `outputDimensionality: 768` is a valid field in `@google/genai` 1.33.0**

Evidence:
- `grep "outputDimensionality" node_modules/@google/genai/dist/genai.d.ts` returns `outputDimensionality?: number;`
- `node_modules/@google/genai/dist/index.cjs` contains runtime handler for `outputDimensionality`
- Live API probe (`scripts/verify-embed-api.ts`) is written and ready; requires `GOOGLE_API_KEY` in `.env.local` to run against the real Gemini API

**Action required before plan 02-02:** Add `GOOGLE_API_KEY` to `.env.local` and run `npx tsx scripts/verify-embed-api.ts` to confirm the runtime response returns exactly 768 dimensions.

**Downstream plans 01/02/03 are unblocked** — the SDK type shape is confirmed. The live API probe is a recommended sanity check, not a blocker.

## Task Commits

1. **Task 1: Set up pytest in agent/ + create test directory scaffold** - `3a23c29` (feat)
2. **Task 2: Extend vitest to cover scripts/ and verify embedContent signature** - `3644617` (feat)

**Plan metadata:** (pending — docs commit below)

## Files Created/Modified

- `agent/pyproject.toml` — Added `[dependency-groups].dev`, `[tool.pytest.ini_options]`
- `agent/uv.lock` — Updated after `uv sync --all-groups`
- `agent/tests/__init__.py` — Empty package marker for test imports
- `agent/tests/conftest.py` — Shared fixtures: `mock_platform_client`, `mentors_payload`, `projects_payload`, `roadmaps_payload`, `semantic_mentors_payload`
- `agent/tests/fixtures/mentors.json` — 3 mentor objects with uid, username (one null), displayName, expertise, bio, capacity fields
- `agent/tests/fixtures/projects.json` — 2 projects: one with creatorProfile, one with `null`
- `agent/tests/fixtures/roadmaps.json` — 2 roadmaps: ai domain + frontend domain with all shape fields
- `agent/tests/fixtures/semantic_mentors.json` — 2 entries with name, username, url, expertise, availability, rating, completed_sessions, bio_excerpt, match_score
- `vitest.config.ts` — Added 2 scripts glob entries to `test.include`
- `scripts/__tests__/.gitkeep` — Directory tracker
- `scripts/verify-embed-api.ts` — embedContent probe for outputDimensionality:768

## Decisions Made

- `asyncio_mode = "auto"` selected so async test functions need no `@pytest.mark.asyncio` decorator — cleaner test code
- `mock_platform_client` uses `monkeypatch.setattr` on the `_get` function rather than `httpx.MockTransport` — decouples tests from the httpx transport layer and is simpler for the prefix-routing pattern
- Confirmed `outputDimensionality:768` at TypeScript type level rather than blocking on live API probe — downstream plans can proceed; live probe is a recommended pre-02-02 sanity check

## Deviations from Plan

None — plan executed exactly as written. The live probe could not run due to `GOOGLE_API_KEY` not being present in `.env.local`, but the TypeScript type-level confirmation is sufficient for unblocking downstream plans.

## Issues Encountered

- `GOOGLE_API_KEY` not present in `.env.local` or `.env` — live Gemini API probe cannot run in this environment. TypeScript type-level confirmation provided instead. Operator should add `GOOGLE_API_KEY` to `.env.local` and run `npx tsx scripts/verify-embed-api.ts` before starting plan 02-02.
- Pre-existing `src/__tests__/security-rules/firestore.test.ts` failure in vitest (1 failed, 78 passed) — out of scope, pre-dates this plan.

## User Setup Required

Before starting plan 02-02, add `GOOGLE_API_KEY` to `.env.local`:

```
GOOGLE_API_KEY=your_ai_studio_api_key_here
```

Then run the live probe:
```bash
npx tsx scripts/verify-embed-api.ts
```

Expected output: `OK: gemini-embedding-001 returned 768 dimensions for outputDimensionality=768`

## Next Phase Readiness

- Plans 01 (link polish), 02 (RAG), 03 (Discord bot) are all unblocked
- `cd agent && uv run pytest --collect-only` exits 0 with no errors
- `npx vitest run` covers scripts/__tests__/ for plan 02's embed script tests
- 4 fixture files ready for use in downstream unit tests
- Live API probe script ready to run once GOOGLE_API_KEY is available

---
*Phase: 02-adk-community-assistant-for-discord-google-cloud-next-2026-demo*
*Completed: 2026-04-11*
