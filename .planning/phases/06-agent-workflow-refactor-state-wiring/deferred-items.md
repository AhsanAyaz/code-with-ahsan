# Phase 06 — Deferred Items

## Out-of-scope discoveries logged during execution

### [Plan 06-03] Flaky `test_fan_out_executes_three_leaves_concurrently`

- **Discovered during:** Plan 06-03 Task 3 full-suite verification (`pytest -q` after wrapping featured_resources in AgentTool)
- **Test:** `agent/tests/test_external_knowledge_fan_out.py::test_fan_out_executes_three_leaves_concurrently`
- **Behavior:** Fails intermittently when run as part of the full suite; passes deterministically when run in isolation
- **Pre-existing:** YES — this test belongs to Plan 06-01 (committed in `abf3d7d`), not Plan 06-03. Plan 06-01's deviation #2 already documents relaxing the threshold 100ms → 2000ms for LLM-jitter tolerance. The remaining flakiness is full-suite-only and likely stems from accumulated Gemini API jitter across all the LlmAgent-running tests earlier in the suite.
- **Relation to Plan 06-03:** NONE — no Plan 06-03 file touches `external_knowledge/` or the fan-out test. Plan 06-03 changes only `featured_resources.py` and `content_agent.py`, neither of which is imported by the fan-out test.
- **Resolution:** Out of scope for Plan 06-03. Either revisit the threshold further in a Phase 06 hardening pass or accept full-suite-only flakiness with the workaround "re-run the test in isolation to confirm." Plan 06-04's `adk web` smoke + 24h soak gate is the next opportunity to revisit.
