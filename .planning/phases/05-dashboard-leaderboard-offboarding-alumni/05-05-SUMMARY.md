---
plan: 05-05
phase: 05-dashboard-leaderboard-offboarding-alumni
status: complete
checkpoint: pending-human-verification
---

# Plan 05-05: UI Assembly — Summary

## What was built

### Ambassador Dashboard (`/ambassadors/dashboard`)
- `src/app/ambassadors/dashboard/page.tsx` — server shell (`force-dynamic`)
- `src/app/ambassadors/dashboard/DashboardClient.tsx` — role-gate redirect, cancel-safe fetch, component composition
- `src/app/ambassadors/dashboard/PersonalStatsPanel.tsx` — 5-stat DaisyUI grid, `text-error` on strikes ≥ 2
- `src/app/ambassadors/dashboard/OnboardingChecklist.tsx` — 5-item checklist with self-mark PATCH buttons
- `src/app/ambassadors/dashboard/LeaderboardPanel.tsx` — tab toggle (cumulative/this_month), grace banner, top-3 table, own-rank row
- `src/app/ambassadors/dashboard/AmbassadorOfMonthBanner.tsx` — conditional banner (null when no AotM set)

### Admin Lifecycle UI (`/admin/ambassadors/members/[uid]`)
- `src/app/admin/ambassadors/members/[uid]/OffboardConfirmModal.tsx` — accessible `<dialog>` with `aria-labelledby`, replaces `window.confirm`
- `src/app/admin/ambassadors/members/[uid]/AlumniTransitionButton.tsx` — inline confirm, cohort end-date gate
- `src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx` — wired both components + Discord retry banner

## Deviations
- `cohortEndDate` passed as `null` to `AlumniTransitionButton` — the GET `/api/ambassador/members/[uid]` handler does not currently return `cohort.endDate`. Button will always be hidden until the GET handler is extended. Surfaced as a known gap.

## Checkpoint
Task 3 (human-verify) was deferred by the user. Browser verification of the dashboard and admin lifecycle UI is pending.

## Self-Check: PASSED (automated)
- `tsc --noEmit` passed
- All acceptance criteria grep checks passed
- `window.confirm` removed from MemberDetailClient
