# Project instructions

## Model routing for subagents

When the main (orchestrator) agent is running on **Opus**:

- **Planning, triage decisions, reviews, and merge gates stay on Opus** — the main agent
  does this work itself and does not delegate the judgment calls.
- **Execution work is delegated to subagents running Sonnet 5** (`model: sonnet`, i.e.
  `claude-sonnet-5`). Any Agent tool call that
  implements, edits, refactors, tests, or otherwise carries out an already-decided plan
  must pass `model: sonnet`, even when the agent definition's frontmatter says otherwise
  (this instruction overrides agent frontmatter, e.g. `fix-implementer`).

Rule of thumb: Opus decides _what_ to do, Sonnet does it.

If the main agent is not Opus, use the model each agent definition specifies.
