---
phase: 1
slug: promptathon-live-host-panel-with-presenter-slides-admin-winner-management-and-permanent-winners-display
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | vitest.config.ts (if present) |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit && npx next build --dry-run 2>/dev/null || npx next build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run full TypeScript + build check
- **Before `/gsd:verify-work`:** Full suite must be green + manual UI walkthrough
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 1-01-01 | 01 | 1 | constants update | type-check | `npx tsc --noEmit` | ⬜ pending |
| 1-01-02 | 01 | 1 | Firestore schema | type-check | `npx tsc --noEmit` | ⬜ pending |
| 1-01-03 | 01 | 1 | API route winners GET | manual | curl test | ⬜ pending |
| 1-01-04 | 01 | 1 | API route winners PUT | manual | curl with token | ⬜ pending |
| 1-02-01 | 02 | 2 | HostAuthGate | type-check | `npx tsc --noEmit` | ⬜ pending |
| 1-02-02 | 02 | 2 | Presenter panel sections | manual | visual walkthrough | ⬜ pending |
| 1-02-03 | 02 | 2 | Team roll call reveal | manual | spacebar/button | ⬜ pending |
| 1-02-04 | 02 | 2 | Twist reveal animation | manual | visual check | ⬜ pending |
| 1-02-05 | 02 | 2 | Winners real-time read | manual | set winners, check panel | ⬜ pending |
| 1-03-01 | 03 | 3 | Admin winner form | manual | fill + submit | ⬜ pending |
| 1-03-02 | 03 | 3 | Winners public page | manual | check event page | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers TypeScript checking. No new test files needed — this phase is predominantly UI/visual and requires manual verification.

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| Section navigation (keyboard + buttons) | Visual/interactive UI | Open /events/cwa-promptathon/2026/host, verify Space/N/P/H/F work |
| Team roll-call animated reveal | Visual animation | Press Space repeatedly, verify cards appear with glow effect |
| Twist reveal countdown | Visual animation | Navigate to Twist section, verify 5-second countdown + reveal |
| Winners podium reveal (3→2→1) | Visual animation + real-time data | Set winners via admin, navigate to Winners section, verify reveal sequence |
| Winners on public event page | Requires live data | Confirm winners section appears only after announcedAt is set |
| Admin auth gate | Security check | Verify panel returns 401/login screen without valid token |
| Sponsor UTM links | Link correctness | Click each sponsor, verify ?utm_source=codewithahsan in URL |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or manual test instructions
- [ ] TypeScript clean after each wave
- [ ] Manual walkthrough of all 10 presenter sections
- [ ] Admin winner flow end-to-end tested
- [ ] Public event page winners display tested
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
