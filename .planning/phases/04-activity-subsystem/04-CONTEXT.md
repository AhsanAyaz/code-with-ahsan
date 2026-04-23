# Phase 4: Activity Subsystem - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers four ambassador activity capabilities:
1. **Referral attribution** — unique referral code per ambassador, cookie-based click tracking, signup conversion write
2. **Event logging** — ambassador-owned event ledger with fixed type enum
3. **Monthly self-report** — submission form at `/ambassadors/report` + timezone-aware Discord DM reminder cron
4. **Strike management** — daily cron flags missing reports for admin review; admin confirms strikes manually; 2-strike offboarding hook surfaces in the new member admin page

Phase 4 does NOT build the dashboard (Phase 5), the leaderboard (Phase 5), the alumni transition (Phase 5), or the offboarding email (Phase 5). REPORT-07's "one-click offboarding flow" is Phase 5 work — Phase 4 only adds the strike count increment action to the member admin page.

</domain>

<decisions>
## Implementation Decisions

### Report Form Location
- **D-01:** Monthly self-report lives at `/ambassadors/report` as a standalone page (Phase 4). Ambassador navigates here to submit. Phase 5 links to it from the dashboard and adds the status badge + next-due-date view.

### Event Types
- **D-02:** Event `type` is a fixed Zod enum: `"workshop" | "blog_post" | "talk_webinar" | "community_stream" | "study_group" | "other"`. Labels for UI: Workshop, Blog post, Talk/Webinar, Community stream, Study group, Other. Enables clean per-category counts for Phase 5 leaderboard without free-text ambiguity.

### Referral Cookie
- **D-03:** Cookie is set in Next.js **middleware** (`src/middleware.ts`). On any request where `searchParams.get("ref")` is present and non-empty: set `cwa_ref` cookie (30-day expiry, `SameSite=Lax`, path `/`, `HttpOnly`). Middleware runs server-side before OAuth redirects bounce away, so the cookie survives Google/GitHub/Discord sign-in flows. Only write the cookie when the param is present — do not clear or overwrite an existing cookie on requests without the param (preserves original attribution within the 30-day window).

### Timezone for Report Reminders
- **D-04:** Ambassador self-selects their timezone from a dropdown on `/profile` (extends the Phase 3 Ambassador Public Card section). Stored as `timezone` (IANA string, e.g. `"Asia/Karachi"`) on `mentorship_profiles/{uid}/ambassador/v1`. The daily cron (REPORT-04) and DM reminder (REPORT-05) read this field. Default when absent: `"UTC"`.

### Strike Admin Surface
- **D-05:** New `/admin/ambassadors/members/[uid]` detail page for active ambassador management. Shows: activity summary (referral count, event count, reports on-time/overdue), strike count, report history, cron-flagged items. Strike increment is a one-click action on this page (REPORT-06). Phase 5 adds the offboarding trigger here. This page is distinct from `/admin/ambassadors/[applicationId]` (application review, no longer the right home once the user is an active member).

### Human-in-the-Loop Crons (locked from requirements)
- **D-06:** Both crons (REPORT-04 daily missing-report flag, DISC-04 weekly Discord-role reconciliation) flag for admin review — they NEVER mutate strike counts, roles, or Firestore state. All mutations are explicit admin actions.

### Claude's Discretion
- Referral code generation algorithm (format `{USERNAME_PREFIX}-{4_HEX}`, uniqueness via Firestore transaction retry loop or random collision check)
- Monthly deadline definition (last day of calendar month at 23:59 ambassador local time)
- Cron schedule times (daily at 08:00 UTC for report flag; weekly Monday 09:00 UTC for Discord reconciliation)
- Event collection path (`ambassador_events/{eventId}` top-level vs subcollection) — recommend top-level for admin query simplicity
- Report collection path (`monthly_reports/{reportId}` top-level, keyed on `{ambassadorId}_{cohortId}_{YYYY-MM}` for uniqueness enforcement)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements (primary source of truth)
- `.planning/REQUIREMENTS.md` §REF-01..REF-05 — referral attribution spec
- `.planning/REQUIREMENTS.md` §EVENT-01..EVENT-04 — event logging spec
- `.planning/REQUIREMENTS.md` §REPORT-01..REPORT-07 — self-report + strike spec
- `.planning/REQUIREMENTS.md` §DISC-04 — Discord role reconciliation cron

### Roadmap (phase boundary + success criteria)
- `.planning/ROADMAP.md` §Phase 4 — goal, depends-on, success criteria

### Prior phase decisions this phase builds on
- `.planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md` — D-13 (claim sync), D-14 (claim refresh timing)
- `.planning/phases/02-application-subsystem/02-CONTEXT.md` — D-17 (Firestore writes independent of Discord), D-21 (email pattern)
- `.planning/phases/03-public-presentation/03-CONTEXT.md` — D-13 (Phase 4 writes do NOT touch public_ambassadors)

### Existing code patterns (executor MUST read before touching)
- `src/lib/ambassador/roleMutation.ts` — syncRoleClaim; extended here with referral code generation
- `src/lib/ambassador/acceptance.ts` — runAcceptanceTransaction; Phase 4 extends it to generate referral code at accept time (REF-01)
- `src/lib/discord.ts` — sendDM() at line ~530; used for REPORT-05 reminders
- `src/app/api/mentorship/profile/route.ts` — POST handler; REF-03 hook point for referral cookie consumption on first signup
- `.github/workflows/mentorship-inactivity-checks.yml` — canonical cron workflow pattern for REPORT-04 and DISC-04 crons
- `src/types/ambassador.ts` — AmbassadorSubdoc interface; Phase 4 adds `referralCode`, `timezone` fields
- `src/middleware.ts` (may not exist yet) — D-03 cookie setter lives here

### Codebase conventions
- `.planning/codebase/` (if present) — architecture maps
- `src/lib/firebaseAdmin.ts` — always import `db`, `auth`, `storage` from here; never call `admin.firestore()` / `getAuth()` directly (emulator named-app pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sendDM(discordUsername, message)` in `src/lib/discord.ts:530` — drives REPORT-05 DM reminders; already used for roadmap notifications
- `sendEmail` / `wrapEmailHtml` in `src/lib/email.ts` — available for any strike-warning email (FUTURE-REPORT-01, not Phase 4 scope)
- `src/lib/ambassador/acceptance.ts` `runAcceptanceTransaction` — Phase 4 extends this to generate and write the referral code at acceptance time
- GitHub Actions workflow pattern in `.github/workflows/mentorship-inactivity-checks.yml` — copy-adapt for REPORT-04 and DISC-04 crons
- `AmbassadorSubdoc` in `src/types/ambassador.ts` — extend with `referralCode?: string` and `timezone?: string`
- `hasRoleClaim` / `verifyAuth` in `src/lib/auth.ts` and `src/lib/permissions.ts` — all new API routes use these for auth gating

### Established Patterns
- API routes: feature flag → verifyAuth → hasRoleClaim → Zod parse → business logic
- Admin-only routes: feature flag → verifyAuth → `ctx.admin === true` check
- Cron scripts: TypeScript in `scripts/`, GitHub Actions workflow in `.github/workflows/`
- Firestore admin writes: always use named exports from `src/lib/firebaseAdmin.ts`; never pass `undefined` values (ignoreUndefinedProperties not set)

### Integration Points
- `src/middleware.ts` — new file for REF-02 cookie setter (no middleware currently exists beyond Next.js defaults)
- `src/app/api/mentorship/profile/route.ts` POST handler — REF-03 referral consumption hook goes here
- `src/app/ambassadors/layout.tsx` — `/ambassadors/report` inherits this layout (MentorshipProvider + feature flag gate)
- `src/app/admin/ambassadors/` — new `members/[uid]/` subdirectory for D-05 member admin page
- `src/app/profile/AmbassadorPublicCardSection.tsx` — D-04 timezone dropdown added here

</code_context>

<specifics>
## Specific Ideas

- Referral code format: `{PREFIX}-{4HEX}` where PREFIX is first 5 chars of username uppercased (e.g. `AHSAN-A7F2`). Matches the example in REF-01.
- Cookie name: `cwa_ref` (per REF-02 spec).
- Cookie attributes: 30-day expiry, `SameSite=Lax`, `path=/`, `HttpOnly` (so client JS can't read/tamper; server reads it on profile POST).
- Self-report fields (REPORT-01): "What worked this month?", "What blocked you?", "What do you need from us?" — 3 free-text fields, no min length enforced (ambassador judgment).
- Report month key: `YYYY-MM` string derived from `submittedAt` in ambassador's timezone (e.g. `"2026-04"`). One report per `{ambassadorId}_{YYYY-MM}` enforced at write time (REPORT-02).

</specifics>

<deferred>
## Deferred Ideas

- Click tracking (redirect endpoint that logs every click before bouncing) — explicitly FUTURE-REF-01 in requirements; Phase 4 ships conversion-only attribution
- Aggregate click → signup funnel on dashboard — FUTURE-REF-02
- Automated strike-warning email at 1 confirmed strike — FUTURE-REPORT-01; kept manual in v6.0
- Phase 5 offboarding trigger on member admin page — REPORT-07 scope; Phase 4 only adds the strike increment action
- Badge renders on MentorCard / project chips / site-wide name — deferred from Phase 3 D-11; future quick task

</deferred>

---

*Phase: 04-activity-subsystem*
*Context gathered: 2026-04-23*
