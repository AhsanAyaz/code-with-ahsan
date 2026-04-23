---
phase: 4
slug: activity-subsystem
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (confirmed — `@vitest/coverage-v8` installed from Phase 1) |
| **Config file** | `vitest.config.*` (root) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| REF-01 | referral-core | 1 | REF-01 | — | Code format valid, uniqueness enforced | unit | `npx vitest run src/lib/ambassador/referralCode.test.ts` | ❌ W0 | ⬜ pending |
| REF-02 | referral-core | 1 | REF-02 | — | Cookie set on first `?ref=`, skipped if existing | unit | `npx vitest run src/middleware.test.ts` | ❌ W0 | ⬜ pending |
| REF-03 | referral-core | 2 | REF-03 | — | Cookie consumed once, referral doc created | integration | manual/emulator | ❌ W0 | ⬜ pending |
| REF-04 | referral-core | 2 | REF-04 | — | Self-attribution blocked; double-attribution blocked | unit | `npx vitest run src/lib/ambassador/referral.test.ts` | ❌ W0 | ⬜ pending |
| EVENT-02 | event-tracker | 1 | EVENT-02 | — | 30-day edit window enforced server-side | unit | `npx vitest run src/app/api/ambassador/events/[eventId]/route.test.ts` | ❌ W0 | ⬜ pending |
| REPORT-02 | monthly-report | 1 | REPORT-02 | — | One report per ambassador per month enforced | unit | `npx vitest run src/app/api/ambassador/report/route.test.ts` | ❌ W0 | ⬜ pending |
| REPORT-04 | cron-flags | 1 | REPORT-04 | — | Cron flags missing reports, never mutates state | manual/smoke | manual dry-run of script | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ambassador/referralCode.test.ts` — stubs for REF-01 (format validation, uniqueness retry)
- [ ] `src/middleware.test.ts` — stubs for REF-02 (cookie set on first visit, skip if existing cookie)
- [ ] `src/lib/ambassador/referral.test.ts` — stubs for REF-04 (self-attribution, double-attribution guards)
- [ ] `src/lib/ambassador/reportDeadline.test.ts` — stubs for REPORT-04 (timezone deadline calculation)
- [ ] `src/app/api/ambassador/events/[eventId]/route.test.ts` — stubs for EVENT-02 (30-day edit window)
- [ ] `src/app/api/ambassador/report/route.test.ts` — stubs for REPORT-02 (one report per month)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cron flags missing reports | REPORT-04 | Script runs against live Firestore; no emulator fixture for cron context | Run `npx tsx scripts/flag-missing-reports.ts --dry-run`; verify output lists expected ambassadors, no Firestore mutations |
| Discord reconciliation cron | DISC-04 | Requires live Discord API; no test double for guild member list | Run `npx tsx scripts/reconcile-discord-roles.ts --dry-run`; verify output lists ambassadors missing role, no role mutations |
| Referral cookie survives OAuth redirect | REF-02 | Requires real OAuth provider flow | Sign out, visit `/?ref=TEST-1234`, sign in via Google/GitHub/Discord, verify `cwa_ref` cookie still set before profile creation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
