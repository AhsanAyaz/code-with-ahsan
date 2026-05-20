---
phase: tools-event-email-blasts
plan: "05"
title: Send API + audit log
subsystem: admin-api
tags: [email-blast, resend, firestore, admin-api, audit-log]
dependency_graph:
  requires: [01-resend-migration, 02-ghost-admin-client, 03-recipient-parser]
  provides: [POST /api/admin/email-blast, GET /api/admin/email-blast/drafts, email-blasts Firestore collection]
  affects: [src/lib/email.ts]
tech_stack:
  added: []
  patterns: [admin-token gate via requireAdmin, Firestore pre-create + update pattern, sequential send with 250ms gap]
key_files:
  created:
    - src/app/api/admin/email-blast/route.ts
    - src/app/api/admin/email-blast/drafts/route.ts
    - src/app/api/admin/email-blast/__tests__/route.test.ts
    - src/lib/email-blast/escapeHtml.ts
  modified:
    - firestore.rules
    - src/lib/email.ts
decisions:
  - "Export sendEmail from src/lib/email.ts — it was internal-only but the blast route needs it directly; added export keyword, no callers broken"
  - "htmlEscape extracted to src/lib/email-blast/escapeHtml.ts for testability alongside parseRecipients.ts"
  - "GET /api/admin/email-blast/drafts returns 200 with empty drafts + error message on Ghost failure (degrade gracefully per plan)"
metrics:
  duration: 15m
  completed: "2026-05-20"
  tasks_completed: 7
  files_changed: 6
---

# Phase tools-event-email-blasts Plan 05: Send API + Audit Log Summary

Sequential email blast API with Resend delivery, per-recipient {{name}} HTML-escaping, and Firestore audit log tracking in-progress/completed/errored states.

## What Was Built

**`POST /api/admin/email-blast`** — Core send endpoint:
- Admin-token gate via `requireAdmin()` (validates against `admin_sessions` Firestore collection)
- Validates body: `ghostPostId` (non-empty string), `subject` (1–200 chars), `recipients` array (1–500 items)
- Returns 413 for recipients > 500 (hard cap against accidental 10k blasts)
- Fetches fresh draft HTML via `getDraftHtml(ghostPostId)` — 404 if null
- Pre-creates Firestore doc in `email-blasts/{auto-id}` with `status: "in_progress"` before any sends
- Loops recipients sequentially: htmlEscape name, split/join `{{name}}`, call `sendEmail()`
- 250ms delay between sends (skipped after last) — Resend free tier safe at ~4/sec
- Updates Firestore doc with `status: "completed"`, `sentCount`, `failedCount`, full `recipients` results array
- On uncaught exception: persists `status: "errored"` + partial results, returns 500 with partial data

**`GET /api/admin/email-blast/drafts`** — Draft picker endpoint:
- Admin-token gated, `Cache-Control: no-store`
- Delegates to `listEmailBlastDrafts()` from `@/lib/ghost/admin`
- Degrades gracefully on Ghost failure: returns `{ drafts: [], error: "Ghost API unavailable" }` with 200

**`src/lib/email-blast/escapeHtml.ts`** — HTML escape utility:
- Escapes `& < > " '` for safe name substitution in blast HTML bodies

**`firestore.rules`** — Locked down `email-blasts/{blastId}` to `allow read, write: if false` (Admin SDK bypasses for server writes; blocks client SDK reads).

## Tests

10 tests in `src/app/api/admin/email-blast/__tests__/route.test.ts`:
- 401 on missing/invalid admin token
- 400 on missing `ghostPostId`
- 400 on missing `subject`
- 400 on empty recipients array
- 413 on recipients > 500
- 404 when Ghost draft not found
- Happy path: 2 recipients — sendEmail called twice, Firestore set+update, `sent: 2`
- Partial failure: 1 sendEmail returns false → `failed: 1`, audit log `failedCount: 1`
- XSS: `<b>` name → `&lt;b&gt;` in HTML body
- Timing: N-1 setTimeout(250ms) calls for N recipients

All 10 pass. `npx tsc --noEmit` passes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Export] Exported `sendEmail` from `src/lib/email.ts`**
- **Found during:** Task 3 implementation
- **Issue:** `sendEmail` was declared as a non-exported internal function (`async function sendEmail`). The blast route imports it directly — this would have caused a TypeScript/runtime error.
- **Fix:** Added `export` keyword to `sendEmail` in `src/lib/email.ts`. All 14+ existing callers use named exports (`sendAdminMentorPendingEmail`, etc.) and call the internal `sendEmail` indirectly — no callers broken.
- **Files modified:** `src/lib/email.ts`
- **Commit:** 4c44ba6

## Known Stubs

None — the send route calls real `sendEmail`, `getDraftHtml`, and Firestore. Under `DISABLE_EMAILS=true` the existing `sendEmail` implementation returns `true` without hitting Resend (suitable for smoke testing).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: audit-log-size | src/app/api/admin/email-blast/route.ts | `recipients` array written to Firestore can be up to 500 items × {name, email, ok, error?}; Firestore doc limit is 1MB — at avg 100 bytes/recipient this is ~50KB, well within limits but worth monitoring for large blasts |

## Self-Check: PASSED

- src/app/api/admin/email-blast/route.ts: FOUND
- src/app/api/admin/email-blast/drafts/route.ts: FOUND
- src/app/api/admin/email-blast/__tests__/route.test.ts: FOUND
- src/lib/email-blast/escapeHtml.ts: FOUND
- Commit 4c44ba6: FOUND
