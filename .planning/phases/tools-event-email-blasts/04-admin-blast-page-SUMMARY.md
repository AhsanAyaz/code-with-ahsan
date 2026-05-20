---
phase: tools-event-email-blasts
plan: "04"
title: Admin blast page UI — /admin/events/email
subsystem: admin-ui
tags: [email-blast, admin, next-app-router, daisyui]
dependency_graph:
  requires: [02-ghost-admin-client, 03-recipient-parser]
  provides: [admin-email-blast-ui]
  affects: [src/app/admin/events/email]
tech_stack:
  added: []
  patterns: [AdminAuthGate, ADMIN_TOKEN_KEY, useRef debounce, DaisyUI modal]
key_files:
  created:
    - src/app/admin/events/email/page.tsx
    - src/app/admin/events/email/EmailBlastClient.tsx
    - src/app/admin/events/email/PreviewIframe.tsx
  modified: []
decisions:
  - Used subjectTouchedRef pattern (same as raffle titleHydratedRef) to prevent auto-fill from overwriting user edits
  - PreviewIframe uses onLoad to measure scrollHeight for dynamic height
  - Badge showing "{{name}} substituted" rendered with string concatenation to avoid JSX brace confusion
  - DaisyUI modal opened via modal-open class on dialog element (matches existing codebase pattern)
metrics:
  duration: ~15min
  completed: 2026-05-20
---

# Phase tools-event-email-blasts Plan 04: Admin blast page UI Summary

**One-liner:** Ghost draft picker + TSV recipient textarea with live parseRecipients, sandboxed HTML preview iframe, DaisyUI confirm modal, and post-send results table at `/admin/events/email`.

## Tasks Completed

| # | Task | Status |
|---|------|--------|
| 1 | Page shell — AdminAuthGate wrapper | Done |
| 2 | Client component skeleton + state shape | Done |
| 3 | Draft fetch + picker (with refresh button, relative timestamps) | Done |
| 4 | Recipient textarea + 150ms debounced live parse + skipped collapsible | Done |
| 5 | PreviewIframe component with {{name}} substitution | Done |
| 6 | Confirm modal (subject, count, first 5 recipients, full list collapsible) | Done |
| 7 | Results table (green/red rows, summary stats, reset + audit log link) | Done |
| 8 | A11y pass (labels, aria-live, aria-busy, ESC to close modal) | Done |
| 9 | Commit | Done |

## Commits

- `57ae114` feat(admin): add email blast composer UI at /admin/events/email

## Deviations from Plan

None — plan executed exactly as written. One minor fix: JSX badge rendering `{{name}}` used string concatenation `{"{{"+"name"+"}}"} ` to avoid TypeScript parser ambiguity with nested braces.

## Known Stubs

- "View audit log" link points to `/admin/events/email/history` which does not yet exist (out of scope per plan). Link renders but navigates to a 404. Intentional placeholder — Plan 06 or later will wire this.
- `GET /api/admin/email-blast/drafts` endpoint not yet implemented (Plan 05). Draft picker gracefully shows "No drafts found" on 404/empty response.
- `POST /api/admin/email-blast` send endpoint not yet implemented (Plan 05). Send button will call the route and show an error until Plan 05 is deployed.

## Threat Flags

None — this is an admin-only UI behind AdminAuthGate. No new network surface was introduced beyond what Plans 02/05 define for the API routes.

## Self-Check: PASSED

- src/app/admin/events/email/page.tsx — FOUND
- src/app/admin/events/email/EmailBlastClient.tsx — FOUND
- src/app/admin/events/email/PreviewIframe.tsx — FOUND
- Commit 57ae114 — FOUND
- npx tsc --noEmit — PASSED (zero errors)
