# Project instructions

These apply to every agent working in this repo (Google Antigravity, Gemini CLI,
Claude Code, and anything else that reads `AGENTS.md`).

## Firestore indexes ship with the query

Any change that adds or edits a Firestore query must add the composite index it
needs to `firestore.indexes.json` **in the same commit**, and deploy it with
`npx firebase deploy --only firestore:indexes --project code-with-ahsan-45496`.

Never "fix" a missing index by clicking the link in the Firebase console error.
That leaves production working and the repo wrong, and the next indexes deploy
from a clean checkout drops it.

A missing composite index does not fail the build, the tests, or the emulator. It
throws `FAILED_PRECONDITION` at runtime in production, the route returns an empty
array, and the UI silently renders nothing.

Verify before committing:

```
npm run check:firestore-indexes
```

This also runs on `git commit` via `.husky/pre-commit`. If it fails, add the
index — do not bypass with `--no-verify`.

Full rules (when an index is required, field ordering, array and vector index
shapes, graceful fallbacks while an index builds) are in the
**`firestore-indexes` skill**: `.agent/skills/firestore-indexes/SKILL.md`.
Read it before touching Firestore query code.

## ADK Agent, MCP & Cloud Run Conventions (`agent/`)

- **Python & Pytest**: Always use the existing virtualenv binaries directly (`agent/.venv/bin/python` and `agent/.venv/bin/pytest -k "not test_fan_out_executes_three_leaves_concurrently"`) because `~/.local/bin/uv` is hidden inside the terminal sandbox and `test_fan_out_executes_three_leaves_concurrently` makes a live network call to `generativelanguage.googleapis.com`. Never modify `agent/pyproject.toml` or `agent/uv.lock`.
- **Environment & Keys**: Load `GEMINI_API_KEY` (and set `GOOGLE_API_KEY` if unset), `GITHUB_TOKEN`, and `NEXT_PUBLIC_LOUPE_API_KEY` from environment variables or the repo root `.env.local`. Default GitHub repo is `AhsanAyaz/code-with-ahsan`.
- **`adk web` Directory Rule & Circular Import Avoidance**: `uv run adk web` treats every subdirectory inside `agent/` as a selectable ADK agent package. Do **NOT** create new subdirectories inside `agent/` for MCP servers or FastAPI/Cloud Run workers (which causes `No root_agent found` in the `adk web` dropdown). Place standalone scripts and `Dockerfile` directly in `agent/` (e.g., `agent/loupe_triage_mcp.py`, `agent/triage_service.py`, `agent/Dockerfile`), and place new ADK sub-agents inside `agent/community_assistant/sub_agents/`. In `loupe_triage_mcp.py`, import `community_assistant.callbacks` (`PII_PATTERNS`, `REDACTION_PLACEHOLDER`) lazily inside a helper function to avoid circular imports when `triage_agent.py` imports `loupe_triage_mcp`.
- **Codebase Search (Local + Cloud Run)**: When searching Next.js source files (`src/`), check local `../src` first and fall back to the GitHub REST API (`GET /repos/AhsanAyaz/code-with-ahsan/git/trees/main?recursive=1` + file content fetch) when running inside a Cloud Run container where `../src` is not mounted.
- **Cloud Run Deployment & GitHub Action Trigger**: Deploy from `agent/` to GCP project `code-with-ahsan-45496` (`us-central1`) using `BypassSandbox: true` (required for network + `~/.config/gcloud` access):
  - Service name: `cwa-loupe-triage` (`--source . --project code-with-ahsan-45496 --region us-central1 --allow-unauthenticated`).
  - Load `GEMINI_API_KEY`, `GITHUB_TOKEN`, and `NEXT_PUBLIC_LOUPE_API_KEY` from `../.env.local` in Python/shell and pass via `--set-env-vars` without printing secret values to terminal output.
  - Have the GitHub Action workflow (`POST /triage` on `issues: [opened, labeled]` and `workflow_dispatch`) call the deployed Cloud Run service URL (`https://cwa-loupe-triage-205504954450.us-central1.run.app/triage`).
- **Local Verification Commands to Give the User**:
  - MCP Inspector: `cd agent && npx @modelcontextprotocol/inspector uv run python loupe_triage_mcp.py`
  - ADK Web UI: `cd agent && uv run adk web` (select `community_assistant` in the top-left dropdown)

