---
name: agent-loop
description: "Run one tick of the code-with-ahsan GitHub⇄ClickUp autonomous loop: triage new GitHub issues, auto-fix + merge safe ones, escalate risky ones to a human, and reconcile ClickUp board activity (in review / board review / test on production) into next actions. Use when the user says 'run the agent loop', 'run a loop tick', '/agent-loop', or drives it recurringly via '/loop 15m /agent-loop'. Runs in the main session (needs ClickUp + GitHub MCP). Delegates analysis to the issue-triage agent (Sonnet 5) and coding to the fix-implementer agent (Sonnet 5); the orchestrator owns every ClickUp write and the merge gate."
---

# agent-loop (orchestrator)

You are the orchestrator. You run in the **main session**, so you — and only you —
own: all **ClickUp MCP** calls, the **merge gate**, `gh` merge/close, `git`
hygiene, and the **ledger**. Subagents (`issue-triage`, `fix-implementer`) cannot
reach MCP; they return structured JSON and you act on it.

One invocation = **one tick**. A tick runs three phases in order: **Intake →
Implement → Reconcile**. Drive recurrence with `/loop 15m /agent-loop`.

## Step 0 — Load context & guard

1. Read `references/config.md` (this skill dir) — IDs, status/member ids,
   verification commands, sensitive-path gate, caps, all JSON schemas. **It is
   authoritative.**
2. Read `<repo-root>/.agents/agent-loop-context.md`.
3. Load the ledger `<repo-root>/.agentloop/ledger.json` (create `{meta:{},
items:{}}` if absent). This is your idempotency + sync spine.
4. **Mode:** default to **`--dry-run`** unless the user passed `--live`. In
   dry-run you narrate every intended action but create/modify/merge **nothing**
   (no ClickUp writes, no branches, no merges, no labels). Say clearly which mode
   you're in at the top.
5. **Repo hygiene:** ensure a clean tree on `main`, up to date
   (`git checkout main && git pull --ff-only`). If the tree is dirty, stop and
   report — never stash/discard someone's work.
6. **First live run only — mapping field.** Call `clickup_get_custom_fields(list_id)`.
   - If a number field named "GitHub Issue" exists, cache its id in
     `ledger.meta.githubFieldId` and set it on every task you create.
   - If it does not exist, the MCP **cannot create custom fields** — log a one-time
     note asking the human to add a number field "GitHub Issue" to list
     `901524032971` in the ClickUp UI, and **degrade gracefully**: rely on the
     `[GH#<n>]` title marker + the ledger for 1:1 mapping (still fully functional).
     Ensure the `agent-tracked` GH label exists (`gh label create` if missing).

## Phase A — Intake (GitHub → triage → ClickUp)

1. List open issues: `gh issue list --state open --limit 30 --json number,title,labels,body`.
2. Filter to **new** ones: issue number NOT in `ledger.items`. Respect the cap —
   at most **5** new issues per tick (log the rest as deferred).
3. For each new issue, spawn the **issue-triage** agent (Agent tool,
   `model: sonnet`, agentType `issue-triage`) with the issue number/title/body/
   labels. Parse its JSON verdict.
4. Create the **1:1 ClickUp task** on list `901524032971`:
   - title `[GH#<n>] <title>`
   - description: issue URL, triage `approachSummary`, severity/category
   - set the **"GitHub Issue"** custom field = `<n>`
   - status + assignee by decision:
     - `auto-fix` → **in development** (no assignee yet; you'll implement)
     - `needs-decision` or `skip` → **board review** + assign **Ahsan** (248670032)
   - Comment on the GH issue linking the ClickUp task URL; add label
     `agent-tracked` (+ the triage agent's `cto-triaged` / `needs-board-decision`).
5. Write the ledger item (`phase`, `clickupTaskId`, `clickupStatus`, `sensitive`
   = triage guess, `attempts:0`, `lastSeenCommentTs:0`).
6. Only `auto-fix` (and `confidence != low`) items proceed to Phase A2. A
   low-confidence auto-fix is treated as `needs-decision` (board review).

## Phase A2 — Implement (for auto-fix items)

> **Run implementers ONE AT A TIME** on the shared tree. They mutate the working
> tree, so a second implementer launched while another's branch is still checked
> out starts dirty (this actually happened — a broadcast PR inherited a prior
> task's branch). To parallelize safely, give each `isolation: 'worktree'` —
> but then you MUST re-verify the build yourself (see the merge gate: Turbopack
> can't build inside a worktree, and the branch is locked to that worktree, so
> only a `--detach` checkout at the head sha gives a real result).

1. **Reset the tree yourself BEFORE every implementer — do not trust the previous
   step to have left you on `main`:**
   - `git checkout main && git pull --ff-only`.
   - Verify clean + on main: `git status --porcelain` empty and
     `git branch --show-current` == `main`. If dirty, STOP and report — never
     stash/discard someone's work.
2. Spawn **fix-implementer** (Agent tool, `model: sonnet`, agentType
   `fix-implementer`) with the issue + triage JSON. Parse its JSON.
   Increment `attempts` in the ledger.
3. **Merge gate — authoritative, on the REAL diff** (not the triage guess):
   - **Re-verify the build yourself when the implementer ran in a worktree.**
     `npm run build` (Turbopack) FAILS inside `.claude/worktrees/*` — it infers the
     workspace root as the parent worktrees dir and errors "couldn't find the
     Next.js package". So a worktree implementer literally cannot run the repo's
     real build; treat its "build green" as unverified and re-run it here.
     **Use a detached checkout — a plain `git checkout <branch>` SILENTLY FAILS
     while the agent's worktree still holds that branch, leaving you on `main` and
     building the wrong tree (this happened; the "verification" was of main):**
     ```
     git fetch origin <branch>
     git checkout --detach <headSha>     # NOT `git checkout <branch>`
     git rev-parse --short HEAD          # assert it equals <headSha>
     npm run build; echo "exit=$?"       # exit 0 required
     npx vitest run                      # no NEW failures vs main's baseline
     git checkout main && git pull --ff-only
     ```
     Never report a build as verified without asserting HEAD == the PR's head sha.
   - **Provenance check first:** `git fetch origin <branch>` then
     `git log --oneline main..origin/<branch>` — confirm the branch contains
     ONLY this issue's commit(s) and nothing from another task (guards against a
     contaminated base). If it carries unrelated commits/files, do NOT merge →
     escalate to Ahsan with a note.
   - Compute `git diff --name-only main...origin/<branch>` and test it against the
     sensitive-path gate in config.md.
   - **Merge** iff `verifyStatus == green` AND diff touches **no** sensitive path
     AND decision was `auto-fix`:
     - `gh pr merge <pr> --squash --delete-branch`
     - `git checkout main && git pull --ff-only`
     - ClickUp → **test on production**, assign **Najla (106789070) + Maham
       (100676509)**, comment "Merged in <PR>. Please test on production."
     - GH issue: **leave open**, comment "Merged in <PR>; tracking prod test in
       ClickUp <task url>." (It closes only when QA approves — Phase B.)
     - Ledger: `phase = test-on-prod`, store `prUrl`.
   - **Escalate** otherwise:
     - sensitive diff OR `verifyStatus == failing` OR low confidence → keep PR
       open; ClickUp → **in review**, assign **Ahsan** (this is the authoritative
       human signal), comment why (sensitive path / verify failing) with the PR
       link. Best-effort `gh pr edit <pr> --add-reviewer AhsanAyaz` — this fails
       when Ahsan is the PR author (expected); ignore that error.
     - Ledger: `phase = in-review`, `sensitive = true` when path-gated.
4. If implementer returned `failing` and `attempts >= 2`: stop retrying →
   ClickUp **board review** + assign Ahsan, comment the blocker. (Circuit breaker.)

## Phase B — Reconcile (ClickUp activity → next action)

For each ledger item whose `clickupStatus` ∈ {`in review`, `board review`,
`test on production`}:

0. **PR-merge detection FIRST (before reading comments).** Ahsan often approves by
   **merging the PR directly on GitHub**, not by commenting on ClickUp — the loop
   must notice that on its own. For any ledger item with a `prUrl`/`branch` still
   in `in-review` (or `board-review` with a PR), run
   `gh pr view <pr> --json state,mergedBy` (or `gh pr list --search head:<branch>`):
   - **state == MERGED** → a human shipped it. Route to **test on production**,
     assign **Najla (106789070) + Maham (100676509)**, comment "Merged in <PR> by
     <mergedBy>. Please test on production." If GitHub auto-closed the issue via
     `Closes #<n>`, **reopen it** (`gh issue reopen <n>`) so GH mirrors the QA-pending
     state — the issue closes only when QA approves. Ledger: `phase = test-on-prod`.
     Then continue to the comment check below (a merged item can still get QA
     comments).
   - **state == CLOSED (not merged)** → the PR was rejected/closed by a human →
     ClickUp **cancelled**, `gh issue close <n>` if still open. Ledger `phase =
cancelled`.
   - **state == OPEN** → nothing merged yet; fall through to the comment check.

1. Fetch task comments (`clickup_get_task_comments`). Find comments newer than
   `lastSeenCommentTs`. **Ignore the loop's own comments** — any whose text starts
   with the `🤖 [agent-loop]` marker (the loop posts via Ahsan's ClickUp account,
   so the author id alone can't distinguish loop posts from real human input;
   the marker is the reliable signal). Only genuine human comments drive actions.
   Still advance `lastSeenCommentTs` past skipped self-comments. If nothing
   human-authored remains, skip.
2. Interpret the newest actionable comment **by author + intent**:
   - **test on production** + comment reads as **fail / "still broken" / reopened**
     → ClickUp **in development**; **reset the tree first** (`git checkout main &&
git pull --ff-only`, verify clean per Phase A2.1); spawn fix-implementer with
     the feedback (update the existing branch/PR, or new branch if already merged);
     re-run the **merge gate** (incl. provenance check); on green+safe re-merge →
     back to **test on production** + Najla+Maham. Bump `attempts`.
   - **test on production** + comment reads as **pass / approved / "works"**
     → ClickUp **shipped**; `gh issue close <n> --comment "Verified on production
— shipped."`; ledger `phase = shipped`.
   - **in review / board review** + comment **by Ahsan (248670032)** →
     interpret intent:
     - approve / merge / LGTM → run the merge (checkout main, pull) → **test on
       production** + Najla+Maham.
     - change request ("do X", "also handle Y") → ClickUp **in development** +
       label GH `changes-requested`; spawn fix-implementer with the instruction;
       update PR; → back to **in review** + Ahsan.
     - close / wontfix → `gh pr close`, `gh issue close`, ClickUp **cancelled**.
     - ambiguous → **leave**, log it, and (optional) `tg-send` a nudge to Ahsan.
       Never guess a destructive action from an ambiguous comment.
3. Update `lastSeenCommentTs` to the newest processed comment's timestamp.

## Guardrails (enforce every tick)

- **Human owns risky merges.** Never auto-merge a sensitive-path diff — no
  exceptions, regardless of triage confidence.
- Caps: ≤5 new issues/tick; ≤2 implement attempts/issue then escalate.
- Idempotency: never create a second ClickUp task for a GH# already in the
  ledger; key task creation on the "GitHub Issue" field.
- Never merge `failing` code. Never close an issue that hasn't passed prod test.
- Leave the repo clean and on `main` at the end of every tick.
- **Loud summary:** end each tick with a table — for each touched item: GH#,
  ClickUp status, action taken (created / merged / escalated / reconciled /
  skipped) and the reason. List deferred (over-cap) issues explicitly.

## Notes on ClickUp MCP

**Every ClickUp comment the orchestrator posts MUST begin with the marker
`🤖 [agent-loop] `.** The loop authenticates as Ahsan's account, so its own status
posts otherwise look like human comments (and can contain words like "approved") —
Phase B would re-read them as fresh decisions and loop. The marker lets Phase B
skip them (see Phase B step 1). Human comments never carry the marker.

Use the `mcp__clickup__*` tools: `clickup_create_task` (with `custom_fields:
[{id, value}]`, `assignees`, `status`, `markdown_description`),
`clickup_update_task` (change `status` / `assignees` / `custom_fields`),
`clickup_create_comment` (`entity_type:"task"`, `entity_id`),
`clickup_get_task_comments`, `clickup_get_task`, `clickup_get_custom_fields`,
`clickup_resolve_assignees`, `clickup_filter_tasks` / `clickup_search` (find a
task by its `[GH#n]` marker when the ledger is cold). Prefer status **names**
(the MCP resolves them); fall back to the ids in config.md. Assign by member id.
There is no create-custom-field tool — see Step 0.6.
