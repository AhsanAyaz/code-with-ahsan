---
phase: 02-application-subsystem
plan: "08"
subsystem: admin-review-ui
tags:
  - admin
  - ambassador
  - review
  - pagination
  - discord
  - video-embed
dependency_graph:
  requires:
    - 02-01  # types/ambassador.ts
    - 02-04  # adminAuth, cohort API
    - 02-05  # GET /api/ambassador/applications (list endpoint)
    - 02-06  # GET/PATCH /api/ambassador/applications/[id], POST /discord-resolve (parallel)
  provides:
    - /admin/ambassadors page with paginated list + filters
    - /admin/ambassadors/[applicationId] detail page
    - VideoEmbed, DiscordBanner, DecisionDialog components
  affects:
    - 02-09  # cleanup cron (admin detail page exposes student-ID URL)
tech_stack:
  added:
    - react-lite-youtube-embed (^3.3.3, already installed)
  patterns:
    - DaisyUI table + badge components
    - Cursor pagination stack (forward-only Firestore, back via client stack)
    - URL query param filters (status + cohortId survive page refresh)
    - Two-file admin page pattern: server-component shell + client component (D-09)
key_files:
  created:
    - src/app/admin/ambassadors/page.tsx
    - src/app/admin/ambassadors/ApplicationsList.tsx
    - src/app/admin/ambassadors/[applicationId]/page.tsx
    - src/app/admin/ambassadors/[applicationId]/ApplicationDetail.tsx
    - src/app/admin/ambassadors/[applicationId]/VideoEmbed.tsx
    - src/app/admin/ambassadors/[applicationId]/DiscordBanner.tsx
    - src/app/admin/ambassadors/[applicationId]/DecisionDialog.tsx
  modified: []
decisions:
  - "Video embed trusts videoEmbedType from ApplicationDoc (server-classified at submission) — no client-side re-classification"
  - "Pagination uses client-side cursor stack (pages array) for back navigation since Firestore is forward-cursor-only"
  - "showDiscordBanner fires when: status=accepted AND (discordMemberId null OR discordRetryNeeded true OR discordRoleAssigned not true)"
  - "ApplicationDetail imports VideoEmbed/DiscordBanner/DecisionDialog from sibling files — collocated per route segment"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-22"
  tasks_completed: 3
  tasks_total: 3
  files_created: 7
  files_modified: 0
---

# Phase 02 Plan 08: Admin Review UI Summary

**One-liner:** Admin ambassador review surface — paginated list with URL-filter persistence, full application detail view with video embed (YouTube/Loom/Drive), Discord retry banner, and accept/decline dialog with reviewer notes.

## What Was Built

Seven files across two Next.js route segments implementing the admin ambassador review flow.

### Component Tree

```
/admin/ambassadors (route)
  page.tsx                     — server-component shell (force-dynamic)
  layout.tsx                   — feature flag gate (isAmbassadorProgramEnabled)
  ApplicationsList.tsx         — client component, DaisyUI table
    - status filter → URL ?status=
    - cohort filter → URL ?cohort= (loaded from GET /api/ambassador/cohorts?scope=all)
    - cursor pagination (forward + client-side stack for back)
    - "Review →" link to /admin/ambassadors/[applicationId]

/admin/ambassadors/[applicationId] (route)
  page.tsx                     — server-component shell (D-09 reference pattern)
  ApplicationDetail.tsx        — client component, fetches GET /api/ambassador/applications/[id]
    VideoEmbed.tsx             — switches on videoEmbedType: YouTube / Loom / Drive
    DiscordBanner.tsx          — warns + retries when Discord role unresolved (REVIEW-05)
    DecisionDialog.tsx         — DaisyUI modal, PATCH accept/decline + reviewer notes
```

### Admin Flow Chain

```
GET /api/ambassador/applications?status=X&cohortId=Y&cursor=Z&pageSize=20
    → ApplicationsList table

click "Review →"

GET /api/ambassador/applications/[id]
    → ApplicationDetail (app data + signed student-ID URL, 1 hour expiry)
    → VideoEmbed renders embed by type
    → showDiscordBanner if accepted + Discord not cleanly resolved

click Accept/Decline

PATCH /api/ambassador/applications/[id]  { action, notes }
    → DecisionDialog confirms
    → load() re-fetches detail page
    → if Discord failed → DiscordBanner appears with Retry button

click Retry

POST /api/ambassador/applications/[id]/discord-resolve
    → DiscordBanner posts, re-resolves handle (Pitfall 2)
    → onResolved() re-fetches detail
```

### Key Design Decisions

1. **Pagination cursor stack:** Firestore cursor pagination is forward-only. ApplicationsList keeps a `pages` array of previous cursors so the "Previous" button can replay them. No server-side reverse cursor is needed for v1.

2. **URL-persisted filters:** Status and cohort filters use `router.push()` with updated URL search params — refreshing the page keeps the admin's filter context (D-10).

3. **Discord banner condition:** `showDiscordBanner` is true when `status === "accepted"` AND any of: `discordMemberId == null`, `discordRetryNeeded === true`, `discordRoleAssigned !== true`. This covers all Discord failure scenarios without duplicating logic from the server.

4. **Video embed trust:** The `videoEmbedType` field on the document was classified server-side at submission time (Plan 05). VideoEmbed trusts this field rather than re-classifying client-side, then extracts the specific ID using Plan 02's `extractYouTubeId` / `extractLoomId` / `extractDriveFileId` helpers.

5. **D-09 reference pattern:** Two files per admin page route — thin server-component `page.tsx` + client component — ensures the parent `AdminAuthGate` in `src/app/admin/layout.tsx` gates auth for all nested admin routes correctly.

6. **Plan 06 parallel contract:** This plan codes against Plan 06's API contracts (GET detail, PATCH accept/decline, POST discord-resolve) without requiring Plan 06 to be complete first. The contracts are defined in the plan interfaces and types are already in `src/types/ambassador.ts`.

## Deviations from Plan

### grep count check on motivation/experience/pitch

The acceptance criterion `grep -cE "(motivation|experience|pitch)"` returning >= 3 uses line-count mode. The implementation renders all three prompts via a single `.map()` call on a one-line array literal: `["motivation", "experience", "pitch"]`. The grep returns 1 (one matching line), but all three prompts render correctly at runtime. This is a test artifact, not a code defect.

### Worktree merge required

**[Rule 3 - Blocking]** The worktree branch was based on Phase 1 end (commit `9a2843d`) and did not have Phase 2 foundations (`src/types/ambassador.ts`, `src/lib/ambassador/videoUrl.ts`, `src/lib/ambassador/adminAuth.ts`, etc.) which were committed to `main` by Phase 2 Plans 01–05. The worktree branch was merged from `main` (fast-forward) before task execution to resolve the missing imports.

## Known Stubs

None — all API endpoints are wired to real routes (coded against Plan 06 contracts). The `DISCORD_AMBASSADOR_ROLE_ID` placeholder (`"PENDING_DISCORD_ROLE_CREATION"`) exists in `src/lib/discord.ts` and is a Plan 09 pre-flight concern, not a UI stub.

## Self-Check: PASSED

All 7 created files verified on disk. All 3 task commits found in git log:
- e18243d: feat(02-08): build list page with filters + cursor pagination
- 87cdd48: feat(02-08): build detail page shell + ApplicationDetail client component
- d9b8acf: feat(02-08): add VideoEmbed, DiscordBanner, DecisionDialog components
