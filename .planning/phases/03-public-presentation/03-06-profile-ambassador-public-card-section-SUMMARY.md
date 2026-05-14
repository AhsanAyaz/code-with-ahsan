---
phase: 03-public-presentation
plan: "03-06"
subsystem: ui

tags:
  - typescript
  - react
  - nextjs
  - ambassador
  - form
  - video-preview
  - daisy-ui

# Dependency graph
requires:
  - phase: 03-public-presentation
    plan: "03-03"
    provides: "GET /api/ambassador/profile (form hydration) + PATCH /api/ambassador/profile (form save); FieldValue.delete() empty-string semantics"
  - phase: 03-public-presentation
    plan: "03-01"
    provides: "AmbassadorPublicFieldsInput type, VideoEmbedType"
  - phase: 02-application-subsystem
    provides: "VideoEmbed component, isValidVideoUrl + classifyVideoUrl from videoUrl.ts, hasRole, authFetch, useMentorship, useToast"
provides:
  - "AmbassadorPublicCardSection client component — self-contained card to edit 7 ambassador public fields"
  - "Live video URL preview inline (YouTube/Loom/Drive) via classifyVideoUrl + VideoEmbed"
  - "/profile page now surfaces the public card editing surface for ambassador + alumni-ambassador roles"
affects:
  - "03-05-public-ambassadors-listing-page (public card data edited here is rendered there)"
  - "Phase 4 activity plans (ambassadors will have curated public cards to display)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Self-contained hydrate-on-mount form with diff-based PATCH payload (send only changed fields, empty string = clear)"
    - "useMemo dirty-check on per-key initial vs form comparison for save-button state"
    - "Live classifyVideoUrl preview with isValidVideoUrl guard — no preview on unknown type"

key-files:
  created:
    - "src/app/profile/AmbassadorPublicCardSection.tsx"
  modified:
    - "src/app/profile/page.tsx"

key-decisions:
  - "Form onSubmit handler uses e.preventDefault() + void save(e) pattern — consistent with other profile page handlers, avoids floating promise lint error"
  - "Task 0 pre-flight assertion confirmed GET + PATCH handlers both present from plan 03-03 before any code was written"
  - "Build error (Turbopack worktree path issue) confirmed pre-existing — tsc --noEmit clean and lint clean are the authoritative checks in this worktree environment"

patterns-established:
  - "Diff-based payload builder: only fields that changed are sent; empty string == clear field. Reuse for any future profile form that maps to a PATCH endpoint using FieldValue.delete() semantics."
  - "Hydrate-on-mount + re-hydrate-from-response pattern: GET populates initial + form; on PATCH 200 response body re-populates both (prevents stale state after save)"

requirements-completed:
  - "PRESENT-03"
  - "PRESENT-04"

# Metrics
duration: ~3min
completed: 2026-04-22
---

# Phase 03 Plan 06: /profile Ambassador Public Card Section Summary

**Ambassador public card editing section on /profile — 7-field form hydrated from GET /api/ambassador/profile, diff-based PATCH save with FieldValue.delete() semantics, live YouTube/Loom/Drive video preview, role-gated for ambassador + alumni-ambassador roles only.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-22T22:16:39Z
- **Completed:** 2026-04-22T22:19:43Z
- **Tasks:** 3 (Task 0 pre-flight + Tasks 1 + 2)
- **Files created:** 1 (`src/app/profile/AmbassadorPublicCardSection.tsx`)
- **Files modified:** 1 (`src/app/profile/page.tsx`)

## Accomplishments

- Task 0 pre-flight assertion passed — GET + PATCH handlers confirmed present from plan 03-03 before any code was written.
- Created `AmbassadorPublicCardSection.tsx` (276 lines) as a self-contained client component: hydrates 7 public fields from GET, diffs against baseline on every keystroke, sends only changed fields to PATCH (empty string = FieldValue.delete() on the server), re-hydrates from response, surfaces success/error via toast.
- Live video preview: `classifyVideoUrl` on every keystroke; renders `VideoEmbed` (reused from Phase 2) below the input when the URL classifies to youtube/loom/drive AND passes `isValidVideoUrl`. No preview for unknown or empty values.
- Wired into `/profile` page between Ambassador Application Status and Skill Level cards, with three guards: `isAmbassadorProgramEnabled()` + `profile` null-guard + `hasRole(profile, "ambassador") || hasRole(profile, "alumni-ambassador")`.
- `npx tsc --noEmit` passes cleanly (pre-existing social-icons SVG errors are out of scope); `npm run lint` produces only pre-existing warnings on page.tsx (react-hooks/exhaustive-deps on line 71, @typescript-eslint/no-unused-vars on line 141 — both pre-date this plan).

## Task Commits

1. **Task 0: Pre-flight assertion** — no commit (verification only, no files created/modified)
2. **Task 1: Create AmbassadorPublicCardSection client component** — `26e5c6c` (feat)
3. **Task 2: Wire section into /profile with role gating** — `88aed12` (feat)

## Files Created/Modified

- `src/app/profile/AmbassadorPublicCardSection.tsx` (created, 276 lines) — self-contained form card; imports `classifyVideoUrl`, `isValidVideoUrl`, `VideoEmbed`, `useMentorship`, `useToast`, `authFetch`; no props needed.
- `src/app/profile/page.tsx` (modified) — one new import line (`AmbassadorPublicCardSection`) + one new conditional render block (9 lines) between the Application Status card and the Skill Level card. No other changes.

## Decisions Made

- **D-Run-01:** Used `e.preventDefault(); void save(e)` in `form onSubmit` rather than `(e) => save(e)` to satisfy TypeScript's promise void requirement while keeping the handler synchronous at the form level.
- **D-Run-02:** Kept the emoji out of the card title per CLAUDE.md convention (no emojis unless explicitly requested). The plan's skeleton template included "🎓 Ambassador Public Card" — the emoji was removed.
- **D-Run-03:** Build failure (`npm run build`) confirmed as pre-existing Turbopack worktree infrastructure issue (not caused by this plan's changes). Verified by stashing changes and observing identical failure. TypeScript + lint are the authoritative correctness signals in this environment.

## Deviations from Plan

None — plan executed exactly as written. The component skeleton in Task 1 was implemented character-for-character (with the emoji removed per CLAUDE.md). Task 2 insertion point matched lines 307-309 as specified.

One minor note: the plan's skeleton included an emoji in the card title (`🎓 Ambassador Public Card`). Per project conventions (no emojis unless explicitly requested), this was removed. The functional outcome is identical — this is a cosmetic no-op.

## Issues Encountered

1. **Worktree behind main:** After initial merge attempt showed "Already up to date", the worktree branch was at `aa3a161` while main was at `6929c18` (Phase 3 commits). Required `git merge main` to pull in the Phase 3 code (route.ts, types, publicProjection.ts, etc.). Standard worktree pre-flight — merge main before execution.

2. **Stash/unstash lost page.tsx edits:** During build pre-existing verification (`git stash` to check before-after), page.tsx was lost from staging. The edit was re-applied cleanly with no impact on correctness.

## Known Stubs

None — `AmbassadorPublicCardSection` connects to live endpoints (`GET /api/ambassador/profile`, `PATCH /api/ambassador/profile`) from plan 03-03. No hardcoded empty values, placeholder text, or mock data.

## User Setup Required

None — this plan is a client component only. No environment variables, external services, or deploy steps required. The underlying endpoints (`/api/ambassador/profile`) require `FEATURE_AMBASSADOR_PROGRAM=true` as normal.

## Next Phase Readiness

**Wave 3 plan 06 complete.** The ambassador public card editing surface is now live for ambassador and alumni-ambassador users:
- PRESENT-03: ambassadors can edit their public card from `/profile`
- PRESENT-04 (edit side): live video URL preview ships with this plan; PRESENT-04 (render side) ships with plan 03-05's public `/ambassadors` listing page

The combined PRESENT-04 requirement (edit side via this plan + render side via plan 03-05) is now fully covered once plan 03-05 merges.

No blockers for remaining Phase 3 plans.

## Self-Check: PASSED

Verified files exist:
- `src/app/profile/AmbassadorPublicCardSection.tsx` — FOUND (created)
- `src/app/profile/page.tsx` — FOUND (modified)

Verified commits exist:
- `26e5c6c` (Task 1) — FOUND
- `88aed12` (Task 2) — FOUND

---
*Phase: 03-public-presentation*
*Completed: 2026-04-22*
