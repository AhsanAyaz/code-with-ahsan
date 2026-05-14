# Phase 5: Dashboard, Leaderboard, Offboarding & Alumni — Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 14 new/modified files
**Analogs found:** 13 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/ambassadors/dashboard/page.tsx` | route/shell | request-response | `src/app/ambassadors/report/page.tsx` | exact |
| `src/app/ambassadors/dashboard/DashboardClient.tsx` | component | request-response | `src/app/ambassadors/report/ReportPageClient.tsx` | exact |
| `src/app/ambassadors/dashboard/PersonalStatsPanel.tsx` | component | request-response | `src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx` | exact |
| `src/app/ambassadors/dashboard/OnboardingChecklist.tsx` | component | request-response | `src/app/admin/ambassadors/members/[uid]/CronFlagsPanel.tsx` | role-match |
| `src/app/ambassadors/dashboard/LeaderboardPanel.tsx` | component | request-response | `src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx` | role-match |
| `src/app/ambassadors/dashboard/AmbassadorOfMonthBanner.tsx` | component | request-response | `src/app/admin/ambassadors/[applicationId]/DiscordBanner.tsx` | role-match |
| `src/app/api/ambassador/dashboard/me/route.ts` | API route | request-response | `src/app/api/ambassador/members/[uid]/route.ts` | exact |
| `src/app/api/ambassador/dashboard/leaderboard/route.ts` | API route | request-response | `src/app/api/ambassador/members/route.ts` | exact |
| `src/app/api/ambassador/members/[uid]/offboard/route.ts` | API route | request-response | `src/app/api/ambassador/members/[uid]/route.ts` (DELETE handler) | exact |
| `src/app/api/ambassador/members/[uid]/alumni/route.ts` | API route | request-response | `src/app/api/ambassador/members/[uid]/route.ts` (DELETE handler) | role-match |
| `src/lib/ambassador/leaderboard.ts` | utility/service | transform | `src/lib/ambassador/acceptance.ts` | role-match |
| `scripts/ambassador-leaderboard-snapshot.ts` | cron script | batch | `scripts/ambassador-report-flag.ts` | exact |
| `.github/workflows/ambassador-activity-checks.yml` (modify) | config | batch | `.github/workflows/ambassador-activity-checks.yml` | exact |
| `src/lib/email.ts` (modify — add sendAmbassadorOffboardingEmail) | utility | request-response | `src/lib/email.ts` lines 605–657 (sendAmbassadorApplicationSubmittedEmail) | exact |

---

## Pattern Assignments

### `src/app/ambassadors/dashboard/page.tsx` (route, request-response)

**Analog:** `src/app/ambassadors/report/page.tsx`

**Full file pattern** (lines 1–19):
```typescript
/**
 * Phase 5 (DASH-01): Ambassador Dashboard page.
 */
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default function AmbassadorDashboardPage() {
  return (
    <main className="page-padding mx-auto max-w-4xl space-y-8 py-8">
      <DashboardClient />
    </main>
  );
}
```

The `dynamic = "force-dynamic"` export is required — the layout gate (`isAmbassadorProgramEnabled()`) runs on every request; static caching would bypass it.

---

### `src/app/ambassadors/dashboard/DashboardClient.tsx` (component, request-response)

**Analog:** `src/app/ambassadors/report/ReportPageClient.tsx`

**Imports pattern** (lines 1–7):
```typescript
"use client";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/apiClient";
import { useMentorship } from "@/contexts/MentorshipContext";
import { hasRole } from "@/lib/permissions";
import { useRouter } from "next/navigation";
```

**Auth gate pattern** — must use `useEffect` + `hasRole` redirect (not a server-side guard, because the layout's `isAmbassadorProgramEnabled` is the only server guard for this route tree):
```typescript
// from RESEARCH.md Pattern 1, mirrors ReportPageClient structure
const { profile, isLoading } = useMentorship();
const router = useRouter();

useEffect(() => {
  if (!isLoading && profile && !hasRole(profile, "ambassador")) {
    router.replace("/profile");
  }
}, [profile, isLoading, router]);
```

**Data fetch pattern** (mirrors ReportPageClient lines 13–29 — cancel-safe async in useEffect):
```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const res = await authFetch("/api/ambassador/dashboard/me");
      if (!res.ok) return;
      const json = await res.json();
      if (!cancelled) setDashboardData(json);
    } catch {
      /* set error state */
    }
  })();
  return () => { cancelled = true; };
}, []);
```

**Loading state** (line 94–99 of MemberDetailClient.tsx):
```tsx
if (!detail) {
  return (
    <div className="py-12 text-center">
      <span className="loading loading-spinner loading-md" aria-label="Loading" />
    </div>
  );
}
```

---

### `src/app/ambassadors/dashboard/PersonalStatsPanel.tsx` (component, request-response)

**Analog:** `src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx`

**Full file pattern** (lines 1–49):
```tsx
"use client";

export function PersonalStatsPanel({
  referralsCount,
  eventsCount,
  reportsOnTime,
  strikes,
  nextReportDue,
}: { ... }) {
  return (
    <section className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Your Impact This Cohort</h2>
        <div className="stats stats-vertical lg:stats-horizontal shadow">
          <div className="stat">
            <div className="stat-title">Referrals</div>
            <div className="stat-value">{referralsCount}</div>
          </div>
          {/* ... */}
          <div className="stat">
            <div className="stat-title">Confirmed Strikes</div>
            <div
              className={strikes >= 2 ? "stat-value text-error" : "stat-value"}
            >
              {strikes}
            </div>
          </div>
        </div>
        {strikes >= 2 && (
          <div role="alert" className="alert alert-error mt-4">
            <span>You have 2 confirmed strikes. Reach out to the program admin if you have questions.</span>
          </div>
        )}
      </div>
    </section>
  );
}
```

The `text-error` class for `strikes >= 2` is established in ActivitySummaryPanel line 37. The `stats stats-vertical lg:stats-horizontal shadow` layout is the exact DaisyUI composition to copy.

---

### `src/app/ambassadors/dashboard/LeaderboardPanel.tsx` (component, request-response)

**Analog:** `src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx` (card structure) + `src/app/admin/ambassadors/[applicationId]/DiscordBanner.tsx` (alert banner pattern)

**Card + tab toggle pattern:**
```tsx
"use client";
import { useState } from "react";

export function LeaderboardPanel({ ... }) {
  const [view, setView] = useState<"cumulative" | "this_month">("cumulative");

  // Grace period check
  if (graceActive) {
    return (
      <section className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Cohort Leaderboard</h2>
          <div role="alert" className="alert alert-info">
            <span>Leaderboard unlocks in {weeksRemaining} week(s). Build momentum — your activity is already being tracked.</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="card-title">Cohort Leaderboard</h2>
          {/* tab toggle */}
          <div role="tablist" className="tabs tabs-boxed">
            <button
              role="tab"
              className={`tab ${view === "cumulative" ? "tab-active" : ""}`}
              onClick={() => setView("cumulative")}
            >All time</button>
            <button
              role="tab"
              className={`tab ${view === "this_month" ? "tab-active" : ""}`}
              onClick={() => setView("this_month")}
            >This month</button>
          </div>
        </div>
        {/* table: 3 columns, one per category */}
        {/* own rank row: full-width, bg-primary/10 */}
        <p aria-live="polite" className="text-sm text-base-content/60">
          Updated {minutesAgo} minutes ago
        </p>
      </div>
    </section>
  );
}
```

**Key constraint from UI-SPEC §Leaderboard table layout:** Use `<table>` semantics (not CSS grid). "Your rank" row spans full width with `bg-primary/10`. Never render full sorted list — only top-3 per category.

---

### `src/app/ambassadors/dashboard/AmbassadorOfMonthBanner.tsx` (component, request-response)

**Analog:** `src/app/admin/ambassadors/[applicationId]/DiscordBanner.tsx`

**Pattern:** Conditional render only when `ambassadorOfTheMonth` is set. Use `alert` or card with accent styling:
```tsx
"use client";

export function AmbassadorOfMonthBanner({ ambassadorOfTheMonth }: { ambassadorOfTheMonth: string | null }) {
  if (!ambassadorOfTheMonth) return null; // never render blank banner (UI-SPEC §Visual Hierarchy Notes)
  return (
    <div className="alert border-primary">
      <span className="font-bold text-primary">Ambassador of the Month</span>
      <span>{ambassadorOfTheMonth}</span>
    </div>
  );
}
```

---

### `src/app/api/ambassador/dashboard/me/route.ts` (API route, request-response)

**Analog:** `src/app/api/ambassador/members/[uid]/route.ts` lines 1–106

**Imports pattern** (lines 1–19 of members/[uid]/route.ts):
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { verifyAuth } from "@/lib/auth";
import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions";
import {
  AMBASSADOR_EVENTS_COLLECTION,
  MONTHLY_REPORTS_COLLECTION,
  REFERRALS_COLLECTION,
} from "@/types/ambassador";
```

**Auth gate pattern** (ambassador-facing route uses `verifyAuth` + `hasRoleClaim`, NOT `requireAdmin`):
```typescript
export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled())
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ctx = await verifyAuth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const uid = ctx.uid;
  // ...
}
```

**Parallel Firestore reads pattern** (lines 49–87 of members/[uid]/route.ts):
```typescript
const [profileSnap, subdocSnap] = await Promise.all([
  db.collection("mentorship_profiles").doc(uid).get(),
  db.collection("mentorship_profiles").doc(uid).collection("ambassador").doc("v1").get(),
]);

if (!subdocSnap.exists)
  return NextResponse.json({ error: "Ambassador not found" }, { status: 404 });

const [referralsCountSnap, eventsSnap, reportsSnap, cohortSnap] = await Promise.all([
  db.collection(REFERRALS_COLLECTION).where("ambassadorId", "==", uid).count().get(),
  db.collection(AMBASSADOR_EVENTS_COLLECTION)
    .where("ambassadorId", "==", uid).where("hidden", "==", false).count().get(),
  db.collection(MONTHLY_REPORTS_COLLECTION)
    .where("ambassadorId", "==", uid).count().get(),
  db.collection(AMBASSADOR_COHORTS_COLLECTION).doc(subdoc.cohortId).get(),
]);
```

**Timestamp normalization helper** (lines 23–32 of members/[uid]/route.ts — copy verbatim):
```typescript
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
```

---

### `src/app/api/ambassador/dashboard/leaderboard/route.ts` (API route, request-response)

**Analog:** `src/app/api/ambassador/members/route.ts` (gate structure) + RESEARCH.md Code Examples §Leaderboard API endpoint

**Auth gate** — same `verifyAuth` + `hasRoleClaim("ambassador")` pattern as `me/route.ts` above.

**Single-doc Firestore read + partial response** (from RESEARCH.md §Code Examples):
```typescript
const snap = await db.collection(LEADERBOARD_SNAPSHOTS_COLLECTION).doc(cohortId).get();
if (!snap.exists) return NextResponse.json({ snapshot: null }, { status: 200 });

const data = snap.data() as LeaderboardSnapshot;
const viewData = view === "this_month" ? data.thisMonth : data.cumulative;

// CRITICAL: return only own rank — never the full ambassadorRanks map
return NextResponse.json({
  top3: {
    referrals: viewData.referrals,
    events: viewData.events,
    reportsOnTime: viewData.reportsOnTime,
  },
  ownRank: viewData.ambassadorRanks[ctx.uid] ?? null,
  updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
  graceEndDate: data.graceEndDate,
});
```

`LEADERBOARD_SNAPSHOTS_COLLECTION` must be added to `src/lib/ambassador/constants.ts` (same pattern as all other collection constants in that file, lines 22–75).

---

### `src/app/api/ambassador/members/[uid]/offboard/route.ts` (API route, request-response)

**Analog:** `src/app/api/ambassador/members/[uid]/route.ts` DELETE handler (lines 108–144)

**Gate pattern** (lines 113–118 of members/[uid]/route.ts):
```typescript
if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
const admin = await requireAdmin(request);
if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

const { uid } = await Promise.resolve(params);
if (!uid) return NextResponse.json({ error: "Invalid uid" }, { status: 400 });
```

**Batch write pattern** (lines 127–143 of members/[uid]/route.ts — Phase 5 extends with `active: false` + `offboardedAt` instead of delete):
```typescript
const profileRef = db.collection("mentorship_profiles").doc(uid);
const subdocRef = profileRef.collection("ambassador").doc("v1");
const subdocSnap = await subdocRef.get();
if (!subdocSnap.exists) return NextResponse.json({ error: "Ambassador not found" }, { status: 404 });

const batch = db.batch();
// Phase 5 offboarding differs from DELETE: keep subdoc (active: false) for history
batch.update(profileRef, { roles: FieldValue.arrayRemove("ambassador") });
batch.update(subdocRef, {
  active: false,
  endedAt: FieldValue.serverTimestamp(),
  offboardedAt: FieldValue.serverTimestamp(),
});
batch.delete(db.collection(PUBLIC_AMBASSADORS_COLLECTION).doc(uid)); // ALUMNI-02: no public projection
await batch.commit();
```

**Soft Discord removal + soft email + claim sync** (from RESEARCH.md Pattern 3):
```typescript
// Soft — failures are captured in response, not thrown
const discordMemberId = (subdocSnap.data() as AmbassadorSubdoc).discordMemberId;
const discordRemoved = discordMemberId
  ? await removeDiscordRole(discordMemberId, DISCORD_AMBASSADOR_ROLE_ID)
  : false;

const emailSent = await sendAmbassadorOffboardingEmail(email, displayName, cohortName)
  .catch(() => false);

// Non-fatal claim sync (same pattern as members/[uid] DELETE lines 137–141)
try {
  await syncAmbassadorClaim(uid);
} catch (e) {
  logger.error("syncAmbassadorClaim after offboarding failed", { uid, error: e });
}

return NextResponse.json({ success: true, discordRemoved, emailSent });
```

---

### `src/app/api/ambassador/members/[uid]/alumni/route.ts` (API route, request-response)

**Analog:** `src/app/api/ambassador/members/[uid]/route.ts` DELETE handler (lines 108–144)

**Critical Firestore constraint** (from RESEARCH.md Pitfall 1): `FieldValue.arrayUnion` and `FieldValue.arrayRemove` cannot target the same field in a single `update()`. Two sequential `batch.update()` calls required:

```typescript
const batch = db.batch();
// Call 1: add alumni role
batch.update(profileRef, { roles: FieldValue.arrayUnion("alumni-ambassador") });
// Call 2: remove ambassador role (separate update — same ref is fine in a batch)
batch.update(profileRef, { roles: FieldValue.arrayRemove("ambassador") });
// Call 3: close subdoc (keep doc, flip active)
batch.update(subdocRef, { active: false, endedAt: FieldValue.serverTimestamp() });
// Call 4: keep public projection but flip active (ALUMNI-03 — badge stays on /u/[username])
batch.update(db.collection(PUBLIC_AMBASSADORS_COLLECTION).doc(uid), { active: false });
await batch.commit();

await syncAmbassadorClaim(uid).catch(console.error);
```

Gate: `requireAdmin` (same as offboard). Additional check: subdoc must exist AND `subdoc.active === true`.

---

### `src/lib/ambassador/leaderboard.ts` (utility/service, transform)

**Analog:** `src/lib/ambassador/acceptance.ts` (module structure — named exports, typed interfaces at top, helpers below)

**Module structure pattern** (from acceptance.ts lines 1–60):
```typescript
/**
 * src/lib/ambassador/leaderboard.ts
 *
 * Leaderboard snapshot builder for Phase 5 (DASH-03).
 * Called by scripts/ambassador-leaderboard-snapshot.ts (cron).
 * Read by GET /api/ambassador/dashboard/leaderboard.
 */

// Export interfaces first (consumed by both cron and API)
export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL: string;
  count: number;
}

export interface LeaderboardSnapshot {
  cohortId: string;
  updatedAt: FirebaseFirestore.Timestamp;
  graceEndDate: string; // ISO — cohort.startDate.toDate() + 28 days
  cumulative: { ... };
  thisMonth: { ... };
}

// buildLeaderboardSnapshot() helper — called by cron
export async function buildLeaderboardSnapshot(cohortId: string): Promise<LeaderboardSnapshot> { ... }
```

**Collection constant pattern** (from constants.ts lines 22–75 — add to that file):
```typescript
/** Phase 5: Top-level Firestore collection for hourly leaderboard snapshot docs (DASH-07).
 *  Doc id is cohortId. Written by ambassador-leaderboard-snapshot cron. */
export const LEADERBOARD_SNAPSHOTS_COLLECTION = "leaderboard_snapshots" as const;
```

---

### `scripts/ambassador-leaderboard-snapshot.ts` (cron script, batch)

**Analog:** `scripts/ambassador-report-flag.ts` (lines 1–106 — exact structural match)

**Header + dotenv pattern** (lines 1–34 of ambassador-report-flag.ts):
```typescript
#!/usr/bin/env npx tsx
/**
 * Phase 5 (DASH-07): Hourly leaderboard snapshot writer.
 * ...
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  LEADERBOARD_SNAPSHOTS_COLLECTION,
} from "../src/lib/ambassador/constants";
import { PUBLIC_AMBASSADORS_COLLECTION } from "../src/types/ambassador";
```

Note the `../src/` relative path (NOT `@/`) — cron scripts live outside `src/`, so TypeScript path aliases don't apply. This is established in `ambassador-report-flag.ts` line 21.

**Active ambassador enumeration pattern** (lines 46–80 of ambassador-report-flag.ts — use `public_ambassadors` NOT collectionGroup per Pitfall 7):
```typescript
const snap = await db
  .collection(PUBLIC_AMBASSADORS_COLLECTION)
  .where("active", "==", true)
  .get();
```

**DRY_RUN flag pattern** (line 35 of ambassador-report-flag.ts):
```typescript
const DRY_RUN = process.argv.includes("--dry-run");
```

**Main function pattern** (lines 147–160 of ambassador-report-flag.ts):
```typescript
async function main() {
  console.log(`[ambassador-leaderboard-snapshot] starting at ${new Date().toISOString()} (dry-run=${DRY_RUN})`);
  // ...
}
main().catch((e) => { console.error(e); process.exit(1); });
```

---

### `.github/workflows/ambassador-activity-checks.yml` (modify — add third job)

**Analog:** Existing jobs in the same file (lines 29–84)

**New job pattern** — add after line 84, following the exact structure of `ambassador-discord-reconciliation` (lines 58–84):
```yaml
  ambassador-leaderboard-snapshot:
    name: Hourly leaderboard snapshot (DASH-07)
    runs-on: ubuntu-latest
    if: |
      (github.event_name == 'schedule' && github.event.schedule == '0 * * * *') ||
      (github.event_name == 'workflow_dispatch' && (github.event.inputs.job == 'leaderboard-snapshot' || github.event.inputs.job == 'both'))
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      - run: npm ci
      - name: Run leaderboard-snapshot cron
        env:
          NODE_ENV: production
          FIREBASE_SERVICE_ACCOUNT_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
        run: |
          if [ "${{ github.event.inputs.dry_run }}" = "true" ]; then
            npx tsx scripts/ambassador-leaderboard-snapshot.ts --dry-run
          else
            npx tsx scripts/ambassador-leaderboard-snapshot.ts
          fi
```

Also add `leaderboard-snapshot` to the `workflow_dispatch.inputs.job.options` array at line 17 and add `- cron: '0 * * * *'` to the `on.schedule` list at line 7.

---

### `src/lib/email.ts` (modify — add `sendAmbassadorOffboardingEmail`)

**Analog:** `sendAmbassadorApplicationSubmittedEmail` (lines 605–624 of email.ts)

**New function pattern** — append after `sendAmbassadorApplicationDeclinedEmail` (after line ~690):
```typescript
/**
 * EMAIL-04 — Offboarding email on 2-strike removal.
 */
export async function sendAmbassadorOffboardingEmail(
  recipientEmail: string,
  displayName: string,
  cohortName: string,
): Promise<boolean> {
  const subject = "Your Ambassador Status — Important Update";
  const siteUrl = getSiteUrlForAmbassadorEmails();
  const content = `
    <h2>Ambassador Program Update</h2>
    <p>Hi ${displayName},</p>
    <p>After two confirmed accountability checks, your participation in the <strong>${cohortName}</strong> ambassador cohort has ended.</p>
    <div class="highlight warning">
      <p>Your Discord Ambassador role has been removed. Your contributions during your time in the program are genuinely appreciated.</p>
    </div>
    <p>Future cohorts remain open. We hope to see you again when the timing is better.<br/>— Ahsan</p>
    <a href="${siteUrl}/ambassadors" class="button">Learn about future cohorts</a>
  `;
  return sendEmail(recipientEmail, subject, wrapEmailHtml(content, subject));
}
```

Both `sendEmail` and `wrapEmailHtml` are private to `email.ts` — this function must be added inside that file, not in a new module.

---

## Shared Patterns

### Feature Flag Gate
**Source:** `src/lib/features.ts` via `isAmbassadorProgramEnabled()`
**Apply to:** All new API routes and the dashboard page shell
```typescript
if (!isAmbassadorProgramEnabled())
  return NextResponse.json({ error: "Not found" }, { status: 404 });
```

### Ambassador Auth (client-facing API routes)
**Source:** `src/lib/auth.ts` `verifyAuth` + `src/lib/permissions.ts` `hasRoleClaim`
**Apply to:** `me/route.ts`, `leaderboard/route.ts`
```typescript
const ctx = await verifyAuth(request);
if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador"))
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

### Admin Auth (admin-facing API routes)
**Source:** `src/lib/ambassador/adminAuth.ts` `requireAdmin`
**Apply to:** `offboard/route.ts`, `alumni/route.ts`
```typescript
const admin = await requireAdmin(request);
if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
```

### Client-side Role Guard (ambassador-facing pages)
**Source:** `src/app/ambassadors/report/ReportPageClient.tsx` + `src/lib/permissions.ts` `hasRole`
**Apply to:** `DashboardClient.tsx`
```typescript
const { profile, isLoading } = useMentorship();
const router = useRouter();
useEffect(() => {
  if (!isLoading && profile && !hasRole(profile, "ambassador")) {
    router.replace("/profile");
  }
}, [profile, isLoading, router]);
```

### Admin Token Header (admin UI components)
**Source:** `src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx` lines 8–11 + `MemberDetailClient.tsx` lines 41–44
**Apply to:** `OffboardConfirmModal.tsx`, `AlumniTransitionButton.tsx`
```typescript
function adminHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  return { "x-admin-token": token ?? "" };
}
```

### Modal Pattern (admin destructive actions)
**Source:** `src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx` lines 49–90
**Apply to:** `OffboardConfirmModal.tsx`
```tsx
<dialog className="modal modal-open" aria-labelledby="offboard-confirm-heading">
  <div className="modal-box">
    <h3 id="offboard-confirm-heading" className="text-xl font-bold">
      Offboard {displayName}?
    </h3>
    {/* body + error alert + modal-action buttons */}
    <div className="modal-action">
      <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
        Go back
      </button>
      <button type="button" className="btn btn-error" onClick={handleConfirm} disabled={submitting}>
        {submitting && <span className="loading loading-spinner loading-sm" />}
        Yes, offboard {displayName}
      </button>
    </div>
  </div>
  <form method="dialog" className="modal-backdrop" onClick={onClose}>
    <button type="button" aria-label="Close">close</button>
  </form>
</dialog>
```

### Toast Feedback Pattern
**Source:** `src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx` lines 24–25, 40–41
**Apply to:** All new admin UI components
```typescript
const toast = useToast(); // from @/contexts/ToastContext
// on success:
toast.success("displayName has been offboarded.");
// on non-blocking failure:
toast.error("Offboarding email could not be sent. Follow up manually.");
```

### Discord Role Removal (new function in discord.ts)
**Source:** `src/lib/discord.ts` `assignDiscordRole` (lines 882–935) — DELETE is the symmetrical counterpart of PUT
**Apply to:** `offboard/route.ts` via `removeDiscordRole`

New function to add to `src/lib/discord.ts` after `assignDiscordRole` (line 935):
```typescript
export async function removeDiscordRole(
  discordMemberIdOrUsername: string,
  roleId: string,
): Promise<boolean> {
  log.debug(`Removing role ${roleId} from user ${discordMemberIdOrUsername}`);
  try {
    let memberId: string;
    if (/^\d{17,19}$/.test(discordMemberIdOrUsername)) {
      memberId = discordMemberIdOrUsername;
    } else {
      const member = await lookupMemberByUsername(discordMemberIdOrUsername);
      if (!member) {
        log.warn(`[Discord] Cannot remove role - user not found: ${discordMemberIdOrUsername}`);
        return false;
      }
      memberId = member.id;
    }
    const guildId = getGuildId();
    // DELETE /guilds/{guild_id}/members/{user_id}/roles/{role_id}
    // 204 = success; 404 = member not in guild — treat as success (idempotent)
    const response = await fetchWithRateLimit(
      `${DISCORD_API}/guilds/${guildId}/members/${memberId}/roles/${roleId}`,
      { method: "DELETE", headers: getHeaders() }
    );
    if (response.status === 204 || response.status === 404) {
      log.debug(`Role ${roleId} removed from ${discordMemberIdOrUsername} (status ${response.status})`);
      return true;
    }
    const errorText = await response.text();
    log.error(`[Discord] Failed to remove role ${roleId}: ${response.status} - ${errorText}`);
    return false;
  } catch (error) {
    log.error(`[Discord] Error removing role ${roleId}:`, error);
    return false;
  }
}
```

### Batch Write Commit with Soft Post-commit Steps
**Source:** `src/app/api/ambassador/members/[uid]/route.ts` DELETE handler lines 127–143
**Apply to:** `offboard/route.ts`, `alumni/route.ts`

Pattern: commit the Firestore batch first (hard failure boundary), then Discord/email/claims as soft steps. Failures in soft steps are captured in the response body, not thrown as HTTP 500.

### Constants Registry
**Source:** `src/lib/ambassador/constants.ts` lines 22–75
**Apply to:** `LEADERBOARD_SNAPSHOTS_COLLECTION` addition; imported in both cron (relative `../src/lib/ambassador/constants`) and API routes (`@/lib/ambassador/constants`)

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/app/ambassadors/dashboard/OnboardingChecklist.tsx` | component | request-response | No checklist/to-do component exists in the codebase. Closest structural analog is `CronFlagsPanel` (list of items with actions) but the UX is different. Use DaisyUI `<ul role="list">` with `<li>` items, `<button type="button">` for self-mark items per UI-SPEC §Accessibility Constraints. |

---

## Metadata

**Analog search scope:** `src/app/ambassadors/`, `src/app/api/ambassador/`, `src/app/admin/ambassadors/`, `src/lib/ambassador/`, `src/lib/discord.ts`, `src/lib/email.ts`, `src/lib/auth.ts`, `src/lib/permissions.ts`, `scripts/`, `.github/workflows/`
**Files scanned:** 18 source files read directly; additional files searched via Grep/Glob
**Pattern extraction date:** 2026-05-06
