# agent-loop — repo operating brief

Re-read at the start of every agent-loop invocation (orchestrator + triage +
implementer). This is the human-readable brief; machine state lives in
`.agentloop/ledger.json`. Full constants/IDs/schemas are in
`.claude/skills/agent-loop/references/config.md` — **that file is authoritative**;
this one is the summary + current-state note.

## What this loop does

One `/agent-loop` tick, from a live session:

1. **Intake** — new GitHub issues → `issue-triage` (Sonnet 5) → create a 1:1
   ClickUp task on the "Products" board.
2. **Implement** — auto-fixable, non-sensitive issues → `fix-implementer`
   (Opus 4.8) → branch, fix, verify, PR. Safe + green → **auto-merge** → ClickUp
   _test on production_ + assign Najla & Maham. Sensitive/uncertain → PR only,
   Ahsan reviewer, ClickUp _in review_.
3. **Reconcile** — new comments on _in review / board review / test on
   production_ tasks → decide next: re-fix after failed prod test, merge on
   approval, close on sign-off, changes on request.

## Routing table

| Situation                                      | ClickUp status                      | Assignee      | Merge?           |
| ---------------------------------------------- | ----------------------------------- | ------------- | ---------------- |
| Needs a human decision / ambiguous / skip      | board review                        | Ahsan         | no               |
| PR needs Ahsan review (sensitive or not-green) | in review                           | Ahsan         | no (human)       |
| Safe + green auto-fix                          | test on production                  | Najla + Maham | yes (squash)     |
| Prod test failed → re-fix                      | in development → test on production | Najla + Maham | re-merge if safe |
| Prod test approved                             | shipped                             | —             | (close GH issue) |
| Ahsan: close/wontfix                           | cancelled                           | —             | close PR + issue |

## Guardrails (do not violate)

- **Never auto-merge a diff that touches a sensitive path** (auth libs, security
  rules, DELETE API routes, migration scripts, env, `.github/workflows`, admin
  trees — full list in config.md). Escalate to Ahsan instead.
- Merge only when local verification is fully green: `tsc --noEmit`, `lint`,
  `build`, `vitest`. There is no CI gate — local green is the bar.
- Caps: ≤5 new issues per tick; ≤2 implement attempts per issue, then board
  review.
- 1:1 mapping is sacred: one GH issue ↔ one ClickUp task. Never duplicate.
- All ClickUp writes + merges happen in the orchestrator (main session); the
  subagents never touch ClickUp and never merge.
- GH issue stays open until QA approves the _test on production_ ticket.
- Dry-run by default; `--live` to act. Loud end-of-tick summary always.

## Conventions

- Branch `fix/<issue#>-<slug>`; Conventional Commit subject with `(GH#<n>)`;
  PR body `Closes #<n>`; squash-merge.
- After every merge: `git checkout main && git pull --ff-only`.

## Current in-flight

_(Orchestrator updates this note each live tick — e.g. "GH#296 → CU task ...,
in review, Ahsan." Keep it short; the ledger is the source of truth.)_

- 2026-08-04: GH#307, pr309 (no GH#) → both merged by Ahsan directly on GitHub,
  routed to test on production + Najla/Maham. GH#312 (hero copy reposition) →
  new ClickUp task, board review + Ahsan (scope ambiguous). GH#298/294/284/285
  still awaiting QA pass/fail on test on production, no action this tick.
