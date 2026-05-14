# Phase 4: Activity Subsystem — Pattern Mapping

**Produced:** 2026-04-23
**Consumed by:** Phase 4 executors (wave plans)
**Source files read:** CONTEXT.md, RESEARCH.md, and 18 codebase analogs

---

## How to use this document

Each section below maps one Phase 4 file to its closest codebase analog.
- **Analog** — the existing file executors must read before touching the new file.
- **Key excerpts** — verbatim imports / signatures / guard patterns copied from the analog.
- **Phase 4 delta** — what to add or change relative to the analog.

---

## 1. `src/middleware.ts` (NEW)

**Role:** Next.js Edge middleware — sets the `cwa_ref` referral cookie on page requests that carry `?ref=` param (REF-02).

**Analog:** No analog exists; this is the first middleware in the project. Pattern is from Next.js docs.

**Key pattern — Next.js middleware shape:**
```typescript
// Imports always from "next/server" for middleware files
import { NextRequest, NextResponse } from "next/server";

// Named export `middleware` (required by Next.js)
export function middleware(request: NextRequest) {
  // ...
  return NextResponse.next();
}

// Named export `config` — restricts which routes the middleware runs on
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
```

**Cookie-set pattern (from Next.js docs, verified in RESEARCH.md):**
```typescript
const response = NextResponse.next();
response.cookies.set("cwa_ref", ref.trim(), {
  maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
  sameSite: "lax",
  path: "/",
  httpOnly: true,
});
return response;
```

**Phase 4 delta vs analog:**
- New file — no existing code to preserve.
- Read `searchParams.get("ref")` from `request.nextUrl`.
- Only set the cookie when the param is present AND no `cwa_ref` cookie already exists (preserves original attribution within the 30-day window, D-03).
- Exclude `/api/` routes from the matcher — the referral cookie is only relevant on page navigations.

---

## 2. `src/lib/ambassador/referralCode.ts` (NEW)

**Role:** Utility — generates and uniqueness-checks referral codes of the form `{PREFIX}-{4HEX}` (REF-01).

**Analog:** `src/lib/ambassador/username.ts` — `ensureUniqueUsername` uses the identical pre-transaction query-loop pattern.

**Key excerpts from analog:**
```typescript
// src/lib/ambassador/username.ts
import { db } from "@/lib/firebaseAdmin";

export async function ensureUniqueUsername(base: string): Promise<string> {
  let candidate = base;
  let counter = 1;
  while (counter < 100) {
    const existing = await db
      .collection("mentorship_profiles")
      .where("username", "==", candidate)
      .limit(1)
      .get();
    if (existing.empty) return candidate;
    candidate = `${base}${counter}`;
    counter++;
  }
  return `${base}${Date.now()}`;
}
```

**Phase 4 delta:**
- `buildCode(username)` — first 5 chars of username, uppercased, non-alphanumeric replaced with `X`, plus `-{4HEX}` random suffix.
- `generateUniqueReferralCode(username)` — instead of querying `mentorship_profiles.username`, query top-level `referral_codes/{code}` doc existence (O(1), no Firestore index required — see RESEARCH.md Pitfall 3). Write `referral_codes/{code}` at acceptance time inside the transaction.
- Max 5 retry attempts (not 100 — collision space is very large).
- Throw on exhaustion (acceptable: near-impossible in practice).

**Import pattern (same as username.ts):**
```typescript
import { db } from "@/lib/firebaseAdmin";
// No FieldValue needed here — read-only queries
```

---

## 3. `src/lib/ambassador/eventTypes.ts` (NEW)

**Role:** Type definition — Zod enum for the fixed event type vocabulary (D-02).

**Analog:** `src/types/ambassador.ts` — `ApplicationStatusSchema`, `CohortStatusSchema` follow the same Zod enum + TS type union pattern.

**Key excerpts from analog:**
```typescript
// src/types/ambassador.ts
import { z } from "zod";

export const ApplicationStatusSchema = z.enum([
  "submitted",
  "under_review",
  "accepted",
  "declined",
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
```

**Phase 4 delta:**
- New `EventTypeSchema` with D-02 values: `"workshop" | "blog_post" | "talk_webinar" | "community_stream" | "study_group" | "other"`.
- Export `UI_LABELS` map from enum value to display label (consumed by `LogEventForm` select options and admin table headers).
- Place in `src/lib/ambassador/eventTypes.ts` (lib, not types, because it includes the labels map — colocated with other ambassador-specific logic).

```typescript
// Pattern to follow:
export const EventTypeSchema = z.enum([
  "workshop",
  "blog_post",
  "talk_webinar",
  "community_stream",
  "study_group",
  "other",
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  workshop: "Workshop",
  blog_post: "Blog post",
  talk_webinar: "Talk / Webinar",
  community_stream: "Community stream",
  study_group: "Study group",
  other: "Other",
};
```

---

## 4. `src/lib/ambassador/reportDeadline.ts` (NEW)

**Role:** Utility — timezone-aware monthly deadline computation for REPORT-04 cron and REPORT-05 reminder logic.

**Analog:** No direct analog. Uses native JS `Intl.DateTimeFormat` — no library needed.

**Key pattern:**
```typescript
// Compute the "last day of month" using day-0-of-next-month trick (JS built-in behavior)
const lastDay = new Date(year, month, 0); // month is 1-indexed (pass next month's number)
// e.g. new Date(2026, 5, 0) → April 30, 2026

// Get ambassador's current month string in their timezone
const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
```

**Phase 4 delta:**
- Export `getDeadlineUTC(year: number, month: number, timezone: string): number` — returns UTC milliseconds of the last second of the given month in the given IANA timezone.
- Export `getAmbassadorMonthKey(timezone: string): string` — returns `"YYYY-MM"` string for the PREVIOUS calendar month in the ambassador's timezone (what the cron should be checking for).
- Unit test required (RESEARCH.md Wave 0 gap): `src/lib/ambassador/reportDeadline.test.ts`.

---

## 5. `src/types/ambassador.ts` (MODIFY)

**Role:** Type definitions — extend `AmbassadorSubdoc` with Phase 4 fields; add new Firestore doc interfaces.

**Analog:** The file itself — `AmbassadorSubdoc` already has Phase 2 and 3 field sections with inline comments marking phase provenance.

**Key excerpts from existing interface:**
```typescript
// src/types/ambassador.ts — current AmbassadorSubdoc (lines 122–140)
export interface AmbassadorSubdoc {
  // Phase 2 fields
  cohortId: string;
  joinedAt: Date;
  active: boolean;
  strikes: number;
  discordMemberId: string | null;
  endedAt?: Date;

  // Phase 3 fields (D-03)
  university?: string;
  city?: string;
  // ... more Phase 3 fields
}
```

**Phase 4 delta — add to `AmbassadorSubdoc`:**
```typescript
  // Phase 4 fields
  referralCode?: string;  // REF-01 — generated at accept time; format {PREFIX}-{4HEX}
  timezone?: string;      // D-04 — IANA string e.g. "Asia/Karachi"; default "UTC" when absent
```

**Phase 4 delta — add new interfaces after existing ones:**
```typescript
// New top-level Firestore doc: referrals/{referralId}
export interface ReferralDoc {
  ambassadorId: string;       // uid of the referring ambassador
  referredUserId: string;     // uid of the newly signed-up user
  convertedAt: Date;          // Firestore Timestamp modelled as Date
  sourceCode: string;         // the referral code value e.g. "AHSAN-A7F2"
}

// New top-level Firestore doc: ambassador_events/{eventId}
export interface AmbassadorEventDoc {
  ambassadorId: string;
  cohortId: string;
  date: Date;
  type: EventType;            // import from @/lib/ambassador/eventTypes
  attendanceEstimate: number;
  link?: string;
  notes?: string;
  hidden: boolean;            // admin flag — EVENT-03
  createdAt: Date;
  updatedAt: Date;
}

// New top-level Firestore doc: monthly_reports/{ambassadorId}_{YYYY-MM}
export interface MonthlyReportDoc {
  ambassadorId: string;
  cohortId: string;
  month: string;              // "YYYY-MM" derived from submittedAt in ambassador timezone
  whatWorked: string;
  whatBlocked: string;
  whatNeeded: string;
  submittedAt: Date;
}

// New top-level Firestore doc: ambassador_cron_flags/{flagId}
export interface AmbassadorCronFlagDoc {
  ambassadorId: string;
  type: "missing_report" | "missing_discord_role";
  period?: string;            // "YYYY-MM" for missing_report
  flaggedAt: Date;
  resolved: boolean;          // admin marks resolved; cron never mutates
}

// Zod schemas for API boundaries
export const LogEventSchema = z.object({
  date: z.string().datetime({ offset: true }),
  type: EventTypeSchema,     // import from eventTypes
  attendanceEstimate: z.number().int().min(0).max(100000),
  link: z.string().trim().max(2048).url().optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type LogEventInput = z.infer<typeof LogEventSchema>;

export const MonthlyReportSchema = z.object({
  whatWorked: z.string().trim().min(1).max(2000),
  whatBlocked: z.string().trim().min(1).max(2000),
  whatNeeded: z.string().trim().min(1).max(2000),
});
export type MonthlyReportInput = z.infer<typeof MonthlyReportSchema>;
```

---

## 6. `src/lib/ambassador/acceptance.ts` (MODIFY)

**Role:** Extend `runAcceptanceTransaction` to generate and write the referral code at accept time (REF-01).

**Analog:** The file itself — specifically the pre-transaction username resolution pattern at lines 85–104.

**Key excerpts from existing pre-transaction pattern:**
```typescript
// src/lib/ambassador/acceptance.ts lines 85–104 — pre-transaction uniqueness check
// Username uniqueness requires a `where().limit().get()` query which is ILLEGAL
// inside a Firestore transaction. So we read/resolve here, then pass into the txn body.
const preAppSnap = await db
  .collection(AMBASSADOR_APPLICATIONS_COLLECTION)
  .doc(applicationId)
  .get();
// ...
let resolvedUsername = preProfileData?.username;
if (!resolvedUsername || resolvedUsername.trim().length === 0) {
  const base = deriveBaseUsername(preApp.applicantName, preApp.applicantEmail);
  resolvedUsername = await ensureUniqueUsername(base);
}
```

**Existing write inside transaction (lines 181–196):**
```typescript
const ambassadorRef = profileRef.collection("ambassador").doc("v1");
const subdocPayload: Record<string, unknown> = {
  cohortId: app.targetCohortId,
  joinedAt: now,
  active: true,
  strikes: 0,
  discordMemberId: app.discordMemberId ?? null,
};
// Conditionally spread — Admin SDK rejects undefined
if (typeof app.university === "string" && app.university.trim().length > 0) {
  subdocPayload.university = app.university.trim();
}
txn.set(ambassadorRef, subdocPayload);
```

**FieldValue import (already present in file):**
```typescript
import { FieldValue } from "firebase-admin/firestore";
```

**Phase 4 delta:**
1. Import `generateUniqueReferralCode` from `@/lib/ambassador/referralCode`.
2. Add pre-transaction referral code generation (same pattern as username):
   ```typescript
   // Pre-transaction — query-based uniqueness check not allowed inside txn
   const referralCode = await generateUniqueReferralCode(resolvedUsername);
   ```
3. Inside transaction, on first accept path, add to `subdocPayload`:
   ```typescript
   subdocPayload.referralCode = referralCode;
   ```
4. Inside transaction, write top-level lookup doc (avoids index requirement):
   ```typescript
   const refCodeRef = db.collection("referral_codes").doc(referralCode);
   txn.set(refCodeRef, { ambassadorId: app.applicantUid, uid: app.applicantUid });
   ```
5. `AcceptanceResult` OK branch should include `referralCode` in return so the caller can log it.

---

## 7. `src/app/api/mentorship/profile/route.ts` (MODIFY)

**Role:** Extend the POST handler to consume the `cwa_ref` cookie and write a `referrals/{id}` doc (REF-03).

**Analog:** The file itself — lines 113 and 127–133 show the fire-and-forget Discord role assignment pattern.

**Key excerpts from existing POST handler:**
```typescript
// src/app/api/mentorship/profile/route.ts lines 113, 127–133
await db.collection("mentorship_profiles").doc(uid).set(profile);

// Fire-and-forget Discord role assignment pattern
if (isDiscordConfigured() && profileData.discordUsername) {
  const roleId = role === "mentor" ? DISCORD_MENTOR_ROLE_ID : DISCORD_MENTEE_ROLE_ID;
  assignDiscordRole(profileData.discordUsername, roleId).catch((err) =>
    console.error("Failed to assign Discord role:", err)
  );
}
```

**Cookie-read pattern (Next.js API route):**
```typescript
// Read HttpOnly cookie server-side — client JS cannot access it
const refCode = request.cookies.get("cwa_ref")?.value;
```

**Phase 4 delta:**
1. After the `db.collection("mentorship_profiles").doc(uid).set(profile)` write, read `request.cookies.get("cwa_ref")?.value`.
2. If `refCode` is present, call `consumeReferral(uid, refCode)` — synchronously awaited (NOT fire-and-forget) so the cookie-clear header can be set on the response.
3. `consumeReferral` helper (can live in `src/lib/ambassador/referral.ts`):
   - Read `referral_codes/{refCode}` → get `ambassadorId`.
   - Self-attribution guard: `ambassadorId !== uid` — REF-04.
   - Double-attribution guard: query `referrals` where `referredUserId == uid`, `limit(1)` — REF-04.
   - Write `referrals/{autoId}` with `{ ambassadorId, referredUserId: uid, convertedAt: now, sourceCode: refCode }`.
4. Clear the cookie on the outgoing response:
   ```typescript
   // CRITICAL: must be on the response object, not fire-and-forget
   const response = NextResponse.json({ success: true, ... }, { status: 201 });
   response.cookies.delete("cwa_ref");
   return response;
   ```
5. Referral failure must be non-fatal — log and continue, do not reject the signup.

---

## 8. `src/lib/ambassador/referral.ts` (NEW)

**Role:** Utility — `consumeReferral(uid, refCode)` helper; self/double-attribution guards (REF-04).

**Analog:** `src/lib/ambassador/username.ts` — pre-query pattern outside transactions; `src/lib/ambassador/acceptance.ts` — conditional-spread pattern.

**Key import pattern:**
```typescript
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
// NOT from firebaseAdmin — direct import per established pattern
```

**Phase 4 delta:**
- `consumeReferral(referredUserId: string, refCode: string): Promise<{ ok: boolean; reason?: string }>`:
  1. Read `referral_codes/{refCode}` — if missing, return `{ ok: false, reason: "unknown_code" }`.
  2. Check `ambassadorId !== referredUserId` — if equal, return `{ ok: false, reason: "self_attribution" }`.
  3. Query `referrals` where `referredUserId == referredUserId`, `limit(1)` — if found, return `{ ok: false, reason: "already_attributed" }`.
  4. Write `referrals/{autoId}` doc using `db.collection("referrals").add(payload)`.
  5. Never throw — return `{ ok: false, reason: "error" }` on exceptions.
- Unit test required: `src/lib/ambassador/referral.test.ts` (Wave 0 gap).

---

## 9. `src/app/api/ambassador/events/route.ts` (NEW)

**Role:** API route — `GET` (list own events) and `POST` (log new event) for authenticated ambassador (EVENT-01).

**Analog:** `src/app/api/ambassador/applications/me/route.ts` — GET pattern with `verifyAuth` + Firestore query. `src/app/api/ambassador/profile/route.ts` — PATCH pattern with full gate order and Zod parse.

**Key excerpts from analog (gate order):**
```typescript
// src/app/api/ambassador/applications/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { isAmbassadorProgramEnabled } from "@/lib/features";

export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ... business logic
}
```

**Full gate order for ambassador-authenticated routes (from CONTEXT.md + RESEARCH.md):**
```typescript
// 1. Feature flag
if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
// 2. Auth
const ctx = await verifyAuth(request);
if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// 3. Role claim
const isAmbassador = hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador");
if (!isAmbassador) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
// 4. Zod parse
const parsed = LogEventSchema.safeParse(body);
if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
// 5. Business logic
```

**Phase 4 delta:**
- GET: query `ambassador_events` where `ambassadorId == ctx.uid`, `hidden == false`, ordered by `date desc`.
- POST: validate body with `LogEventSchema`; conditionally spread `link` and `notes` (Admin SDK rejects undefined); write to `ambassador_events` with `createdAt: FieldValue.serverTimestamp()`.
- Subdoc needed to populate `cohortId`: read `mentorship_profiles/{uid}/ambassador/v1` before the write.

---

## 10. `src/app/api/ambassador/events/[eventId]/route.ts` (NEW)

**Role:** API route — `PATCH` (edit event) and `DELETE` (delete event) with 30-day window enforcement (EVENT-02).

**Analog:** `src/app/api/ambassador/applications/[applicationId]/route.ts` — dynamic route with `params`, gate order, and ownership check.

**Key excerpts from analog (dynamic route params):**
```typescript
// src/app/api/ambassador/applications/[applicationId]/route.ts
type RouteParams = { params: Promise<{ applicationId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { applicationId } = await params;
  // ...
}
```

**Phase 4 delta:**
- `type RouteParams = { params: Promise<{ eventId: string }> }`.
- Gate: feature flag → verifyAuth → role claim (ambassador) → load event doc → ownership check (`event.ambassadorId === ctx.uid`).
- 30-day window check — server-side (RESEARCH.md Pitfall 6):
  ```typescript
  const eventDate = event.date instanceof Date ? event.date : event.date.toDate();
  const windowExpiry = new Date(eventDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (Date.now() > windowExpiry.getTime()) {
    return NextResponse.json({ error: "Edit window has closed (30 days after event date)" }, { status: 409 });
  }
  ```
- PATCH: conditionally spread optional fields; set `updatedAt: FieldValue.serverTimestamp()`.
- DELETE: `doc.delete()`.
- Unit test: `src/app/api/ambassador/events/[eventId]/route.test.ts` (Wave 0 gap).

---

## 11. `src/app/api/ambassador/events/admin/route.ts` (NEW)

**Role:** API route — `GET` all events for a cohort for admin (EVENT-03); `PATCH` to hide/unhide an event.

**Analog:** `src/app/api/ambassador/applications/[applicationId]/route.ts` — admin-only gate using `requireAdmin`.

**Key excerpts from analog (admin gate):**
```typescript
// src/app/api/ambassador/applications/[applicationId]/route.ts
import { requireAdmin } from "@/lib/ambassador/adminAuth";

export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  // ...
}
```

**Phase 4 delta:**
- GET: read `cohortId` from query params; query `ambassador_events` where `cohortId == cohortId`, ordered by `date desc`.
- PATCH body: `{ eventId: string; hidden: boolean }` — update `ambassador_events/{eventId}.hidden`.

---

## 12. `src/app/api/ambassador/report/route.ts` (NEW)

**Role:** API route — `POST` monthly self-report submission (REPORT-01, REPORT-02).

**Analog:** `src/app/api/ambassador/profile/route.ts` — full gate order, Zod parse, batched Firestore write.

**Key excerpts from analog (gate + Zod + write):**
```typescript
// Feature → auth → role → Zod → write
if (!isAmbassadorProgramEnabled()) { ... }
const ctx = await verifyAuth(request);
if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const isAmbassador = hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador");
if (!isAmbassador) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

const parsed = SomeSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
}
```

**Phase 4 delta:**
- Parse body with `MonthlyReportSchema`.
- Derive `month` string (`YYYY-MM`) from ambassador's `timezone` (read from subdoc) and current time using `Intl.DateTimeFormat`.
- Deterministic doc ID: `{uid}_{YYYY-MM}`.
- Existence check + conditional write (RESEARCH.md Pitfall 7 — race safety):
  ```typescript
  const docId = `${ctx.uid}_${month}`;
  const ref = db.collection("monthly_reports").doc(docId);
  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    if (snap.exists) throw new Error("already_submitted");
    txn.set(ref, { ambassadorId: ctx.uid, cohortId, month, ...input, submittedAt: FieldValue.serverTimestamp() });
  });
  ```
- Return 409 on `already_submitted`.
- Unit test: `src/app/api/ambassador/report/route.test.ts` (Wave 0 gap).

---

## 13. `src/app/api/ambassador/report/current/route.ts` (NEW)

**Role:** API route — `GET` current month report status for the authenticated ambassador (REPORT-03).

**Analog:** `src/app/api/ambassador/profile/route.ts` GET handler — auth gate + single Firestore read.

**Key excerpts from analog (GET shape):**
```typescript
// src/app/api/ambassador/profile/route.ts GET handler
export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const ctx = await verifyAuth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ... read subdoc, return JSON
}
```

**Phase 4 delta:**
- Read subdoc to get ambassador's `timezone`.
- Derive current month key (`YYYY-MM`) in ambassador's timezone.
- Read `monthly_reports/{uid}_{YYYY-MM}`.
- Response:
  ```typescript
  return NextResponse.json({
    month,                  // "YYYY-MM"
    submitted: snap.exists, // boolean
    submittedAt: snap.exists ? snap.data()?.submittedAt : null,
    deadlineUTC: getDeadlineUTC(year, monthNum, timezone),
  });
  ```

---

## 14. `src/app/api/ambassador/members/[uid]/strike/route.ts` (NEW)

**Role:** API route — `POST` to increment strike count on an active ambassador's subdoc (REPORT-06, D-05).

**Analog:** `src/app/api/ambassador/applications/[applicationId]/route.ts` — admin-only gate, dynamic route params, `FieldValue.increment`.

**Key excerpts from analog:**
```typescript
// Admin gate pattern
import { requireAdmin } from "@/lib/ambassador/adminAuth";

const admin = await requireAdmin(request);
if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

// FieldValue.increment usage (from Phase 2 established pattern)
import { FieldValue } from "firebase-admin/firestore";
txn.update(cohortRef, { acceptedCount: FieldValue.increment(1) });
```

**Phase 4 delta:**
- Route: `POST /api/ambassador/members/[uid]/strike`.
- Gate: feature flag → `requireAdmin` → read ambassador subdoc to confirm `active === true`.
- Write: `db.collection("mentorship_profiles").doc(uid).collection("ambassador").doc("v1").update({ strikes: FieldValue.increment(1) })`.
- FieldValue.increment is atomic server-side — no transaction needed.
- Response: `{ success: true, newStrikeCount: snap.data().strikes + 1 }` — note: the `+1` is optimistic since server-side increment is atomic; alternatively re-read the doc post-write.
- If `subdoc.strikes + 1 >= 2`, include `{ offboardingRequired: true }` in response so the admin UI can surface the Phase 5 hook point.

---

## 15. `src/app/ambassadors/report/page.tsx` (NEW)

**Role:** Server component page shell for `/ambassadors/report` — the ambassador self-report and event log page (D-01, EVENT-01, REPORT-01).

**Analog:** `src/app/ambassadors/apply/page.tsx` — server component shell that delegates all interactivity to a "use client" child.

**Key excerpts from analog:**
```typescript
// src/app/ambassadors/apply/page.tsx
// Feature-flag gate is inherited from src/app/ambassadors/layout.tsx
// Auth handling lives in the client component (ApplyWizard)

export default function ApplyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Apply to be a Student Ambassador</h1>
      </header>
      <ApplyWizard />
    </div>
  );
}
```

**Layout inherited (no gate needed in page):**
```typescript
// src/app/ambassadors/layout.tsx — already gates with isAmbassadorProgramEnabled() + MentorshipProvider
export default function AmbassadorsLayout({ children }) {
  if (!isAmbassadorProgramEnabled()) { notFound(); }
  return <MentorshipProvider>...</MentorshipProvider>;
}
```

**Phase 4 delta:**
- Import and render `ReportStatusBadge` (current month status — REPORT-03), `MonthlyReportForm` (REPORT-01), and `LogEventForm` (EVENT-01) as client components.
- Page layout: status badge at top, then event log form, then monthly report form — or use tabs.
- No `export const dynamic` needed (layout already handles auth; components fetch client-side).

---

## 16. Client component: `MonthlyReportForm` (NEW — lives in `src/app/ambassadors/report/`)

**Role:** "use client" component — submits the 3-field monthly self-report form (REPORT-01).

**Analog:** `src/app/profile/AmbassadorPublicCardSection.tsx` — "use client", uses `authFetch` + `useMentorship` + `useToast`, controlled form, dirty-check, save handler.

**Key excerpts from analog:**
```typescript
// src/app/profile/AmbassadorPublicCardSection.tsx
"use client";
import { useEffect, useState } from "react";
import { useMentorship } from "@/contexts/MentorshipContext";
import { useToast } from "@/contexts/ToastContext";
import { authFetch } from "@/lib/apiClient";

export default function AmbassadorPublicCardSection() {
  const { user } = useMentorship();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/ambassador/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(error ?? "Could not save");
        return;
      }
      toast.success("Saved");
    } catch {
      toast.error("Network error — try again");
    } finally {
      setSaving(false);
    }
  }
  // ...
}
```

**Phase 4 delta:**
- Three `<textarea>` fields: `whatWorked`, `whatBlocked`, `whatNeeded` (no min length per CONTEXT.md Specifics).
- On submit: `authFetch("/api/ambassador/report", { method: "POST", ... })`.
- On 409 (already submitted): show "Report already submitted for this month" info message — not an error toast.
- Disable form after successful submission for the current month (check via `ReportStatusBadge` state).

---

## 17. Client component: `LogEventForm` (NEW — lives in `src/app/ambassadors/report/`)

**Role:** "use client" component — logs a new ambassador event (EVENT-01).

**Analog:** Same as `MonthlyReportForm` above — `authFetch` + `useToast` + controlled form.

**Phase 4 delta:**
- Fields: `date` (date picker), `type` (select from `EVENT_TYPE_LABELS`), `attendanceEstimate` (number input), `link` (optional URL), `notes` (optional textarea).
- On submit: `authFetch("/api/ambassador/events", { method: "POST", ... })`.
- After success, refresh the event list (lift state up or use a `key` reset trick on the list component).

---

## 18. Client component: `ReportStatusBadge` (NEW — lives in `src/app/ambassadors/report/`)

**Role:** "use client" component — shows current month report status and next deadline (REPORT-03).

**Analog:** Cohort status badge pattern in `src/app/admin/ambassadors/cohorts/page.tsx` — fetches on mount, renders badge from API response.

**Key excerpts from analog (fetch-on-mount pattern):**
```typescript
// src/app/admin/ambassadors/cohorts/page.tsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadCohorts();
}, []);

const loadCohorts = async () => {
  setLoading(true);
  try {
    const res = await fetch("/api/ambassador/cohorts?scope=all", { headers: adminHeaders() });
    const data = await res.json();
    setCohorts(data.cohorts ?? []);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to load");
  } finally {
    setLoading(false);
  }
};
```

**Phase 4 delta:**
- `authFetch("/api/ambassador/report/current")` on mount.
- Show DaisyUI badge: green "Submitted" if `submitted === true`, yellow "Due by [date]" otherwise.
- Expose `submitted` boolean to sibling `MonthlyReportForm` via prop or shared state.

---

## 19. `/admin/ambassadors/members/page.tsx` (NEW)

**Role:** Admin page — lists active ambassadors for the members management surface (D-05).

**Analog:** `src/app/admin/ambassadors/page.tsx` — server component shell that delegates to a client list component.

**Key excerpts from analog:**
```typescript
// src/app/admin/ambassadors/page.tsx
export const dynamic = "force-dynamic";

export default function AdminAmbassadorsPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ambassador Applications</h1>
      </header>
      <ApplicationsList />
    </div>
  );
}
```

**Phase 4 delta:**
- Title: "Active Ambassadors".
- Render `<AmbassadorMembersList />` client component.
- `AmbassadorMembersList` queries `public_ambassadors` (top-level collection, all `active: true` docs) to get name/uid/cohort; links to `/admin/ambassadors/members/[uid]`.

---

## 20. `/admin/ambassadors/members/[uid]/page.tsx` (NEW)

**Role:** Admin detail page — shows activity summary, strike count, report history, cron flags; strike increment action (D-05, REPORT-06).

**Analog:** `src/app/admin/ambassadors/[applicationId]/page.tsx` — server shell + dynamic params + back-link pattern. `src/app/admin/ambassadors/cohorts/page.tsx` — client component with modal dialog and API calls using `adminHeaders()`.

**Key excerpts from analog (server shell):**
```typescript
// src/app/admin/ambassadors/[applicationId]/page.tsx
export const dynamic = "force-dynamic";
type RouteParams = { params: Promise<{ applicationId: string }> };

export default async function AdminApplicationDetailPage({ params }: RouteParams) {
  const { applicationId } = await params;
  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <nav className="text-sm mb-4">
        <a href="/admin/ambassadors" className="link">&larr; All applications</a>
      </nav>
      <ApplicationDetail applicationId={applicationId} />
    </div>
  );
}
```

**Key excerpts from analog (admin modal + action pattern):**
```typescript
// src/app/admin/ambassadors/cohorts/page.tsx
const adminHeaders = (): HeadersInit => {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  return { "Content-Type": "application/json", "x-admin-token": token ?? "" };
};

// Modal confirm pattern
{showCreate && (
  <dialog className="modal modal-open">
    <div className="modal-box">
      <h3 className="font-bold text-lg mb-4">Create Cohort</h3>
      <div className="modal-action">
        <button type="button" className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
        <button type="submit" className="btn btn-primary">Create</button>
      </div>
    </div>
    <div className="modal-backdrop" onClick={() => !submitting && setShowCreate(false)} />
  </dialog>
)}
```

**Phase 4 delta:**
- `type RouteParams = { params: Promise<{ uid: string }> }`.
- Back-link: `&larr; All members`.
- Client component `<AmbassadorMemberDetail uid={uid} />`:
  - Load: ambassador subdoc (strikes, cohortId, referralCode, timezone) + monthly_reports list + ambassador_events count + ambassador_cron_flags (unresolved).
  - Strike increment button: confirm modal → `POST /api/ambassador/members/[uid]/strike` with `adminHeaders()`.
  - If `strikes >= 2`, show warning banner (Phase 5 will add the offboarding trigger here).

---

## 21. `/admin/ambassadors/cohorts/[cohortId]/events/page.tsx` (NEW)

**Role:** Admin page — lists all events for a cohort with hide/unhide action (EVENT-03).

**Analog:** `src/app/admin/ambassadors/cohorts/page.tsx` — client component with `adminHeaders()`, data table, inline toggle actions.

**Key excerpts from analog (table + toggle pattern):**
```typescript
// Cohort page table + toggle
<table className="table table-zebra">
  <thead>...</thead>
  <tbody>
    {cohorts.map((c) => (
      <tr key={c.cohortId}>
        <td>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={c.applicationWindowOpen}
            onChange={() => toggleWindow(c)}
          />
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

**Phase 4 delta:**
- Read `cohortId` from route params.
- Fetch from `GET /api/ambassador/events/admin?cohortId={cohortId}`.
- Table columns: ambassador name, date, type (label from `EVENT_TYPE_LABELS`), attendance, link, hidden toggle.
- Hidden toggle: `PATCH /api/ambassador/events/admin` with `{ eventId, hidden: !current }`.

---

## 22. `src/app/profile/AmbassadorPublicCardSection.tsx` (MODIFY)

**Role:** Add timezone dropdown to the existing ambassador profile editor (D-04).

**Analog:** The file itself — existing controlled form pattern with `update(k)` helper.

**Key excerpts from existing form pattern:**
```typescript
// src/app/profile/AmbassadorPublicCardSection.tsx
type PublicFieldsState = {
  university: string;
  city: string;
  // ...
};

const update =
  (k: keyof PublicFieldsState) =>
  (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
```

**Phase 4 delta:**
1. Add `timezone: string` to `PublicFieldsState` (default `"UTC"`).
2. Add to `EMPTY`: `timezone: ""`.
3. Add timezone `<select>` populated from a curated IANA timezone list (or use the browser's `Intl.supportedValuesOf("timeZone")` — available in modern browsers).
4. The `PATCH /api/ambassador/profile` endpoint must be extended to accept and persist `timezone` to the ambassador subdoc.
5. The Zod schema in `src/types/ambassador.ts` (`AmbassadorPublicFieldsSchema`) must add `timezone: z.string().optional()`.

**Note:** `timezone` is stored on `mentorship_profiles/{uid}/ambassador/v1`, not on the parent profile. The PATCH handler reads the subdoc and writes `timezone` there — same pattern as other subdoc-only fields.

---

## 23. `scripts/ambassador-report-flag.ts` (NEW)

**Role:** GitHub Actions cron script — daily missing-report flagging (REPORT-04, REPORT-05). Writes to `ambassador_cron_flags` only. Never mutates strikes.

**Analog:** `scripts/mentorship-inactivity-warning.ts` — Firebase Admin init pattern, Discord integration, `dotenv` config.

**Key excerpts from analog:**
```typescript
// scripts/mentorship-inactivity-warning.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import * as admin from "firebase-admin";
import { sendDirectMessage } from "../src/lib/discord";

// Firebase Admin init (production path)
if (!admin.apps.length) {
  if (process.env.NODE_ENV === "production") {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      console.error("FIREBASE_SERVICE_ACCOUNT environment variable is not set");
      process.exit(1);
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } else {
    // dev path with local service account JSON
  }
}

const db = admin.firestore();
```

**Phase 4 delta:**
- Import `sendDirectMessage` from `../src/lib/discord` (not `sendDM` — RESEARCH.md Anti-Pattern).
- Import `getAmbassadorMonthKey`, `getDeadlineUTC` from `../src/lib/ambassador/reportDeadline`.
- Query: `db.collectionGroup("ambassador").where("active", "==", true)` to get all active ambassador subdocs.
- For each ambassador:
  1. Derive their previous month key using `getAmbassadorMonthKey(ambassador.timezone ?? "UTC")`.
  2. Check if a `monthly_reports/{uid}_{YYYY-MM}` doc exists.
  3. If missing AND `Date.now() > getDeadlineUTC(year, month, timezone)`: write a `ambassador_cron_flags` doc with `type: "missing_report"`, `period: YYYY-MM`, `flaggedAt: serverTimestamp`, `resolved: false`. NEVER write to the ambassador subdoc.
  4. If within 3 days of deadline: `sendDirectMessage(ambassador.discordHandle, reminderMessage)` (REPORT-05).
- Log all actions. Exit 0 on success; log errors and continue (do not fail the whole run on one bad ambassador).

---

## 24. `scripts/ambassador-discord-reconciliation.ts` (NEW)

**Role:** GitHub Actions cron script — weekly Discord Ambassador role reconciliation (DISC-04). Writes to `ambassador_cron_flags` only. Never mutates roles.

**Analog:** `scripts/mentorship-inactivity-warning.ts` — same Firebase Admin + Discord init pattern.

**Phase 4 delta:**
- Query `public_ambassadors` where `active == true` to get all active ambassadors.
- For each ambassador: call `lookupMemberByUsername(discordHandle)` from `src/lib/discord.ts`; if member found, check their roles for `DISCORD_AMBASSADOR_ROLE_ID`.
- If role missing: write `ambassador_cron_flags` with `type: "missing_discord_role"`, `resolved: false`. NEVER call `assignDiscordRole`.
- Discord check: use `getGuildMember` or `lookupMemberByUsername` — already in `src/lib/discord.ts`.

---

## 25. `.github/workflows/ambassador-activity-checks.yml` (NEW)

**Role:** GitHub Actions workflow — two scheduled jobs: daily report flag + weekly Discord reconciliation.

**Analog:** `.github/workflows/mentorship-inactivity-checks.yml` — copy-adapt structure directly.

**Key excerpts from analog:**
```yaml
# .github/workflows/mentorship-inactivity-checks.yml
name: Mentorship Inactivity Checks

on:
  schedule:
    - cron: '0 9 * * *'    # job 1
    - cron: '0 10 * * *'   # job 2
  workflow_dispatch:
    inputs:
      job:
        description: 'Which job to run'
        required: true
        default: 'warning'
        type: choice
        options: [warning, cleanup, both]

jobs:
  inactivity-warning:
    runs-on: ubuntu-latest
    if: |
      (github.event_name == 'schedule' && github.event.schedule == '0 9 * * *') ||
      (github.event_name == 'workflow_dispatch' && (github.event.inputs.job == 'warning' || github.event.inputs.job == 'both'))
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      - run: npm ci
      - name: Send inactivity warnings
        env:
          NODE_ENV: production
          DISCORD_BOT_TOKEN: ${{ secrets.DISCORD_BOT_TOKEN }}
          DISCORD_GUILD_ID: ${{ secrets.DISCORD_GUILD_ID }}
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
        run: npx tsx scripts/mentorship-inactivity-warning.ts
```

**Phase 4 delta:**
- Name: `Ambassador Activity Checks`.
- Schedules: `'0 8 * * *'` (daily report flag) and `'0 9 * * 1'` (weekly Monday Discord reconciliation).
- Job names: `ambassador-report-flag` and `ambassador-discord-reconciliation`.
- Run commands: `npx tsx scripts/ambassador-report-flag.ts` and `npx tsx scripts/ambassador-discord-reconciliation.ts`.
- Env secrets: same set as analog (`DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `FIREBASE_SERVICE_ACCOUNT`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`). Do NOT add `MAILGUN_*` (no email in Phase 4 crons).
- `workflow_dispatch` options: `report-flag`, `discord-reconciliation`, `both`.

---

## 26. `firestore.indexes.json` (MODIFY — verify needed indexes)

**Role:** Firestore composite index declarations — new collections require new indexes.

**Analog:** Check `firestore.indexes.json` at project root (may already exist from Phase 2/3).

**Phase 4 indexes to add:**

```json
{
  "indexes": [
    {
      "collectionGroup": "ambassador_events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ambassadorId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "ambassador_events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "cohortId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "ambassador_cron_flags",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ambassadorId", "order": "ASCENDING" },
        { "fieldPath": "resolved", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**Note on `referral_codes` approach:** Using top-level `referral_codes/{code}` doc (O(1) read) avoids the collection-group index on `ambassador.referralCode` that would otherwise be required (RESEARCH.md Pitfall 3). No additional index needed for referral lookup.

---

## Critical Import Rules (apply to all Phase 4 files)

| Import | Correct Pattern | Wrong Pattern |
|--------|----------------|---------------|
| Firestore db | `import { db } from "@/lib/firebaseAdmin"` | `admin.firestore()` directly |
| FieldValue | `import { FieldValue } from "firebase-admin/firestore"` | from `@/lib/firebaseAdmin` |
| Auth guard (user routes) | `import { verifyAuth } from "@/lib/auth"` | custom token parse |
| Role check | `import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions"` | manual claim read |
| Admin guard | `import { requireAdmin } from "@/lib/ambassador/adminAuth"` | custom header check |
| Feature flag | `import { isAmbassadorProgramEnabled } from "@/lib/features"` | `process.env.*` directly |
| Authenticated client fetch | `import { authFetch } from "@/lib/apiClient"` | plain `fetch` in components |
| Discord DM | `sendDirectMessage` from `@/lib/discord` | `sendDM` (does not exist) |
| Logger (server routes) | `import { createLogger } from "@/lib/logger"` | `console.log` directly |

---

## Firestore Write Safety Rules (all Phase 4 writes)

From `MEMORY.md` and RESEARCH.md:

1. **Never pass `undefined`** — Admin SDK rejects undefined field values. Always conditionally spread:
   ```typescript
   // Correct
   if (typeof link === "string" && link.trim().length > 0) payload.link = link.trim();
   // Wrong
   payload.link = link; // if link is undefined, Firestore rejects the write
   ```

2. **Query before transaction** — `where().limit().get()` is illegal inside `db.runTransaction`. Run all uniqueness checks pre-transaction, pass resolved values as closure variables.

3. **Cron scripts NEVER mutate strikes/roles** — only write to `ambassador_cron_flags`. D-06 is a hard constraint.

4. **Cookie clearing is synchronous** — set `response.cookies.delete("cwa_ref")` on the `NextResponse` object being returned, not in a fire-and-forget async.
