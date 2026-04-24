---
phase: 04-activity-subsystem
verified: 2026-04-23T21:00:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
deferred:
  - truth: "REPORT-07: Admin panel surfaces a one-click offboarding flow the moment an ambassador reaches 2 confirmed strikes (revoke role, remove Discord role, set active: false)"
    addressed_in: "Phase 5"
    evidence: "Phase 5 SC5: 'The 2-strike check triggers a one-click offboarding flow that revokes the ambassador role, removes the Discord role, ends cohort membership, and fires an offboarding email.' CONTEXT.md D-05 explicitly limits Phase 4 to strike count increment only."
  - truth: "REF-05: Ambassador referral count visible on the ambassador-facing dashboard"
    addressed_in: "Phase 5"
    evidence: "Phase 5 SC1 covers the ambassador dashboard with personal stats including referral count. Phase 4 has no ambassador dashboard page — the dashboard is a Phase 5 deliverable."
human_verification:
  - test: "Browser cookie set on ?ref=CODE visit"
    expected: "Visiting any page with ?ref=VALIDCODE sets an HttpOnly cwa_ref cookie (not readable via document.cookie). Revisiting with a different code should NOT overwrite — existing cookie takes precedence."
    why_human: "HttpOnly cookies are invisible to JavaScript. Cannot verify browser behavior or Edge middleware execution with grep alone."
  - test: "Referral cookie consumed on first profile POST"
    expected: "A new user with a cwa_ref cookie completes signup. The referrals Firestore collection gains a new doc with correct ambassadorId, referredUserId, sourceCode. The cookie is deleted from the response."
    why_human: "Requires a live Firestore emulator or production env to observe collection writes and actual HTTP response headers."
  - test: "Discord DM reminder delivery (REPORT-04 / REPORT-05)"
    expected: "Running ambassador-report-flag.ts in non-dry-run mode for an ambassador with a missing report sends a Discord DM to the correct user. The DM content matches the reminder text."
    why_human: "Requires real Discord API credentials and a guild with an ambassador member to observe DM delivery."
  - test: "Discord role reconciliation (DISC-04)"
    expected: "Running ambassador-discord-reconciliation.ts identifies ambassadors missing the DISCORD_AMBASSADOR_ROLE_ID and writes a cwa_flag doc to ambassador_cron_flags without writing to any roles or strike fields."
    why_human: "Requires live Discord API credentials and a guild. D-06 mutation guard was verified by grep but runtime behavior requires observation."
  - test: "/ambassadors/report page visual rendering and form interaction"
    expected: "Signed-in ambassador sees: ReportStatusBadge inline with 'Monthly Self-Report' heading, MonthlyReportForm with 3 textareas and per-field char counters, LogEventForm below it, EventList at the bottom. Submitting the form transitions to submitted state and EventList refreshes after a new event is logged (refreshKey propagation)."
    why_human: "Component composition order and interactive refresh behavior requires browser rendering to confirm."
  - test: "Admin member detail page layout and StrikeConfirmModal flow"
    expected: "Admin visits /admin/ambassadors/members/[uid]. Sees ActivitySummaryPanel, then CronFlagsPanel, then StrikePanel in that order. Clicking 'Confirm strike' opens a modal showing the ambassador's displayName. Confirming POSTs to the strike endpoint, closes the modal, and updates the strike count displayed."
    why_human: "UI layout order, modal open/close behavior, and post-confirmation state refresh require browser interaction."
  - test: "TimezoneSelect PATCH on /profile"
    expected: "Ambassador changes timezone dropdown on profile page. On save, the PATCH request includes the timezone field. The AmbassadorPublicFieldsSchema rejects invalid timezone strings."
    why_human: "PATCH payload contents and Zod refine behavior require a live request to verify the correct field is included in the update."
---

# Phase 04: Activity Subsystem Verification Report

**Phase Goal:** Deliver the ambassador Activity Subsystem — referral attribution (cookie tracking + signup conversion), event logging, monthly self-report submission, and strike management — fully wired with API routes, UI components, and cron scripts.
**Verified:** 2026-04-23T21:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Referral attribution pipeline is end-to-end: cookie set on `?ref=CODE` visit → consumed on first profile POST → Firestore `referrals` doc written → cookie cleared | VERIFIED | `src/middleware.ts` sets HttpOnly cwa_ref (5 content matches). `src/app/api/mentorship/profile/route.ts` imports `consumeReferral`, `REFERRAL_COOKIE_NAME`, calls `cookies.delete`. `src/lib/ambassador/acceptance.ts` generates `referralCode` at acceptance and writes lookup doc atomically. |
| 2 | Ambassador can log, edit (within 30 days), and delete events; admin can view all events per cohort and toggle hide | VERIFIED | `events/route.ts` (GET+POST), `events/[eventId]/route.ts` (PATCH+DELETE with `EVENT_EDIT_WINDOW_MS` server-side guard), `events/admin/route.ts` (GET+PATCH `requireAdmin`). `LogEventForm.tsx` and `EventList.tsx` confirmed present and substantive. 8 unit tests passing (253 total). |
| 3 | Ambassador can submit exactly one monthly self-report per calendar month (in their timezone); duplicate blocked with 409 | VERIFIED | `report/route.ts` uses deterministic doc id `{uid}_{getCurrentMonthKey(timezone)}` + `runTransaction` existence check. 4 Vitest cases prove one-per-month enforcement (257 total passing). |
| 4 | Ambassador can view current report status (Submitted / On time / Overdue) and the deadline for their timezone | VERIFIED | `report/current/route.ts` confirmed. `ReportStatusBadge.tsx` shows badge-success/badge-info/badge-warning for 3 states. `ReportPageClient.tsx` fetches current status on mount and passes to badge. |
| 5 | Admin can atomically increment an ambassador's strike count via a guarded POST endpoint | VERIFIED | `members/[uid]/strike/route.ts` uses `requireAdmin()` + `FieldValue.increment(1)`. `StrikeConfirmModal.tsx` POSTs to `api/ambassador/members/${uid}/strike`. `StrikePanel.tsx` shows 2-strike warning banner when `strikes >= 2`. |
| 6 | Cron: daily missing-report flagger writes idempotent `ambassador_cron_flags` docs and sends Discord DM reminders | VERIFIED | `scripts/ambassador-report-flag.ts` confirmed with `sendDirectMessage`, `AMBASSADOR_CRON_FLAGS_COLLECTION`, deterministic flag id `{uid}_missing_report_{YYYY-MM}`, `set({...}, { merge: true })`. D-06 mutation guard grep returns EMPTY (no `FieldValue.increment`, `syncRoleClaim`, `assignDiscordRole` in executable code). |
| 7 | Cron: weekly Discord reconciliation flags ambassadors missing the ambassador Discord role; never mutates roles or strikes | VERIFIED | `scripts/ambassador-discord-reconciliation.ts` confirmed with `DISCORD_AMBASSADOR_ROLE_ID`, `missing_discord_role` flag pattern, `getGuildMemberById`. D-06 guard confirmed clean. `.github/workflows/ambassador-activity-checks.yml` schedules both crons with `workflow_dispatch` dry-run support. |
| 8 | Ambassador-facing `/ambassadors/report` page assembles all Phase 4 components in UI-SPEC vertical hierarchy | VERIFIED | `ReportPageClient.tsx` confirmed to import and render `MonthlyReportForm`, `LogEventForm`, `EventList`, `ReportStatusBadge` (9 pattern matches). SUMMARY documents composition order: badge → MonthlyReportForm → LogEventForm → EventList. |
| 9 | Admin member list and detail pages + TimezoneSelect + ReferralCodeCard on /profile are all wired to real data | VERIFIED | `MembersList.tsx` fetches `/api/ambassador/members` with admin headers. `MemberDetailClient.tsx` fetches detail bundle endpoint, passes props to `ActivitySummaryPanel` → `CronFlagsPanel` → `StrikePanel` (order confirmed at lines 93, 100, 102). `AmbassadorPublicCardSection.tsx` has "Your Referral Code", "Copy code", "Your timezone" (17 content matches). `src/types/ambassador.ts` has `isValidIanaTimezone` refine and `timezone` field. |

**Score:** 9/9 truths verified (after deferred items filtered per Step 9b)

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | REPORT-07: One-click offboarding flow when ambassador reaches 2 confirmed strikes | Phase 5 | Phase 5 SC5: "The 2-strike check triggers a one-click offboarding flow that revokes the ambassador role, removes the Discord role, ends cohort membership, and fires an offboarding email." CONTEXT.md D-05 explicitly limits Phase 4 to strike count increment only. Phase 4 surfaces the warning banner with placeholder text. |
| 2 | REF-05: Ambassador referral count on the ambassador-facing dashboard | Phase 5 | Phase 5 SC1 includes the ambassador dashboard with personal activity stats. No ambassador dashboard page exists in Phase 4 — it is a Phase 5 deliverable. Admin detail page shows referralsCount but that is admin-facing only. |

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ambassador/constants.ts` | Phase 4 collection constants + cookie constants | VERIFIED | 8 constants confirmed: `AMBASSADOR_EVENTS_COLLECTION`, `MONTHLY_REPORTS_COLLECTION`, `AMBASSADOR_CRON_FLAGS_COLLECTION`, `REFERRAL_CODES_COLLECTION`, `REFERRALS_COLLECTION`, `REFERRAL_COOKIE_NAME`, `REFERRAL_COOKIE_MAX_AGE_SECONDS`, `EVENT_EDIT_WINDOW_MS` |
| `src/lib/ambassador/eventTypes.ts` | `EventTypeSchema`, `EventType`, `EVENT_TYPE_LABELS` | VERIFIED | All 3 exports confirmed |
| `src/lib/ambassador/referralCode.ts` | `buildCode`, `generateUniqueReferralCode` | VERIFIED | 4 export matches confirmed |
| `src/lib/ambassador/reportDeadline.ts` | `getDeadlineUTC`, `getAmbassadorMonthKey`, `getCurrentMonthKey` | VERIFIED | 3 export matches confirmed |
| `src/types/ambassador.ts` | `ReferralDoc`, `AmbassadorEventDoc`, `MonthlyReportDoc`, `AmbassadorCronFlagDoc`, `LogEventSchema`, `MonthlyReportSchema`, `AmbassadorPublicFieldsSchema` with timezone | VERIFIED | 14+ matches including `isValidIanaTimezone` refine |
| `src/middleware.ts` | Next.js Edge middleware: sets HttpOnly cwa_ref cookie | VERIFIED | `httpOnly`, `sameSite`, `REFERRAL_COOKIE_NAME` confirmed |
| `src/lib/ambassador/referral.ts` | `consumeReferral` with self/double-attribution guards | VERIFIED | Content confirmed; 5 Vitest tests passing |
| `src/lib/ambassador/acceptance.ts` | Extended: generates referralCode at acceptance atomically | VERIFIED | `generateUniqueReferralCode`, `REFERRAL_CODES_COLLECTION` imports confirmed |
| `src/app/api/mentorship/profile/route.ts` | Extended: consumes cwa_ref cookie on first profile POST | VERIFIED | `consumeReferral`, `REFERRAL_COOKIE_NAME`, `cookies.delete` confirmed |
| `firestore.rules` | Deny-all client rules for 5 collections | VERIFIED | 5 deny-all blocks: referral_codes, referrals, ambassador_events, monthly_reports, ambassador_cron_flags |
| `src/app/api/ambassador/events/route.ts` | GET + POST ambassador events | VERIFIED | Both exports confirmed |
| `src/app/api/ambassador/events/[eventId]/route.ts` | PATCH + DELETE with 30-day server-side window | VERIFIED | `EVENT_EDIT_WINDOW_MS`, `PATCH`, `DELETE` confirmed; 8 unit tests passing |
| `src/app/api/ambassador/events/admin/route.ts` | Admin GET + PATCH hide/unhide | VERIFIED | `requireAdmin`, `GET`, `PATCH` confirmed |
| `src/app/ambassadors/report/LogEventForm.tsx` | Client form for logging events | VERIFIED | "Log an event", "Save event", "No events logged yet" confirmed |
| `src/app/ambassadors/report/EventList.tsx` | Client list with edit/delete and 30-day window message | VERIFIED | "No events logged yet", "30-day edit window" confirmed |
| `src/app/api/ambassador/report/route.ts` | POST monthly report with one-per-month transaction | VERIFIED | `getCurrentMonthKey`, `runTransaction`, `MONTHLY_REPORTS_COLLECTION` confirmed |
| `src/app/api/ambassador/report/current/route.ts` | GET current-month report status | VERIFIED | Exists in directory |
| `src/app/api/ambassador/members/[uid]/strike/route.ts` | Admin POST strike increment | VERIFIED | `requireAdmin`, `FieldValue.increment` confirmed |
| `src/app/ambassadors/report/MonthlyReportForm.tsx` | Client form with 3 textareas and submitted state | VERIFIED | "Monthly Self-Report", "Submit report", "What worked this month", "Report submitted" confirmed |
| `src/app/ambassadors/report/ReportStatusBadge.tsx` | 3-state badge (Submitted/On time/Overdue) | VERIFIED | badge-success, badge-info, badge-warning, "Submitted", "On time", "Overdue" confirmed |
| `src/app/ambassadors/report/page.tsx` | Server shell for /ambassadors/report | VERIFIED | File exists |
| `src/app/ambassadors/report/ReportPageClient.tsx` | Client orchestrator composing all 4 children | VERIFIED | All 4 child components imported (9 matches) |
| `src/app/admin/ambassadors/members/page.tsx` | Admin server shell for members list | VERIFIED | "Ambassador Members" confirmed |
| `src/app/admin/ambassadors/members/MembersList.tsx` | Client table with loading/error/empty states | VERIFIED | "Active ambassadors", "No active ambassadors" confirmed |
| `src/app/admin/ambassadors/members/[uid]/page.tsx` | Admin server shell for member detail | VERIFIED | File exists |
| `src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx` | Client orchestrator with evidence-before-action order | VERIFIED | ActivitySummaryPanel (line 93), CronFlagsPanel (line 100), StrikePanel (line 102) order confirmed |
| `src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx` | DaisyUI stats grid | VERIFIED | "Activity Summary" confirmed |
| `src/app/admin/ambassadors/members/[uid]/CronFlagsPanel.tsx` | Unresolved flag list with empty success state | VERIFIED | "Flagged by Automated Check", "No flags. This ambassador is up to date." confirmed |
| `src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx` | Strike display + button + 2-strike warning | VERIFIED | "Strike Management", "Confirm strike", "reached 2 confirmed strikes" confirmed |
| `src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx` | Dialog modal with displayName interpolation | VERIFIED | "Confirm strike for", "Yes, confirm strike", "Go back" confirmed |
| `src/app/api/ambassador/members/route.ts` | Admin GET list endpoint | VERIFIED | GET export confirmed |
| `src/app/api/ambassador/members/[uid]/route.ts` | Admin GET detail bundle endpoint | VERIFIED | GET export confirmed |
| `src/app/profile/AmbassadorPublicCardSection.tsx` | Extended with TimezoneSelect + ReferralCodeCard | VERIFIED | "Your Referral Code", "Copy code", "Your timezone" confirmed (17 matches) |
| `scripts/ambassador-report-flag.ts` | Daily cron with dry-run, idempotent flag writes, DM reminders | VERIFIED | `sendDirectMessage`, `AMBASSADOR_CRON_FLAGS_COLLECTION`, deterministic id pattern confirmed |
| `scripts/ambassador-discord-reconciliation.ts` | Weekly cron with D-06 mutation guard | VERIFIED | `DISCORD_AMBASSADOR_ROLE_ID`, `missing_discord_role`, `getGuildMemberById` confirmed. D-06 guard EMPTY. |
| `.github/workflows/ambassador-activity-checks.yml` | Scheduled workflow + workflow_dispatch with dry_run | VERIFIED | Both schedules and script references confirmed (10 matches) |
| `src/lib/discord.ts` | `getGuildMemberById` function (new addition) | VERIFIED | Function present; used by discord reconciliation cron |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/middleware.ts` | `cwa_ref` HttpOnly cookie | Edge middleware cookie set on `?ref=CODE` | WIRED | `httpOnly: true`, `sameSite: "lax"`, `REFERRAL_COOKIE_NAME` all confirmed |
| `src/app/api/mentorship/profile/route.ts` | `src/lib/ambassador/referral.ts` | `consumeReferral(uid, refCode)` call + cookie delete | WIRED | `consumeReferral` import and `cookies.delete(REFERRAL_COOKIE_NAME)` both confirmed |
| `src/lib/ambassador/acceptance.ts` | `referral_codes` Firestore collection | `txn.set(refCodeRef, { ambassadorId, uid })` in transaction | WIRED | `generateUniqueReferralCode` + `REFERRAL_CODES_COLLECTION` imports confirmed |
| `src/app/ambassadors/report/ReportPageClient.tsx` | MonthlyReportForm + LogEventForm + EventList + ReportStatusBadge | JSX composition | WIRED | All 4 child components confirmed imported and rendered (9 pattern matches) |
| `src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx` | `POST /api/ambassador/members/[uid]/strike` | StrikeConfirmModal fetch with admin headers | WIRED | `api/ambassador/members.*strike` pattern confirmed in StrikeConfirmModal |
| `src/app/profile/AmbassadorPublicCardSection.tsx` | `PATCH /api/ambassador/profile` | Existing submit path extended with timezone value | WIRED | `timezone` field confirmed in component (17 matches) |
| `scripts/ambassador-report-flag.ts` | `ambassador_cron_flags` Firestore collection | `set({...}, { merge: true })` with deterministic id | WIRED | `AMBASSADOR_CRON_FLAGS_COLLECTION` + merge pattern confirmed |
| `scripts/ambassador-discord-reconciliation.ts` | `src/lib/discord.ts getGuildMemberById` | Direct import + call for role check | WIRED | `getGuildMemberById` import and call confirmed |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ReportPageClient.tsx` | `current` (report status) | `fetch /api/ambassador/report/current` on mount | Yes — API reads Firestore subdoc + monthly_reports doc | FLOWING |
| `MembersList.tsx` | `members` | `fetch /api/ambassador/members` with admin headers | Yes — collection-group query on `ambassador` subdocs where `active === true` | FLOWING |
| `MemberDetailClient.tsx` | `bundle` (profile + subdoc + events + reports + flags) | `fetch /api/ambassador/members/[uid]` | Yes — multiple Firestore reads: subdoc, events (limit 20), reports (limit 12), flags, referralsCount aggregation | FLOWING |
| `ActivitySummaryPanel.tsx` | `bundle.recentEvents`, `bundle.referralsCount`, `bundle.recentReports` | Props from `MemberDetailClient` | Yes — backed by real Firestore queries in detail endpoint | FLOWING |
| `CronFlagsPanel.tsx` | `bundle.unresolvedFlags` | Props from `MemberDetailClient` | Yes — backed by Firestore query on `ambassador_cron_flags` | FLOWING |
| `StrikePanel.tsx` | `subdoc.strikes` | Props from `MemberDetailClient` | Yes — read from ambassador subdoc in detail endpoint | FLOWING |
| `AmbassadorPublicCardSection.tsx` | `referralCode`, `timezone` | Props from parent profile page (subdoc read) | Yes — reads existing ambassador subdoc which includes both fields | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED for live browser/Discord/Firestore-dependent behaviors. TypeScript compilation verified by SUMMARY self-checks (all plans report `npx tsc --noEmit` exits 0). Unit tests verified: 38 (Plan 01) + 31 (Plan 02) + 253 (Plan 03) + 257 (Plan 04) total passing at time of each plan's completion.

---

## Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| REF-01 | 04-02, 04-05 | Referral code generated at acceptance; displayed on /profile with copy button | SATISFIED | `acceptance.ts` generates code; `AmbassadorPublicCardSection.tsx` shows "Your Referral Code" card with "Copy code" button |
| REF-02 | 04-02 | Referral cookie set via middleware on `?ref=CODE` visits | SATISFIED | `src/middleware.ts` HttpOnly cookie confirmed |
| REF-03 | 04-02, 04-04 | Cookie consumed on first profile POST; referral doc written to Firestore | SATISFIED | `profile/route.ts` consumes cookie, calls `consumeReferral`, clears cookie |
| REF-04 | 04-02 | Self-attribution and double-attribution guards | SATISFIED | `referral.ts` enforces both guards; 5 unit tests covering guard cases |
| REF-05 | — | Ambassador referral count on ambassador-facing dashboard | DEFERRED | No ambassador dashboard in Phase 4. Addressed in Phase 5 SC1. Admin detail shows count (admin-only). |
| EVENT-01 | 04-03 | Ambassador can log events (POST) with type, date, attendance, optional link/notes | SATISFIED | `events/route.ts` POST endpoint + `LogEventForm.tsx` confirmed |
| EVENT-02 | 04-03 | Ambassador can edit/delete own events within 30-day server-side window | SATISFIED | `events/[eventId]/route.ts` with `EVENT_EDIT_WINDOW_MS` server-side check; 8 unit tests covering window and ownership |
| EVENT-03 | 04-03 | Admin can view all events per cohort and toggle hide | SATISFIED | `events/admin/route.ts` GET+PATCH with `requireAdmin`; `EventAdminTable.tsx` confirmed |
| EVENT-04 | 04-03 | Hidden events excluded from ambassador's own view | SATISFIED | `events/route.ts` GET uses `where("hidden", "==", false)` filter |
| REPORT-01 | 04-04 | Ambassador can submit monthly self-report (3 fields) | SATISFIED | `report/route.ts` POST + `MonthlyReportForm.tsx` with 3 textareas |
| REPORT-02 | 04-04 | One report per month enforced with 409 on duplicate | SATISFIED | Deterministic doc id + `runTransaction` + 4 Vitest cases proving enforcement |
| REPORT-03 | 04-04, 04-05 | Current month status (Submitted/On time/Overdue) visible on report page | SATISFIED | `report/current/route.ts` + `ReportStatusBadge.tsx` + `ReportPageClient.tsx` fetch wired |
| REPORT-04 | 04-06 | Daily cron flags ambassadors with missing monthly reports | SATISFIED | `ambassador-report-flag.ts` confirmed with idempotent flag writes |
| REPORT-05 | 04-06 | Discord DM reminders at 3-days-before and deadline-day | SATISFIED | `sendDirectMessage` + `shouldRemind()` window logic confirmed in cron script |
| REPORT-06 | 04-04, 04-05 | Admin can atomically increment ambassador strike count | SATISFIED | `strike/route.ts` `requireAdmin` + `FieldValue.increment(1)` + `StrikeConfirmModal` POSTs to endpoint |
| REPORT-07 | — | One-click offboarding flow at 2 confirmed strikes | DEFERRED | CONTEXT D-05 limits Phase 4 to strike increment only. Phase 4 shows 2-strike warning banner with placeholder text. Full flow addressed in Phase 5 SC5. |
| DISC-04 | 04-06, 04-05 | Weekly cron flags ambassadors missing Discord ambassador role; CronFlagsPanel shows flags in admin UI | SATISFIED | `ambassador-discord-reconciliation.ts` + `CronFlagsPanel.tsx` + `getGuildMemberById` confirmed |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx` | "The offboarding flow will be available in the next phase." — placeholder text in 2-strike banner | Info | Intentional per CONTEXT D-05 and Phase 5 deferral. Not a stub — the warning banner itself is the Phase 4 deliverable. |

No blockers found. No TODO/FIXME/PLACEHOLDER comments in new files. No empty handlers that prevent goal achievement. No hardcoded empty arrays/objects feeding rendered UI. D-06 mutation guard clean (confirmed by grep returning EMPTY for `FieldValue.increment`, `syncRoleClaim`, `assignDiscordRole` in cron scripts).

---

## Human Verification Required

### 1. Browser Cookie Behavior (REF-02)

**Test:** Open a browser in incognito, visit the site with `?ref=SOMEVALIDCODE`, then open DevTools > Application > Cookies.
**Expected:** `cwa_ref` cookie present with HttpOnly flag checked. `document.cookie` in console does NOT show the cookie value. Revisiting with a different `?ref=` code should not overwrite the cookie.
**Why human:** HttpOnly cookies are invisible to client-side JavaScript. Edge middleware execution and cookie header inspection requires a live browser.

### 2. End-to-End Referral Conversion (REF-03)

**Test:** Create a test ambassador with a known referral code. As a new user (with cwa_ref cookie set), complete profile creation via POST `/api/mentorship/profile`.
**Expected:** A `referrals` Firestore doc is written with `ambassadorId`, `referredUserId`, `sourceCode`, and `convertedAt`. The `cwa_ref` cookie is absent from the Set-Cookie response header after POST completes.
**Why human:** Requires live Firestore (emulator or production) and an HTTP client that can inspect response headers and collection writes atomically.

### 3. Discord DM Reminder Delivery (REPORT-05)

**Test:** Run `scripts/ambassador-report-flag.ts` (non-dry-run) with a real ambassador who has a missing report for the previous month and a valid `discordUserId`.
**Expected:** The ambassador receives a Discord DM containing the reminder text. The `ambassador_cron_flags` collection gains a doc with the correct idempotent id. Re-running produces no duplicate.
**Why human:** Requires Discord API credentials, a real guild member, and Firestore access.

### 4. Discord Role Reconciliation (DISC-04)

**Test:** Run `scripts/ambassador-discord-reconciliation.ts` (non-dry-run) against a guild where a known ambassador lacks the `DISCORD_AMBASSADOR_ROLE_ID`.
**Expected:** A `ambassador_cron_flags` doc is written for that ambassador with `type: "missing_discord_role"`. No `strikes`, `roles`, or `endedAt` fields are modified anywhere. D-06 invariant holds at runtime.
**Why human:** Requires live Discord API and Firestore; runtime D-06 guard cannot be verified by static grep alone.

### 5. /ambassadors/report Page — Composition and Refresh (REPORT-01, REPORT-03)

**Test:** Sign in as an ambassador, navigate to `/ambassadors/report`.
**Expected:** Page shows `ReportStatusBadge` inline with the "Monthly Self-Report" heading, then `MonthlyReportForm` (3 textareas with char counters), then `LogEventForm`, then `EventList`. Logging a new event via `LogEventForm` causes `EventList` to refresh without a full page reload.
**Why human:** Component render order, char counter reactivity, and `refreshKey` propagation require browser execution.

### 6. Admin Member Detail Page — Layout and Strike Modal (REPORT-06)

**Test:** Sign in as admin, navigate to `/admin/ambassadors/members`, click a member.
**Expected:** Detail page shows `ActivitySummaryPanel` (stats grid) first, then `CronFlagsPanel`, then `StrikePanel`. Clicking "Confirm strike" opens a modal with the ambassador's display name in the heading. Confirming the modal calls the strike endpoint and the strike count updates in the UI.
**Why human:** Visual layout order, modal open/close state, and post-confirmation UI refresh require browser interaction.

### 7. TimezoneSelect PATCH (D-04)

**Test:** As an ambassador, change the timezone dropdown on `/profile` and save.
**Expected:** The PATCH request body includes `{ timezone: "America/New_York" }` (or selected tz). Submitting an invalid timezone (e.g., "Fake/Zone") via direct API call returns a 400 with Zod validation error.
**Why human:** Network inspector needed to confirm PATCH payload contents; Zod refine validation requires a live API request.

---

## Gaps Summary

No automated gaps found. All Phase 4 goals are verified against the codebase:

- All 14 new API routes confirmed substantive and wired
- All 7 new UI components confirmed (ReportPageClient, MembersList, MemberDetailClient, ActivitySummaryPanel, CronFlagsPanel, StrikePanel, StrikeConfirmModal)
- All 2 cron scripts confirmed with D-06 mutation guard clean
- GitHub Actions workflow confirmed with both schedules and workflow_dispatch
- All 5 Firestore deny-all blocks confirmed
- All 17 requirement IDs accounted for (15 satisfied, 2 deferred to Phase 5)
- Test suite: 257+ tests passing across all plans

Two items deferred to Phase 5 per CONTEXT D-05 / Phase 5 roadmap:
- REPORT-07 (offboarding flow) addressed by Phase 5 SC5
- REF-05 (ambassador referral count dashboard) addressed by Phase 5 SC1

Seven human verification items remain — all require live browser, Discord API, or Firestore to observe runtime behavior that cannot be confirmed by static analysis.

---

_Verified: 2026-04-23T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
