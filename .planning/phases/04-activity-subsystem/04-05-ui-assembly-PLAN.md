---
phase: 04-activity-subsystem
plan: 05
type: execute
wave: 3
depends_on:
  - 04-03-event-logging
  - 04-04-report-and-strike-api
files_modified:
  - src/app/ambassadors/report/page.tsx
  - src/app/ambassadors/report/ReportPageClient.tsx
  - src/app/admin/ambassadors/members/page.tsx
  - src/app/admin/ambassadors/members/MembersList.tsx
  - src/app/admin/ambassadors/members/[uid]/page.tsx
  - src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx
  - src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx
  - src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx
  - src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx
  - src/app/admin/ambassadors/members/[uid]/CronFlagsPanel.tsx
  - src/app/api/ambassador/members/route.ts
  - src/app/api/ambassador/members/[uid]/route.ts
  - src/app/profile/AmbassadorPublicCardSection.tsx
  - src/types/ambassador.ts
autonomous: true
requirements:
  - REF-01
  - REPORT-03
  - REPORT-06
  - DISC-04
must_haves:
  truths:
    - "Ambassador page /ambassadors/report renders MonthlyReportForm + ReportStatusBadge (inline with heading) + LogEventForm + EventList in that vertical order (UI-SPEC §Visual Hierarchy)"
    - "Admin page /admin/ambassadors/members lists all active ambassadors (subdoc.active === true) with name, cohort, strikes, link to detail page"
    - "Admin page /admin/ambassadors/members/[uid] renders two-column layout: summary left (ActivitySummaryPanel), actions right (CronFlagsPanel above StrikePanel — evidence before action per UI-SPEC)"
    - "Admin can open StrikeConfirmModal, see the ambassador's displayName in the heading, and confirm — which POSTs to /api/ambassador/members/[uid]/strike"
    - "2-strike warning banner appears on the member detail when subdoc.strikes >= 2"
    - "AmbassadorPublicCardSection on /profile is extended with (a) a TimezoneSelect bound to AmbassadorPublicFieldsSchema.timezone (D-04) and (b) a ReferralCodeCard showing the subdoc.referralCode with Copy button (REF-01 display)"
    - "AmbassadorPublicFieldsSchema (in src/types/ambassador.ts) is extended with an optional `timezone` field validated as a non-empty IANA string"
    - "New admin-scope API endpoints return the data the pages consume: GET /api/ambassador/members (list) and GET /api/ambassador/members/[uid] (detail bundle with reports + events + flags)"
  artifacts:
    - path: "src/app/ambassadors/report/page.tsx"
      provides: "Server-rendered shell for /ambassadors/report — assembles MonthlyReportForm, ReportStatusBadge, LogEventForm, EventList"
      min_lines: 40
    - path: "src/app/admin/ambassadors/members/page.tsx"
      provides: "Admin server shell for members list"
      min_lines: 20
    - path: "src/app/admin/ambassadors/members/MembersList.tsx"
      provides: "Client members list with filter + link to detail"
      min_lines: 80
    - path: "src/app/admin/ambassadors/members/[uid]/page.tsx"
      provides: "Admin server shell for single-member detail"
      min_lines: 20
    - path: "src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx"
      provides: "Client orchestrator for the member detail two-column layout"
      min_lines: 100
    - path: "src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx"
      provides: "DaisyUI stat grid showing events-this-cohort + referrals + last-report"
      min_lines: 50
    - path: "src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx"
      provides: "Strike count display + Confirm strike button + 2-strike warning banner"
      min_lines: 60
    - path: "src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx"
      provides: "DecisionDialog-style modal with irreversible-action warning"
      min_lines: 60
    - path: "src/app/admin/ambassadors/members/[uid]/CronFlagsPanel.tsx"
      provides: "List of unresolved ambassador_cron_flags for this ambassador"
      min_lines: 50
    - path: "src/app/api/ambassador/members/route.ts"
      provides: "Admin GET list of active ambassadors for /admin/ambassadors/members"
      exports: ["GET"]
    - path: "src/app/api/ambassador/members/[uid]/route.ts"
      provides: "Admin GET detail bundle (subdoc + recent events + recent reports + flags)"
      exports: ["GET"]
    - path: "src/app/profile/AmbassadorPublicCardSection.tsx"
      provides: "Extended with TimezoneSelect + ReferralCodeCard"
      contains: "timezone"
    - path: "src/types/ambassador.ts"
      provides: "AmbassadorPublicFieldsSchema extended with optional timezone field"
      contains: "timezone"
  key_links:
    - from: "src/app/ambassadors/report/page.tsx"
      to: "MonthlyReportForm + LogEventForm + EventList + ReportStatusBadge"
      via: "JSX composition per UI-SPEC vertical hierarchy"
      pattern: "MonthlyReportForm|LogEventForm|EventList|ReportStatusBadge"
    - from: "src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx"
      to: "POST /api/ambassador/members/[uid]/strike"
      via: "fetch with adminHeaders from confirm modal"
      pattern: "api/ambassador/members.*strike"
    - from: "src/app/profile/AmbassadorPublicCardSection.tsx"
      to: "PATCH /api/ambassador/profile (AmbassadorPublicFieldsSchema with timezone)"
      via: "existing submit path extended with timezone dropdown value"
      pattern: "timezone"
---

<objective>
Assemble the page shells and wire all Phase 4 UI into the app: the ambassador-facing `/ambassadors/report` page (vertical composition per UI-SPEC), the admin-facing `/admin/ambassadors/members` list + `/admin/ambassadors/members/[uid]` detail pages (D-05), and the `/profile` extensions for timezone (D-04) + referral-code display (REF-01 visible surface). Adds two admin-scope GET endpoints that back the member pages.

Purpose: Connects the components built in Plans 01–04 into user-reachable routes. Delivers REPORT-03 surface (badge on ambassador page), REPORT-06/REPORT-07 admin strike flow (modal + button + 2-strike warning banner), DISC-04 flag visibility (CronFlagsPanel), and REF-01 + D-04 profile additions.

Output: 4 new pages (1 ambassador, 3 admin) + 7 new components + 2 admin API GET endpoints + 1 extension of the existing AmbassadorPublicCardSection + 1 AmbassadorPublicFieldsSchema extension.
</objective>

<threat_model>
- Authentication: Ambassador page uses existing client-side auth gate (user must be signed in; `authFetch` provides the ID token). Admin pages use the existing admin-layout gate (redirects to login if no admin token).
- Authorization — admin members list/detail: Both new GET endpoints use `requireAdmin()`. Non-admin gets 403. No data leak via the list route even to an authenticated ambassador.
- Authorization — PATCH timezone: Uses the existing `PATCH /api/ambassador/profile` route which already applies `verifyAuth` + `hasRoleClaim("ambassador")` + `AmbassadorPublicFieldsSchema.safeParse`. Extending the schema with `timezone` inherits all existing gates — NO new auth surface is created.
- Data integrity — timezone validation: Schema-level validation uses a strict Zod `.refine()` that checks the value is a non-empty string AND valid per `Intl.supportedValuesOf("timeZone")` OR falls back to a curated allowlist if that API is unavailable at runtime. Prevents injection of arbitrary strings that could later crash cron date math.
- Data integrity — strike modal: Modal MUST display the ambassador's displayName in the heading per UI-SPEC §Accessibility — "prevents admin confirming the wrong ambassador record." Covered by an acceptance criterion grepping for the displayName interpolation.
- Information disclosure — referrals count: The admin detail endpoint returns a `referrals` count but the referrals collection itself is server-read only. The count is derived via a server-side count-aggregation query; the ambassador's ID is passed as a query filter. No cross-ambassador leakage.
- Information disclosure — displayed referralCode: The referralCode is displayed on the owning ambassador's own `/profile` page. It is already readable server-side by the ambassador's own profile card (their own subdoc). No new client-SDK read path is introduced.
- Cookie safety: N/A — no cookies in this plan.
- Cron safety: N/A — no crons in this plan.
- Block-on severity: HIGH for (a) admin-only gate on both new GET endpoints, (b) displayName interpolation in strike modal heading, (c) timezone schema validation. All have acceptance criteria.
</threat_model>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/REQUIREMENTS.md
@.planning/phases/04-activity-subsystem/04-CONTEXT.md
@.planning/phases/04-activity-subsystem/04-RESEARCH.md
@.planning/phases/04-activity-subsystem/04-PATTERNS.md
@.planning/phases/04-activity-subsystem/04-UI-SPEC.md
@.planning/phases/04-activity-subsystem/04-01-foundations-types-schemas-PLAN.md
@.planning/phases/04-activity-subsystem/04-03-event-logging-PLAN.md
@.planning/phases/04-activity-subsystem/04-04-report-and-strike-api-PLAN.md
@src/app/profile/AmbassadorPublicCardSection.tsx
@src/app/admin/ambassadors/cohorts/page.tsx
@src/app/admin/ambassadors/cohorts/[cohortId]/page.tsx
@src/components/DecisionDialog.tsx
@src/types/ambassador.ts
@src/lib/ambassador/adminAuth.ts

<interfaces>
From Plan 03 (MUST be complete before Wave 3):
- `LogEventForm` — `src/app/ambassadors/report/LogEventForm.tsx` (default import; renders logging form)
- `EventList` — `src/app/ambassadors/report/EventList.tsx` (default import; renders ambassador's own events with edit/delete)

From Plan 04 (MUST be complete before Wave 3):
- `MonthlyReportForm` — `src/app/ambassadors/report/MonthlyReportForm.tsx`
- `ReportStatusBadge, type ReportCurrent` — `src/app/ambassadors/report/ReportStatusBadge.tsx`
- `POST /api/ambassador/members/[uid]/strike` — body: empty; returns `{ uid, strikes }`

From Plan 01:
- `AmbassadorEventDoc`, `MonthlyReportDoc`, `AmbassadorCronFlagDoc` — `@/types/ambassador`
- `AMBASSADOR_EVENTS_COLLECTION`, `MONTHLY_REPORTS_COLLECTION`, `AMBASSADOR_CRON_FLAGS_COLLECTION`, `REFERRALS_COLLECTION`

Existing `AmbassadorPublicFieldsSchema` (confirmed Phase 3 pattern in src/types/ambassador.ts):
- Currently accepts `{ university?, city?, publicTagline?, twitterUrl?, githubUrl?, personalSiteUrl?, cohortPresentationVideoUrl?, cohortPresentationVideoEmbedType? }` — all optional
- This plan adds `timezone?: string` — IANA tz string, validated via `Intl.supportedValuesOf("timeZone")` when available

Existing `DecisionDialog` pattern (src/components/DecisionDialog.tsx — confirmed from UI-SPEC modal reference):
- Uses `<dialog className="modal modal-open">` pattern
- Heading on top, body paragraph, actions in `modal-action` bottom bar
- Confirm button is `btn btn-error`, cancel is `btn btn-ghost`

Admin pages pattern (src/app/admin/ambassadors/cohorts/[cohortId]/page.tsx):
- `page.tsx` is a server component — reads the param from `{ params }`, calls Admin SDK directly or delegates to a Client orchestrator
- Client orchestrator handles fetching via adminHeaders + rendering panels

Established UI-SPEC constraints (04-UI-SPEC.md):
- DaisyUI v5 + Tailwind; no new component library
- Semantic tokens only (badge-success / badge-warning / badge-error / alert-info etc.)
- Heading h1 = `text-2xl font-bold`, card-title = `text-xl font-bold`, labels = `font-bold`
- No `font-semibold` anywhere in Phase 4
- Every modal uses `<dialog className="modal modal-open">` matching DecisionDialog
- Every destructive action requires a confirmation modal

UI-SPEC copy strings for /admin/ambassadors/members:
- Members list heading: "Ambassador Members"
- Members list subheading: "Active ambassadors in the program. Click a member to see their activity and manage strikes."
- Empty members list heading: "No active ambassadors found."
- Empty members list body: "Once an applicant is accepted into the program, they will appear here."
- Activity summary heading: "Activity Summary"
- Strike section heading: "Strike Management"
- Strike count label: "Confirmed strikes"
- Cron flags heading: "Flagged by Automated Check"
- Cron flags empty: "No flags. This ambassador is up to date."
- Flag item copy: "Missing report for {Month YYYY} — flagged {date}"
- Strike increment CTA: "Confirm strike"
- Strike confirm modal heading: "Confirm strike for {displayName}?"
- Strike confirm modal body: "This records a confirmed strike against this ambassador. Strike increments are irreversible from this panel. Review the flagged reports above before confirming."
- Strike confirm button: "Yes, confirm strike"
- Strike cancel button: "Go back"
- 2-strike warning banner: "This ambassador has reached 2 confirmed strikes. The offboarding flow will be available in the next phase."
- Discord reconciliation flag: "Missing Discord Ambassador role — flagged {date}. Use the retry button on the application detail page to re-assign."
- Report history heading: "Report History"
- Report history empty: "No reports submitted yet. Reports appear here once an ambassador submits their monthly self-report."
- Event history heading: "Logged Events"
- Event history empty: "No events logged. Events appear here once an ambassador logs an activity from their report page."

UI-SPEC copy strings for /profile:
- Timezone field label: "Your timezone"
- Timezone field help text: "Used to calculate your monthly report deadline and send reminders at the right time."
- Timezone default notice: "Defaults to UTC if not set."
- Referral code section heading: "Your Referral Code"
- Referral code label: "Share this code to earn referral credit"
- Copy button CTA: "Copy code"
- Copy success feedback: "Copied to clipboard"
- Referral link label: "Or share this link directly"
- Empty state (no code yet): "Your referral code is being generated — check back shortly after acceptance is confirmed."
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Assemble /ambassadors/report page.tsx with MonthlyReportForm + ReportStatusBadge + LogEventForm + EventList</name>
  <files>src/app/ambassadors/report/page.tsx</files>
  <read_first>
    - src/app/ambassadors/report/MonthlyReportForm.tsx (Plan 04 Task 4 — consumed here)
    - src/app/ambassadors/report/ReportStatusBadge.tsx (Plan 04 Task 5)
    - src/app/ambassadors/report/LogEventForm.tsx (Plan 03)
    - src/app/ambassadors/report/EventList.tsx (Plan 03)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Visual Hierarchy Notes §/ambassadors/report (composition order: MonthlyReportForm is focal point; EventList subordinate)
    - src/app/admin/ambassadors/cohorts/page.tsx (page-component layout pattern — `page-padding` utility + `<main>` wrapper)
    - src/app/api/ambassador/report/current/route.ts (Plan 04 Task 2 — drives badge)
  </read_first>
  <behavior>
    - Route `/ambassadors/report` renders a logged-in-only server shell that delegates to a Client orchestrator
    - Client orchestrator fetches `/api/ambassador/report/current` once and passes result into `ReportStatusBadge` prop
    - ReportStatusBadge renders inline with the page heading (`<h1>Monthly Self-Report</h1><ReportStatusBadge />` flex row) — UI-SPEC §Visual Hierarchy
    - MonthlyReportForm renders first (focal point)
    - LogEventForm renders below MonthlyReportForm (subordinate)
    - EventList renders below LogEventForm
    - Page uses existing `.page-padding` utility + `<main>` wrapper matching admin pages
  </behavior>
  <action>
    Step 1: Create `src/app/ambassadors/report/page.tsx` (server component shell):

    ```tsx
    /**
     * Phase 4 (D-01): Ambassador Monthly Self-Report page.
     * Composition order (UI-SPEC §Visual Hierarchy Notes):
     *   1. Page heading + ReportStatusBadge (inline)
     *   2. MonthlyReportForm (focal point)
     *   3. LogEventForm
     *   4. EventList
     */
    import { ReportPageClient } from "./ReportPageClient";

    export const dynamic = "force-dynamic";

    export default function AmbassadorReportPage() {
      return (
        <main className="page-padding mx-auto max-w-4xl space-y-8 py-8">
          <ReportPageClient />
        </main>
      );
    }
    ```

    Step 2: Create `src/app/ambassadors/report/ReportPageClient.tsx` (client orchestrator — fetches current status, composes all four children):

    ```tsx
    "use client";

    import { useEffect, useState } from "react";
    import { authFetch } from "@/lib/apiClient";
    import { MonthlyReportForm } from "./MonthlyReportForm";
    import { ReportStatusBadge, type ReportCurrent } from "./ReportStatusBadge";
    import { LogEventForm } from "./LogEventForm";
    import { EventList } from "./EventList";

    export function ReportPageClient() {
      const [current, setCurrent] = useState<ReportCurrent | null>(null);
      const [refreshKey, setRefreshKey] = useState(0);

      useEffect(() => {
        let cancelled = false;
        (async () => {
          try {
            const res = await authFetch("/api/ambassador/report/current");
            if (!res.ok) return;
            const json = (await res.json()) as ReportCurrent;
            if (!cancelled) setCurrent(json);
          } catch {
            /* silent — MonthlyReportForm will render its own error */
          }
        })();
        return () => {
          cancelled = true;
        };
      }, [refreshKey]);

      return (
        <>
          <header className="flex items-center justify-between gap-4">
            <div />
            <ReportStatusBadge current={current} />
          </header>

          <MonthlyReportForm />

          <section className="space-y-4">
            <LogEventForm onCreated={() => setRefreshKey((k) => k + 1)} />
            <EventList refreshKey={refreshKey} />
          </section>
        </>
      );
    }
    ```

    NOTE: `LogEventForm` and `EventList` are created by Plan 03 with the prop signatures `{ onCreated?: () => void }` and `{ refreshKey?: number }` respectively — if Plan 03 used different prop names, this file must align with those exact signatures.
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -E "MonthlyReportForm|ReportStatusBadge|LogEventForm|EventList" src/app/ambassadors/report/ReportPageClient.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/ambassadors/report/page.tsx` exists; is a server component (no `"use client"` directive); delegates all rendering to `<ReportPageClient />`
    - `src/app/ambassadors/report/ReportPageClient.tsx` exists; starts with `"use client";`; imports all four siblings (`MonthlyReportForm`, `ReportStatusBadge`, `LogEventForm`, `EventList`)
    - Composition order in JSX: `ReportStatusBadge` (inline with header) → `MonthlyReportForm` → `LogEventForm` → `EventList`
    - `MonthlyReportForm` appears BEFORE `LogEventForm` in the JSX
    - `LogEventForm` appears BEFORE `EventList` in the JSX
    - Fetch to `/api/ambassador/report/current` happens once on mount (`useEffect` with dependency on refreshKey only)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    `/ambassadors/report` is the complete ambassador-facing Phase 4 page. Visible in browser after login as an ambassador role user.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add admin GET list + detail endpoints — /api/ambassador/members (list) and /api/ambassador/members/[uid] (detail bundle)</name>
  <files>src/app/api/ambassador/members/route.ts, src/app/api/ambassador/members/[uid]/route.ts</files>
  <read_first>
    - src/lib/ambassador/adminAuth.ts (requireAdmin shape)
    - src/app/api/ambassador/members/[uid]/strike/route.ts (Plan 04 Task 3 — sibling admin route for auth-gate consistency)
    - src/types/ambassador.ts (AMBASSADOR_EVENTS_COLLECTION, MONTHLY_REPORTS_COLLECTION, AMBASSADOR_CRON_FLAGS_COLLECTION, REFERRALS_COLLECTION)
    - src/app/api/ambassador/applications/route.ts (admin GET list pattern — if present — for pagination/filter conventions)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Component Inventory admin-facing (what data the pages need)
  </read_first>
  <behavior>
    - Feature flag off → both GETs return 404
    - Non-admin (no admin token) → both return 403 via `requireAdmin()`
    - `GET /api/ambassador/members` (admin) → 200 with `{ members: Array<{ uid, displayName, email, cohortId, strikes, referralCode?, active: boolean, unresolvedFlagCount: number }> }` sorted by displayName asc
    - `GET /api/ambassador/members` excludes subdocs where `active !== true` (only active ambassadors)
    - `GET /api/ambassador/members/[uid]` (admin) → 200 with `{ profile, subdoc, recentEvents: AmbassadorEventDoc[] (limit 20), recentReports: MonthlyReportDoc[] (limit 12), unresolvedFlags: AmbassadorCronFlagDoc[], referralsCount: number }`
    - Missing subdoc on detail route → 404
    - All Firestore Timestamp fields normalized to ISO strings in response JSON
  </behavior>
  <action>
    Step 1: Create `src/app/api/ambassador/members/route.ts`:

    ```typescript
    /**
     * Phase 4 (D-05): Admin list of active ambassadors.
     *   GET /api/ambassador/members
     *
     * Returns minimal shape for the MembersList table: uid, displayName, cohort,
     * strikes, referralCode, unresolvedFlagCount. Full detail is at [uid] endpoint.
     */
    import { NextRequest, NextResponse } from "next/server";
    import { db } from "@/lib/firebaseAdmin";
    import { isAmbassadorProgramEnabled } from "@/lib/features";
    import { requireAdmin } from "@/lib/ambassador/adminAuth";
    import { AMBASSADOR_CRON_FLAGS_COLLECTION } from "@/types/ambassador";

    export async function GET(request: NextRequest) {
      if (!isAmbassadorProgramEnabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const admin = await requireAdmin(request);
      if (!admin.ok) {
        return NextResponse.json({ error: admin.error }, { status: admin.status });
      }

      // Collection-group read of all ambassador subdocs where active === true
      const subdocsSnap = await db
        .collectionGroup("ambassador")
        .where("active", "==", true)
        .get();

      const members = await Promise.all(
        subdocsSnap.docs.map(async (subdocSnap) => {
          const subdoc = subdocSnap.data();
          const uid = subdocSnap.ref.parent.parent?.id ?? "";
          // Parent profile for displayName + email
          const profileSnap = uid
            ? await db.collection("mentorship_profiles").doc(uid).get()
            : null;
          const profile = profileSnap?.data() ?? {};

          // Unresolved flag count
          const flagsSnap = await db
            .collection(AMBASSADOR_CRON_FLAGS_COLLECTION)
            .where("ambassadorId", "==", uid)
            .where("resolved", "==", false)
            .count()
            .get();

          return {
            uid,
            displayName: (profile.displayName as string | undefined) ?? uid,
            email: (profile.email as string | undefined) ?? null,
            cohortId: (subdoc.cohortId as string | undefined) ?? null,
            strikes: (subdoc.strikes as number | undefined) ?? 0,
            referralCode: (subdoc.referralCode as string | undefined) ?? null,
            active: subdoc.active === true,
            unresolvedFlagCount: flagsSnap.data().count ?? 0,
          };
        }),
      );

      members.sort((a, b) => a.displayName.localeCompare(b.displayName));

      return NextResponse.json({ members }, { status: 200 });
    }
    ```

    Step 2: Create `src/app/api/ambassador/members/[uid]/route.ts`:

    ```typescript
    /**
     * Phase 4 (D-05): Admin detail bundle for a single active ambassador.
     *   GET /api/ambassador/members/[uid]
     */
    import { NextRequest, NextResponse } from "next/server";
    import { db } from "@/lib/firebaseAdmin";
    import { isAmbassadorProgramEnabled } from "@/lib/features";
    import { requireAdmin } from "@/lib/ambassador/adminAuth";
    import {
      AMBASSADOR_EVENTS_COLLECTION,
      MONTHLY_REPORTS_COLLECTION,
      AMBASSADOR_CRON_FLAGS_COLLECTION,
      REFERRALS_COLLECTION,
    } from "@/types/ambassador";

    function normalizeTimestamps<T extends Record<string, unknown>>(data: T): T {
      const out: Record<string, unknown> = { ...data };
      for (const key of Object.keys(out)) {
        const v = out[key] as { toDate?: () => Date } | unknown;
        if (v && typeof (v as { toDate?: () => Date }).toDate === "function") {
          out[key] = (v as { toDate: () => Date }).toDate().toISOString();
        }
      }
      return out as T;
    }

    export async function GET(
      request: NextRequest,
      { params }: { params: { uid: string } | Promise<{ uid: string }> },
    ) {
      if (!isAmbassadorProgramEnabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const admin = await requireAdmin(request);
      if (!admin.ok) {
        return NextResponse.json({ error: admin.error }, { status: admin.status });
      }

      const { uid } = await Promise.resolve(params);
      if (!uid) return NextResponse.json({ error: "Invalid uid" }, { status: 400 });

      const [profileSnap, subdocSnap] = await Promise.all([
        db.collection("mentorship_profiles").doc(uid).get(),
        db
          .collection("mentorship_profiles")
          .doc(uid)
          .collection("ambassador")
          .doc("v1")
          .get(),
      ]);

      if (!subdocSnap.exists) {
        return NextResponse.json({ error: "Ambassador not found" }, { status: 404 });
      }

      const [eventsSnap, reportsSnap, flagsSnap, referralsCountSnap] = await Promise.all([
        db
          .collection(AMBASSADOR_EVENTS_COLLECTION)
          .where("ambassadorId", "==", uid)
          .orderBy("date", "desc")
          .limit(20)
          .get(),
        db
          .collection(MONTHLY_REPORTS_COLLECTION)
          .where("ambassadorId", "==", uid)
          .orderBy("month", "desc")
          .limit(12)
          .get(),
        db
          .collection(AMBASSADOR_CRON_FLAGS_COLLECTION)
          .where("ambassadorId", "==", uid)
          .where("resolved", "==", false)
          .orderBy("flaggedAt", "desc")
          .get(),
        db
          .collection(REFERRALS_COLLECTION)
          .where("ambassadorId", "==", uid)
          .count()
          .get(),
      ]);

      return NextResponse.json(
        {
          profile: normalizeTimestamps(profileSnap.data() ?? {}),
          subdoc: normalizeTimestamps(subdocSnap.data() ?? {}),
          recentEvents: eventsSnap.docs.map((d) =>
            normalizeTimestamps({ id: d.id, ...d.data() }),
          ),
          recentReports: reportsSnap.docs.map((d) =>
            normalizeTimestamps({ id: d.id, ...d.data() }),
          ),
          unresolvedFlags: flagsSnap.docs.map((d) =>
            normalizeTimestamps({ id: d.id, ...d.data() }),
          ),
          referralsCount: referralsCountSnap.data().count ?? 0,
        },
        { status: 200 },
      );
    }
    ```

    NOTE: Both routes may require Firestore composite indexes on `ambassador_events(ambassadorId asc, date desc)`, `monthly_reports(ambassadorId asc, month desc)`, and `ambassador_cron_flags(ambassadorId asc, resolved asc, flaggedAt desc)`. These are added in Plan 06 Task 4 (firestore.indexes.json).
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -E "requireAdmin" src/app/api/ambassador/members/route.ts src/app/api/ambassador/members/[uid]/route.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/api/ambassador/members/route.ts` exists and exports `GET`
    - `src/app/api/ambassador/members/[uid]/route.ts` exists and exports `GET`
    - Both files call `isAmbassadorProgramEnabled()` as the first gate
    - Both files call `requireAdmin(request)` as the second gate
    - List endpoint filters `.where("active", "==", true)` — only returns active ambassadors
    - Detail endpoint returns `referralsCount` (number) derived from a Firestore count aggregation on REFERRALS_COLLECTION filtered by `ambassadorId`
    - Detail endpoint response keys match exactly: `profile`, `subdoc`, `recentEvents`, `recentReports`, `unresolvedFlags`, `referralsCount`
    - Timestamps normalized: no route response JSON contains `_seconds` or `toDate` — all converted to ISO strings
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    Two admin-scope GET endpoints power the members list + detail pages. Both are admin-gated, feature-flag-gated, and return JSON-safe payloads.
  </done>
</task>

<task type="auto">
  <name>Task 3: Create admin members list page + MembersList client component</name>
  <files>src/app/admin/ambassadors/members/page.tsx, src/app/admin/ambassadors/members/MembersList.tsx</files>
  <read_first>
    - src/app/admin/ambassadors/cohorts/page.tsx (admin list page pattern — server shell + client list)
    - src/app/api/ambassador/members/route.ts (Task 2 — response shape)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Copywriting — Admin Member Management (list copy verbatim)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Component Inventory admin-facing (MembersList references ApplicationsList pattern)
    - src/app/admin/ambassadors/applications/ApplicationsList.tsx (if present — the table-plus-filters pattern referenced by UI-SPEC)
  </read_first>
  <behavior>
    - `/admin/ambassadors/members` renders the server shell + `<MembersList />`
    - MembersList fetches `/api/ambassador/members` via `authFetch` with `adminHeaders()`
    - Renders a table (or card list on mobile) with columns: Name, Cohort, Strikes, Flags, Action
    - Each row has a link to `/admin/ambassadors/members/{uid}`
    - Rows where `strikes >= 2` display the strike count in a `badge-warning` or `badge-error` for visual priority
    - Rows with `unresolvedFlagCount > 0` show a `badge-warning` beside the name
    - Empty state renders `alert alert-info` with UI-SPEC empty heading + body verbatim
    - Loading state renders `loading loading-spinner loading-md` centered
    - Error state renders `alert alert-error` with "Could not load members. Check your connection and try again."
    - Page heading "Ambassador Members" as `<h1 className="text-2xl font-bold">`
    - Subheading "Active ambassadors in the program. Click a member to see their activity and manage strikes." as `<p className="text-base-content/70">`
  </behavior>
  <action>
    Step 1: Create `src/app/admin/ambassadors/members/page.tsx`:

    ```tsx
    /**
     * Phase 4 (D-05): Admin members list page.
     * Server shell — delegates to MembersList client component.
     */
    import { MembersList } from "./MembersList";

    export const dynamic = "force-dynamic";

    export default function AdminMembersPage() {
      return (
        <main className="page-padding mx-auto max-w-6xl space-y-6 py-8">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold">Ambassador Members</h1>
            <p className="text-base-content/70">
              Active ambassadors in the program. Click a member to see their activity and manage strikes.
            </p>
          </header>
          <MembersList />
        </main>
      );
    }
    ```

    Step 2: Create `src/app/admin/ambassadors/members/MembersList.tsx` (client component):

    ```tsx
    "use client";

    import Link from "next/link";
    import { useEffect, useState } from "react";
    import { authFetch } from "@/lib/apiClient";
    import { adminHeaders } from "@/lib/ambassador/adminClient";

    type Member = {
      uid: string;
      displayName: string;
      email: string | null;
      cohortId: string | null;
      strikes: number;
      referralCode: string | null;
      active: boolean;
      unresolvedFlagCount: number;
    };

    export function MembersList() {
      const [members, setMembers] = useState<Member[] | null>(null);
      const [error, setError] = useState<string | null>(null);

      useEffect(() => {
        let cancelled = false;
        (async () => {
          try {
            const res = await authFetch("/api/ambassador/members", {
              headers: adminHeaders(),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = (await res.json()) as { members: Member[] };
            if (!cancelled) setMembers(json.members);
          } catch {
            if (!cancelled) setError("Could not load members. Check your connection and try again.");
          }
        })();
        return () => {
          cancelled = true;
        };
      }, []);

      if (error) {
        return (
          <div role="alert" className="alert alert-error">
            <span>{error}</span>
          </div>
        );
      }

      if (!members) {
        return (
          <div className="py-12 text-center">
            <span className="loading loading-spinner loading-md" aria-label="Loading members" />
          </div>
        );
      }

      if (members.length === 0) {
        return (
          <div className="alert alert-info flex-col items-start">
            <h2 className="font-bold">No active ambassadors found.</h2>
            <p>Once an applicant is accepted into the program, they will appear here.</p>
          </div>
        );
      }

      return (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Cohort</th>
                <th>Strikes</th>
                <th>Flags</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.uid}>
                  <td className="font-bold">{m.displayName}</td>
                  <td>{m.cohortId ?? "—"}</td>
                  <td>
                    <span
                      className={
                        m.strikes >= 2
                          ? "badge badge-error font-bold"
                          : m.strikes === 1
                            ? "badge badge-warning font-bold"
                            : "badge badge-ghost"
                      }
                    >
                      {m.strikes}
                    </span>
                  </td>
                  <td>
                    {m.unresolvedFlagCount > 0 ? (
                      <span className="badge badge-warning font-bold">
                        {m.unresolvedFlagCount}
                      </span>
                    ) : (
                      <span className="badge badge-ghost">0</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/ambassadors/members/${m.uid}`} className="btn btn-sm btn-ghost">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    ```

    NOTE: `adminHeaders` is assumed to be exported from `@/lib/ambassador/adminClient` following the Phase 2 convention. If the actual export path is different (e.g., `@/lib/ambassador/adminAuth` client side), align the import at executor time.
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -E "Ambassador Members|Click a member to see their activity|No active ambassadors found" src/app/admin/ambassadors/members/page.tsx src/app/admin/ambassadors/members/MembersList.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/admin/ambassadors/members/page.tsx` exists; heading "Ambassador Members" verbatim; subheading verbatim
    - `src/app/admin/ambassadors/members/MembersList.tsx` exists and starts with `"use client";`
    - Empty state body "Once an applicant is accepted into the program, they will appear here." present verbatim
    - Table includes Name, Cohort, Strikes, Flags columns
    - Each row renders a `Link` to `/admin/ambassadors/members/{uid}` (not `href` string only — Next.js Link component)
    - 2-strikes rows use `badge-error`; 1-strike rows use `badge-warning`; 0-strikes rows use `badge-ghost`
    - No raw hex colors (`grep -E "#[0-9a-fA-F]{3,6}" src/app/admin/ambassadors/members/MembersList.tsx` returns 0)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    `/admin/ambassadors/members` renders a live list of all active ambassadors. Admins can click through to the detail page (Task 4).
  </done>
</task>

<task type="auto">
  <name>Task 4: Create admin member detail page + orchestrator + ActivitySummaryPanel + CronFlagsPanel</name>
  <files>src/app/admin/ambassadors/members/[uid]/page.tsx, src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx, src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx, src/app/admin/ambassadors/members/[uid]/CronFlagsPanel.tsx</files>
  <read_first>
    - src/app/api/ambassador/members/[uid]/route.ts (Task 2 — response shape)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Copywriting — Admin Member Management (verbatim copy for all panels)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Visual Hierarchy Notes §/admin/ambassadors/members/[uid] (stats top → flags → strike panel; evidence before action)
    - src/app/admin/ambassadors/cohorts/[cohortId]/page.tsx (admin detail page pattern reference)
    - src/types/ambassador.ts (AmbassadorEventDoc, MonthlyReportDoc, AmbassadorCronFlagDoc)
  </read_first>
  <behavior>
    - Route `/admin/ambassadors/members/[uid]` renders a server shell that delegates to a client orchestrator
    - Client orchestrator fetches `/api/ambassador/members/[uid]` with adminHeaders, renders loading / error / data states
    - Data layout (UI-SPEC Visual Hierarchy): `<ActivitySummaryPanel />` at top, then `<CronFlagsPanel />`, then `<StrikePanel />` (Task 5), then Report History table, then Event History table
    - ActivitySummaryPanel: DaisyUI `stats` grid showing Events count (recentEvents.length), Referrals (referralsCount), Reports-this-cohort (recentReports count), Current strikes (subdoc.strikes)
    - CronFlagsPanel: renders each `unresolvedFlags` item as `alert alert-warning`; missing_report type shows "Missing report for {Month YYYY} — flagged {date}"; missing_discord_role type shows UI-SPEC Discord reconciliation copy verbatim
    - CronFlagsPanel empty state: "No flags. This ambassador is up to date." as `alert alert-success`
    - Report History empty state: UI-SPEC verbatim
    - Event History empty state: UI-SPEC verbatim
    - Heading uses `{profile.displayName}` as page h1
  </behavior>
  <action>
    Step 1: Create `src/app/admin/ambassadors/members/[uid]/page.tsx`:

    ```tsx
    import { MemberDetailClient } from "./MemberDetailClient";

    export const dynamic = "force-dynamic";

    export default async function AdminMemberDetailPage({
      params,
    }: {
      params: Promise<{ uid: string }>;
    }) {
      const { uid } = await params;
      return (
        <main className="page-padding mx-auto max-w-6xl space-y-6 py-8">
          <MemberDetailClient uid={uid} />
        </main>
      );
    }
    ```

    Step 2: Create `src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx`:

    ```tsx
    "use client";

    import { useCallback, useEffect, useState } from "react";
    import { authFetch } from "@/lib/apiClient";
    import { adminHeaders } from "@/lib/ambassador/adminClient";
    import { ActivitySummaryPanel } from "./ActivitySummaryPanel";
    import { CronFlagsPanel } from "./CronFlagsPanel";
    import { StrikePanel } from "./StrikePanel";

    type MemberDetail = {
      profile: { displayName?: string; email?: string };
      subdoc: {
        cohortId?: string;
        strikes?: number;
        referralCode?: string;
        timezone?: string;
        active?: boolean;
      };
      recentEvents: Array<{
        id: string;
        date: string;
        type: string;
        attendanceEstimate: number;
        hidden: boolean;
      }>;
      recentReports: Array<{
        id: string;
        month: string;
        submittedAt: string;
      }>;
      unresolvedFlags: Array<{
        id: string;
        type: "missing_report" | "missing_discord_role";
        period?: string;
        flaggedAt: string;
      }>;
      referralsCount: number;
    };

    export function MemberDetailClient({ uid }: { uid: string }) {
      const [detail, setDetail] = useState<MemberDetail | null>(null);
      const [error, setError] = useState<string | null>(null);

      const load = useCallback(async () => {
        try {
          const res = await authFetch(`/api/ambassador/members/${uid}`, {
            headers: adminHeaders(),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as MemberDetail;
          setDetail(json);
        } catch {
          setError("Could not load member detail. Check your connection and try again.");
        }
      }, [uid]);

      useEffect(() => {
        load();
      }, [load]);

      if (error) {
        return (
          <div role="alert" className="alert alert-error">
            <span>{error}</span>
          </div>
        );
      }

      if (!detail) {
        return (
          <div className="py-12 text-center">
            <span className="loading loading-spinner loading-md" aria-label="Loading member detail" />
          </div>
        );
      }

      const displayName = detail.profile.displayName ?? uid;

      return (
        <div className="space-y-8">
          <header>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            {detail.subdoc.cohortId && (
              <p className="text-base-content/70">Cohort: {detail.subdoc.cohortId}</p>
            )}
          </header>

          <ActivitySummaryPanel
            eventsCount={detail.recentEvents.filter((e) => !e.hidden).length}
            referralsCount={detail.referralsCount}
            reportsCount={detail.recentReports.length}
            strikes={detail.subdoc.strikes ?? 0}
          />

          <CronFlagsPanel flags={detail.unresolvedFlags} />

          <StrikePanel
            uid={uid}
            displayName={displayName}
            strikes={detail.subdoc.strikes ?? 0}
            onStrikeIncremented={load}
          />

          <section className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Report History</h2>
              {detail.recentReports.length === 0 ? (
                <div className="alert alert-info">
                  <span>
                    No reports submitted yet. Reports appear here once an ambassador submits their monthly self-report.
                  </span>
                </div>
              ) : (
                <ul className="list-disc pl-5">
                  {detail.recentReports.map((r) => (
                    <li key={r.id}>
                      {r.month} — submitted {new Date(r.submittedAt).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Logged Events</h2>
              {detail.recentEvents.length === 0 ? (
                <div className="alert alert-info">
                  <span>
                    No events logged. Events appear here once an ambassador logs an activity from their report page.
                  </span>
                </div>
              ) : (
                <ul className="list-disc pl-5">
                  {detail.recentEvents.map((e) => (
                    <li key={e.id}>
                      {new Date(e.date).toLocaleDateString()} — {e.type} ({e.attendanceEstimate} attendees)
                      {e.hidden && <span className="badge badge-error ml-2">Hidden</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      );
    }
    ```

    Step 3: Create `src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx`:

    ```tsx
    "use client";

    export function ActivitySummaryPanel({
      eventsCount,
      referralsCount,
      reportsCount,
      strikes,
    }: {
      eventsCount: number;
      referralsCount: number;
      reportsCount: number;
      strikes: number;
    }) {
      return (
        <section className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Activity Summary</h2>
            <div className="stats stats-vertical lg:stats-horizontal shadow">
              <div className="stat">
                <div className="stat-title">Events</div>
                <div className="stat-value">{eventsCount}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Referrals</div>
                <div className="stat-value">{referralsCount}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Reports submitted</div>
                <div className="stat-value">{reportsCount}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Confirmed strikes</div>
                <div
                  className={
                    strikes >= 2
                      ? "stat-value text-error"
                      : strikes === 1
                        ? "stat-value text-warning"
                        : "stat-value"
                  }
                >
                  {strikes}
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }
    ```

    Step 4: Create `src/app/admin/ambassadors/members/[uid]/CronFlagsPanel.tsx`:

    ```tsx
    "use client";

    type Flag = {
      id: string;
      type: "missing_report" | "missing_discord_role";
      period?: string;
      flaggedAt: string;
    };

    function formatMonthHuman(period: string): string {
      const [y, m] = period.split("-").map(Number);
      if (!Number.isFinite(y) || !Number.isFinite(m)) return period;
      return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    }

    export function CronFlagsPanel({ flags }: { flags: Flag[] }) {
      return (
        <section className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Flagged by Automated Check</h2>
            {flags.length === 0 ? (
              <div className="alert alert-success">
                <span>No flags. This ambassador is up to date.</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {flags.map((f) => {
                  const flaggedDate = new Date(f.flaggedAt).toLocaleDateString();
                  if (f.type === "missing_report") {
                    return (
                      <li key={f.id} className="alert alert-warning">
                        <span>
                          Missing report for {f.period ? formatMonthHuman(f.period) : "an unknown month"} — flagged {flaggedDate}
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={f.id} className="alert alert-warning">
                      <span>
                        Missing Discord Ambassador role — flagged {flaggedDate}. Use the retry button on the application detail page to re-assign.
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      );
    }
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -E "Activity Summary|Flagged by Automated Check|No flags. This ambassador is up to date|Report History|Logged Events|Missing Discord Ambassador role" src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx src/app/admin/ambassadors/members/[uid]/CronFlagsPanel.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/admin/ambassadors/members/[uid]/page.tsx` exists as a server component
    - `src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx` exists and starts with `"use client";`
    - `src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx` exists with `"use client";` and renders a DaisyUI `stats` container with 4 stat blocks (Events, Referrals, Reports submitted, Confirmed strikes)
    - `src/app/admin/ambassadors/members/[uid]/CronFlagsPanel.tsx` exists with `"use client";`
    - CronFlagsPanel empty state copy "No flags. This ambassador is up to date." present verbatim
    - CronFlagsPanel `missing_report` branch contains template `Missing report for ` followed by month interpolation and "— flagged"
    - CronFlagsPanel `missing_discord_role` branch contains "Missing Discord Ambassador role — flagged" and "Use the retry button on the application detail page to re-assign." verbatim
    - MemberDetailClient renders children in order: ActivitySummaryPanel → CronFlagsPanel → StrikePanel → Report History → Logged Events (UI-SPEC §Visual Hierarchy: evidence BEFORE action)
    - Report History empty state "No reports submitted yet. Reports appear here once an ambassador submits their monthly self-report." verbatim
    - Logged Events empty state "No events logged. Events appear here once an ambassador logs an activity from their report page." verbatim
    - Heading "Activity Summary" verbatim
    - Heading "Flagged by Automated Check" verbatim
    - Strike count > 0 uses `text-warning` or `text-error` for visual prominence on the stat
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    The admin member detail page renders the full activity picture for an ambassador: stats grid, cron flags (evidence), then the strike action panel. Task 5 wires the strike action.
  </done>
</task>

<task type="auto">
  <name>Task 5: Create StrikePanel + StrikeConfirmModal — admin strike action UI (REPORT-06, REPORT-07)</name>
  <files>src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx, src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx</files>
  <read_first>
    - src/components/DecisionDialog.tsx (canonical modal pattern: `<dialog className="modal modal-open">` + `<form method="dialog" className="modal-backdrop">`)
    - src/app/api/ambassador/members/[uid]/strike/route.ts (Plan 04 Task 3 — POST signature)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Copywriting — Admin Member Management (Strike section — all copy verbatim)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Accessibility Constraints (modal must display ambassador's displayName — prevents admin confirming the wrong record)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Visual Hierarchy §/admin/ambassadors/members/[uid] (StrikePanel renders AFTER CronFlagsPanel)
  </read_first>
  <behavior>
    - StrikePanel renders a card with heading "Strike Management", subheading "Confirmed strikes: {strikes}", and a "Confirm strike" primary button
    - Clicking "Confirm strike" opens StrikeConfirmModal
    - StrikeConfirmModal heading MUST interpolate `{displayName}` — exactly: `Confirm strike for {displayName}?`
    - StrikeConfirmModal body copy verbatim from UI-SPEC
    - Two buttons: "Yes, confirm strike" (`btn btn-error`) and "Go back" (`btn btn-ghost`)
    - "Yes, confirm strike" POSTs to `/api/ambassador/members/[uid]/strike` with adminHeaders
    - On success: closes modal, shows toast.success "Strike confirmed.", calls `onStrikeIncremented()` to refresh parent detail data
    - On error: shows `alert alert-error` in the modal with "Could not confirm strike. Try again or reload the page."
    - Submit button shows loading spinner and is disabled during the request
    - When subdoc.strikes >= 2: StrikePanel renders a banner `alert alert-warning` with UI-SPEC verbatim copy "This ambassador has reached 2 confirmed strikes. The offboarding flow will be available in the next phase." (Phase 5 handles offboarding)
    - Modal close via `Escape` key or backdrop click handled by the native `<dialog>` element
  </behavior>
  <action>
    Step 1: Create `src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx`:

    ```tsx
    "use client";

    import { useState } from "react";
    import { StrikeConfirmModal } from "./StrikeConfirmModal";

    export function StrikePanel({
      uid,
      displayName,
      strikes,
      onStrikeIncremented,
    }: {
      uid: string;
      displayName: string;
      strikes: number;
      onStrikeIncremented: () => void;
    }) {
      const [modalOpen, setModalOpen] = useState(false);

      return (
        <>
          <section className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Strike Management</h2>
              <p className="text-base-content/70">
                Confirmed strikes: <span className="font-bold">{strikes}</span>
              </p>

              {strikes >= 2 && (
                <div role="alert" className="alert alert-warning">
                  <span>
                    This ambassador has reached 2 confirmed strikes. The offboarding flow will be available in the next phase.
                  </span>
                </div>
              )}

              <div className="card-actions justify-end">
                <button
                  type="button"
                  className="btn btn-error"
                  onClick={() => setModalOpen(true)}
                >
                  Confirm strike
                </button>
              </div>
            </div>
          </section>

          {modalOpen && (
            <StrikeConfirmModal
              uid={uid}
              displayName={displayName}
              onClose={() => setModalOpen(false)}
              onConfirmed={() => {
                setModalOpen(false);
                onStrikeIncremented();
              }}
            />
          )}
        </>
      );
    }
    ```

    Step 2: Create `src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx`:

    ```tsx
    "use client";

    import { useState } from "react";
    import { authFetch } from "@/lib/apiClient";
    import { adminHeaders } from "@/lib/ambassador/adminClient";
    import { useToast } from "@/components/ToastContext";

    export function StrikeConfirmModal({
      uid,
      displayName,
      onClose,
      onConfirmed,
    }: {
      uid: string;
      displayName: string;
      onClose: () => void;
      onConfirmed: () => void;
    }) {
      const toast = useToast();
      const [submitting, setSubmitting] = useState(false);
      const [error, setError] = useState<string | null>(null);

      async function handleConfirm() {
        if (submitting) return;
        setError(null);
        setSubmitting(true);
        try {
          const res = await authFetch(`/api/ambassador/members/${uid}/strike`, {
            method: "POST",
            headers: adminHeaders(),
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          toast.success("Strike confirmed.");
          onConfirmed();
        } catch {
          setError("Could not confirm strike. Try again or reload the page.");
        } finally {
          setSubmitting(false);
        }
      }

      return (
        <dialog className="modal modal-open" aria-labelledby="strike-confirm-heading">
          <div className="modal-box">
            <h3 id="strike-confirm-heading" className="text-xl font-bold">
              Confirm strike for {displayName}?
            </h3>
            <p className="py-4">
              This records a confirmed strike against this ambassador. Strike increments are irreversible from this panel. Review the flagged reports above before confirming.
            </p>

            {error && (
              <div role="alert" className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
                disabled={submitting}
              >
                Go back
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting && <span className="loading loading-spinner loading-sm" />}
                Yes, confirm strike
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={onClose}>
            <button type="button" aria-label="Close">close</button>
          </form>
        </dialog>
      );
    }
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -E "Strike Management|Confirm strike|Confirm strike for \\$\\{displayName\\}\\?|Yes, confirm strike|Go back|reached 2 confirmed strikes|offboarding flow will be available in the next phase" src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx` exists with `"use client";`
    - `src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx` exists with `"use client";`
    - StrikePanel heading "Strike Management" verbatim
    - StrikePanel button copy "Confirm strike" verbatim
    - StrikePanel 2-strike banner copy "This ambassador has reached 2 confirmed strikes. The offboarding flow will be available in the next phase." verbatim, wrapped in `alert alert-warning`
    - StrikePanel DOES NOT call the strike endpoint itself — only opens the modal (double-confirmation guard)
    - StrikeConfirmModal heading template interpolates `{displayName}` — grep for `Confirm strike for {displayName}?` (note the literal brace + identifier in JSX)
    - StrikeConfirmModal body copy verbatim from UI-SPEC (all 3 sentences)
    - Confirm button label "Yes, confirm strike" verbatim on `btn btn-error`
    - Cancel button label "Go back" verbatim on `btn btn-ghost`
    - Modal uses `<dialog className="modal modal-open">` pattern matching DecisionDialog
    - Success path calls `toast.success("Strike confirmed.")`
    - Error state uses `alert alert-error` with "Could not confirm strike. Try again or reload the page."
    - `grep -E "roles|discord|endedAt|active:.false" src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx` returns 0 matches (no side-effect sprawl — UI only posts strike increment)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    Admin can click "Confirm strike", sees the modal with the correct ambassador's name, confirms, and the strike count updates in the parent panel. 2-strike banner appears when applicable. Phase 5 will add the offboarding action on the same page.
  </done>
</task>

<task type="auto">
  <name>Task 6: Extend AmbassadorPublicCardSection with TimezoneSelect + ReferralCodeCard + schema extension</name>
  <files>src/app/profile/AmbassadorPublicCardSection.tsx, src/types/ambassador.ts</files>
  <read_first>
    - src/app/profile/AmbassadorPublicCardSection.tsx (entire file — existing form pattern: labeled inputs, PATCH submit, success/error handling)
    - src/types/ambassador.ts (existing AmbassadorPublicFieldsSchema definition — where to add `timezone` field)
    - src/app/api/ambassador/profile/route.ts (PATCH handler that already validates via AmbassadorPublicFieldsSchema — adding `timezone` to the schema auto-extends the accepted body)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Copywriting — Timezone Setting + Referral System (verbatim copy)
    - .planning/phases/04-activity-subsystem/04-CONTEXT.md §Decisions D-04 (ambassador self-selects IANA timezone, default "UTC")
  </read_first>
  <behavior>
    - `AmbassadorPublicFieldsSchema` in `src/types/ambassador.ts` gains an optional `timezone` field: `z.string().trim().min(1).refine(isValidIanaTimezone, ...)`. Validation uses `Intl.supportedValuesOf("timeZone")` when available; otherwise falls back to a curated allowlist of common IANA tz names.
    - AmbassadorPublicCardSection form renders a new select input with label "Your timezone" and help text "Used to calculate your monthly report deadline and send reminders at the right time."
    - Select options are populated from `Intl.supportedValuesOf("timeZone")` when available; fallback to a curated list of ~30 common tz names
    - Default selected value is `subdoc.timezone ?? "UTC"`
    - When the user is not yet accepted (no subdoc), the Timezone field renders disabled with help text adjusted — OR is not rendered at all (match existing AmbassadorPublicCardSection gating)
    - Form PATCH submits to existing `/api/ambassador/profile` with `{ ...existingFields, timezone }` — no new endpoint needed
    - Below the existing fields, render a `ReferralCodeCard` section with:
      - Section heading "Your Referral Code" (`<h3 className="text-xl font-bold">`)
      - Description "Share this code to earn referral credit" below
      - If `subdoc.referralCode` present: large code chip with primary color + a "Copy code" button that copies to clipboard and shows "Copied to clipboard" feedback
      - If `subdoc.referralCode` absent (edge case — subdoc exists but code somehow missing): render empty state "Your referral code is being generated — check back shortly after acceptance is confirmed."
      - Referral link preview: "Or share this link directly" + read-only input showing `https://codewithahsan.dev/?ref={code}` (or the deployed domain — use a reasonable constant or `window.location.origin`)
    - Referral code IS NOT editable — display-only
  </behavior>
  <action>
    Step 1: In `src/types/ambassador.ts`, locate `AmbassadorPublicFieldsSchema` (existing Phase 3 schema) and add the `timezone` optional field. The schema is currently something like:

    ```typescript
    export const AmbassadorPublicFieldsSchema = z.object({
      university: z.string().trim().max(120).optional(),
      city: z.string().trim().max(120).optional(),
      publicTagline: z.string().trim().max(280).optional(),
      twitterUrl: z.string().trim().url().max(300).optional().or(z.literal("")),
      githubUrl: z.string().trim().url().max(300).optional().or(z.literal("")),
      personalSiteUrl: z.string().trim().url().max(300).optional().or(z.literal("")),
      cohortPresentationVideoUrl: z.string().trim().url().max(600).optional().or(z.literal("")),
      cohortPresentationVideoEmbedType: CohortPresentationVideoEmbedTypeSchema.optional(),
    });
    ```

    Append a `timezone` field (and add a tz-validation helper at the top of the file or in a sibling module):

    ```typescript
    /** D-04: Validate an IANA timezone string. */
    function isValidIanaTimezone(tz: string): boolean {
      try {
        // Intl.supportedValuesOf is supported in Node 18+ / modern browsers
        const supported =
          typeof Intl !== "undefined" &&
          typeof (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf === "function"
            ? (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone")
            : null;
        if (supported) return supported.includes(tz);
        // Fallback: attempt to format with this timezone; invalid tz throws a RangeError.
        new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
        return true;
      } catch {
        return false;
      }
    }

    export const AmbassadorPublicFieldsSchema = z.object({
      // ... existing fields unchanged ...
      timezone: z
        .string()
        .trim()
        .min(1)
        .refine(isValidIanaTimezone, { message: "Invalid IANA timezone" })
        .optional(),
    });
    ```

    (If `AmbassadorPublicFieldsSchema` is already defined with `.object({...})`, add the `timezone` key inside that object rather than nesting a second schema.)

    Step 2: In `src/app/profile/AmbassadorPublicCardSection.tsx`, add timezone state + select + a new ReferralCodeCard subsection at the bottom:

    ```tsx
    // At the top of component state:
    const [timezone, setTimezone] = useState<string>(subdoc?.timezone ?? "UTC");

    // Below existing fields in the form JSX (before the submit button):
    <div className="form-control">
      <label htmlFor="ambassador-timezone" className="label">
        <span className="label-text font-bold">Your timezone</span>
      </label>
      <select
        id="ambassador-timezone"
        className="select select-bordered"
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
      >
        {TIMEZONE_OPTIONS.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </select>
      <span className="label-text-alt text-base-content/60">
        Used to calculate your monthly report deadline and send reminders at the right time.
      </span>
    </div>

    // Add `timezone` to the PATCH body in the existing submit handler:
    body: JSON.stringify({ ...existingPayload, timezone }),
    ```

    Populate `TIMEZONE_OPTIONS` at module scope:

    ```tsx
    const TIMEZONE_OPTIONS: string[] = (() => {
      try {
        const supported =
          typeof Intl !== "undefined" &&
          typeof (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf === "function"
            ? (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone")
            : null;
        if (supported && supported.length > 0) return supported;
      } catch {
        /* fall through */
      }
      return [
        "UTC",
        "America/New_York",
        "America/Los_Angeles",
        "America/Chicago",
        "America/Denver",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Europe/Amsterdam",
        "Asia/Dubai",
        "Asia/Karachi",
        "Asia/Kolkata",
        "Asia/Bangkok",
        "Asia/Jakarta",
        "Asia/Singapore",
        "Asia/Hong_Kong",
        "Asia/Shanghai",
        "Asia/Tokyo",
        "Asia/Seoul",
        "Australia/Sydney",
        "Pacific/Auckland",
        "Africa/Cairo",
        "Africa/Johannesburg",
        "Africa/Lagos",
        "America/Sao_Paulo",
        "America/Mexico_City",
        "America/Toronto",
        "America/Buenos_Aires",
      ];
    })();
    ```

    Step 3: Below the existing form, add a new `<section>` for the Referral Code card (or export/import a separate `ReferralCodeCard` inline component — inline keeps the plan small):

    ```tsx
    <section className="card bg-base-100 shadow-xl">
      <div className="card-body gap-4">
        <h3 className="text-xl font-bold">Your Referral Code</h3>
        <p className="text-base-content/70">Share this code to earn referral credit</p>
        {subdoc?.referralCode ? (
          <>
            <div className="flex items-center gap-3">
              <span className="badge badge-primary badge-lg font-bold">
                {subdoc.referralCode}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(subdoc.referralCode!);
                    toast.success("Copied to clipboard");
                  } catch {
                    /* ignore — clipboard API may be blocked */
                  }
                }}
              >
                Copy code
              </button>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">Or share this link directly</span>
              </label>
              <input
                type="text"
                readOnly
                className="input input-bordered"
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${subdoc.referralCode}`}
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          </>
        ) : (
          <div className="alert alert-info">
            <span>
              Your referral code is being generated — check back shortly after acceptance is confirmed.
            </span>
          </div>
        )}
      </div>
    </section>
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -E "timezone|Your timezone|Your Referral Code|Share this code to earn referral credit|Copy code|Copied to clipboard" src/app/profile/AmbassadorPublicCardSection.tsx src/types/ambassador.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/types/ambassador.ts` `AmbassadorPublicFieldsSchema` gains an optional `timezone` field with `.refine(isValidIanaTimezone, ...)`
    - `isValidIanaTimezone` helper function exists and uses `Intl.supportedValuesOf("timeZone")` when available
    - `src/app/profile/AmbassadorPublicCardSection.tsx` contains a `<select id="ambassador-timezone">` element
    - Select label "Your timezone" present verbatim
    - Select help text "Used to calculate your monthly report deadline and send reminders at the right time." present verbatim
    - Select `value` bound to `timezone` state; `onChange` updates it
    - PATCH body includes `timezone` key
    - ReferralCodeCard heading "Your Referral Code" verbatim
    - Description "Share this code to earn referral credit" verbatim
    - Copy button label "Copy code" verbatim
    - Empty state copy "Your referral code is being generated — check back shortly after acceptance is confirmed." verbatim when no code
    - Clipboard success toast "Copied to clipboard" verbatim
    - Link preview label "Or share this link directly" verbatim
    - `grep "badge badge-primary" src/app/profile/AmbassadorPublicCardSection.tsx` returns at least 1 match (code chip styling)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    Ambassadors can select their IANA timezone on `/profile` (D-04), and they see their referral code plus a copyable share link (REF-01 display surface). PATCH schema validates timezone server-side.
  </done>
</task>

</tasks>

<verification>
Phase-level checks after all 6 tasks in Plan 05 complete:

1. **Type check passes:** `npx tsc --noEmit` exits 0.
2. **UI-SPEC copy verbatim audit (grep):**
   - `/ambassadors/report` page heading, subheading, status badge labels, 3 field labels, submit CTA, success toast — all verbatim (MonthlyReportForm is from Plan 04; this plan only assembles it)
   - `/admin/ambassadors/members` list heading, subheading, empty state — verbatim in MembersList
   - `/admin/ambassadors/members/[uid]` Activity Summary, Flagged by Automated Check, Strike Management, Report History, Logged Events, 2-strike banner, all flag item templates, all empty-state copy — verbatim
   - `/profile` timezone label, timezone help text, Your Referral Code, Share this code to earn referral credit, Copy code, Or share this link directly, empty-state code copy — verbatim
3. **Admin-only gates on new endpoints:** `grep -c requireAdmin src/app/api/ambassador/members/route.ts src/app/api/ambassador/members/[uid]/route.ts` returns ≥ 2.
4. **displayName appears in strike modal heading:** `grep "Confirm strike for {displayName}" src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx` returns a match.
5. **Strike flow composition:** MemberDetailClient.tsx renders `CronFlagsPanel` (evidence) BEFORE `StrikePanel` (action) in JSX. Visual Hierarchy compliance.
6. **No raw hex colors in any new UI file:** `grep -RE "#[0-9a-fA-F]{3,6}" src/app/ambassadors/report/*.tsx src/app/admin/ambassadors/members/ --include="*.tsx"` returns 0 lines (beyond those already present in unchanged files).
7. **Schema extension doesn't break existing PATCH:** `/api/ambassador/profile` PATCH accepts `{ timezone }` in body and persists to subdoc; manual smoke: POST with timezone value, re-fetch subdoc, observe field present.
8. **No new runtime dependencies:** `git diff package.json` shows no new dependencies added.
9. **Every new client component file starts with "use client";** — `grep -L '^"use client";' src/app/admin/ambassadors/members/MembersList.tsx src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx src/app/admin/ambassadors/members/[uid]/CronFlagsPanel.tsx src/app/ambassadors/report/ReportPageClient.tsx` returns zero files.
10. **Admin gate on member pages inherited from existing admin layout:** Confirm existing admin layout file (`src/app/admin/layout.tsx` or similar) guards `/admin/**` routes — no new auth gate needed at the page level. Note in SUMMARY.md.
</verification>

<success_criteria>
- `/ambassadors/report` renders the full Phase 4 ambassador experience: MonthlyReportForm, ReportStatusBadge (inline with heading), LogEventForm, EventList — in that vertical order (UI-SPEC compliant).
- `/admin/ambassadors/members` lists all active ambassadors with quick visual indicators for strikes and flags.
- `/admin/ambassadors/members/[uid]` renders the full activity picture: stats grid → cron flags (evidence) → StrikePanel (action) → Report History → Logged Events.
- StrikeConfirmModal correctly interpolates the ambassador's displayName into its heading (UI-SPEC accessibility requirement — prevents wrong-record confirmations).
- `/profile` gains a TimezoneSelect bound to the PATCH schema (D-04) and a ReferralCodeCard displaying the subdoc.referralCode with Copy button (REF-01 visible surface).
- Two admin-scope GET endpoints (`/api/ambassador/members`, `/api/ambassador/members/[uid]`) are admin-gated, feature-flag-gated, and return JSON-safe payloads.
- AmbassadorPublicFieldsSchema extension validates timezone strings via `Intl.supportedValuesOf("timeZone")` — no injection of arbitrary strings.
- All UI copy strings match UI-SPEC verbatim (grep audit passes).
- No new runtime dependencies introduced; `npx tsc --noEmit` exits 0.
</success_criteria>

<output>
After completion, create `.planning/phases/04-activity-subsystem/04-05-SUMMARY.md` documenting:
- The 4 pages created (1 ambassador, 3 admin) and their vertical composition per UI-SPEC
- The 7 new components + their responsibilities (MembersList, MemberDetailClient, ActivitySummaryPanel, StrikePanel, StrikeConfirmModal, CronFlagsPanel, ReportPageClient)
- The 2 new admin-scope GET endpoints (list + detail bundle)
- The 2 AmbassadorPublicCardSection extensions (TimezoneSelect, ReferralCodeCard)
- The AmbassadorPublicFieldsSchema `timezone` extension with Intl-based validation
- Note that admin auth at the page level is inherited from the existing `/admin/**` layout gate — no new page-level auth code introduced
- Note that offboarding (REPORT-07 full scope) is deferred to Phase 5 — Phase 4 only surfaces the 2-strike warning banner
</output>
