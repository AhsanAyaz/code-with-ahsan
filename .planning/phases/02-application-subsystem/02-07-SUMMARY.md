---
phase: 02-application-subsystem
plan: 07
subsystem: ui
tags: [react, nextjs, daisy-ui, firebase, ambassador, wizard, multi-step-form]

requires:
  - phase: 02-01
    provides: ApplicationSubmitInput type, ApplicationStatus type from @/types/ambassador
  - phase: 02-02
    provides: isValidVideoUrl from @/lib/ambassador/videoUrl (client-side validation parity)
  - phase: 02-04
    provides: GET /api/ambassador/cohorts?scope=open endpoint (body.cohorts shape)
  - phase: 02-05
    provides: POST /api/ambassador/applications, GET /me, POST /student-id-upload-url

provides:
  - 4-step apply wizard at /ambassadors/apply (EligibilityStep + PersonalInfoStep + ApplicationStep + ReviewStep)
  - useApplyForm hook with per-step validation and buildSubmitPayload
  - AmbassadorApplicationStatus component mounted on /profile (APPLY-07)

affects:
  - 02-08 (admin review UI reads same application shape via GET /api/ambassador/applications)
  - 02-09 (cleanup cron operates on submitted applications)

tech-stack:
  added: []
  patterns:
    - "Client-safe academic email validator: regex-only (no readFileSync) with D-15 soft warning"
    - "authFetch from @/lib/apiClient replaces manual getIdToken() + Bearer header wiring"
    - "useMentorship() for user/loading — profile page pattern; AuthContext only for showLoginPopup"
    - "DaisyUI steps header: ul.steps > li.step + step-primary for multi-step wizard progress"
    - "D-13 two-path academic verification: radio buttons control conditional field reveal"

key-files:
  created:
    - src/app/ambassadors/apply/page.tsx
    - src/app/ambassadors/apply/ApplyWizard.tsx
    - src/app/ambassadors/apply/useApplyForm.ts
    - src/app/ambassadors/apply/steps/EligibilityStep.tsx
    - src/app/ambassadors/apply/steps/PersonalInfoStep.tsx
    - src/app/ambassadors/apply/steps/ApplicationStep.tsx
    - src/app/ambassadors/apply/steps/ReviewStep.tsx
    - src/app/profile/AmbassadorApplicationStatus.tsx
  modified:
    - src/app/profile/page.tsx

key-decisions:
  - "Client-safe academic email validation: replaced Node.js readFileSync-based validateAcademicEmail with inline regex (Rule 2 deviation — academicEmail.ts uses readFileSync unavailable in browser). Server still runs full Hipo check on submit."
  - "authFetch from @/lib/apiClient used throughout — avoids manual getIdToken() wiring in 4 components"
  - "useMentorship() for user auth — consistent with profile/page.tsx pattern; not useAuth (which only has showLoginPopup)"
  - "applicantName field added to PersonalInfoStep (Step 2) — required by ApplicationSubmitSchema.min(2) but not mentioned in plan's step description; added during implementation to prevent 400 on submit"
  - "academicVerificationPath set in buildSubmitPayload based on _academicPath radio choice (email->email, studentId->student_id) — bridges the UI local state (null/email/studentId) to the Zod enum (email/student_id)"

patterns-established:
  - "Multi-step wizard: separate step components + orchestrating Wizard component + useForm hook"
  - "Per-step validation via validateStep(step: 1|2|3|4) in form hook — called by wizard's goNext()"
  - "Client-only local state fields prefixed with _ (e.g., _academicPath) stripped by buildSubmitPayload"
  - "Signed-URL upload: POST to get signed URL → PUT file bytes directly to GCS with Content-Type"

requirements-completed:
  - APPLY-01
  - APPLY-02
  - APPLY-03
  - APPLY-04
  - APPLY-05
  - APPLY-07

duration: ~35min
completed: 2026-04-22
---

# Phase 02 Plan 07: Apply Wizard UI Summary

**4-step DaisyUI apply wizard at /ambassadors/apply with eligibility gate, cohort selection, academic verification (two-path D-13), signed-URL student-ID upload, and profile-page status strip (APPLY-07)**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-22T10:55:00Z
- **Completed:** 2026-04-22T11:30:55Z
- **Tasks:** 3 completed
- **Files created:** 8 new + 1 modified (profile/page.tsx)

## Component Tree

```
/ambassadors/apply
  └── page.tsx (server component — feature gate from layout, renders shell)
        └── ApplyWizard.tsx (client — step state machine, DaisyUI steps header, submit handler)
              ├── EligibilityStep.tsx (Step 1 — profile age vs AMBASSADOR_DISCORD_MIN_AGE_DAYS)
              ├── PersonalInfoStep.tsx (Step 2 — name, cohort dropdown, uni/year/country/city)
              ├── ApplicationStep.tsx (Step 3 — 3 prompts, Discord handle, D-13 verification, video URL)
              └── ReviewStep.tsx (Step 4 — read-only review + submit button)

/profile
  └── page.tsx (modified — feature-gated AmbassadorApplicationStatus mount)
        └── AmbassadorApplicationStatus.tsx (new — fetches /me, renders badge or Apply CTA)
```

## Accomplishments

- Full 4-step wizard built end-to-end; each step enforces its own validation before advancing
- EligibilityStep fetches `/api/mentorship/profile`, compares `createdAt` age to `AMBASSADOR_DISCORD_MIN_AGE_DAYS` (no hardcoded 30)
- PersonalInfoStep reads `body.cohorts` from `/api/ambassador/cohorts?scope=open` (Plan 04 Task 3 shape); shows "No open cohorts" empty state per D-05
- ApplicationStep wires APPLICATION_VIDEO_PROMPTS (3 labels), D-13 two-path radio, D-15 soft warning on blur, signed-URL GCS upload for student ID
- ReviewStep shows read-only summary of all fields with prompt answers inline
- AmbassadorApplicationStatus fetches `/api/ambassador/applications/me`, renders status badges + discordRetryNeeded warning; mounted on /profile behind `isAmbassadorProgramEnabled()`
- TypeScript passes with zero errors (excl. pre-existing social-icons SVG issue unrelated to this plan)

## Task Commits

1. **Task 1: useApplyForm hook + ApplyWizard shell + page.tsx** — `aba5160` (feat)
2. **Task 2: Four step components** — `aefcd61` (feat)
3. **Task 3: AmbassadorApplicationStatus + profile mount** — `a0eacf6` (feat)

## Files Created/Modified

- `src/app/ambassadors/apply/page.tsx` — thin server-component shell; feature gate inherited from layout
- `src/app/ambassadors/apply/ApplyWizard.tsx` — 4-step orchestrator with DaisyUI steps, authFetch submit
- `src/app/ambassadors/apply/useApplyForm.ts` — form state, per-step validation, buildSubmitPayload
- `src/app/ambassadors/apply/steps/EligibilityStep.tsx` — Step 1 age gate
- `src/app/ambassadors/apply/steps/PersonalInfoStep.tsx` — Step 2 cohort + personal info
- `src/app/ambassadors/apply/steps/ApplicationStep.tsx` — Step 3 prompts + verification + video
- `src/app/ambassadors/apply/steps/ReviewStep.tsx` — Step 4 read-only review + submit
- `src/app/profile/AmbassadorApplicationStatus.tsx` — APPLY-07 status strip
- `src/app/profile/page.tsx` — +3 lines (import + feature-gated component mount)

## Notes on Plan 08 Compatibility

Plan 08 (admin review UI) reads applications via `GET /api/ambassador/applications` (admin list) and `GET /api/ambassador/applications/[id]` (detail). No new wire formats introduced in Plan 07 — the submit payload follows `ApplicationSubmitInput` exactly, and the signed student-ID upload uses the same `storagePath` field Plan 08 reads to generate signed admin URLs.

## Note on studentIdStoragePath vs applicationId

The storage path is generated using a client-side UUID (`crypto.randomUUID()`) passed to `POST /student-id-upload-url` as `applicationId`. This UUID is used only for the GCS object path — it does NOT become the Firestore document ID. The Firestore doc ID is assigned by the server in Plan 05's POST handler. Plan 08 reads `storagePath` from the application doc and generates a signed URL for the admin to view the ID image.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Client-safe academic email validator**
- **Found during:** Task 1 (useApplyForm.ts)
- **Issue:** `src/lib/ambassador/academicEmail.ts` uses `readFileSync` (Node.js) to load the Hipo JSON snapshot — this API is not available in browser bundles. The plan listed this file as "client-usable" but the implementation uses a Node.js-only API.
- **Fix:** Inlined a regex-only `validateAcademicEmailClient()` helper in both `useApplyForm.ts` and `ApplicationStep.tsx`. The regex layer is identical to the server-side regex; only the Hipo lookup is absent (falls back to "needsManualVerification = true for any non .edu/.ac domain"). Server still runs the full two-layer check on submission, so no security regression.
- **Files modified:** `src/app/ambassadors/apply/useApplyForm.ts`, `src/app/ambassadors/apply/steps/ApplicationStep.tsx`
- **Verification:** `npx tsc --noEmit` passes; no `fs` import in client bundle
- **Committed in:** aba5160, aefcd61

**2. [Rule 2 - Missing Critical] Added `applicantName` field to form**
- **Found during:** Task 1 (useApplyForm.ts)
- **Issue:** `ApplicationSubmitSchema` requires `applicantName` (min 2 chars) but the plan's task description for Step 2 did not explicitly mention adding a name field to the form.
- **Fix:** Added `applicantName` to `EMPTY` state, step-2 validation in `validateStep`, a form input in `PersonalInfoStep`, and a review row in `ReviewStep`.
- **Files modified:** `useApplyForm.ts`, `steps/PersonalInfoStep.tsx`, `steps/ReviewStep.tsx`
- **Verification:** `npx tsc --noEmit` passes; schema and form are aligned
- **Committed in:** aefcd61

---

**Total deviations:** 2 auto-fixed (both Rule 2 — missing critical functionality)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

- Worktree branch (`worktree-agent-aac6f924`) was branched from main before Phase 2 commits (Plans 01–06). Resolved by rebasing onto main before writing code, which brought all Phase 2 types and helpers into the worktree. TypeScript then validated correctly.

## Next Phase Readiness

- All apply wizard files in place; Plan 08 (admin review UI) can build the admin list/detail page
- `AmbassadorApplicationStatus` already surfaces `discordRetryNeeded` for Plan 06's retry flow
- No blockers

---
*Phase: 02-application-subsystem*
*Completed: 2026-04-22*
