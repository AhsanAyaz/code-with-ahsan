---
description: Run one tick of the GitHub⇄ClickUp autonomous agent loop (triage → fix/merge → reconcile). Pass --live to act; default is --dry-run. Drive recurrence with /loop 15m /agent-loop.
---

Invoke the `agent-loop` skill to run one orchestration tick.

Arguments: $ARGUMENTS

- Default mode is **`--dry-run`** (narrate intended actions, change nothing).
- Pass **`--live`** to actually create ClickUp tasks, open/merge PRs, and move the board.
- Recurring use: `/loop 15m /agent-loop --live`.

Follow the skill exactly, including the sensitive-path merge gate and the
end-of-tick summary.
