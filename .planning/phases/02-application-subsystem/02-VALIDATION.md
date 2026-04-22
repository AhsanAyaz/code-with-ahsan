---
phase: 2
slug: application-subsystem
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + @vitest/coverage-v8 4.1.5 |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npx vitest run src/__tests__/ambassador/` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/ambassador/`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green + manual smoke of all 6 observable outputs
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-xx-01 | xx | 1 | APPLY-03 | unit | `npx vitest run src/__tests__/ambassador/videoUrl.test.ts` | ❌ W0 | ⬜ pending |
| 2-xx-02 | xx | 1 | APPLY-04 | unit | `npx vitest run src/__tests__/ambassador/academicEmail.test.ts` | ❌ W0 | ⬜ pending |
| 2-xx-03 | xx | 1 | DISC-02 | unit (mock) | `npx vitest run src/__tests__/ambassador/acceptance.test.ts` | ❌ W0 | ⬜ pending |
| 2-xx-04 | xx | 1 | REVIEW-02 | unit (mock storage) | `npx vitest run src/__tests__/ambassador/signedUrl.test.ts` | ❌ W0 | ⬜ pending |
| 2-xx-05 | xx | 1 | EMAIL-01/02/03 | unit (mock sendEmail) | `npx vitest run src/__tests__/ambassador/emails.test.ts` | ❌ W0 | ⬜ pending |
| 2-xx-06 | xx | 2 | COHORT-04 | integration (manual) | manual: POST accept with full cohort fixture | — | ⬜ pending |
| 2-xx-07 | xx | 2 | DISC-03 | manual | verify Discord PUT idempotency per API docs | — | ⬜ pending |
| 2-xx-08 | xx | 2 | APPLY-07 | manual smoke | open `/profile` after submitting; verify status badge | — | ⬜ pending |
| 2-xx-09 | xx | 2 | REVIEW-01 | manual smoke | load `/admin/ambassadors`; filter by status | — | ⬜ pending |
| 2-xx-10 | xx | 2 | COHORT-01/02 | manual smoke | create cohort at `/admin/ambassadors/cohorts` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/ambassador/videoUrl.test.ts` — stubs for APPLY-03 (URL regex accepts Loom/YouTube/Drive; rejects others)
- [ ] `src/__tests__/ambassador/academicEmail.test.ts` — stubs for APPLY-04 (academic email regex; unknown TLD → `needsManualVerification: true`)
- [ ] `src/__tests__/ambassador/acceptance.test.ts` — stubs for DISC-02 (Firestore write succeeds independently of Discord call)
- [ ] `src/__tests__/ambassador/signedUrl.test.ts` — stubs for REVIEW-02 (signed URL 1-hour expiry)
- [ ] `src/__tests__/ambassador/emails.test.ts` — stubs for EMAIL-01/02/03 (correct subject, recipient, trigger timing)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Acceptance returns 409 when cohort is full | COHORT-04 | Requires Firestore transaction fixture with full cohort state | POST accept endpoint with a full cohort; verify 409 response and admin UI error message |
| Discord role assignment is idempotent | DISC-03 | Discord API v10 PUT behavior — no unit mock can substitute for live endpoint | Click retry on already-accepted application; verify no duplicate Discord role (check Discord audit log) |
| Applicant profile shows correct status | APPLY-07 | UI state requires authenticated session + Firestore reads | Sign in as applicant after submit; open `/profile`; verify status badge shows `submitted` |
| Admin list page renders and filters work | REVIEW-01 | Multi-status filter and pagination requires full admin session | Load `/admin/ambassadors`; apply each status filter; advance page if >10 results |
| Admin can create cohort and toggle window | COHORT-01/02 | Form + Firestore write + UI state requires authenticated admin session | Create cohort at `/admin/ambassadors/cohorts`; toggle `applicationOpen`; verify status badge updates |

---

## Observable Outputs (Phase Completion Proof)

1. A signed-in user with a 30-day-old CWA account navigates to `/ambassadors/apply`, completes all wizard steps, and submits — Firestore gains `applications/{uid}/{appId}` with `status: "submitted"` and EMAIL-01 confirmation is sent.
2. Admin views the application at `/admin/ambassadors/[applicationId]`, sees video embed for submitted URL, sees student-ID via a signed URL that expires after 1 hour.
3. Admin clicks Accept: `mentorship_profiles/{uid}.roles` gains `"ambassador"`, ambassador subdoc exists, cohort `acceptedCount` increments, applicant receives EMAIL-02, application status shows "accepted".
4. If Discord role assignment fails, the detail page shows a retry banner; clicking retry re-attempts without creating a duplicate role.
5. Admin declines: `status` → "declined", EMAIL-03 sent. After 30 days, GitHub Actions cleanup removes the student-ID Storage file.
6. Cohort panel creates a cohort; accepting the (maxSize+1)th applicant returns a 409 error in the admin UI.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
