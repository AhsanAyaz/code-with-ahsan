# Phase 2: Application Subsystem - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the end-to-end pipeline from "prospective ambassador submits an application" to "accepted ambassador has a Discord role and receives emails." Covers: cohort management (admin creates/opens cohorts), public application form (`/ambassadors/apply`), admin review panel (`/admin/ambassadors`), acceptance workflow (Firestore commit → Discord role → emails), and three transactional emails.

**Note:** Flip `FEATURE_AMBASSADOR_PROGRAM=true` at the start of this phase — ambassador routes go live.

</domain>

<decisions>
## Implementation Decisions

### Application Form Layout
- **D-01:** Multi-step wizard, 4 steps: (1) Eligibility pre-check (Discord age gate), (2) Personal info + university + cohort selection, (3) Motivation prompts (3×) + Discord handle + academic verification + video link, (4) Review + submit.
- **D-02:** Eligibility pre-check is Step 1 — verify Discord membership age before showing the rest of the wizard. User sees "come back in N days" if ineligible, avoiding wasted effort.
- **D-03:** Discord membership age threshold: **make this a named constant** (`AMBASSADOR_DISCORD_MIN_AGE_DAYS`) so it can be changed without code search. Threshold TBD between 7 days (lower friction) and 30 days (spec value) — default to 30, but planner should surface this as a decision in the plan so it can be set intentionally before launch.
- **D-04:** 3 motivation prompts as per spec §5: (1) motivation for applying, (2) relevant experience, (3) pitch for what they'd do as ambassador.
- **D-05:** Cohort selection: dropdown of cohorts with `status="upcoming"` and open application window. If no cohorts are open, show "No open cohorts right now" message with a "Notify me" call-to-action (future phase). No auto-assignment.

### Video Submission
- **D-06:** External link ONLY — no Firebase Storage video upload. Applicant pastes a Loom, YouTube, or Google Drive URL.
- **D-07:** URL validation: format check only (regex match for recognized URL patterns). Do NOT fetch the URL server-side. Accepted patterns: `loom.com/share/`, `youtu.be/`, `youtube.com/watch`, `youtube.com/shorts/`, `drive.google.com/file/d/`.
- **D-08:** Admin view of video: embedded player in the detail page. Use `react-lite-youtube-embed` (already in codebase) for YouTube URLs; Google Drive `/file/d/{id}/preview` iframe for Drive links; Loom uses their standard embed iframe pattern. Detect URL type server-side and render the appropriate embed.

### Admin Review Panel Navigation
- **D-09:** Application list at `/admin/ambassadors` → dedicated detail page at `/admin/ambassadors/[applicationId]`. First admin detail-page in the codebase — creates a new pattern.
- **D-10:** List page columns: Name, University, Target Cohort, Status badge (submitted / under_review / accepted / declined), Submitted date. Filters: cohort (dropdown), status (dropdown), submission date range.
- **D-11:** Accept / Decline buttons on the detail page only, not on the list. Optional notes textarea before confirming. Matches REVIEW-03 wording ("open an application detail view").
- **D-12:** Post-accept UX is optimistic: Firestore commit fires first (roles update + ambassador subdoc + cohort attach), Discord role assignment fires async immediately after. If Discord fails, a retry banner renders on the detail page. Admin stays on the detail page throughout. Status label updates optimistically to "accepted" before Discord resolves.

### Academic Email Verification
- **D-13:** Explicit two-path choice at the start of the academic verification section (Step 3): "I have an academic email" shows the email field; "I don't have a .edu email" shows the student-ID photo upload field directly. No surprise mid-field reveal.
- **D-14:** Student-ID photo stored in Firebase Storage at `applications/{applicantUid}/{applicationId}/student_id.{ext}`, same deny-by-default rules as APPLY-06. Admin reviewer sees the photo inline on the detail page (via short-lived signed URL, same as any admin-only Storage read).
- **D-15:** Academic email validation: regex check for `.edu`, `.edu.{cc}`, `.ac.{cc}` domains. Back this with the Hipo `world_universities_and_domains.json` snapshot server-side (APPLY-04). Unknown TLD → show a soft warning ("We couldn't auto-verify your academic email — you can continue by uploading a student ID") rather than hard block.

### Discord Integration
- **D-16:** Discord member ID resolved at application submission time (DISC-01) — fail soft: if the handle cannot be resolved, `discordMemberId` is null on the application doc and the admin detail page shows a warning banner. Admin can still review and accept; the retry button on the detail page re-attempts resolution before re-trying Discord role assignment.
- **D-17:** Acceptance is two-stage (DISC-02): Firestore write is atomic and independent of Discord; Discord role assignment failure never rolls back the Firestore commit. This matches the existing non-blocking Discord pattern from `src/lib/discord.ts`.
- **D-18:** Discord role assignment is idempotent (DISC-03) — the accept endpoint checks current member roles before assigning, so a retry never double-assigns.

### Cohort Management (Admin)
- **D-19:** Admin cohort panel at `/admin/ambassadors/cohorts`. Separate from application panel. Allows create cohort (name, startDate, endDate, maxSize, status), open/close application window, view attached accepted ambassadors.
- **D-20:** `maxSize` enforced at acceptance time server-side (COHORT-04) — API returns 409 with "Cohort is full" if the cohort's accepted ambassador count equals maxSize. Admin UI shows current count / maxSize prominently on the detail page.

### Email Notifications
- **D-21:** Three transactional emails use existing `sendEmail` / `wrapEmailHtml` pattern from `src/lib/email.ts`. No new email infrastructure.
  - EMAIL-01: confirmation on submission — to applicant
  - EMAIL-02: acceptance email with onboarding steps — to applicant
  - EMAIL-03: decline email (kind messaging, encourage reapply) — to applicant

### Claude's Discretion
- Exact wizard step progress bar style (step dots, numbered steps, percentage bar) — match existing DaisyUI patterns
- Pagination implementation for the admin application list (server-side cursor pagination consistent with existing admin pages)
- Specific error messages and toast notifications — follow existing toast/UiToast patterns
- Firestore security rules for `applications/` and `cohorts/` collections (write from Phase 1 dual-claim pattern)
- Declined video cleanup cron scheduling (REVIEW-04) — use GitHub Actions as established in STATE.md workflow notes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Spec (primary source of truth)
- `docs/superpowers/specs/2026-04-21-student-ambassador-program-design.md` — Full program design: §4 eligibility criteria, §5 selection process (video, review), §8 accountability, §9.3 component boundaries, §9.4 data model sketch

### Requirements
- `.planning/REQUIREMENTS.md` — All Phase 2 REQ-IDs: COHORT-01–04, APPLY-01–08, REVIEW-01–05, DISC-01–03, EMAIL-01–03

### Phase 1 Foundation (decisions that Phase 2 builds on)
- `.planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md` — Phase 1 decisions: roleMutation helper, syncRoleClaim, feature flag semantics, non-blocking Discord pattern

### Existing Code Patterns (executor MUST read before touching)
- `src/lib/discord.ts` — `assignDiscordRole()` at line ~822 (DISC-02, DISC-03); `getMemberByUsername()` for Discord ID resolution (DISC-01)
- `src/lib/email.ts` — `sendEmail()`, `wrapEmailHtml()` pattern (EMAIL-01, EMAIL-02, EMAIL-03)
- `src/lib/ambassador/roleMutation.ts` — Role write path for acceptance (appending `"ambassador"` to `roles[]`)
- `src/lib/permissions.ts` — `hasRole(profile, "ambassador")` for dashboard gate (DASH-01)
- `src/app/admin/layout.tsx` — Admin auth pattern (for new admin routes)
- `src/app/ambassadors/layout.tsx` — Feature flag gate (all `/ambassadors/*` routes)
- `src/app/mentorship/onboarding/page.tsx` — Closest existing registration form pattern (structural reference)

### Codebase Conventions
- `.planning/codebase/CONVENTIONS.md` — Naming, import order, DaisyUI component patterns
- `.planning/codebase/STACK.md` — Stack constraints (no new deps, existing Firebase/DaisyUI/Tailwind patterns)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `react-lite-youtube-embed` (already in package.json) — embed YouTube video URLs in admin review panel
- `src/lib/discord.ts:assignDiscordRole()` — already handles ambassador Discord role assignment, no extension needed
- `src/lib/email.ts:sendEmail()` + `wrapEmailHtml()` — ready for the three transactional emails
- `src/lib/ambassador/roleMutation.ts:syncRoleClaim()` — write path for adding `"ambassador"` to `roles[]` on acceptance
- `src/lib/permissions.ts:hasRole()` — gate for `/ambassadors/dashboard` (Phase 5), referenced here for acceptance logic
- `src/components/ui/` — DaisyUI components (Button, Card, Badge, Modal) for wizard and admin panel
- `src/contexts/ToastContext.tsx` — existing toast pattern for success/error feedback

### Established Patterns
- Non-blocking Discord: Discord failures are caught, logged, and surfaced as retry banners — never crash the primary API response
- Admin auth: `src/app/admin/layout.tsx` handles session-based auth; all new `/admin/ambassadors/*` routes inherit it
- Feature flag gate: layout.tsx `notFound()` pattern already live for `/ambassadors/*` — just flip env var

### Integration Points
- `/api/mentorship/profile` POST — existing signup handler where `cwa_ref` cookie is consumed (Phase 4 referral system hooks here later)
- `mentorship_profiles/{uid}` — acceptance writes `roles` update + `ambassador` subdoc (via `roleMutation.ts`)
- `cohorts/{cohortId}` — new top-level Firestore collection; no existing code touches it
- `applications/{applicationId}` — new top-level Firestore collection; new Firebase Storage path

</code_context>

<specifics>
## Specific Ideas

- Video URL regex should explicitly support: `loom.com/share/`, `youtu.be/`, `youtube.com/watch`, `youtube.com/shorts/`, `drive.google.com/file/d/` — confirmed by user
- Discord membership age threshold constant `AMBASSADOR_DISCORD_MIN_AGE_DAYS` — explicitly surface as a decision in the plan (7 days vs 30 days) so Ahsan can set it intentionally before launch
- Google Drive embed path pattern: `https://drive.google.com/file/d/{id}/preview`

</specifics>

<deferred>
## Deferred Ideas

- "Notify me when applications open" subscription (when no cohorts are open) — noted during cohort selection discussion; belongs in a later phase or quick task
- Multi-reviewer voting with partial-acceptance state machine (FUTURE-REVIEW-01) — explicitly out of scope for v1; single-reviewer only
- On-platform interview scheduling for shortlisted applicants (FUTURE-APPLY-01) — Calendly / Google Meet sufficient for cohort 1

</deferred>

---

*Phase: 02-application-subsystem*
*Context gathered: 2026-04-22*
