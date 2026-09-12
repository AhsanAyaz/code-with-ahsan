# Project instructions

## Model routing for subagents

When the main (orchestrator) agent is running on **Opus**:

- **Planning, triage decisions, reviews, and merge gates stay on Opus** — the main agent
  does this work itself and does not delegate the judgment calls.
- **Execution work is also delegated to subagents running Opus** (`model: opus`). Any
  Agent tool call that implements, edits, refactors, tests, or otherwise carries out an
  already-decided plan must pass `model: opus`, even when the agent definition's
  frontmatter says otherwise (this instruction overrides agent frontmatter, e.g.
  `fix-implementer`).

Rule of thumb: Opus decides _what_ to do, and Opus does it.

If the main agent is not Opus, use the model each agent definition specifies.

## No em-dashes in copy

Never use an em-dash (`—`) in anything a person reads: slide decks, event copy,
page and component text, headings, docs, commit messages, PR descriptions.
Rewrite with a comma, a colon, a full stop, or parentheses, whichever the
sentence actually wants. Do not swap in an en-dash as a substitute.

En-dashes (`–`) stay where they belong: numeric and time ranges such as
`8:30 – 9:30 AM`.

## Firestore indexes ship with the query

Any change that adds or edits a Firestore query must add the composite index it
needs to `firestore.indexes.json` **in the same commit**, and deploy it with
`npx firebase deploy --only firestore:indexes --project code-with-ahsan-45496`.
Never resolve a missing index by clicking the link in the Firebase console error
— that leaves production working and the repo wrong.

A missing composite index does not fail the build, the tests, or the emulator; it
throws `FAILED_PRECONDITION` in production and the UI silently renders nothing.

Verify with `npm run check:firestore-indexes` (also enforced by
`.husky/pre-commit`). Read the **`firestore-indexes` skill**
(`.claude/skills/firestore-indexes/SKILL.md`) before touching Firestore query
code. The same instructions are mirrored for other agents in `AGENTS.md` and
`.agent/skills/firestore-indexes/SKILL.md`; the checker fails if the two skill
copies drift apart.
