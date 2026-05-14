---
phase: 02-adk-community-assistant-for-discord-google-cloud-next-2026-demo
plan: "01"
subsystem: api
tags: [python, pytest, httpx, platform-client, mentorship-agent, projects-agent, roadmap-agent, urls, tdd]

requires:
  - phase: 02-00
    provides: pytest 9.0.3 installed, conftest.py with mock_platform_client fixture, 4 JSON fixture files mirroring live API shapes

provides:
  - BASE_URL exported from platform_client.py with production default https://codewithahsan.dev
  - _shape_mentor returns url field (absolute URL or None when username missing)
  - _shape_project returns url and creator_url fields (null-safe when creatorProfile is None or has no username)
  - _shape_roadmap returns url and author_url fields (null-safe when creatorProfile is None or has no username)
  - 19 pytest tests across 4 test files covering shape, integration, null safety, and error paths

affects:
  - 02-02 (RAG — semantic_search_mentors tool will also return url field using same BASE_URL pattern)
  - 02-03 (Discord bot — tool responses with clickable URLs make Discord replies link-rich)

tech-stack:
  added: []
  patterns:
    - "Import BASE_URL from platform_client in each sub-agent (single source of truth for base URL)"
    - "Extract id/username variables before dict literal in shape functions for clean f-string URL construction"
    - "Null-safe creatorProfile: use raw.get('creatorProfile') or {} pattern to handle null from API"

key-files:
  created:
    - agent/tests/test_platform_client.py
    - agent/tests/test_mentorship_agent.py
    - agent/tests/test_projects_agent.py
    - agent/tests/test_roadmap_agent.py
  modified:
    - agent/community_assistant/platform_client.py
    - agent/community_assistant/sub_agents/mentorship_agent.py
    - agent/community_assistant/sub_agents/projects_agent.py
    - agent/community_assistant/sub_agents/roadmap_agent.py

key-decisions:
  - "BASE_URL default changed from http://localhost:3000 to https://codewithahsan.dev — local dev uses PLATFORM_API_BASE_URL env var override (already in .env.example)"
  - "url fields are None (not string 'None') when id/username is missing — prevents broken URLs in Discord replies"
  - "creatorProfile null handling uses raw.get('creatorProfile') or {} pattern — covers both missing key and explicit null from API"

patterns-established:
  - "Sub-agents import BASE_URL from platform_client: from ..platform_client import BASE_URL, fetch_*"
  - "Shape functions extract scalar IDs before dict literal: project_id = raw.get('id') then use in f-string"
  - "Null-safe optional URL: f'{BASE_URL}/entity/{id}' if id else None"

requirements-completed: [LINKS-01, LINKS-02, LINKS-03, LINKS-04]

duration: 12min
completed: 2026-04-11
---

# Phase 02 Plan 01: Link Polish Summary

**Absolute https://codewithahsan.dev URLs added to all 3 sub-agent shape functions using BASE_URL from platform_client, with null safety for missing ids/usernames and 19 pytest tests covering shape, integration, and error paths**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-11T23:05:00Z
- **Completed:** 2026-04-11T23:17:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- BASE_URL default updated to `https://codewithahsan.dev` in platform_client.py — production URLs appear in tool responses without any env var configuration
- `_shape_mentor` gains `url` field (`https://codewithahsan.dev/mentors/{username}` or `None` when username is missing — one fixture mentor has null username, covered by tests)
- `_shape_project` gains `url` and `creator_url` fields; `creator_url` is `None` when `creatorProfile` is `null` or has no `username` — both fixture projects covered
- `_shape_roadmap` gains `url` and `author_url` fields with same null safety pattern as projects
- 19 tests total: 4 platform_client + 6 mentorship_agent + 5 projects_agent + 4 roadmap_agent — all pass in 1.63s

## Task Commits

1. **Task 1: Update platform_client BASE_URL default + add unit tests** - `63bf444` (feat)
2. **Task 2: Add url field to mentorship_agent + tests** - `1c4eafb` (feat)
3. **Task 3: Add url+creator_url to projects_agent and url+author_url to roadmap_agent + tests** - `e7c8242` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `agent/community_assistant/platform_client.py` - Changed BASE_URL default to https://codewithahsan.dev; added docstring
- `agent/community_assistant/sub_agents/mentorship_agent.py` - Import BASE_URL; refactor _shape_mentor to include url field
- `agent/community_assistant/sub_agents/projects_agent.py` - Import BASE_URL; refactor _shape_project to include url and creator_url fields
- `agent/community_assistant/sub_agents/roadmap_agent.py` - Import BASE_URL; refactor _shape_roadmap to include url and author_url fields
- `agent/tests/test_platform_client.py` - 4 tests: default URL, env override, trailing slash strip, _get connection error
- `agent/tests/test_mentorship_agent.py` - 6 tests: shape+url, null username, capacity, search integration, error path, validation map test_mentor_url_shape
- `agent/tests/test_projects_agent.py` - 5 tests: url+creator, no id, null creatorProfile, creator without username, integration
- `agent/tests/test_roadmap_agent.py` - 4 tests: url+author, null creatorProfile, no id, integration

## Decisions Made

- Changed BASE_URL default from `http://localhost:3000` to `https://codewithahsan.dev` — production is now opt-out (set env var) rather than opt-in. This matches the "zero configuration for prod" principle. Local dev already has PLATFORM_API_BASE_URL in .env.example.
- url field is Python `None` (not the string `"None"`) when id/username is absent — the LLM receives a JSON null which it can check for before rendering, preventing broken `/mentors/None` links in Discord replies.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All tests passed on first GREEN run for each task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 (RAG semantic search) can safely import `BASE_URL` from platform_client for the new `semantic_search_mentors` shape function
- Validation map rows LINKS-01 through LINKS-04 are now green
- `cd agent && uv run pytest -x` passes 19 tests in ~1.7s — clean baseline for plan 02 additions

---
*Phase: 02-adk-community-assistant-for-discord-google-cloud-next-2026-demo*
*Completed: 2026-04-11*

## Self-Check: PASSED
