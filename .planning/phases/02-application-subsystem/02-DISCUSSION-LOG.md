# Phase 2: Application Subsystem - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 02-application-subsystem
**Areas discussed:** Application form layout, Video submission UX, Admin review panel navigation, Academic email validation UX

---

## Application Form Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-step wizard | 3–4 steps with progress bar. Groups: (1) Personal info, (2) Prompts + Discord, (3) Video upload, (4) Review + submit. | ✓ |
| Single long page | All fields on one page, matches existing MentorRegistrationForm.tsx pattern. | |
| Two-part split | Part 1: eligibility check; Part 2: full application. | |

**User's choice:** Multi-step wizard

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3 prompts (as per spec) | Motivation, relevant experience, pitch for what they'd do as ambassador. | ✓ |
| 2 prompts (shorter) | Drop one prompt to reduce friction. | |
| You decide | Claude picks. | |

**User's choice:** 3 prompts as per spec

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — check Discord age upfront | Step 0/pre-screen: verify ≥N days before rendering wizard. | ✓ |
| No — validate on submit | Show form, reject at submission if ineligible. | |

**User's choice:** Pre-screen Discord age upfront
**Notes:** User questioned whether 30-day threshold is too high ("a lot of folks don't use Discord at all"). Decided to make threshold a named constant `AMBASSADOR_DISCORD_MIN_AGE_DAYS` and surface the 7-days-vs-30-days decision explicitly in the plan for intentional setting before launch.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown of open cohorts | Only shows cohorts with status='upcoming' and open window. | ✓ |
| Auto-assigned | Assign to current active cohort automatically. | |
| You decide | Claude picks. | |

**User's choice:** Dropdown of open cohorts

---

## Video Submission UX

| Option | Description | Selected |
|--------|-------------|----------|
| Both: upload OR external link | Tabbed UI for Firebase Storage upload or Loom/YouTube URL. | |
| Upload only | Firebase Storage only. | |
| External link only | URL field only (Loom / YouTube). | ✓ |

**User's choice:** External link only
**Notes:** Simplifies implementation significantly — no resumable upload UI, no signed URL generation. Admin review embeds the link directly.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Embedded player | Embed Loom/YouTube in an iframe on review page. react-lite-youtube-embed exists for YouTube. | ✓ |
| Open in new tab | Link button — admin opens in new tab. | |

**User's choice:** Embedded player

---

| Option | Description | Selected |
|--------|-------------|----------|
| Format check only | Regex validate recognized URL pattern; don't fetch. | ✓ |
| Accessibility check | Server-side HEAD/fetch to verify reachable. | |

**User's choice:** Format check only
**Notes:** User added Google Drive as a supported platform alongside Loom and YouTube.

---

## Admin Review Panel Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| List → dedicated detail page | /admin/ambassadors/[applicationId] — first admin detail-page pattern. | ✓ |
| List + slide-over drawer | Right-side panel, list stays visible. | |
| List with inline expand | Row expands below. | |

**User's choice:** List → dedicated detail page

---

| Option | Description | Selected |
|--------|-------------|----------|
| Name + university + cohort + status + submitted date | Full triage context. | ✓ |
| Name + status + submitted date only | Minimal columns. | |
| You decide | Claude picks. | |

**User's choice:** Name + university + cohort + status + submitted date

---

| Option | Description | Selected |
|--------|-------------|----------|
| On detail page with notes textarea | Accept/Decline at bottom of detail page with optional notes. | ✓ |
| On list page (inline) | Quick action buttons on each row. | |

**User's choice:** Detail page with notes textarea

---

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistic: Firestore first, Discord async | Firestore commits first; Discord fires async; retry banner on failure. | ✓ |
| Sequential: block until Discord resolves | Wait for both Firestore and Discord. | |

**User's choice:** Optimistic with Discord retry banner

---

## Academic Email Validation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit choice at start of email step | Two paths shown upfront: "I have an academic email" vs "I don't have a .edu email". | ✓ |
| Inline fallback after field blur | Student ID upload option appears after email field fails validation. | |
| Only after form submit attempt | Student ID option only shown after submit fails. | |

**User's choice:** Explicit choice at start of academic verification step

---

| Option | Description | Selected |
|--------|-------------|----------|
| Firebase Storage at applications/{applicantUid}/{applicationId}/student_id.{ext} | Same deny-by-default rules as video storage. | ✓ |
| Firestore base64 inline | Encode photo directly on application doc. | |
| You decide | Claude picks. | |

**User's choice:** Firebase Storage, same path convention as application

---

## Claude's Discretion

- Wizard progress bar style (step dots vs numbered vs percentage)
- Pagination implementation for admin application list
- Specific toast/error message text
- Firestore security rules for new collections
- Declined video cleanup cron scheduling

## Deferred Ideas

- "Notify me when applications open" — noted during cohort selection discussion; future quick task or phase
