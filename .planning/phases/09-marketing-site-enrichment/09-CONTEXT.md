# Phase 9: Marketing Site Enrichment - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebuild the home page into a marketing-driven landing (jamwithai.dev-level richness) and enrich `/sponsors` with an About-Ahsan section + a shared "Ahsan's work" showcase. The decisive discovery: the building blocks already exist as data-driven `/about` portfolio components — this phase is **composition + a hero rebuild**, not build-from-scratch.

</domain>

<spec_lock>

## Requirements (locked via SPEC.md)

**9 requirements are locked.** See `09-SPEC.md` for full requirements, boundaries, and acceptance criteria. Downstream agents MUST read `09-SPEC.md` before planning or implementing.

**In scope (from SPEC.md):** full home visual rebuild; shared "Ahsan's work" showcase; home testimonials; home trusted-by logo strip; prominent Sponsor CTA; About-Ahsan on `/sponsors`; retain live stats/FAQ/founder; placeholder-behind-data-module where content pending.
**Out of scope (from SPEC.md):** community-built projects showcase; backend/API changes; authoring final real copy; redesign of other pages; side-nav mechanics beyond adding a Sponsor entry; newsletter backend.

</spec_lock>

<decisions>
## Implementation Decisions

### Reuse strategy

- **D-01: Reuse existing `/about` portfolio components as-is.** `BooksSection`, `CoursesSection`, `OpenSourceSection`, `TestimonialsSection`, `PortfolioBio` (in `src/components/portfolio/`) drop straight onto home + sponsors. Restyle only if a section reads wrong in the new context (a ui-phase call). No data duplication, stays consistent with `/about`.
- This collapses SPEC Requirements 2 (showcase), 3 (testimonials), 7 (About Ahsan), 8 (sponsors showcase) into "compose existing components" rather than "build new." SPEC's "new shared component + data module" is satisfied by the already-shared portfolio components + `src/data/*` modules.

### Projects / showcase data

- **D-02: Augment existing data modules — no new data layer.** Ahsan's project list folds into `src/data/openSourceProjects.ts` and/or `src/data/projectsData.js` (edits/additions). Showcase reads existing modules (`booksData.js`, `openSourceProjects.ts`, `testimonials.ts`). This is the SPEC's "data-only swap" — already true.

### Home information architecture

- **D-03: Home sections (rebuilt flow, jamwithai-shaped):** rebuilt hero + trusted-by brand strip → Ahsan's work showcase (books/courses/OSS) → testimonials → keep PillarsGrid + live stats (CommunityStats/SocialReachBar) + HomeFAQ woven in. All four groups retained; ui-phase decides exact ordering + transitions.
- **D-04:** Live `/api/stats` integration (CommunityStats, SocialReachBar) is preserved untouched.

### Sponsor entry point

- **D-05: Header nav "Sponsor" button (jamwithai-style)** — a persistent, visible Sponsor affordance in the header bar (`LayoutWrapper` navbar), always visible while scrolling, plus at least one home-page mention. This is the SPEC's "prominent Sponsor CTA" and is explicitly the allowed side-nav exception ("adding a prominent Sponsor entry point"). Nav mechanics from #263 otherwise unchanged.

### Claude's Discretion

- Exact section order, spacing, motion, and hero visual language — deferred to the ui-phase (frontend-design). This CONTEXT locks WHICH components/sections and their data sources, not the pixel design.
- Whether the header Sponsor button is a `btn btn-primary` vs accent treatment — ui-phase.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked requirements

- `.planning/phases/09-marketing-site-enrichment/09-SPEC.md` — Locked requirements, boundaries, acceptance criteria. Read first.

### Reusable components (the core of this phase)

- `src/components/portfolio/PortfolioBio.tsx` — Ahsan bio + GDE badge + avatar (About-Ahsan source)
- `src/components/portfolio/BooksSection.tsx` — books showcase (reads `src/data/booksData.js`)
- `src/components/portfolio/CoursesSection.tsx` — courses showcase
- `src/components/portfolio/OpenSourceSection.tsx` — OSS showcase (reads `src/data/openSourceProjects.ts`)
- `src/components/portfolio/TestimonialsSection.tsx` — testimonials w/ ratings (reads `src/data/testimonials.ts`)
- `src/app/about/page.tsx` — reference composition of all the above

### Data modules (augment, don't recreate)

- `src/data/openSourceProjects.ts` · `src/data/projectsData.js` · `src/data/booksData.js` · `src/data/testimonials.ts` · `src/data/workHistory.ts` · `src/data/siteMetadata.js` (`ngBook` Angular Cookbook link)

### Home + nav surfaces to modify

- `src/app/page.tsx` — home composition
- `src/components/home/` — `CommunityHero`, `PillarsGrid`, `CommunityStats`, `SocialReachBar`, `FounderCredibility` (+ `HomeFAQ`, `NewsletterForm` at `src/components/`)
- `src/components/LayoutWrapper.tsx` — header (add Sponsor nav button)
- `src/app/sponsors/page.tsx` — add About-Ahsan + showcase
- `public/static/images/sponsors/` — brand logos (reuse for home trusted-by strip)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **Portfolio component suite** (`src/components/portfolio/*`): fully data-driven, already composed on `/about`. Primary vehicle for Requirements 2/3/7/8.
- **Sponsor logo assets + mono `currentColor` pattern** (`public/static/images/sponsors/`, sponsors page logo strip): reuse for the home trusted-by strip (SPEC Req 4).
- **Live stats components** (`CommunityStats`, `SocialReachBar` → `/api/stats`): keep as-is.
- **`NewsletterForm`** (`src/components/NewsletterForm.tsx`): existing newsletter capture for the hero CTA (SPEC Req 1). No backend change.

### Established Patterns

- DaisyUI tokens + brand primary `#8f27e0`; Rubik + JetBrains Mono; `page-padding` gutter utility; mono uppercase eyebrows for section labels; `currentColor` theme-aware logos.
- Data-module-driven sections (`data/*.ts|js` → component `.map()`) is the house pattern — the SPEC's "data-only swap" requirement is already the norm.

### Integration Points

- Home (`src/app/page.tsx`) recomposition; header (`LayoutWrapper`) Sponsor button; sponsors page (`src/app/sponsors/page.tsx`) new sections. No API/data-model changes.

</code_context>

<specifics>
## Specific Ideas

- Visual reference: https://www.jamwithai.dev/ (whole page) and /sponsors/ — community-strong badge, big-type hero, trusted-by logo row, showcase, testimonials, persistent header "Sponsor" button.
- Ahsan-as-creator framing throughout (personal authority, GDE, 4 books, 13M+ installs, 50+ talks).
- Real content (final project list, testimonial quotes) is Ahsan-supplied and folds into existing data modules; build proceeds on current data + placeholders meanwhile.

</specifics>

<deferred>
## Deferred Ideas

- Community-built projects showcase (from `/projects` data) — explicitly out of scope this phase; candidate for a future phase.
- Redesign of other pages (mentorship, courses, `/about` itself, projects) — out of scope.
- Newsletter provider/backend changes — out of scope; reuse existing form.

None of the discussion strayed outside phase scope beyond the above (already SPEC-excluded).

</deferred>

---

_Phase: 9-marketing-site-enrichment_
_Context gathered: 2026-07-07_
