# Phase 4: Activity Subsystem — Research

**Researched:** 2026-04-23
**Domain:** Next.js middleware · Firestore transactions · GitHub Actions cron · Discord DM API · timezone-aware scheduling
**Confidence:** HIGH (primary sources: live codebase + existing Phase 2/3 patterns)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 — Report Form Location:**
Monthly self-report lives at `/ambassadors/report` as a standalone page (Phase 4). Phase 5 links to it from the dashboard and adds the status badge + next-due-date view.

**D-02 — Event Types:**
Event `type` is a fixed Zod enum: `"workshop" | "blog_post" | "talk_webinar" | "community_stream" | "study_group" | "other"`. Labels: Workshop, Blog post, Talk/Webinar, Community stream, Study group, Other.

**D-03 — Referral Cookie:**
Cookie set in Next.js **middleware** (`src/middleware.ts`). On any request where `searchParams.get("ref")` is present and non-empty: set `cwa_ref` cookie (30-day expiry, `SameSite=Lax`, path `/`, `HttpOnly`). Only write the cookie when the param is present — do not clear or overwrite an existing one.

**D-04 — Timezone:**
Ambassador self-selects IANA timezone from a dropdown on `/profile` (extends AmbassadorPublicCardSection). Stored as `timezone` on `mentorship_profiles/{uid}/ambassador/v1`. Default when absent: `"UTC"`.

**D-05 — Strike Admin Surface:**
New `/admin/ambassadors/members/[uid]` detail page for active ambassador management. Distinct from `/admin/ambassadors/[applicationId]`. Phase 5 adds offboarding trigger; Phase 4 only adds strike increment action.

**D-06 — Human-in-the-Loop Crons (locked from requirements):**
Both crons (REPORT-04 daily missing-report flag, DISC-04 weekly Discord-role reconciliation) flag for admin review — they NEVER mutate strike counts, roles, or Firestore state.

### Claude's Discretion

- Referral code generation algorithm: format `{USERNAME_PREFIX}-{4_HEX}`, uniqueness via Firestore transaction retry loop or random collision check
- Monthly deadline definition: last day of calendar month at 23:59 ambassador local time
- Cron schedule times: daily at 08:00 UTC for report flag; weekly Monday 09:00 UTC for Discord reconciliation
- Event collection path: recommend top-level `ambassador_events/{eventId}` for admin query simplicity
- Report collection path: `monthly_reports/{reportId}` top-level, keyed on `{ambassadorId}_{YYYY-MM}` for uniqueness enforcement

### Deferred Ideas (OUT OF SCOPE)

- Click tracking (redirect endpoint) — FUTURE-REF-01
- Aggregate click → signup funnel — FUTURE-REF-02
- Automated strike-warning email at 1 confirmed strike — FUTURE-REPORT-01
- Phase 5 offboarding trigger on member admin page — REPORT-07 scope; Phase 4 only adds the strike increment action
- Badge renders on MentorCard / project chips / site-wide name — deferred from Phase 3 D-11
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REF-01 | Each accepted ambassador gets a unique short human-readable referral code stored on ambassador subdoc | Extend `runAcceptanceTransaction` to generate `{PREFIX}-{4HEX}` and write to subdoc; uniqueness via collision check before transaction |
| REF-02 | Visiting any page with `?ref={code}` sets `cwa_ref` cookie (30-day, SameSite=Lax, HttpOnly) | New `src/middleware.ts` — Next.js middleware reads `searchParams`, sets cookie via `NextResponse` |
| REF-03 | On first signup (profile POST), `cwa_ref` cookie consumed, `referrals/{referralId}` doc created | Extend `src/app/api/mentorship/profile/route.ts` POST handler to read cookie, write doc, clear cookie |
| REF-04 | Block self-attribution and double-attribution | Check `ambassadorId !== referredUserId` and query `referrals` for existing `referredUserId` before write |
| REF-05 | Ambassador referral count reflects active referred users | Phase 5 dashboard concern; Phase 4 creates the data only |
| EVENT-01 | Ambassador logs events from `/ambassadors/report` | New `POST /api/ambassador/events` route + `LogEventForm` component |
| EVENT-02 | Ambassador can edit/delete own events until 30 days after event date | `PATCH /api/ambassador/events/[eventId]` + `DELETE` with 30-day window check |
| EVENT-03 | Admin views all events per cohort, can flag/hide entries | New `/admin/ambassadors/cohorts/[cohortId]/events` page + `EventAdminTable` component |
| EVENT-04 | Event count reflects non-hidden events in current cohort | Query filter `hidden: false` |
| REPORT-01 | Ambassador submits monthly self-report (3 free-text fields) | `MonthlyReportForm` component at `/ambassadors/report` |
| REPORT-02 | `monthly_reports` doc enforces one report per ambassador per month | Keyed doc `{ambassadorId}_{YYYY-MM}`, check for existence before write |
| REPORT-03 | Dashboard shows next-report-due date and status badge | Phase 4 only provides the data; badge displayed on `/ambassadors/report` via `ReportStatusBadge` |
| REPORT-04 | GitHub Actions daily cron flags missing reports (no mutation) | New cron workflow + script, modeled on `mentorship-inactivity-checks.yml` |
| REPORT-05 | Discord DM reminder 3 days before deadline and at deadline | Cron script calls `sendDirectMessage` from `src/lib/discord.ts` |
| REPORT-06 | Admin confirms strike from admin panel | Strike increment action on `/admin/ambassadors/members/[uid]` via new API endpoint |
| REPORT-07 | At 2 strikes, admin panel surfaces offboarding (Phase 4 adds strike increment only) | Phase 4: `POST /api/ambassador/members/[uid]/strike` endpoint + modal UI |
| DISC-04 | Weekly cron flags ambassadors missing Discord Ambassador role (no mutation) | New cron workflow + script, similar pattern to REPORT-04 cron |
</phase_requirements>

---

## Summary

Phase 4 builds the Activity Subsystem: referral attribution, event logging, monthly self-reporting, strike management, and two GitHub Actions crons. All required technical pieces are either already present in the codebase or follow directly established patterns from Phases 2–3. No new runtime dependencies are needed.

The phase has four distinct subsystems, each with an API layer + client UI + (for reports/strikes) a cron component. The critical architectural decisions are already locked: cookie handling via Next.js middleware (new file), Firestore collections for events/reports/referrals, and human-in-the-loop crons that flag but never mutate.

The primary complexity is: (1) referral code uniqueness at acceptance time, (2) timezone-aware monthly deadline calculation for the cron, and (3) the 30-day event edit window enforcement. All three have straightforward implementations using existing Firestore and date-math patterns.

**Primary recommendation:** Follow the locked decisions verbatim; extend existing patterns from Phases 2–3 rather than inventing new ones. The codebase is well-structured and all integration points are identified.

---

## Project Constraints (from CLAUDE.md)

No `CLAUDE.md` file found at the project root. Constraints are derived from `REQUIREMENTS.md §Constraints` and accumulated `STATE.md` decisions:

- Must use existing Next.js / React 19 / Firebase / DaisyUI stack — no new runtime dependencies
- Must follow existing admin dashboard styling and component patterns
- Must use existing `src/lib/discord.ts` functions — extend, do not replace
- All Firestore admin writes: import `db`, `auth`, `storage` from `src/lib/firebaseAdmin`; never call `admin.firestore()` / `getAuth()` directly
- Firestore Admin SDK does NOT set `ignoreUndefinedProperties` — always conditionally spread optional fields
- API route gate order: `isAmbassadorProgramEnabled()` → `verifyAuth()` / `requireAdmin()` → `hasRoleClaim()` → Zod parse → business logic
- Cron jobs: GitHub Actions + `scripts/*.ts` via `npx tsx` — NOT Vercel cron or Next.js API routes
- `FieldValue` imported from `firebase-admin/firestore` directly (not re-exported from `firebaseAdmin.ts`)
- Do not regress any v1.0–v5.0 capability

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15/16 (existing) | App Router, API routes, middleware | Locked — entire app is Next.js |
| Firebase Admin SDK | existing | Firestore writes, auth claims | Locked — all server-side DB access |
| Zod | existing | API boundary validation | Locked — all schemas use Zod |
| DaisyUI v5 | existing | UI components | Locked — consistent with all prior phases |
| TypeScript | existing | Type safety | Locked |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` or native `Intl` | — | Timezone-aware date math for deadline calculation | REPORT-04 cron, REPORT-05 reminder |
| `@actions/core` | — | GitHub Actions output/logging (already available in Actions env) | Cron scripts only |

**Note on `date-fns`:** Check if already in `package.json` before adding. If not present, use native `Intl.DateTimeFormat` + `Date` arithmetic — the deadline logic is simple enough (last day of month at 23:59 local time) to not require a library.

**Installation:** No new packages expected. Verify `date-fns` presence:
```bash
npm list date-fns 2>/dev/null
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `Intl` timezone math | `date-fns-tz` | `date-fns-tz` is cleaner API but adds a dep; native Intl is sufficient for one-timezone-at-a-time comparisons |
| Top-level `ambassador_events` collection | Subcollection under `mentorship_profiles/{uid}/ambassador/events` | Top-level enables cross-ambassador admin queries without collection-group index; CONTEXT.md recommends top-level |
| Monthly report keyed doc ID | Auto-generated ID + composite index | Keyed doc (`{ambassadorId}_{YYYY-MM}`) enables existence-check without extra query and makes read paths trivial |

---

## Architecture Patterns

### New Collections (Phase 4 Firestore Schema)

```
referrals/{referralId}
  ambassadorId: string       — uid of the referring ambassador
  referredUserId: string     — uid of the newly signed-up user
  convertedAt: Timestamp
  sourceCode: string         — the referral code value (e.g. "AHSAN-A7F2")

ambassador_events/{eventId}
  ambassadorId: string
  cohortId: string
  date: Timestamp
  type: EventType            — Zod enum (D-02)
  attendanceEstimate: number
  link?: string
  notes?: string
  hidden: boolean            — admin flag (EVENT-03)
  createdAt: Timestamp
  updatedAt: Timestamp

monthly_reports/{ambassadorId}_{YYYY-MM}
  ambassadorId: string
  cohortId: string
  month: string              — "YYYY-MM" derived from submittedAt in ambassador timezone
  whatWorked: string
  whatBlocked: string
  whatNeeded: string
  submittedAt: Timestamp

ambassador_cron_flags/{flagId}
  ambassadorId: string
  type: "missing_report" | "missing_discord_role"
  period?: string            — "YYYY-MM" for missing_report flags
  flaggedAt: Timestamp
  resolved: boolean          — admin can mark resolved; cron never mutates
```

### AmbassadorSubdoc Extensions (Phase 4 fields to add to `src/types/ambassador.ts`)

```typescript
// Phase 4 fields to add to AmbassadorSubdoc interface
referralCode?: string;    // REF-01 — generated at accept time
timezone?: string;        // D-04 — IANA string e.g. "Asia/Karachi"
```

### Recommended File Structure (new files)

```
src/
├── middleware.ts                                  # REF-02 cookie setter (NEW — no middleware currently)
├── app/
│   ├── ambassadors/
│   │   └── report/
│   │       └── page.tsx                           # D-01 standalone report page
│   ├── admin/ambassadors/
│   │   ├── members/
│   │   │   ├── page.tsx                           # D-05 member list
│   │   │   └── [uid]/
│   │   │       └── page.tsx                       # D-05 member detail + strike
│   │   └── cohorts/[cohortId]/
│   │       └── events/page.tsx                    # EVENT-03 admin event view
├── api/ambassador/
│   ├── events/route.ts                            # GET + POST (EVENT-01)
│   ├── events/[eventId]/route.ts                  # PATCH + DELETE (EVENT-02)
│   ├── events/admin/route.ts                      # GET all events for admin (EVENT-03)
│   ├── report/route.ts                            # POST monthly report (REPORT-01/02)
│   ├── report/current/route.ts                    # GET current month status (REPORT-03)
│   └── members/[uid]/strike/route.ts              # POST strike increment (REPORT-06)
├── lib/ambassador/
│   ├── referralCode.ts                            # generateReferralCode(), uniqueness logic
│   ├── reportDeadline.ts                          # computeDeadline(timezone, month) helper
│   └── eventTypes.ts                              # EventTypeSchema Zod enum (D-02)
└── scripts/
    ├── ambassador-report-flag.ts                  # REPORT-04 daily cron
    └── ambassador-discord-reconciliation.ts       # DISC-04 weekly cron
.github/workflows/
    └── ambassador-activity-checks.yml             # New workflow for REPORT-04 + DISC-04
```

### Pattern 1: Next.js Middleware Cookie Setter (REF-02)

No `src/middleware.ts` currently exists. The file is new. Next.js middleware runs at the Edge before the request reaches any route handler — this is exactly what makes it survive OAuth redirects.

```typescript
// src/middleware.ts
// Source: Next.js docs — middleware response cookies
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ref = searchParams.get("ref");

  if (!ref || ref.trim().length === 0) {
    return NextResponse.next();
  }

  // Only write when param is present; never overwrite existing attribution
  const existing = request.cookies.get("cwa_ref");
  if (existing) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set("cwa_ref", ref.trim(), {
    maxAge: 60 * 60 * 24 * 30,   // 30 days in seconds
    sameSite: "lax",
    path: "/",
    httpOnly: true,
  });
  return response;
}

// Run on all routes except static assets and API internals
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Confidence:** HIGH — verified against Next.js docs pattern.

### Pattern 2: Referral Code Generation (REF-01 — Claude's Discretion)

```typescript
// src/lib/ambassador/referralCode.ts
import { db } from "@/lib/firebaseAdmin";

/** Generate a code of form {PREFIX}-{4HEX}. PREFIX = first 5 chars of username, uppercased. */
function buildCode(username: string): string {
  const prefix = username.slice(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  const hex = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
  return `${prefix}-${hex}`;
}

/** Generate a unique referral code with collision retry (max 5 attempts). */
export async function generateUniqueReferralCode(username: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = buildCode(username);
    // Check uniqueness via a query on ambassador subdocs
    const snap = await db
      .collectionGroup("ambassador")
      .where("referralCode", "==", code)
      .limit(1)
      .get();
    if (snap.empty) return code;
  }
  throw new Error("Could not generate unique referral code after 5 attempts");
}
```

**Integration into `runAcceptanceTransaction`:** Generate code outside the transaction (since collection-group queries are illegal inside `txn.get`), then pass the resolved code into the transaction body and write it to the subdoc alongside other accept-time fields.

**Confidence:** HIGH — mirrors the `ensureUniqueUsername` pre-transaction pattern already in `acceptance.ts`.

### Pattern 3: Referral Consumption on Profile POST (REF-03)

The `POST /api/mentorship/profile/route.ts` handler already exists. The hook point is after the `db.collection("mentorship_profiles").doc(uid).set(profile)` write. The handler runs server-side and has access to the `request` object.

```typescript
// In POST /api/mentorship/profile/route.ts — add after profile write
const refCode = request.cookies.get("cwa_ref")?.value;
if (refCode) {
  // Fire-and-forget (same pattern as Discord role assignment)
  consumeReferralCookie(uid, refCode, response).catch((err) =>
    console.error("[profile.POST] referral attribution failed:", err)
  );
}
```

The `consumeReferralCookie` helper:
1. Queries `mentorship_profiles/{uid}/ambassador/v1` collection-group for `referralCode == refCode` → finds ambassadorId
2. Checks self-attribution (`ambassadorId !== uid`) — REF-04
3. Checks double-attribution (query `referrals` where `referredUserId == uid`, limit 1) — REF-04
4. Writes `referrals/{referralId}` doc
5. Clears cookie on the `NextResponse` object

**Cookie clearing on response:** The `NextResponse` that carries the cookie-clear header must be the one returned to the client. In Next.js API routes, this means passing the `response` object (or using `response.cookies.delete("cwa_ref")`) — not a fire-and-forget pattern for the clear step. Use a wrapper approach: run the attribution logic synchronously after the profile write, then set `Set-Cookie` to delete `cwa_ref` on the outgoing response.

**Confidence:** HIGH — standard Next.js API route cookie manipulation.

### Pattern 4: Monthly Report Deadline (REPORT-04, REPORT-05 — Claude's Discretion)

```typescript
// src/lib/ambassador/reportDeadline.ts
/** Returns the last millisecond of the given month in the ambassador's timezone. */
export function getMonthDeadline(year: number, month: number, timezone: string): Date {
  // Last day of month: day 0 of next month
  const lastDay = new Date(year, month, 0); // month is 1-indexed here
  // Format as YYYY-MM-DD in the ambassador's timezone, then set 23:59:59
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  const localStr = fmt.format(lastDay); // e.g. "2026-04-30"
  // Combine with 23:59:59 and parse back as that timezone's midnight equivalent
  // Use Intl.DateTimeFormat offset to compute UTC equivalent
  const deadlineLocal = new Date(`${localStr}T23:59:59`);
  return deadlineLocal; // cron compares this against Date.now() in UTC
}
```

**Simpler approach (recommended for the cron):** For each ambassador flagged as missing, compute "is today after the deadline in their timezone?" using `Intl.DateTimeFormat` to get their current month string, then check if a report doc exists for `{ambassadorId}_{YYYY-MM}`. The cron runs daily at 08:00 UTC (after midnight in most timezones) so any "today is past last day of month" check is reliable.

**Confidence:** MEDIUM — timezone arithmetic is inherently fiddly; recommend a unit test for this helper.

### Pattern 5: GitHub Actions Cron (REPORT-04, DISC-04)

Copy-adapt from `.github/workflows/mentorship-inactivity-checks.yml`. Two jobs in one workflow file:

```yaml
# .github/workflows/ambassador-activity-checks.yml
on:
  schedule:
    - cron: '0 8 * * *'    # daily 08:00 UTC — missing report flag (REPORT-04, REPORT-05)
    - cron: '0 9 * * 1'    # weekly Mon 09:00 UTC — Discord reconciliation (DISC-04)
  workflow_dispatch:
    inputs:
      job:
        required: true
        default: 'report-flag'
        type: choice
        options: [report-flag, discord-reconciliation, both]

jobs:
  ambassador-report-flag:
    if: |
      (github.event_name == 'schedule' && github.event.schedule == '0 8 * * *') ||
      (github.event_name == 'workflow_dispatch' && (github.event.inputs.job == 'report-flag' || github.event.inputs.job == 'both'))
    # ... same checkout/node/npm ci steps as canonical pattern
    run: npx tsx scripts/ambassador-report-flag.ts

  ambassador-discord-reconciliation:
    if: |
      (github.event_name == 'schedule' && github.event.schedule == '0 9 * * 1') ||
      ...
    run: npx tsx scripts/ambassador-discord-reconciliation.ts
```

**Required secrets** (same as existing cron): `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `FIREBASE_SERVICE_ACCOUNT`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

**Confidence:** HIGH — direct adaptation of existing workflow.

### Anti-Patterns to Avoid

- **Querying inside Firestore transaction:** `db.runTransaction` only allows `txn.get(docRef)`, not `where()` queries. Referral code uniqueness check and any other query-based uniqueness must run in a pre-transaction step, with the resolved value passed into the transaction body as a closure. (Same pattern as `ensureUniqueUsername` in `acceptance.ts`.)
- **Passing `undefined` to Firestore writes:** Admin SDK rejects these. Always conditionally spread optional fields. `if (typeof x === "string") payload.x = x`.
- **Using `discord.js` library:** This project uses direct fetch calls to the Discord REST API via `src/lib/discord.ts`. Do not introduce `discord.js`.
- **Auto-mutating strikes in cron:** BOTH crons must ONLY write to `ambassador_cron_flags` collection. They must NEVER call `FieldValue.increment` on `strikes` or mutate `roles`.
- **Self-clearing cookie with fire-and-forget:** The `cwa_ref` cookie deletion must happen on the outgoing response object, not in a `.catch`-wrapped async. Set `response.cookies.delete("cwa_ref")` synchronously on the response being returned.
- **Using `sendDirectMessage` export name vs actual function name:** The function in `src/lib/discord.ts` at line ~526 is `sendDirectMessage(discordUsername, message)` — NOT `sendDM`. Use the correct export.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie setting in Next.js middleware | Custom edge cookie logic | `NextResponse.cookies.set()` (built into `next/server`) | HttpOnly cookies are the standard Next.js pattern; custom logic will miss edge cases like Secure flag in production |
| Timezone-aware "last day of month" | Custom calendar math | Native `new Date(year, month, 0)` + `Intl.DateTimeFormat` | JavaScript handles month overflow correctly; no library needed for this one operation |
| Event type labels | Free-text string field | Zod enum D-02 (already locked) | Free-text creates leaderboard aggregation complexity in Phase 5 |
| Report uniqueness enforcement | Application-level duplicate check | Deterministic Firestore doc ID `{ambassadorId}_{YYYY-MM}` | Doc ID collision = automatic "already exists" signal; no separate query needed |
| Discord DM sending | New HTTP client | `sendDirectMessage()` in `src/lib/discord.ts:526` | Existing function handles member lookup, DM channel creation, message send, and logging |
| Admin auth check | New middleware | `requireAdmin()` from `src/lib/ambassador/adminAuth` | Already handles admin token validation consistently across all admin routes |

---

## Common Pitfalls

### Pitfall 1: Referral Cookie Survives OAuth But Is Read Server-Side Only

**What goes wrong:** The cookie is `HttpOnly`. Client-side code cannot read `cwa_ref`. The consumption must happen in the `POST /api/mentorship/profile` server handler.

**Why it happens:** HttpOnly is required by D-03 to prevent client JS tampering.

**How to avoid:** Read `request.cookies.get("cwa_ref")` inside the API route handler, not in client components. Clear the cookie on the `NextResponse` object before returning.

**Warning signs:** If the referral doc is never created, check that the cookie read is happening inside the Next.js API route (not client-side), and that the `HttpOnly` attribute is set correctly in middleware.

### Pitfall 2: Next.js Middleware Matcher — Must Exclude API Routes and Static Assets

**What goes wrong:** Without a proper matcher, middleware runs on every request including `/_next/static`, `/_next/image`, and internal API calls. This adds latency and may interfere with streaming.

**Why it happens:** Default middleware matches all routes.

**How to avoid:** Use the matcher config to exclude static assets:
```typescript
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
```
Note: Exclude `/api/` routes from the cookie-setter since the referral cookie is only relevant on page navigations, not API calls. This also prevents double-execution when the profile POST is called.

### Pitfall 3: Collection-Group Query for Referral Code Lookup Requires an Index

**What goes wrong:** `db.collectionGroup("ambassador").where("referralCode", "==", code)` fails with a Firestore index error on first run.

**Why it happens:** Firestore collection-group queries require a composite index when the collection group is not a top-level collection.

**How to avoid:** Create the Firestore index in `firestore.indexes.json` before deploying:
```json
{
  "collectionGroup": "ambassador",
  "queryScope": "COLLECTION_GROUP",
  "fields": [{ "fieldPath": "referralCode", "order": "ASCENDING" }]
}
```
Alternatively, maintain a top-level `referral_codes/{code}` lookup doc written at acceptance time — this avoids the collection-group query entirely and is faster.

**Recommendation:** Use the top-level lookup doc approach. Write `referral_codes/{code} → { ambassadorId, uid }` at acceptance time inside `runAcceptanceTransaction`. On consumption, read `referral_codes/{code}` directly — O(1) lookup, no index needed, no collection-group query.

### Pitfall 4: Firestore Transaction vs Batch — Correct Tool for Each Write

**What goes wrong:** Using a batch where a transaction is needed (or vice versa), causing race conditions.

**Why it happens:** Both APIs look similar but have different consistency guarantees.

**How to avoid:**
- Use `db.runTransaction()` when the write depends on a read (e.g., double-attribution check for referrals)
- Use `db.batch()` when writes are independent (e.g., writing an event doc + updating a counter is safe as a batch since there's no contention concern at this scale)
- The strike increment (`FieldValue.increment(1)`) is safe as a direct `.update()` since Firestore server-side increments are atomic

### Pitfall 5: Cron Script Timezone-Awareness

**What goes wrong:** The cron runs in UTC. An ambassador in `Asia/Karachi` (UTC+5) whose deadline is "April 30 23:59 Karachi time" would be flagged at April 30 18:59 UTC, but the cron at 08:00 UTC the next day (May 1 13:00 Karachi time) would not see the correct window.

**Why it happens:** UTC date comparison doesn't account for the ambassador's local "end of month."

**How to avoid:** For each ambassador, compute the deadline in their timezone using their stored `timezone` field. Compare `Date.now()` against the UTC equivalent of their "last day of month, 23:59:59 local time." Flag only when the current time is AFTER that deadline AND no report doc exists for the period.

**Implementation:** Use `Intl.DateTimeFormat` to get the ambassador's current month string. Then check if it's past the last day of the PREVIOUS month in their timezone. If so, and no report exists for the previous month, flag.

### Pitfall 6: Event Edit Window — Client vs Server Enforcement

**What goes wrong:** The 30-day event edit window is only enforced in the UI, not on the server.

**Why it happens:** UI-only checks are trivially bypassed.

**How to avoid:** In `PATCH /api/ambassador/events/[eventId]`, verify that `event.date + 30 days > now` server-side before allowing the update. Return 409 with a clear error message if the window has closed.

### Pitfall 7: Monthly Report "Already Submitted" Race

**What goes wrong:** Two concurrent report submits for the same ambassador/month create two docs if using auto-generated IDs.

**Why it happens:** Race between two submit clicks.

**How to avoid:** Use deterministic doc ID `{ambassadorId}_{YYYY-MM}` and `db.collection("monthly_reports").doc(docId).set(payload, { merge: false })`. A pre-write existence check (`doc.get()`) + conditional write prevents duplicates. For full safety, use a transaction: read the doc, check it doesn't exist, write it.

---

## Code Examples

### Existing `sendDirectMessage` Signature
```typescript
// Source: src/lib/discord.ts:526
export async function sendDirectMessage(
  discordUsername: string,
  message: string
): Promise<boolean>
// Returns true if sent, false otherwise. Non-blocking — failure logs but does not throw.
```

### requireAdmin Pattern (from Phase 2)
```typescript
// Source: src/lib/ambassador/adminAuth.ts (existing)
const admin = await requireAdmin(request);
if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
// admin.uid is available after this check
```

### FieldValue Import Pattern (Phase 2 established)
```typescript
// Source: established in Phase 2, src/app/api/ambassador/applications/[applicationId]/route.ts
import { FieldValue } from "firebase-admin/firestore";
// NOT from firebaseAdmin.ts — direct import from firebase-admin/firestore
```

### Conditional Spread for Optional Fields (Admin SDK undefined rejection)
```typescript
// Source: src/lib/ambassador/acceptance.ts (established pattern)
const payload: Record<string, unknown> = {
  ambassadorId,
  cohortId,
  // ... required fields
};
if (typeof link === "string" && link.trim().length > 0) {
  payload.link = link.trim();
}
// Never: payload.link = link  ← rejects if link is undefined
```

### Feature Gate + Auth + Role Gate Pattern
```typescript
// Source: src/app/api/ambassador/profile/route.ts (established)
if (!isAmbassadorProgramEnabled()) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
const ctx = await verifyAuth(request);
if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const isAmbassador = hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador");
if (!isAmbassador) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js Pages Router middleware | App Router + `src/middleware.ts` at root | Next.js 13+ | Middleware runs at Edge, before OAuth redirects — correct for cookie preservation |
| Vercel cron | GitHub Actions scheduled workflow | Phase 2 decision | All crons in this project use `.github/workflows/` + `npx tsx scripts/` |
| `admin.firestore()` | Named-app pattern via `firebaseAdmin.ts` | Phase 1 (emulator guard) | Import `db` from `@/lib/firebaseAdmin` always |

---

## Open Questions (RESOLVED)

1. **`date-fns` availability** — RESOLVED: `date-fns-tz` v3.2.0 is used in Plan 01 for timezone-aware deadline math. If absent from package.json, executor adds it; fallback is native `Intl.DateTimeFormat`.

2. **Firestore index for `referral_codes` approach vs collection-group query** — RESOLVED: Plans adopt the `referral_codes/{code}` top-level lookup doc approach (Plan 01). Avoids composite index deployment and gives O(1) reads.

3. **REPORT-03 on `/ambassadors/report` page** — RESOLVED: `ReportStatusBadge` renders on `/ambassadors/report` in Phase 4 (part of the report UI). Phase 5 adds next-due-date display on the dashboard.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Cron scripts | ✓ | v22.13.1 | — |
| tsx | Cron script execution | ✓ | v4.21.0 | — |
| DISCORD_BOT_TOKEN | REPORT-05, DISC-04 | ✓ (existing secret) | — | Log-only mode if missing |
| FIREBASE_SERVICE_ACCOUNT | Cron Firestore access | ✓ (existing secret) | — | — |
| Firestore emulator | Local dev | ✓ (existing setup) | — | — |

No missing dependencies with no fallback. All GitHub Actions secrets required by Phase 4 crons are already in use by existing cron workflows.

---

## Validation Architecture

`workflow.nyquist_validation` is not set in `.planning/config.json` (absent key = treat as enabled).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (confirmed from Phase 1 — `@vitest/coverage-v8` installed) |
| Config file | `vitest.config.*` (check root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REF-01 | Referral code generation: unique, correct format | unit | `npx vitest run src/lib/ambassador/referralCode.test.ts` | ❌ Wave 0 |
| REF-02 | Middleware sets cookie on `?ref=` param, skips if existing | unit | `npx vitest run src/middleware.test.ts` | ❌ Wave 0 |
| REF-03 | Profile POST consumes cookie, writes referral doc | integration | manual / emulator test | ❌ Wave 0 |
| REF-04 | Self-attribution blocked; double-attribution blocked | unit | `npx vitest run src/lib/ambassador/referral.test.ts` | ❌ Wave 0 |
| EVENT-02 | 30-day edit window enforced server-side | unit | `npx vitest run src/app/api/ambassador/events/[eventId]/route.test.ts` | ❌ Wave 0 |
| REPORT-02 | One report per ambassador per month | unit | `npx vitest run src/app/api/ambassador/report/route.test.ts` | ❌ Wave 0 |
| REPORT-04 | Cron flags missing reports, never mutates | manual / smoke | manual run of script with dry-run flag | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ambassador/referralCode.test.ts` — covers REF-01 (format, uniqueness retry)
- [ ] `src/middleware.test.ts` — covers REF-02 (cookie set on first visit, skip if existing)
- [ ] `src/lib/ambassador/reportDeadline.test.ts` — covers REPORT-04 timezone deadline calculation
- [ ] `src/lib/ambassador/referral.test.ts` — covers REF-04 self/double attribution guards

---

## Sources

### Primary (HIGH confidence)
- Live codebase: `src/lib/ambassador/acceptance.ts` — acceptance transaction pattern, pre-transaction uniqueness check
- Live codebase: `src/middleware.ts` — file does NOT exist yet; confirmed via `ls` check
- Live codebase: `.github/workflows/mentorship-inactivity-checks.yml` — canonical cron pattern
- Live codebase: `src/lib/discord.ts:526` — `sendDirectMessage` function signature
- Live codebase: `src/app/api/ambassador/profile/route.ts` — PATCH pattern, gate order, batched write
- Live codebase: `src/types/ambassador.ts` — `AmbassadorSubdoc` current shape; Phase 4 extensions identified
- Live codebase: `src/lib/firebaseAdmin.ts` — named-app emulator pattern

### Secondary (MEDIUM confidence)
- Next.js App Router docs: middleware cookie setting via `NextResponse.cookies.set()`
- Firestore docs: collection-group queries require composite indexes

### Tertiary (LOW confidence — flag for validation)
- Timezone deadline calculation using native `Intl` API — validated conceptually but unit test recommended before shipping the cron

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire stack is inherited from prior phases; no new dependencies
- Architecture patterns: HIGH — all new files follow directly from existing phase 2/3 patterns
- Pitfalls: HIGH — all six pitfalls are grounded in observed codebase behaviors (undefined rejection, transaction query limitations, existing export names)
- Timezone math: MEDIUM — correct approach identified but recommend unit test

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (stable Next.js/Firebase stack)
