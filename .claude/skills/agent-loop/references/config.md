# agent-loop — config & constants

Single source of truth for IDs, paths, commands, and schemas used by the
`agent-loop` skill and the `issue-triage` / `fix-implementer` agents.
The orchestrator reads this every tick. If a value here conflicts with an
agent's memory, **this file wins**.

## Repo

- Repo root: the git toplevel of `code-with-ahsan`.
- Default branch: `main`. Remote: `origin` (`git@github.com:AhsanAyaz/code-with-ahsan.git`).
- GitHub repo (for `gh` / MCP): `AhsanAyaz/code-with-ahsan`.

## ClickUp

- Workspace/team id: `90151851365`
- Space "Products": `901511238520`
- Board list: `901524032971`
- Status name → id:
  - `backlog` → `p901511238520_VJZJCTJB`
  - `scoping` → `p901511238520_Z6G1CbJN`
  - `in development` → `p901511238520_EpLpIJ9h`
  - `in review` → `p901511238520_DyIG6iqo`
  - `testing` → `p901511238520_OxAaPX0N`
  - `ready for development` → `p901511238520_9ZamTjsl`
  - `test on production` → `p901511238520_sM82JyD2`
  - `board review` → `p901511238520_JIPqJ0ik`
  - `shipped` → `p901511238520_Kfh0tzCU`
  - `cancelled` → `p901511238520_GdjHwOag`
- Members (name → id):
  - Najla Obaid → `106789070`
  - Maham Tahir → `100676509` (mahamst31@gmail.com)
  - Muhammad Ahsan Ayaz (the owner / "me") → `248670032`
  - Kinza Pervez → `106680555`
- Custom field: **"GitHub Issue"** (number) on list `901524032971`. Holds the GH
  issue number for 1:1 lookup. The MCP **cannot create custom fields** — a human
  adds this number field once in the ClickUp UI. Discover its id via
  `clickup_get_custom_fields(list_id)` and cache it in `ledger.meta.githubFieldId`.
  If the field is absent, degrade to title-marker + ledger mapping (still 1:1).
- Set the field at task creation via `clickup_create_task(custom_fields:[{id,
value:"<n>"}])`; change status/assignees later via `clickup_update_task`.

When ClickUp status setter needs a value, prefer the status **name** (the MCP
resolves it); ids above are the fallback / disambiguation reference.

**Self-comment marker:** the loop posts ClickUp comments via Ahsan's account, so
every orchestrator-authored comment MUST start with `🤖 [agent-loop] `. Phase B
ignores comments bearing this marker (only human comments drive actions) — this
prevents the loop re-reading its own "…approved…" recaps as fresh decisions.

## GitHub ↔ ClickUp mapping (1:1)

Three redundant links, checked in this order:

1. Ledger `.agentloop/ledger.json` (authoritative for the loop).
2. ClickUp task **"GitHub Issue"** custom field == issue number.
3. ClickUp task **title** prefix `[GH#<n>]`.
   GH side: the issue carries a comment linking the ClickUp task URL + the
   `agent-tracked` label.

## Verification commands (run from repo root)

```bash
npx tsc --noEmit        # types
npm run lint            # eslint
npm run build           # next build (prebuild runs content:build + build:events)
npm test                # vitest run (unit)
```

`npm run test:rules` (Firestore emulator) is **only** relevant when the diff
touches `firestore.rules` / security-rules — and those are sensitive paths that
are escalated (never auto-merged), so the loop does not run it inline.

"Green" = tsc + lint + build + vitest all pass. There is **no CI status gate**,
so local green is the bar.

**Known environment traps when verifying:**

- `npm run build` (Turbopack) **cannot run inside `.claude/worktrees/*`** — it
  infers the workspace root as the parent worktrees dir ("couldn't find the
  Next.js package"). A worktree implementer's "build green" is therefore
  unverified; the orchestrator must re-run it from the main checkout.
- While an agent's worktree holds a branch, `git checkout <branch>` in the main
  checkout **fails and leaves you on `main`** — building the wrong tree. Always
  `git checkout --detach <headSha>` and assert `git rev-parse --short HEAD`.
- `npm run lint` may OOM on large local runs; compare behaviour against `main`
  rather than trusting an absolute problem count.
- Some suites are **red on `main`** (email-blast timing mocks; firestore
  security-rules tests needing the emulator). Judge "no NEW failures vs main",
  never "all green".

## Conventions

- Branch: `fix/<issue#>-<slug>` or `feat/<issue#>-<slug>` (kebab slug, ≤ ~5 words).
- Commit: Conventional Commits, subject ≤ 72 chars, imperative, with `(GH#<n>)`:
  e.g. `fix(roadmaps): show pending roadmaps to admins (GH#296)`.
- PR body includes `Closes #<n>`. Merge = **squash** (`gh pr merge --squash`),
  which appends `(#<PR>)` to the squashed subject.
- After any merge: `git checkout main && git pull --ff-only` (leave the tree
  clean and on `main`).

## Sensitive-path gate (NEVER auto-merge → escalate to human)

Escalate (open PR, do not merge, Ahsan reviewer, ClickUp `in review`) if the real
diff (`git diff --name-only main...HEAD`) matches ANY:

- `src/lib/auth.ts`, `src/lib/*adminAuth*.ts`, `src/lib/firebaseAdmin*.ts`, `src/lib/permissions.ts`
- `**/firestore.rules`, `**/storage.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`, `cors.json`
- any `src/app/api/**/route.ts` that contains a `DELETE` handler
- `scripts/{migrate*,drop-*,sync-*,cleanup-*,backfill-*,seed-*}.*`
- any `.env*`, `next.config.ts`, `.github/workflows/*`, `.vercel/*`
- admin trees: `src/app/admin/**`, `src/app/api/**/admin/**`, `src/app/api/**/mentorship/admin/**`, `src/components/admin/**`

The triage agent's `sensitiveGuess` is advisory only. The **orchestrator**
re-checks the real diff after the implementer pushes — that check is authoritative.

## Guardrails / caps

- Max **5** new issues triaged per tick.
- Max **2** implement attempts per issue; then → `board review` + assign Ahsan.
- Circuit breaker: implementer that can't reach green after 2 tries returns
  `failing`; orchestrator escalates, never merges failing code.
- Idempotency: an issue is "new" only if absent from the ledger. Never create a
  second ClickUp task for a GH# already mapped.
- `--dry-run`: report intended actions; create/modify/merge nothing. Default the
  very first run of a session to dry-run unless the user passes `--live`.
- Loud logging: end every tick with a summary table (created / merged / escalated
  / reconciled / skipped, with reasons).

## GitHub labels

- `agent-tracked` — the loop has created a ClickUp task for this issue.
- `cto-triaged` — triage complete (reuse existing).
- `needs-board-decision` — routed to `board review` (reuse existing).
- `changes-requested` — reviewer/QA asked for changes (reuse existing).

## Triage agent output schema (JSON)

```json
{
  "ghIssue": 296,
  "title": "short restated title",
  "category": "bug | enhancement | question | duplicate | wontfix",
  "severity": "critical | major | minor | trivial",
  "decision": "auto-fix | needs-decision | skip",
  "sensitiveGuess": true,
  "likelyPaths": ["src/app/..."],
  "proposedBranch": "fix/296-...",
  "approachSummary": "1-3 sentences on the intended fix",
  "confidence": "high | medium | low",
  "notes": "anything the implementer/orchestrator should know"
}
```

- `decision=skip` → duplicate/wontfix/needs-more-info → route to `board review`.
- `decision=needs-decision` → real ask but needs a human call → `board review`.
- `decision=auto-fix` → proceed to implement.
- `confidence=low` on an `auto-fix` → orchestrator treats as needs-decision.

## Implementer agent output schema (JSON)

```json
{
  "ghIssue": 296,
  "branch": "fix/296-...",
  "prUrl": "https://github.com/AhsanAyaz/code-with-ahsan/pull/NNN",
  "filesChanged": ["src/..."],
  "verifyStatus": "green | failing",
  "attempts": 1,
  "notes": "what changed + any residual risk"
}
```

## Ledger schema (`.agentloop/ledger.json`, git-ignored)

```json
{
  "meta": { "githubFieldId": "<clickup custom field id>", "updatedAt": "<iso>" },
  "items": {
    "296": {
      "ghIssue": 296,
      "clickupTaskId": "abc123",
      "branch": "fix/296-...",
      "prUrl": "https://github.com/.../pull/297",
      "phase": "triaged | implementing | in-review | board-review | test-on-prod | shipped | cancelled",
      "clickupStatus": "in review",
      "sensitive": true,
      "attempts": 1,
      "lastSeenCommentTs": 0,
      "updatedAt": "<iso>"
    }
  }
}
```
