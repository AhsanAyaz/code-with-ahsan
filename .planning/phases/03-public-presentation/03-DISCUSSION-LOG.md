# Phase 3: Public Presentation - Discussion Log

**Date:** 2026-04-22
**Mode:** discuss

Raw record of the discuss-phase session that produced `03-CONTEXT.md`. Captures the gray areas surfaced, the options considered for each, and the choices made — useful when decisions need to be revisited.

---

## Prior Context Loaded

- `.planning/PROJECT.md` — v6.0 milestone definition, milestone roster
- `.planning/STATE.md` — Phase 02 complete, ready for Phase 03 transition
- `.planning/ROADMAP.md` — Phase 3 goal + 4 success criteria + PRESENT-01..04 mapping
- `.planning/REQUIREMENTS.md` — PRESENT-01..04 verbatim
- `.planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md` — roles array, hasRole, dual-read
- `.planning/phases/02-application-subsystem/02-CONTEXT.md` — application doc shape, video URL validators, ambassador subdoc seed
- `src/lib/ambassador/acceptance.ts` — current `runAcceptanceTransaction` (subdoc shape lines 125–137)
- `src/types/mentorship.ts` — `MentorshipProfile`, `Role` enum
- `src/components/mentorship/MentorCard.tsx`, `src/app/mentorship/mentors/[username]/MentorProfileClient.tsx` — closest existing card + detail-page patterns
- `src/app/profile/page.tsx` — settings page with role-gated sections

`gsd-tools todo match-phase 3` returned no matched todos — no existing TODO comments in the repo are tagged for this phase.

## Codebase Scout Highlights

- Only `/mentorship/mentors/[username]` exists as a public profile surface today. There is no generic `/profile/[uid]` or `/u/[username]` route.
- `MentorshipProfile` lacks `university`, `city`, distinct "1-line public bio", and any social fields beyond `linkedinUrl`.
- The `mentorship_profiles/{uid}/ambassador/v1` subdoc is the existing seed for ambassador-specific data (Phase 2).
- Application doc captures `university`, `country`, `city` — but these don't currently flow to the profile.
- `cohortPresentationVideoUrl` does not exist anywhere in the codebase.
- Video URL pattern (Loom/YouTube/Drive paste) and validators were established in Phase 2 — `isValidVideoUrl`, `classifyVideoUrl` in `src/lib/ambassador/videoUrl.ts`.

## Gray Areas Surfaced

Six gray areas were identified; user picked all four of the load-bearing ones to discuss (Topics 1–4 below). The other two (badge placement scope, alumni-badge timing) were folded into Topic 4.

---

## Topic 1 — Public Profile Route

**Question:** Where do public profile pages live, and where do `/ambassadors` cards link to?

**Options considered:**
1. **Generic `/u/[username]`** — unified public profile, mentor-or-ambassador-or-future-role aware, with `/mentorship/mentors/[username]` 308-redirecting in
2. Ambassador-only `/ambassadors/[username]` mirroring the mentor pattern
3. List-only — no detail page, badge only on `/mentorship/mentors/[username]`

**Decision:** Option 1 — generic `/u/[username]` is canonical. `/mentorship/mentors/[username]` redirects. Cards link to `/u/[username]`.

**Rationale:** One canonical URL per user; clean place to render any future role; solves the badge-placement story permanently. Trade-off accepted: more work in Phase 3 to build the new route + redirect, and a long-tail migration of every existing public link.

**Follow-up flagged:** Username fallback for ambassador-only users (no mentor onboarding → no `username` set). Backfill at acceptance-time recommended; planner to finalize.

---

## Topic 2 — Public Fields Data Source

**Question:** Where do the public ambassador fields (university, 1-line bio, socials) live, and how does the ambassador edit them?

**Options considered:**
1. Snapshot on accept → write to parent `MentorshipProfile`; edit from `/profile`
2. Read live from application doc + profile combo, no snapshot
3. **Dedicated ambassador subdoc fields** — extend `mentorship_profiles/{uid}/ambassador/v1`, snapshot university/city on accept

**Decision:** Option 3 — extend the ambassador subdoc.

**Rationale:** Keeps ambassador concerns isolated from `MentorshipProfile`; survives the alumni role transition cleanly; no schema sprawl on the parent profile doc.

**Sub-decision:** `linkedinUrl` stays on the parent profile (mentor reuse). New social fields (twitter/github/personal) live on the subdoc. Card render joins parent profile + subdoc.

---

## Topic 3 — PRESENT-04 Cohort Presentation Video

**Question:** How does the ambassador submit the optional public `cohortPresentationVideo`?

**Options considered:**
1. **URL paste, reuse Phase 2 validators** — same UX as application video
2. Firebase Storage upload (signed PUT, same as student-ID upload)
3. URL paste only, defer storage upload to a future quick task

**Decision:** Option 1 — URL paste, reuse `isValidVideoUrl` + `classifyVideoUrl`.

**Rationale:** Zero new infrastructure; ambassadors host on their own platform (less storage cost, less moderation surface); same admin-review tooling already exists. PRESENT-04 wording ("can be uploaded") permits URL paste.

**Sub-decision:** New endpoint `PATCH /api/ambassador/profile` writes to subdoc. Existing `/api/mentorship/profile` doesn't write subcollections; keeping ambassador writes isolated avoids cross-contamination.

---

## Topic 4 — Denormalization + Badge Scope

**Question A — denormalization strategy:**
1. Live read on each request (N+1 reads, simple)
2. **Write-time public projection on accept + on edit** — single collection query
3. Hybrid snapshot + live-read

**Decision A:** Option 2 — top-level `public_ambassadors/{uid}` collection. Two write paths: `acceptance.ts` (in-transaction) and `PATCH /api/ambassador/profile` (batched). `/ambassadors` reads via single collection query.

**Cross-phase note:** Phase 5 alumni transition + 2-strike offboarding MUST also update/remove this projection. Captured as D-12 in CONTEXT.md.

**Question B — badge placement scope:**
1. **Profile page only (PRESENT-03 minimum)**
2. Profile + MentorCard
3. Profile + cards + author bylines

**Decision B:** Option 1 — badge only on `/u/[username]`. MentorCard, project/roadmap byline chips deferred. Revisit as a quick task post-launch if recognition coverage feels thin.

**Question C — alumni badge timing:**
1. **Both badges in Phase 3** (single component, switches on role prop)
2. Ambassador only now, Alumni in Phase 5

**Decision C:** Option 1 — single `AmbassadorBadge` component built in Phase 3. Phase 5 alumni transition reuses it without revisiting Phase 3 code.

---

## Decisions Locked (cross-reference to CONTEXT.md)

| ID | Topic | Decision |
|----|-------|----------|
| D-01 / D-01a | Public profile route | `/u/[username]` canonical; legacy mentor URL 308-redirects; username fallback flagged for planner |
| D-02 / D-03 / D-03a | Public fields data source | Extend `ambassador/v1` subdoc; linkedinUrl stays on parent profile |
| D-04 / D-04a | Cohort video | URL paste, reuse Phase 2 validators; Storage upload deferred |
| D-05 / D-05a | Editing surface | New `/profile` section + new `PATCH /api/ambassador/profile` endpoint |
| D-06 | Acceptance snapshot | Extend `runAcceptanceTransaction` to snapshot university/city + write public projection |
| D-07 / D-08 / D-09 | Denormalization | `public_ambassadors/{uid}` projection, dual-write, single-query reads |
| D-10 / D-11 | Badge | Single component for both variants; profile-only placement |
| D-12 / D-13 | Cross-phase contracts | Phase 5 must keep projection in sync; Phase 4 must NOT touch it |

## Deferred / Out of Phase 3 Scope

- Site-wide badge proliferation (MentorCard chip, byline chips)
- Firebase Storage upload for cohort presentation video
- Hybrid denormalization strategy
- Alumni-archive "Past Cohorts" page (Phase 5 concern)
- Public ambassador detail page with referral/event history (Phase 4/5 concern)
- "Notify me when applications open" CTA (still deferred from Phase 2)

---

*Generated by `/gsd:discuss-phase 3` — 2026-04-22*
