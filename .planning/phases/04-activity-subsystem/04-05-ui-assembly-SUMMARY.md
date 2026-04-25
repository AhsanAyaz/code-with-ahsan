---
phase: 04-activity-subsystem
plan: "05"
subsystem: activity-ui-assembly
tags:
  - ambassador
  - ui
  - admin
  - profile
  - timezone
  - referral
  - strike
  - wave-3
dependency_graph:
  requires:
    - 04-03-event-logging (LogEventForm, EventList components)
    - 04-04-report-and-strike-api (MonthlyReportForm, ReportStatusBadge, strike POST endpoint)
    - 04-01-foundations-types-schemas (AmbassadorPublicFieldsSchema, collection constants)
  provides:
    - /ambassadors/report page (assembled Phase 4 ambassador surface)
    - /admin/ambassadors/members (list page)
    - /admin/ambassadors/members/[uid] (detail page with full activity picture)
    - TimezoneSelect on /profile (D-04)
    - ReferralCodeCard on /profile (REF-01 display surface)
    - GET /api/ambassador/members (admin list endpoint)
    - GET /api/ambassador/members/[uid] (admin detail bundle endpoint)
    - AmbassadorPublicFieldsSchema.timezone field
  affects:
    - src/types/ambassador.ts (schema extension)
    - src/app/profile/AmbassadorPublicCardSection.tsx (extended with timezone + referral)
tech_stack:
  added: []
  patterns:
    - Server component shell + client orchestrator (Next.js pattern)
    - Admin token header via ADMIN_TOKEN_KEY from AdminAuthGate
    - DaisyUI stats grid for ActivitySummaryPanel
    - dialog modal modal-open pattern (matches DecisionDialog)
    - Intl.supportedValuesOf timezone validation with RangeError fallback
key_files:
  created:
    - src/app/ambassadors/report/page.tsx
    - src/app/ambassadors/report/ReportPageClient.tsx
    - src/app/api/ambassador/members/route.ts
    - src/app/api/ambassador/members/[uid]/route.ts
    - src/app/admin/ambassadors/members/page.tsx
    - src/app/admin/ambassadors/members/MembersList.tsx
    - src/app/admin/ambassadors/members/[uid]/page.tsx
    - src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx
    - src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx
    - src/app/admin/ambassadors/members/[uid]/CronFlagsPanel.tsx
    - src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx
    - src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx
  modified:
    - src/app/profile/AmbassadorPublicCardSection.tsx
    - src/types/ambassador.ts
decisions:
  - "Admin headers defined inline per-file (no shared adminClient module exists — matches established pattern in ApplicationsList, EventAdminTable)"
  - "LogEventForm and EventList are default exports (Plan 03 pattern) — imported as default in ReportPageClient"
  - "ReportStatusBadge rendered inline with h1 heading in ReportPageClient (not inside MonthlyReportForm)"
  - "AmbassadorPublicCardSection wrapper changed from single card div to space-y-6 div to accommodate sibling ReferralCodeCard section"
  - "Admin page-level auth inherited from /admin/layout.tsx (AdminAuthGate) — no per-page auth code needed"
  - "Offboarding (REPORT-07 full scope) deferred to Phase 5 — Phase 4 only surfaces the 2-strike warning banner"
metrics:
  duration: "~60 minutes"
  completed: "2026-04-23T19:16:12Z"
  tasks: 6
  files: 14
---

# Phase 04 Plan 05: UI Assembly Summary

Assembled Phase 4 into four user-reachable routes: the ambassador-facing `/ambassadors/report` page, the admin `/admin/ambassadors/members` list + detail pages, and `/profile` extensions for timezone (D-04) and referral code (REF-01 display).

## What Was Built

### Pages (4 new routes)

**`/ambassadors/report`** (`page.tsx` + `ReportPageClient.tsx`)
Server shell delegates to `ReportPageClient`. Client orchestrator fetches `/api/ambassador/report/current` on mount, passes result to `ReportStatusBadge` (inline with `<h1>Monthly Self-Report</h1>`). Composition order per UI-SPEC Visual Hierarchy: badge → `MonthlyReportForm` → `LogEventForm` → `EventList`. `refreshKey` propagates event creation from `LogEventForm` to `EventList`.

**`/admin/ambassadors/members`** (`page.tsx` + `MembersList.tsx`)
Server shell with heading "Ambassador Members" + subheading verbatim. `MembersList` client component fetches the list endpoint with admin token. Table shows Name, Cohort, Strikes (badge-error/warning/ghost), Flags (badge-warning), with a `Link` to the detail page per row. Full loading, error, and empty states.

**`/admin/ambassadors/members/[uid]`** (`page.tsx` + `MemberDetailClient.tsx`)
Server shell awaits `params` (Next.js 15+ async params). `MemberDetailClient` fetches the detail bundle endpoint. Layout order (UI-SPEC "evidence before action"): `ActivitySummaryPanel` → `CronFlagsPanel` → `StrikePanel` → Report History → Logged Events.

### Components (7 new)

| Component | Responsibility |
|-----------|---------------|
| `ReportPageClient` | Client orchestrator for `/ambassadors/report` — fetches current status, composes all 4 children |
| `MembersList` | Admin client list with table, loading/error/empty states |
| `MemberDetailClient` | Admin client orchestrator for member detail — fetches bundle, passes props to panels |
| `ActivitySummaryPanel` | DaisyUI `stats` grid: Events, Referrals, Reports submitted, Confirmed strikes |
| `CronFlagsPanel` | `alert alert-warning` list per unresolved flag; empty state `alert alert-success` |
| `StrikePanel` | Strike count display + "Confirm strike" button + 2-strike warning banner |
| `StrikeConfirmModal` | `<dialog className="modal modal-open">` pattern; interpolates `{displayName}` in heading; POSTs to strike endpoint |

### Admin API Endpoints (2 new)

**`GET /api/ambassador/members`**
Gate order: `isAmbassadorProgramEnabled()` → `requireAdmin()`. Collection-group query on `ambassador` subdocs where `active === true`. Per-member unresolved flag count via Firestore count aggregation. Sorted by `displayName` asc. Returns `{ members: [...] }`.

**`GET /api/ambassador/members/[uid]`**
Gate order: `isAmbassadorProgramEnabled()` → `requireAdmin()`. Returns full detail bundle: `profile`, `subdoc`, `recentEvents` (limit 20), `recentReports` (limit 12), `unresolvedFlags`, `referralsCount` (count aggregation). `normalizeTimestamps` helper converts all Firestore Timestamps to ISO strings.

### Profile Extensions (2 extensions)

**TimezoneSelect** (`AmbassadorPublicCardSection.tsx`)
New `<select id="ambassador-timezone">` with label "Your timezone" and help text per UI-SPEC. `TIMEZONE_OPTIONS` populated from `Intl.supportedValuesOf("timeZone")` with 28-item curated fallback. Value bound to `timezone` state; PATCH payload extended when timezone changes from initial value.

**ReferralCodeCard** (inline section in `AmbassadorPublicCardSection.tsx`)
Heading "Your Referral Code", code chip with `badge-primary badge-lg`, "Copy code" button with `toast.success("Copied to clipboard")`, read-only link preview "Or share this link directly" using `window.location.origin`. Empty state when `referralCode` absent.

### Schema Extension (`src/types/ambassador.ts`)

`AmbassadorPublicFieldsSchema` gains `timezone?: string` field with `isValidIanaTimezone` refine. Validator uses `Intl.supportedValuesOf("timeZone")` when available; falls back to `Intl.DateTimeFormat` format attempt (throws `RangeError` on invalid tz). Prevents injection of arbitrary strings into cron date math.

## Architecture Notes

- **Admin page-level auth:** Inherited from `/admin/layout.tsx` (`AdminAuthGate` component) — no new page-level auth code was needed. Both admin pages live under `/admin/**` and benefit automatically.
- **Admin headers pattern:** Defined inline per-file using `ADMIN_TOKEN_KEY` from `@/components/admin/AdminAuthGate` — matches the established pattern in `ApplicationsList.tsx`, `EventAdminTable.tsx`, and `cohorts/page.tsx`. No shared `adminClient` module exists.
- **Offboarding deferred:** REPORT-07's "one-click offboarding flow" is Phase 5 work. Phase 4 only surfaces the 2-strike warning banner: "This ambassador has reached 2 confirmed strikes. The offboarding flow will be available in the next phase."
- **Firestore indexes:** The detail endpoint queries `ambassador_events(ambassadorId, date)`, `monthly_reports(ambassadorId, month)`, and `ambassador_cron_flags(ambassadorId, resolved, flaggedAt)` — composite indexes for these were added in Plan 06 (`firestore.indexes.json`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Pattern alignment] LogEventForm / EventList imported as default exports**
- **Found during:** Task 1
- **Issue:** Plan 05 action code used named imports `{ LogEventForm }` and `{ EventList }`, but Plan 03 created both as default exports.
- **Fix:** Used `import LogEventForm from "./LogEventForm"` and `import EventList from "./EventList"` in `ReportPageClient.tsx`.
- **Files modified:** `src/app/ambassadors/report/ReportPageClient.tsx`

**2. [Rule 2 - Missing adminClient module] adminHeaders defined inline**
- **Found during:** Task 3
- **Issue:** Plan action referenced `@/lib/ambassador/adminClient` which does not exist. The project defines admin headers inline in each component.
- **Fix:** Defined `adminHeaders()` inline in `MembersList.tsx`, `MemberDetailClient.tsx`, and `StrikeConfirmModal.tsx` using the established pattern from `ApplicationsList.tsx`.
- **Files modified:** Three new client components

**3. [Rule 1 - Wrapper restructure] AmbassadorPublicCardSection outer wrapper changed**
- **Found during:** Task 6
- **Issue:** The component returned a single `card` div. Adding `ReferralCodeCard` as a sibling section required a `space-y-6` wrapper div.
- **Fix:** Changed outer wrapper from `<div className="card bg-base-100 shadow-xl">` to `<div className="space-y-6">` containing the form card + referral code section as siblings.
- **Files modified:** `src/app/profile/AmbassadorPublicCardSection.tsx`

## Known Stubs

None — all components receive real data from their respective API endpoints.

## Threat Flags

None — all new endpoints use the existing `requireAdmin()` gate. No new auth surfaces introduced. TimezoneSelect PATCH inherits existing `verifyAuth` + `hasRoleClaim("ambassador")` gates on `/api/ambassador/profile`.

## Self-Check: PASSED

All 12 created files verified present on disk. All 5 task commits verified in git log.

| Check | Result |
|-------|--------|
| All created files exist | PASS (12/12) |
| All task commits exist | PASS (5/5) |
| `npx tsc --noEmit` exits 0 | PASS |
| requireAdmin on both new endpoints | PASS (2 each) |
| displayName interpolation in StrikeConfirmModal | PASS |
| CronFlagsPanel before StrikePanel in MemberDetailClient | PASS |
| No raw hex colors in new UI files | PASS |
| All client components start with "use client" | PASS (7/7) |
