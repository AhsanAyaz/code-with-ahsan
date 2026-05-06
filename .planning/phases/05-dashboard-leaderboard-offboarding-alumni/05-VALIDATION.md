---
phase: 5
slug: dashboard-leaderboard-offboarding-alumni
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-dash01 | dashboard-api | 1 | DASH-01 | — | Auth gate 401/403 for non-ambassador | unit | `npm test -- --run src/app/api/ambassador/dashboard` | ❌ W0 | ⬜ pending |
| 5-dash02 | dashboard-api | 1 | DASH-02 | — | Returns own stats fields | unit | `npm test -- --run src/app/api/ambassador/dashboard` | ❌ W0 | ⬜ pending |
| 5-dash05 | leaderboard | 2 | DASH-05 | — | Returns top-3 only + own rank (never full map) | unit | `npm test -- --run src/lib/ambassador/leaderboard` | ❌ W0 | ⬜ pending |
| 5-dash06 | leaderboard | 2 | DASH-06 | — | Grace period math — before/after 28-day window | unit | `npm test -- --run src/lib/ambassador/leaderboard` | ❌ W0 | ⬜ pending |
| 5-alumni01 | alumni | 3 | ALUMNI-01 | — | Role array swap: remove ambassador + add alumni-ambassador atomically | unit | `npm test -- --run src/app/api/ambassador/members` | ❌ W0 | ⬜ pending |
| 5-alumni02 | offboard | 3 | ALUMNI-02 | — | Offboarding does NOT set alumni-ambassador | unit | `npm test -- --run src/app/api/ambassador/members` | ❌ W0 | ⬜ pending |
| 5-disc05 | offboard | 3 | DISC-05 | — | removeDiscordRole: 404 treated as success (idempotent) | unit | `npm test -- --run src/lib/discord` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ambassador/leaderboard.test.ts` — stubs for DASH-05, DASH-06
- [ ] `src/app/api/ambassador/dashboard/me/route.test.ts` — stubs for DASH-01, DASH-02
- [ ] `src/app/api/ambassador/members/[uid]/offboard.test.ts` — stubs for ALUMNI-02, DISC-05
- [ ] `src/app/api/ambassador/members/[uid]/alumni.test.ts` — stubs for ALUMNI-01

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Onboarding checklist per-item completion state persists on subdoc | DASH-08 | Firestore write integration | Sign in as ambassador, toggle each checklist item, reload, verify state persists |
| Ambassador of the Month field displayed from cohort doc | DASH-09 | Admin-curated field — requires admin panel write | Admin sets field on cohort doc, verify dashboard renders it |
| "Updated N minutes ago" and manual refresh button work | DASH-07 | UI interaction test | Load dashboard, verify timestamp shown, click refresh, verify timestamp updates |
| Offboarding email fires on 2-strike removal | EMAIL-04 | Email delivery | Trigger offboarding flow, verify email received at test address |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
