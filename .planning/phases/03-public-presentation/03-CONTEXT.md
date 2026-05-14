# Phase 3: Public Presentation - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the public-facing surface for the Student Ambassador Program: a `/ambassadors` cohort listing page (read-only, sensitive fields excluded), a generic `/u/[username]` public profile page that renders Ambassador / Alumni Ambassador badges, and the post-acceptance editing UX so each ambassador can curate the public fields they share (university, 1-line tagline, social links, optional public cohort presentation video).

No new role transitions, no application surface changes — Phase 3 is a read-mostly surface over the data that Phase 2 seeds. Cross-phase contract: Phase 5's alumni transition + offboarding flow must keep the new public projection in sync (D-10).

</domain>

<decisions>
## Implementation Decisions

### Public Profile Route
- **D-01:** `/u/[username]` is the canonical public profile URL. Generic by design — renders mentor sections if `hasRole(profile, "mentor")`, ambassador sections if `hasRole(profile, "ambassador" | "alumni-ambassador")`, future roles slot in the same way. `/mentorship/mentors/[username]` 308-redirects to `/u/[username]`. Cards on `/ambassadors` link to `/u/[username]`.
- **D-01a:** Username fallback for ambassador-only users (who never went through mentor onboarding and may have no `username` set) is a planner concern. Recommended path: backfill `username` (e.g. derived from displayName/email) at acceptance time, fallback to `uid` in the URL while planner finalizes. Surface this in research/planning.

### Public Ambassador Fields (Data Source)
- **D-02:** Public ambassador-card fields live on the existing `mentorship_profiles/{uid}/ambassador/v1` subdoc — NOT on the parent `MentorshipProfile`. Keeps ambassador concerns isolated from mentor concerns; survives the alumni role transition cleanly.
- **D-03:** Subdoc field additions (extends the Phase 2 shape `{cohortId, joinedAt, active, strikes, discordMemberId}`):
  - `university?: string` — snapshot from application doc on accept (D-06)
  - `city?: string` — snapshot from application doc on accept
  - `publicTagline?: string` — 1-line public bio (~120 chars), distinct from mentor `profile.bio`. Editable from /profile.
  - `twitterUrl?: string`, `githubUrl?: string`, `personalSiteUrl?: string` — editable from /profile
  - `cohortPresentationVideoUrl?: string`, `cohortPresentationVideoEmbedType?: "loom"|"youtube"|"drive"` — see D-04
- **D-03a:** `linkedinUrl` stays on parent `MentorshipProfile` (mentor reuse). Card render joins parent profile (photo, displayName, linkedinUrl) + ambassador subdoc (everything else). Do NOT duplicate linkedinUrl onto the subdoc.

### PRESENT-04 Cohort Presentation Video
- **D-04:** URL paste only (no Firebase Storage upload). Reuse Phase 2 validators `isValidVideoUrl` + `classifyVideoUrl` from `src/lib/ambassador/videoUrl.ts`. Embed using the existing VideoEmbed component (Phase 2, `src/components/ambassador/`). Stored on subdoc as `cohortPresentationVideoUrl` + `cohortPresentationVideoEmbedType`.
- **D-04a:** A future quick task can add Storage upload if URL-paste reliability becomes an issue. PRESENT-04 wording ("can be uploaded") permits URL-paste.

### Profile Editing Surface
- **D-05:** New "Ambassador Public Card" section on `/profile` settings page (`src/app/profile/page.tsx`), visible only when `hasRole(profile, "ambassador") || hasRole(profile, "alumni-ambassador")`. Edits university, city, publicTagline, twitterUrl, githubUrl, personalSiteUrl, cohortPresentationVideoUrl. Inline preview using VideoEmbed for the video field.
- **D-05a:** New endpoint `PATCH /api/ambassador/profile` writes to the subdoc — the existing `PUT /api/mentorship/profile` handler does NOT write to subcollections. Keep ambassador writes isolated.

### Acceptance-Time Snapshot
- **D-06:** Extend `runAcceptanceTransaction` in `src/lib/ambassador/acceptance.ts` to snapshot `university` and `city` from the application doc onto the ambassador subdoc on first accept. No-op on re-accept (idempotency preserved).

### Denormalized Public Projection
- **D-07:** Top-level Firestore collection `public_ambassadors/{uid}` is the read source for `/ambassadors`. Single collection-level query — no N+1, no joins at request time, public read rules trivial. Schema:
  ```
  uid, username, displayName, photoURL,
  university, city, publicTagline,
  linkedinUrl, twitterUrl, githubUrl, personalSiteUrl,
  cohortId, cohortPresentationVideoUrl, cohortPresentationVideoEmbedType,
  active: true,
  updatedAt
  ```
- **D-08:** Two write paths keep the projection in sync:
  1. `acceptance.ts` writes `public_ambassadors/{uid}` inside the same transaction as the role/subdoc/cohort write
  2. `PATCH /api/ambassador/profile` updates both the subdoc AND the projection (single batched write; if either fails the request fails — drift is the worst outcome)
- **D-09:** `/ambassadors` page query: `where('active', '==', true) and where('cohortId', '==', currentCohortId)`. "Current cohort" definition is a Claude-discretion item (see below); recommended: cohort with `status: "active"` falling back to most-recent `startDate` if none.

### Badge Component
- **D-10:** Single `AmbassadorBadge` component built in Phase 3, switches on prop `role: "ambassador" | "alumni-ambassador"`. Phase 5's alumni transition reuses the existing component without revisiting Phase 3 code.
- **D-11:** Badge renders ONLY on `/u/[username]` (PRESENT-03 minimum). Out of scope for Phase 3: MentorCard, project/roadmap creatorProfile chips, site-wide name renders. These are deferred and can be added in a future quick task if visible-recognition coverage feels thin after launch.

### Cross-Phase Contracts
- **D-12:** Phase 5 alumni transition + 2-strike offboarding MUST update or remove `public_ambassadors/{uid}`:
  - Term-completion alumni transition → set `active: false` (and stop listing) OR keep with an `alumni: true` flag if a future "Past Cohorts" surface is desired (defer to Phase 5 discuss-phase)
  - 2-strike offboarding → delete `public_ambassadors/{uid}` (clean removal, no alumni recognition)
- **D-13:** Phase 4 referral / event / report writes do NOT touch `public_ambassadors/{uid}` — these are private-dashboard concerns, not public-card concerns.

### Claude's Discretion
- Card layout / grid density on `/ambassadors` — extend the `MentorCard` 3-col responsive pattern (`src/components/mentorship/MentorCard.tsx`); default sort recommended: `joinedAt` ascending (recognizes early acceptances first), with a flat alphabetical fallback if research surfaces a better convention
- Empty state for `/ambassadors` when no active cohort or zero accepted ambassadors
- "Current cohort" resolution heuristic (D-09) — recommended: cohort with `status === "active"`, fallback to most-recent `startDate`; planner should confirm against the cohort lifecycle Phase 2 established
- `publicTagline` character limit (recommend 120, enforce server-side via Zod)
- Redirect type for `/mentorship/mentors/[username]` → `/u/[username]` (recommend 308 permanent for SEO)
- `username` fallback strategy for ambassador-only users (D-01a) — research what other public surfaces assume about username presence
- Specific Firestore rules wording for `public_ambassadors/` (public read, deny client writes — Admin SDK only)
- Order of social-link icons / which icon set
- Whether the public profile page shows the cohort presentation video full-bleed or in a collapsed accordion
- Toast / loading / error patterns for the new /profile section — follow existing `src/contexts/ToastContext.tsx` conventions

</decisions>

<specifics>
## Specific Ideas

- Card pattern reference: `src/components/mentorship/MentorCard.tsx` (DaisyUI card, ProfileAvatar, expertise badges) — the closest precedent for the ambassador card's photo + name + tagline + chips layout
- VideoEmbed component reference: `src/components/ambassador/` (Phase 2 — for the inline preview in /profile and the public card video render)
- Public listing reference: `src/app/mentorship/mentors/page.tsx` — fetches via `/api/mentorship/mentors?public=true`, grid layout, search/filter — analogous shape for `/ambassadors`
- Profile settings reference: `src/app/profile/page.tsx` — section-card pattern (one DaisyUI `card` per concern); add the new "Ambassador Public Card" section between "Ambassador Application Status" (already gated) and "Skill Level"
- Username resolution reference: existing `mentor.username || mentor.uid` pattern at `MentorCard.tsx:198` and `MentorCard.tsx:318`

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Spec (primary source of truth)
- `docs/superpowers/specs/2026-04-21-student-ambassador-program-design.md` — §2 program lifecycle (cohort active vs upcoming), §6 ambassador public surface, §9.4 data model sketch (subdoc shape baseline)

### Requirements
- `.planning/REQUIREMENTS.md` lines 60–63 — PRESENT-01..04 verbatim

### Roadmap (phase boundary, success criteria)
- `.planning/ROADMAP.md` "Phase 3: Public Presentation" section — Goal + 4 Success Criteria

### Phase 1 Foundation (decisions Phase 3 builds on)
- `.planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md` — `hasRole`/`hasAnyRole` (D-04, D-06 dual-read), feature flag semantics, claim-sync pattern (matters for badge gating + future role-aware UI)

### Phase 2 Application Subsystem (acceptance pipeline + ambassador subdoc shape)
- `.planning/phases/02-application-subsystem/02-CONTEXT.md` — D-06/D-07 (URL-only video + accepted patterns), D-13 (academic verification path), D-14 (Storage path conventions)
- `src/lib/ambassador/acceptance.ts` lines 95–140 — current `runAcceptanceTransaction` shape; D-06 extension point
- `src/lib/ambassador/videoUrl.ts` — `isValidVideoUrl`, `classifyVideoUrl` (reused for D-04)

### Existing Code Patterns (executor MUST read before touching)
- `src/types/mentorship.ts` — `MentorshipProfile`, `Role`, `RoleSchema` — extend ApplicationDoc / introduce AmbassadorSubdocPublicFields type here
- `src/lib/permissions.ts` — `hasRole(profile, "ambassador")` — used for /profile section gating + badge render
- `src/lib/firebaseAdmin.ts` — Admin SDK setup (note: ignoreUndefinedProperties is NOT set; conditionally spread optional fields when writing public_ambassadors projection — see `~/.claude/.../memory/feedback_firestore_admin_undefined.md`)
- `src/components/mentorship/MentorCard.tsx` — card pattern reference for ambassador cards
- `src/app/mentorship/mentors/page.tsx` + `src/app/mentorship/mentors/[username]/MentorProfileClient.tsx` — listing + detail-page pattern; the new `/u/[username]` page absorbs the mentor-detail content under a role-aware layout
- `src/app/profile/page.tsx` — settings page with role-gated sections (existing pattern: `isAmbassadorProgramEnabled() && <AmbassadorApplicationStatus />`)
- `src/app/ambassadors/layout.tsx` — feature flag gate; new `/ambassadors/page.tsx` inherits this for free
- `firestore.rules` — needs new section for `public_ambassadors/{uid}` (allow read: if true; allow write: if false — Admin SDK only)

### Codebase Conventions
- `.planning/codebase/CONVENTIONS.md` — naming, import order, DaisyUI patterns
- `.planning/codebase/STACK.md` — no new deps; reuse existing UI primitives

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MentorCard.tsx` — closest card pattern; ProfileAvatar + DaisyUI card + badge chips already styled
- `MentorProfileClient.tsx` — detail-page pattern; the `/u/[username]` page can compose mentor section + new ambassador section conditionally
- `react-lite-youtube-embed` (already in package.json) — YouTube embed for cohort presentation video
- `src/lib/ambassador/videoUrl.ts` — Phase 2 URL validator + classifier; zero-cost reuse for cohortPresentationVideoUrl
- `src/components/ambassador/` (Phase 2) — VideoEmbed / video preview components
- `src/lib/permissions.ts:hasRole()` — gates the /profile section + the badge render
- `src/contexts/MentorshipContext.tsx` — provides `profile` for client-side gating decisions
- `src/contexts/ToastContext.tsx` — existing toast pattern for save success/error in the new /profile section

### Established Patterns
- Role-gated /profile sections: `isAmbassadorProgramEnabled() && <AmbassadorApplicationStatus />` (Phase 2) — same pattern for the new "Ambassador Public Card" section
- Top-level public collection with read-true + write-false rules: existing pattern in firestore.rules for similar denormalized projections
- Atomic transaction extensions: Phase 2's `runAcceptanceTransaction` already groups multi-doc writes — D-08 extends it with one more `txn.set(public_ambassadors/{uid})` call
- 308 redirects in Next.js 16: `redirects()` in `next.config.ts` OR per-route `redirect()` from `next/navigation` — research which fits better for D-01

### Integration Points
- `src/lib/ambassador/acceptance.ts` — extend `runAcceptanceTransaction` to (a) snapshot university/city onto subdoc, (b) write `public_ambassadors/{uid}` projection
- `src/app/profile/page.tsx` — add new "Ambassador Public Card" section
- `src/app/api/ambassador/` — new `profile/route.ts` (PATCH) for subdoc + projection writes
- `src/app/ambassadors/page.tsx` — NEW (currently only /apply exists at /ambassadors); fetches public_ambassadors and renders card grid
- `src/app/u/[username]/page.tsx` — NEW route + redirect from `/mentorship/mentors/[username]`
- `firestore.rules` — new rules block for `public_ambassadors/`
- Phase 5 contract (D-12): alumni transition + offboarding helpers must update/remove `public_ambassadors/{uid}` — noted for the Phase 5 discuss-phase agenda

</code_context>

<specifics>
## Specific Ideas

(Captured above under Specifics — combined to avoid duplication.)

</specifics>

<deferred>
## Deferred Ideas

- Site-wide badge proliferation (MentorCard chip, project/roadmap byline chip, anywhere displayName renders) — D-11 keeps Phase 3 minimal; revisit as a quick task post-launch if recognition coverage feels thin
- Firebase Storage upload for `cohortPresentationVideoUrl` — D-04a defers; URL-paste ships first
- Hybrid snapshot + live-read denorm strategy — discussed and rejected as overkill for ~25 ambassadors per cohort
- "Past Cohorts" archive surface for alumni — Phase 5 discuss-phase concern (D-12)
- Public ambassador detail page with deeper bio / event history / referral count — DASH-/REPORT- requirements live in Phases 4 & 5; cohortPresentationVideo is the Phase 3 substitute for "richer public profile"
- "Notify me when applications open" CTA carry-over from Phase 2 deferred list — still deferred

</deferred>

---

*Phase: 03-public-presentation*
*Context gathered: 2026-04-22*
