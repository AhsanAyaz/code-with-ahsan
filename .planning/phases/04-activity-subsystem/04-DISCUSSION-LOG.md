# Phase 4: Activity Subsystem - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 04-activity-subsystem
**Areas discussed:** Report form location, Event types, Referral cookie placement, Timezone source, Strike admin surface

---

## Report Form Location

| Option | Description | Selected |
|--------|-------------|----------|
| A — Standalone `/ambassadors/report` | Standalone page in Phase 4; Phase 5 links from dashboard | ✓ |
| B — Stub dashboard | Minimal `/ambassadors/dashboard` with just form + status badge now | |
| C — Profile page section | Add form to `/profile` alongside Public Card editor | |

**User's choice:** A — Standalone page
**Notes:** Phase 5 will link to it and add the status badge / next-due-date view.

---

## Event Types

| Option | Description | Selected |
|--------|-------------|----------|
| A — Fixed enum | Workshop, Blog post, Talk/Webinar, Community stream, Study group, Other | ✓ |
| B — Free text | Ambassador types any string | |

**User's choice:** A — Fixed enum
**Notes:** Enables clean per-category counts for Phase 5 leaderboard.

---

## Referral Cookie Placement

| Option | Description | Selected |
|--------|-------------|----------|
| A — Next.js middleware | Server-side, catches all routes including post-OAuth landings | ✓ |
| B — Client-side component | `<ReferralTracker />` on homepage only; may miss OAuth redirect flows | |

**User's choice:** A — Middleware
**Notes:** No middleware currently exists in the codebase; new `src/middleware.ts` needed.

---

## Timezone Source for Report Reminders

| Option | Description | Selected |
|--------|-------------|----------|
| A — Ambassador self-selects | Dropdown on `/profile`, stored on subdoc | ✓ |
| B — Fixed UTC default | All reminders at fixed UTC time; simpler but imprecise | |
| C — Derived from application data | Infer from country/city; fragile | |

**User's choice:** A — Self-selected
**Notes:** IANA timezone string stored as `timezone` on ambassador subdoc. Default `"UTC"` when absent.

---

## Strike Admin Surface

| Option | Description | Selected |
|--------|-------------|----------|
| A — New `/admin/ambassadors/members/[uid]` page | Dedicated active-member management page | ✓ |
| B — Extend application detail page | Add tab/section to existing `/admin/ambassadors/[applicationId]` | |

**User's choice:** A — New page
**Notes:** Separates "application review" from "ongoing member management". Phase 5 adds the offboarding trigger to this same page.

---

## Claude's Discretion

- Referral code generation algorithm and collision handling
- Monthly deadline boundary definition
- Cron schedule times
- Event and report Firestore collection paths

## Deferred Ideas

- Click tracking redirect endpoint (FUTURE-REF-01)
- Aggregate click → signup funnel (FUTURE-REF-02)
- Automated 1-strike warning email (FUTURE-REPORT-01)
- Phase 5 offboarding trigger (REPORT-07)
