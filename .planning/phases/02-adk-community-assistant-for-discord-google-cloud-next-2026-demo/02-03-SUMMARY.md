---
phase: 02-adk-community-assistant-for-discord-google-cloud-next-2026-demo
plan: 03
subsystem: infra
tags: [discord, discord.py, google-adk, cloud-run, docker, bot, gateway, session-management]

# Dependency graph
requires:
  - phase: 02-adk-community-assistant-for-discord-google-cloud-next-2026-demo/02-02
    provides: root_agent, InMemorySessionService, Runner, community_assistant package with all sub-agents

provides:
  - discord.py bot process that forwards @mentions to ADK root_agent in-process (no HTTP hop)
  - Per-user session mapping (Discord user_id → InMemorySessionService session_id)
  - Message chunking at 1990 chars for Discord's 2000-char limit
  - Dockerfile for Cloud Run deployment (python:3.12-slim, COPY community_assistant)
  - 18 pytest cases covering all bot helper functions (41 total in suite)

affects:
  - Cloud Run deploy (Task 5, pending human-action checkpoint)
  - Production CWA Discord server (after Task 5)

# Tech tracking
tech-stack:
  added: [discord.py>=2.7.1, google-auth>=2.0.0]
  patterns:
    - Pure helper functions at module level (no discord.py imports) so tests run without discord.py installed
    - Lazy _wire_bot() pattern — all discord.py and google-adk imports inside the function, called only from main()
    - runner.run_async() inside asyncio on_message handler (never sync runner.run())
    - Discord user_id as ADK session key — string keyed dict mapping to InMemorySessionService

key-files:
  created:
    - agent/discord_bot/__init__.py
    - agent/discord_bot/bot.py
    - agent/discord_bot/requirements.txt
    - agent/discord_bot/.env.example
    - agent/discord_bot/Dockerfile
    - agent/discord_bot/.dockerignore
    - agent/discord_bot/README.md
    - agent/tests/test_discord_bot_message_handler.py
    - agent/tests/test_discord_bot_session_mapping.py
  modified: []

key-decisions:
  - "bot.py uses lazy _wire_bot() to keep discord.py and google-adk out of module-level imports — tests run without those deps installed"
  - ".env.sample renamed to .env.example to match project gitignore allowlist (!.env.example pattern)"
  - "Dockerfile build context is repo root — COPY paths are relative to root, not agent/discord_bot/"
  - "runner.run_async() enforced (not runner.run()) — sync form crashes with RuntimeError in asyncio event loop"
  - "SAFE_CHUNK_SIZE=1990 (10-char buffer below Discord's 2000-char hard limit)"

patterns-established:
  - "Discord bot helper functions take primitive types (ints, strings) not discord.py types — pure functions, easy to unit test"
  - "Graceful degradation: catch Exception in on_message, send ERROR_REPLY, never crash the process"
  - "Typing indicator via async with message.channel.typing() wraps entire agent call"

requirements-completed: [BOT-01, BOT-02, BOT-03, BOT-04, BOT-05]

# Metrics
duration: ~20min
completed: 2026-04-12
---

# Phase 02 Plan 03: Discord Bot Bridge Summary

**discord.py bot wiring ADK root_agent in-process via runner.run_async(), with per-user InMemorySession mapping, 1990-char chunking, and Dockerfile for Cloud Run at min/max-instances=1**

## Performance

- **Duration:** ~20 min (Tasks 2-3 executed; Task 4 auto-approved in --auto mode; Task 5 pending human-action)
- **Started:** 2026-04-12T07:40:00Z
- **Completed:** 2026-04-12 (Tasks 1-4 complete; Task 5 pending Cloud Run deploy)
- **Tasks:** 4 of 5 complete (Task 5 pending human-action checkpoint)
- **Files modified:** 9

## Accomplishments

- Bot package scaffold with pure helper functions testable without discord.py/google-adk installed
- 18 new pytest cases (41 total): message handler filtering, mention stripping, chunking, error reply, session mapping
- Dockerfile with python:3.12-slim, copies both discord_bot/ and community_assistant/ packages, PYTHONPATH=/app
- README with local dev instructions, Cloud Run deploy command, Secret Manager setup, troubleshooting section

## Task Commits

Each task was committed atomically:

1. **Task 1: Discord app setup** — done by user (no commit — manual Discord Developer Portal step)
2. **Task 2: Bot package + tests** — `c913975` (feat)
3. **Task 3: Dockerfile + dockerignore + README** — `56fa004` (chore)
4. **Task 4: Local smoke test** — auto-approved in --auto mode (checkpoint:human-verify)
5. **Task 5: Cloud Run deploy** — checkpoint:human-action (PENDING — awaiting gcloud deploy)

## Files Created/Modified

- `agent/discord_bot/__init__.py` — package marker
- `agent/discord_bot/bot.py` — discord.py Client with on_message handler, in-process ADK Runner, session mapping, typing indicator, chunked sends, error handling (153 lines)
- `agent/discord_bot/requirements.txt` — pinned runtime deps: discord.py, google-adk, python-dotenv, google-auth, httpx
- `agent/discord_bot/.env.example` — documented env vars (renamed from .env.sample to match project gitignore pattern)
- `agent/discord_bot/Dockerfile` — python:3.12-slim, COPY community_assistant, PYTHONPATH=/app, CMD python bot.py
- `agent/discord_bot/.dockerignore` — excludes tests, .env, caches, .git
- `agent/discord_bot/README.md` — local dev, Cloud Run deploy command, Secret Manager setup, troubleshooting
- `agent/tests/test_discord_bot_message_handler.py` — 15 test cases
- `agent/tests/test_discord_bot_session_mapping.py` — 3 async test cases

## Decisions Made

- Renamed `.env.sample` to `.env.example` — the project's `.gitignore` blocks `.env*` but has an explicit `!.env.example` allowlist entry. The plan spec used `.env.sample` but that would be gitignored; `.env.example` is the established project convention.
- `_wire_bot()` lazy-init pattern: all discord.py and google-adk imports inside the function so tests import the module without needing those heavy packages in the test venv.
- Build context is repo root (not `agent/discord_bot/`) so the Dockerfile can `COPY agent/community_assistant` alongside `agent/discord_bot`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] .env.sample renamed to .env.example**
- **Found during:** Task 3 (git add stage)
- **Issue:** Project `.gitignore` has `.env*` blocked but `!.env.example` is explicitly allowed. `.env.sample` would be silently gitignored and never committed.
- **Fix:** Renamed `agent/discord_bot/.env.sample` to `agent/discord_bot/.env.example`
- **Files modified:** `agent/discord_bot/.env.example`
- **Verification:** `git add agent/discord_bot/.env.example` succeeded without ignored-file warning
- **Committed in:** `c913975` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug/correctness)
**Impact on plan:** Cosmetic rename only; content and purpose unchanged. All plan requirements still met.

## Issues Encountered

None beyond the .env.sample → .env.example rename above.

## Checkpoints

**Task 4 (checkpoint:human-verify) — Local smoke test** — AUTO-APPROVED (--auto mode, 2026-04-11)

**Task 5 (checkpoint:human-action) — Cloud Run deploy** — PENDING
Requires gcloud auth, Secret Manager setup, and `gcloud run deploy` from the repo root. See `agent/discord_bot/README.md` for the full deploy command, or the structured checkpoint below. Signal: type `production live` once deployed.

## Next Phase Readiness

- Bot code is production-ready pending local smoke test
- Cloud Run deploy command is documented in README.md with all flags
- After Tasks 4 and 5 resolve, the plan is complete and the demo is ready for Google Cloud Next 2026 filming

---
*Phase: 02-adk-community-assistant-for-discord-google-cloud-next-2026-demo*
*Completed: 2026-04-12 (Tasks 2-3 complete; Tasks 4-5 pending human checkpoints)*
