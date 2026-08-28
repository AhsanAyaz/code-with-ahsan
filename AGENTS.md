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
