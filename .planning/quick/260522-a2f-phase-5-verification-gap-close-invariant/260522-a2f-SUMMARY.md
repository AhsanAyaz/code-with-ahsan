---
quick_id: 260522-a2f
phase: quick/260522-a2f-phase-5-verification-gap-close-invariant
plan: 01
subsystem: ambassador-dashboard
tags: [phase-5, gap-close, INV-1, INV-2, INV-4, tdd]
requires:
  - "GET /api/ambassador/dashboard/me (Plan 05-03)"
  - "PATCH /api/ambassador/profile (Plan 03-03)"
  - "Admin GET /api/ambassador/members/[uid] (Phase 4 D-05)"
  - "AlumniTransitionButton (Plan 05-05)"
  - "src/lib/ambassador/reportDeadline.ts getDeadlineUTC (Phase 4)"
provides:
  - "stats.reportsOnTime field on /me response (additive, number >= 0)"
  - "AmbassadorPublicFieldsSchema.onboarding optional partial map (joinedDiscord, sharedReferralLink)"
  - "Dot-path onboarding writes (onboarding.\${flag}) on PATCH /profile — sibling-preserving"
  - "Skip-public-projection optimisation for onboarding-only PATCH"
  - "Top-level cohort.endDate field on admin GET /members/[uid] (ISO string or null)"
  - "MemberDetailClient.cohort?.endDate prop source for AlumniTransitionButton"
affects:
  - "Ambassador dashboard /me consumers (UI renders reportsOnTime number not undefined)"
  - "OnboardingChecklist persistence (self-mark survives reload)"
  - "Admin member detail page (AlumniTransitionButton visibility gate evaluates real value)"
tech-stack:
  added: []
  patterns:
    - "Firestore dot-path update() for sibling-preserving partial-object writes"
    - "Conditional Promise.resolve(null) in Promise.all to skip optional reads"
key-files:
  created:
    - src/app/api/ambassador/profile/route.test.ts
  modified:
    - src/app/api/ambassador/dashboard/me/route.ts
    - src/app/api/ambassador/dashboard/me/route.test.ts
    - src/types/ambassador.ts
    - src/app/api/ambassador/profile/route.ts
    - src/app/api/ambassador/members/[uid]/route.ts
    - src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx
decisions:
  - "INV-1 reportsOnTime derived server-side from monthly_reports docs + getDeadlineUTC — no new onTime field added at write time (reports cap ~12 docs/ambassador, full .get() acceptable). Threat T-260522-a2f-06 accepts the DoS surface."
  - "INV-1 deadline boundary inclusive (submittedMs <= deadline) — matches getDeadlineUTC contract ('final ms of month, 23:59:59.999 local time'). Threat T-260522-a2f-05 accepts boundary repudiation risk."
  - "INV-2 onboarding accepted ONLY {joinedDiscord, sharedReferralLink} — keys mirror AmbassadorSubdoc.onboarding shape exactly (no widening). Auto-derived flags (setBio/uploadedVideo/loggedFirstEvent) stay in /me, not in subdoc."
  - "INV-2 dot-path write (onboarding.\${key}) instead of full-object replace — prevents clobbering siblings. Defensive typeof === 'boolean' check after Zod parse."
  - "INV-2 skip public_ambassadors projection write on onboarding-only PATCH — avoids unnecessary updatedAt bump on the public card (onboarding is private)."
  - "INV-4 cohort read uses Promise.resolve(null) when subdoc.cohortId absent — avoids a wasted Firestore read."
  - "INV-4 kept subdoc.cohortEndDate in MemberDetail type (backward compat for test fixtures) but it's no longer used as the prop source."
metrics:
  duration: "~9 min"
  completed: "2026-05-22T05:37:28Z"
  tasks: 3
  files: 6
  commits: 4
---

# Quick 260522-a2f Summary

Closes three actionable Phase 5 verification gaps from `.planning/phases/05-dashboard-leaderboard-offboarding-alumni/05-VERIFICATION.md` — ambassador dashboard now renders a real reports-on-time number, the onboarding checklist persists self-mark flags via Firestore dot-path writes, and the admin can trigger the alumni transition because the GET handler now joins `cohorts/{cohortId}.endDate`.

## Gaps Closed

### INV-1 — `/me` missing `reportsOnTime` (PARTIAL → CLOSED)

**Evidence:**

- `src/app/api/ambassador/dashboard/me/route.ts:78` — replaced `count().get()` with full `.get()`.
- `src/app/api/ambassador/dashboard/me/route.ts:91-105` — `reportsOnTime` derivation: parse `YYYY-MM`, call `getDeadlineUTC(year, month, tz)`, compare `submittedAt.toMillis() <= deadline`.
- `src/app/api/ambassador/dashboard/me/route.ts:119` — `reportsOnTime` added to response `stats` ALONGSIDE preserved `reportsCount`.
- `src/app/api/ambassador/dashboard/me/route.test.ts:135-144` — failing-then-passing test asserts `body.stats.reportsOnTime === 1` from seeded mock (Doc 1 on time Jan 31 23:59:58 UTC; Doc 2 late Mar 5 for Feb).

**TDD trail:**

- **RED** commit `88b58f9` — test added; ran `npm test`, new test failed with `expected 'undefined' to be 'number'`, existing 6 tests still passed.
- **GREEN** commit `5e687c2` — implementation added; all 7 tests pass.

### INV-2 — onboarding checklist persistence dead (PARTIAL → CLOSED)

**Evidence:**

- `src/types/ambassador.ts:142-149` — `AmbassadorPublicFieldsSchema` extended with optional `onboarding` partial map. Keys: `joinedDiscord`, `sharedReferralLink` (mirror `AmbassadorSubdoc.onboarding` shape exactly).
- `src/app/api/ambassador/profile/route.ts:173-181` — dot-path collection loop: `subdocUpdate["onboarding.${flagKey}"] = flagValue` (NEVER `subdocUpdate.onboarding =` full-object replace).
- `src/app/api/ambassador/profile/route.ts:193-198` — `hasPublicFieldUpdate` computation: true only when `subdocUpdate` has at least one non-`onboarding.*` key.
- `src/app/api/ambassador/profile/route.ts:253-256` — batched write skips `batch.set(publicRef, ...)` when only onboarding flags present.
- `src/app/api/ambassador/profile/route.test.ts` (new file, 6 cases) — covers: non-empty acceptance, dot-path write (sibling not clobbered), empty-object 400, projection-write skip, mixed-PATCH projection-write, defensive non-boolean handling.

**Commit:** `8d66ed2` — single feat commit (schema + handler + tests).

**Threat mitigation evidence (T-260522-a2f-02):**

```bash
$ grep -E '^\s*subdocUpdate\.onboarding\s*=' src/app/api/ambassador/profile/route.ts
# no match — full-object replace pattern absent
```

### INV-4 — admin GET missing `cohort.endDate` (PARTIAL → CLOSED)

**Evidence:**

- `src/app/api/ambassador/members/[uid]/route.ts:17-20` — extended import to include `AMBASSADOR_COHORTS_COLLECTION`.
- `src/app/api/ambassador/members/[uid]/route.ts:65-66` — extract `cohortId` from subdoc data.
- `src/app/api/ambassador/members/[uid]/route.ts:97-99` — cohort read added to second `Promise.all` (conditional `Promise.resolve(null)` when `cohortId` absent).
- `src/app/api/ambassador/members/[uid]/route.ts:104-118` — `cohortEndDate` derivation: Timestamp → ISO, Date → ISO, string passthrough, else null.
- `src/app/api/ambassador/members/[uid]/route.ts:124` — `cohort: { endDate: cohortEndDate }` returned as sibling top-level field.
- `src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx:14-23` — `MemberDetail` type extended with `cohort?: { endDate: string | null }`.
- `src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx:196` — `<AlumniTransitionButton cohortEndDate={detail.cohort?.endDate ?? null} ... />` — prop source switched from dead `detail.subdoc.cohortEndDate`.

**Commit:** `aada493` — single feat commit (route + UI consumer).

**Untouched files** (verified via `git diff --name-only HEAD --`):

- `src/app/admin/ambassadors/members/[uid]/AlumniTransitionButton.tsx` — visibility gate logic untouched.

## Out-of-Scope Files Confirmed Untouched

```bash
$ git diff --name-only HEAD -- \
    src/app/api/ambassador/dashboard/leaderboard/ \
    src/lib/ambassador/leaderboard.ts \
    scripts/ambassador-leaderboard-snapshot.ts \
    .github/workflows/ambassador-activity-checks.yml \
    'src/app/api/ambassador/members/[uid]/offboard/' \
    'src/app/admin/ambassadors/members/[uid]/OffboardConfirmModal.tsx'
# (no output) — INV-3 leaderboard and INV-5 offboarding/2-strike files untouched.
```

## Verification

- `npm test -- --run src/app/api/ambassador` — 35/35 passing across 6 files (incl. 1 new `reportsOnTime` case, 6 new onboarding cases).
- `npx tsc --noEmit` — green for the touched surface. 7 pre-existing errors remain in `src/components/social-icons/index.tsx` (SVG module declarations); these were present on the spawn-time base commit and are out of scope for this gap-close.

## Deviations from Plan

### Minor — acceptance criterion grep specificity

- **Plan criterion (Task 3):** `grep -A1 "<AlumniTransitionButton" MemberDetailClient.tsx | grep -q "detail.cohort"`
- **Reality:** JSX is multi-line; the `cohortEndDate=...` prop is on the 4th line after the opening tag (lines: `<AlumniTransitionButton`, `uid`, `displayName`, `cohortEndDate`, ...). `grep -A1` therefore returns no match.
- **Resolution:** The underlying intent (`AlumniTransitionButton`'s `cohortEndDate` prop is sourced from `detail.cohort.endDate`) IS satisfied — verified via `grep -A5`. Documenting as a literal-criterion deviation; semantic intent met.
- **No code change required** — this is a plan-criterion mismatch, not a code defect.

### None of Rule 1-4 deviations applied

- No auto-fixed bugs (Rule 1)
- No missing critical functionality added (Rule 2)
- No blocking issues encountered (Rule 3)
- No architectural questions raised (Rule 4)

Plan was executed exactly as written modulo the literal-grep deviation above.

## Threat Surface Scan

No new threat surface introduced beyond what's documented in the plan's `<threat_model>`. All mitigations applied:

- **T-260522-a2f-01** (Tampering — PATCH onboarding body): Zod's strip behavior + post-parse `typeof === 'boolean'` guard. Verified in `route.test.ts:165-184`.
- **T-260522-a2f-02** (Tampering — full-object replace): `grep -E '^\s*subdocUpdate\.onboarding\s*=' route.ts` returns no match. Verified in test "writes onboarding flags via dot-path (does not clobber sibling keys)".
- **T-260522-a2f-04** (Information disclosure — reportsOnTime cross-ambassador): query is `.where("ambassadorId", "==", uid)` where `uid` comes from `verifyAuth` — self-scoped by construction.

## Commit Log

| # | Type | Hash | Description |
|---|------|------|-------------|
| 1 | test | `88b58f9` | add failing test for stats.reportsOnTime (INV-1 RED) |
| 2 | feat | `5e687c2` | derive reportsOnTime in /me (INV-1 GREEN) |
| 3 | feat | `8d66ed2` | persist onboarding flags via PATCH /profile (INV-2) |
| 4 | feat | `aada493` | expose cohort.endDate on admin member GET (INV-4) |

## Self-Check: PASSED

- `[x]` src/app/api/ambassador/dashboard/me/route.ts — FOUND (modified)
- `[x]` src/app/api/ambassador/dashboard/me/route.test.ts — FOUND (modified, 7 tests pass)
- `[x]` src/types/ambassador.ts — FOUND (modified)
- `[x]` src/app/api/ambassador/profile/route.ts — FOUND (modified)
- `[x]` src/app/api/ambassador/profile/route.test.ts — FOUND (created, 6 tests pass)
- `[x]` src/app/api/ambassador/members/[uid]/route.ts — FOUND (modified)
- `[x]` src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx — FOUND (modified)
- `[x]` Commit 88b58f9 — FOUND in git log
- `[x]` Commit 5e687c2 — FOUND in git log
- `[x]` Commit 8d66ed2 — FOUND in git log
- `[x]` Commit aada493 — FOUND in git log
- `[x]` AlumniTransitionButton.tsx — UNTOUCHED (verified via git diff)
- `[x]` Leaderboard / cron / offboarding files — UNTOUCHED (verified via git diff)
