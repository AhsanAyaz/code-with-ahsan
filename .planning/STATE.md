---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: Student Ambassador Program
status: roadmap_complete
stopped_at: roadmap complete, ready to plan Phase 1 (2026-04-21)
last_updated: "2026-04-21T14:00:00.000Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** Community members can find mentors, collaborate on real projects with structured support, and follow clear learning roadmaps—all within a mentor-led, quality-focused environment.
**Current focus:** v6.0 Student Ambassador Program — roadmap complete (5 phases, 66 v1 requirements mapped). Next step: plan Phase 1 (Foundation — Roles Array Migration). Design reference: `docs/superpowers/specs/2026-04-21-student-ambassador-program-design.md`.

## Current Position

Phase: Phase 1 — Foundation: Roles Array Migration (next)
Plan: — (no plans yet; awaiting `/gsd:plan-phase 1`)
Status: Roadmap complete — ready to plan Phase 1
Last activity: 2026-04-21 — v6.0 roadmap created (5 phases, 66 requirements, 100% coverage)

## Performance Metrics

**v5.0 Velocity:**

- 3 plans completed across 1 phase
- ~22 scoped commits, 41 files changed, +5,514/-37 LOC
- Total execution: 2 days (2026-03-27 research → 2026-03-28 final polish)

**v4.0 Reference:**

- 2 plans completed across 1 phase
- 15 commits, 246 files changed, +11,603/-3,459 LOC
- Total execution: 7 days (2026-03-04 → 2026-03-11)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

- [Phase 01]: Used top-level import for HackathonTwist in constants.ts for cleaner type annotation
- [Phase 01]: Winners GET API is publicly accessible to allow public display panel to read without credentials
- [Phase 01-03]: Admin form uses PLACEMENTS config array to DRY up 3 placement sections; WinnersDisplay returns null until announcedAt confirmed
- [Phase 01]: HostAuthGate imports only ADMIN_TOKEN_KEY from AdminAuthGate — token-only auth with no Firebase user dependency
- [Phase 01]: TwistRevealSection owns its countdown internally via setInterval in useRef — parent HostPanel only flips twistPhase state
- [Phase 01]: WinnersSection uses prevRevealedCount ref to detect 2->3 transition for confetti (prevents double-fire)
- [Phase quick-260410]: Used text-based social proof strip and single DaisyUI collapse for a la carte markdown
- [v6.0 roadmap]: Phase structure mirrors research consensus — Phase 1 Foundation (roles migration, 5-deploy sequence) → Phase 2 Application (seeds real ambassadors) → Phase 3 Public Presentation || Phase 4 Activity (parallel; independent subsystems) → Phase 5 Dashboard/Leaderboard/Offboarding/Alumni (aggregates over Activity outputs).
- [v6.0 roadmap]: Offboarding (DISC-05, EMAIL-04) is landed in Phase 5 alongside the strike-triggered flow because the strike counter and admin offboarding UI both live in Phase 4's strike system but the atomic roles-array mutation + Discord removal is tightly coupled to the alumni-flag transition mechanics in ALUMNI-01..03.
- [v6.0 roadmap]: Reconciliation cron for missing Discord roles (DISC-04) lives in Phase 4 because it's cron infrastructure paired with the strike-check cron; role assignment at acceptance (DISC-01..03) stays in Phase 2.

### Workflow Notes

**Cron jobs — always use GitHub Actions + scripts/:**
Scheduled tasks use `.github/workflows/*.yml` running `npx tsx scripts/*.ts`. Do NOT use Vercel cron or Next.js API routes for scheduled work.

**Quick task + PR workflow:**
For GitHub issue fixes, use `/gsd:quick` to plan and execute, then cherry-pick onto a fix branch and create PR with "Closes #NNN".

**v6.0 foundation rollout — 5-deploy sequence (Phase 1):**
Do not deploy the rules flip before `sync-custom-claims.ts` completes. Dual-claim rules window must stay for ≥2 weeks. Rollback of rules must be one command away during deploy. `FEATURE_AMBASSADOR_PROGRAM` gates every `/ambassadors/*` route through Phase 1 and only flips on at the start of Phase 2.

### Roadmap Evolution

- v5.0 CWA Promptathon 2026 shipped 2026-04-21 (1 phase, 3 plans)
- v6.0 Student Ambassador Program spec drafted 2026-04-21
- v6.0 requirements defined 2026-04-21 — 63 v1 + 9 future + out-of-scope catalog
- v6.0 roadmap created 2026-04-21 — 5 phases, 66 requirements mapped (counted actual REQ-IDs in REQUIREMENTS.md; milestone spec's "63" figure is a minor undercount — see Blockers/Concerns)

### Blockers/Concerns

- **Minor requirement-count discrepancy:** Milestone planning context stated 63 v1 requirements, but `.planning/REQUIREMENTS.md` contains 66 REQ-IDs (ROLE ×8, COHORT ×4, APPLY ×8, REVIEW ×5, DISC ×5, PRESENT ×4, REF ×5, EVENT ×4, REPORT ×7, DASH ×9, ALUMNI ×3, EMAIL ×4 = 66). All 66 are mapped in the roadmap. Likely an off-by-three in the original milestone brief; REQUIREMENTS.md is treated as authoritative and the "Coverage" footer in REQUIREMENTS.md should be updated from 63 → 66 during the next requirements edit.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 72 | update the rates card according to feedback | 2026-03-17 | f0efea9 | [72-update-the-rates-card-according-to-feedb](./quick/72-update-the-rates-card-according-to-feedb/) |
| 73 | rates page redesign — sponsorship pitch deck layout | 2026-03-18 | 96fb4c7 | [73-rates-page-redesign-codewithahsan-dev-ra](./quick/73-rates-page-redesign-codewithahsan-dev-ra/) |
| 260402-ls1 | improve DX for open-source contributors (.env.example, seed script, README, CONTRIBUTING.md) | 2026-04-02 | b39387d | [260402-ls1-improve-dx-for-open-source-contributors-](./quick/260402-ls1-improve-dx-for-open-source-contributors-/) |
| 260409-lsg | add Re-activate button to cancelled mentorship cards (GH-160) | 2026-04-09 | 852e56d | [260409-lsg-add-button-to-re-activate-mentorship-for](./quick/260409-lsg-add-button-to-re-activate-mentorship-for/) |
| 260410 | CRO audit and optimize rates page (CTAs, social proof, collapsible a la carte) | 2026-04-09 | d11b30f | [260410-cro-audit-and-optimize-mentorship-rates-](./quick/260410-cro-audit-and-optimize-mentorship-rates-/) |
| 260411 | update inactivity warning message to @mention mentor and mentee (GH-151) | 2026-04-10 | 3fa2bff | [260411-update-inactivity-warning-message-to-men](./quick/260411-update-inactivity-warning-message-to-men/) |

## Session Continuity

Last session: 2026-04-21
Stopped at: v6.0 roadmap complete (5 phases, 66 requirements mapped); ready to plan Phase 1
Resume file: None — run `/gsd:plan-phase 1` to begin Foundation planning

---
*Last activity: 2026-04-21 - v6.0 Student Ambassador Program roadmap created; 5 phases, 66 requirements, 100% coverage*
