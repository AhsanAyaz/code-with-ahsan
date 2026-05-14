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

## Milestone: v3.0 — Brand Identity & Site Restructure

**Shipped:** 2026-03-10
**Phases:** 4 | **Plans:** 8
**Timeline:** 1 day (2026-03-10)

### What Was Built
- Community-first homepage with live stats, social proof pillars, and founder credibility
- Flat top-level navigation (7 primary items)
- Recruiter-ready `/about` portfolio page
- Mentorship page refocused, `/community` as Get Involved hub
- Public stats API with Firestore caching

### What Worked
- Entire milestone completed in a single day — tight scope paid off
- Brand-first thinking (identity before implementation) kept design coherent

### Key Lessons
1. Small, focused milestones ship faster than large ones
2. Brand identity work benefits from top-down design (overall vision before components)

---

## Milestone: v4.0 — Admin Course Creator with YouTube Integration

**Shipped:** 2026-03-11
**Phases:** 1 | **Plans:** 2
**Timeline:** 7 days (2026-03-04 → 2026-03-11)

### What Was Built
- YouTube chapter-timestamp to MDX pipeline
- Admin courses page with full CRUD, visibility toggle, and reorder
- YouTube playlist support with per-video URLs
- AI-generated SEO descriptions via Gemini
- Course card 3-column layout with black background thumbnails

### What Worked
- UAT-driven development: 8/9 tests passed on first run, 1 bug (playlist URLs) caught and fixed immediately
- User feedback loop during UAT surfaced valuable enhancements (visibility toggle, reorder, AI descriptions, form UX)
- Firestore session auth consistency — initial plan used env var, UAT revealed mismatch, fixed quickly

### What Was Inefficient
- Auth pattern initially diverged from existing admin routes (env var vs Firestore session) — should have checked existing patterns before planning
- Multiple post-plan enhancements (visibility, reorder, AI descriptions, form layout) suggest initial scope was too minimal

### Patterns Established
- `visibilityOrder` numeric field in MDX frontmatter for ordered display
- `@google/genai` integration pattern for Gemini AI features
- YouTube chapter regex: `^(?:(\d+):)?(\d{1,2}):(\d{2})\s+(.+)$`

### Key Lessons
1. Check existing auth patterns before implementing new routes — consistency saves UAT rework
2. Course management features (visibility, reorder) should be table stakes in initial scope
3. AI-generated content (descriptions) adds polish with minimal implementation cost

---

## Milestone: v5.0 — CWA Promptathon 2026

**Shipped:** 2026-04-21
**Phases:** 1 | **Plans:** 3
**Timeline:** 2 days (2026-03-27 research → 2026-03-28 final polish)

### What Was Built
- Firestore winners API (public GET, admin PUT/DELETE) backing all display surfaces
- Fullscreen presenter panel with 10 keyboard-navigable sections and Framer Motion transitions
- Token-only `HostAuthGate` decoupled from Firebase user (reused `ADMIN_TOKEN_KEY` only)
- Real-time winners reveal with confetti triggered on 2→3 transition via `prevRevealedCount` ref
- Admin winner form with `PLACEMENTS` config array DRY-ing up 3 placement sections
- Public `WinnersDisplay` podium with `announcedAt` gating

### What Worked
- Event-shaped deadline discipline: phase scoped narrowly to what was needed for a specific live event, resisted scope creep
- Section-per-component architecture made keyboard navigation simple (parent state machine + section components)
- Live-event polish commits (judges list, sponsor copy, wrap-up slide) kept out of phase plans — handled as ad-hoc fixes
- Public GET on winners API simplified the public display page (no auth plumbing needed)

### What Was Inefficient
- Phase directory cleanup from prior milestone (v4.0 admin course creator dir) was never done when v4.0 shipped — caused cross-contamination during v5.0 archival (CLI included v4.0 SUMMARY.md files in v5.0 accomplishments)
- Fix: added phase archival to the milestone-complete flow (moved to `v4.0-phases/` and `v5.0-phases/` retroactively)
- ROADMAP.md Promptathon phase checkboxes stayed `[ ]` throughout the phase — never auto-updated on summary creation

### Patterns Established
- `PLACEMENTS`-style config arrays for form sections that share structure (gold/silver/bronze etc.)
- `prevValueRef` pattern for detecting state transitions in effects (prevents double-fire on derived animations)
- Event-scoped feature subtrees: `/events/[slug]/[year]/` as a colocation pattern for event-specific components + data

### Key Lessons
1. Always archive phase directories to `milestones/v{X.Y}-phases/` during milestone completion — leftover phase dirs in `.planning/phases/` get absorbed into the next milestone's stats by the gsd-tools CLI
2. Event-specific milestones are fine to ship as v{N}.0 with a single phase — don't force minor versioning
3. Token-only auth (decoupled from Firebase user) works well for live-stream operator tools — avoids the auth gate flashing Firebase loading states during presentations
4. Small, time-boxed milestones benefit from `yolo` mode — less ceremony, more shipping

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Timeline | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~1 day | 3 | Initial GSD setup, manual workflow |
| v2.0 | 36 days | 15 | Wave-based parallelism, quick tasks, decimal phase inserts, audit cycle |
| v3.0 | 1 day | 4 | Tight scope, brand-first design, single-day delivery |
| v4.0 | 7 days | 1 | UAT-driven development, user feedback loop, AI integration |

### Top Lessons (Verified Across Milestones)

1. Foundation-first: types and permissions before features (validated across v1.0 admin + v2.0 projects/roadmaps)
2. Non-blocking external calls: Discord operations should never fail APIs (validated across mentorship channels, project channels, booking notifications)
3. Check existing patterns before new implementations — auth, styling, data patterns (validated v4.0 auth mismatch)
4. UAT feedback loops surface high-value features cheaply (validated v4.0 visibility/reorder/AI additions)
