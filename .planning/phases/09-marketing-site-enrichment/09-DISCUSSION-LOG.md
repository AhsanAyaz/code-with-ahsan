# Phase 9: Marketing Site Enrichment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-07
**Phase:** 9-marketing-site-enrichment
**Areas discussed:** Reuse strategy, Projects data, Home section architecture, Sponsor entry point

---

## Reuse strategy

| Option                            | Description                                                    | Selected |
| --------------------------------- | -------------------------------------------------------------- | -------- |
| Reuse as-is                       | Drop existing /about portfolio components onto home + sponsors | ✓        |
| Adapt into marketing variants     | New wrappers around same data modules                          |          |
| Reuse some, restyle hero-adjacent | Reuse books/courses/OSS; richer testimonials + strip           |          |

**User's choice:** Reuse as-is.
**Notes:** Existing `src/components/portfolio/*` are already data-driven and composed on `/about`. Collapses SPEC Req 2/3/7/8 into composition. Restyle only where a section reads wrong (ui-phase call).

---

## Projects data

| Option                                  | Description                                                    | Selected |
| --------------------------------------- | -------------------------------------------------------------- | -------- |
| Augment existing data modules           | Fold Ahsan's list into openSourceProjects.ts / projectsData.js | ✓        |
| New curated flagship list               | Fresh src/data/showcase.ts                                     |          |
| Both — flagship home, full list on page | Split                                                          |          |

**User's choice:** Augment existing data modules.
**Notes:** No new data layer. Showcase reads existing modules; content swap = data edit (already the SPEC's intent).

---

## Home section architecture

| Option                          | Description                                                | Selected |
| ------------------------------- | ---------------------------------------------------------- | -------- |
| Hero + trusted-by strip         | Rebuilt hero + brand-logo row                              | ✓        |
| Ahsan's work showcase           | Books/courses/OSS/flagship                                 | ✓        |
| Testimonials                    | TestimonialsSection w/ ratings                             | ✓        |
| Keep pillars + live stats + FAQ | Retain PillarsGrid, CommunityStats/SocialReachBar, HomeFAQ | ✓        |

**User's choice:** All four groups retained.
**Notes:** jamwithai-shaped flow. Exact order/motion deferred to ui-phase. Live `/api/stats` preserved.

---

## Sponsor entry point

| Option                              | Description                                         | Selected |
| ----------------------------------- | --------------------------------------------------- | -------- |
| Hero CTA + dedicated band           | Sponsor in hero + band                              |          |
| Dedicated band only                 | Mid-page band                                       |          |
| Header nav button (jamwithai-style) | Persistent header Sponsor button + one home mention | ✓        |

**User's choice:** Header nav button (jamwithai-style).
**Notes:** Persistent header affordance in `LayoutWrapper`. This is the allowed side-nav exception ("add a prominent Sponsor entry point"); #263 nav mechanics otherwise unchanged.

---

## Claude's Discretion

- Exact section order, spacing, motion, hero visual language — ui-phase (frontend-design).
- Header Sponsor button treatment (primary vs accent) — ui-phase.

## Deferred Ideas

- Community-built projects showcase (from /projects data) — future phase.
- Redesign of other pages (mentorship, courses, /about, projects) — out of scope.
- Newsletter provider/backend changes — out of scope.
