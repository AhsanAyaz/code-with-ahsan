# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Community Collaboration & Learning

**Shipped:** 2026-03-10
**Phases:** 15 | **Plans:** 44 | **Quick Tasks:** 41
**Timeline:** 36 days (2026-02-02 → 2026-03-10)

### What Was Built
- Project collaboration system with full lifecycle, Discord integration, and team formation
- Learning roadmap authoring with Markdown editor, version history, and admin approval
- Roadmap discovery catalog with domain filtering and mentor recommendations
- Mentor time slot booking with double-booking prevention and Google Calendar sync
- Admin project management with cascade delete and nested route dashboard
- Centralized permission system with 95 test cases
- Showcase page for completed projects with demo links

### What Worked
- Wave-based parallel execution kept phases moving fast (avg ~10 min/plan for later phases)
- Foundation-first approach (Phase 4: types, permissions, security rules) prevented rework in later phases
- Denormalized profile subset pattern (creatorProfile) avoided expensive joins across all features
- Non-blocking Discord pattern (log errors, don't throw) kept APIs resilient
- Quick tasks for polish/fixes between phases maintained momentum without formal planning overhead
- Phase 6.1 decimal insert for urgent permission fix worked well — clear semantics, no renumbering

### What Was Inefficient
- Phase 1-2 plans were slow (~60-89 min avg) before workflow optimizations settled in
- Phase 10 gap closure plans (10-04, 10-05) were created mid-phase rather than during planning — caused confusion in tracking
- Some quick tasks were very small (1-line fixes) but still created full quick task directories — overhead for trivial changes
- STATE.md grew very large with per-phase completion details — should be more concise
- Showcase page (07-06) was built then deleted in quick-063, then rebuilt in Phase 14 — requirement thrash

### Patterns Established
- `{projectId}_{userId}` composite key pattern for preventing duplicate applications/invitations/members
- Auth at route level (not middleware) for flexibility with mixed public/private endpoints
- Card-based layout pattern for settings/edit pages (bg-base-200 + card bg-base-100 shadow-xl)
- GitHub Actions + standalone scripts for cron jobs (not Vercel cron or API routes)
- Timezone handling: always display in viewer/recipient timezone with label
- `div+onClick` card pattern to avoid nested anchor hydration errors when cards contain links

### Key Lessons
1. Permission systems should be built first — every feature depends on them, and retrofitting is painful
2. Non-blocking external service calls (Discord, Calendar) are essential for API reliability
3. Quick tasks are valuable for user-facing polish but should have a size threshold — some are too small to warrant tracking
4. Audit gaps should be caught before "shipping" rather than requiring a gap closure phase
5. STATE.md works best as a pointer to PROJECT.md decisions, not a duplicate record

### Cost Observations
- Model mix: ~20% opus (orchestration, verification), ~80% sonnet (execution, research)
- Later phases achieved 2-5 min/plan average — dramatic improvement from Phase 1's 89 min/plan
- Parallel wave execution saved significant time in multi-plan phases (Phase 12: 6 plans in ~36 min)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Timeline | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~1 day | 3 | Initial GSD setup, manual workflow |
| v2.0 | 36 days | 15 | Wave-based parallelism, quick tasks, decimal phase inserts, audit cycle |

### Top Lessons (Verified Across Milestones)

1. Foundation-first: types and permissions before features (validated across v1.0 admin + v2.0 projects/roadmaps)
2. Non-blocking external calls: Discord operations should never fail APIs (validated across mentorship channels, project channels, booking notifications)
