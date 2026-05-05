# Phase 5: Dashboard, Leaderboard, Offboarding & Alumni — Research

**Researched:** 2026-05-05
**Domain:** Next.js 16 / React 19 / Firebase (Firestore + Auth) / DaisyUI / Mailgun / Discord REST API
**Confidence:** HIGH — all findings grounded in live codebase inspection and verified against existing Phase 1–4 patterns.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | `/ambassadors/dashboard` gated to `hasRole(profile, "ambassador")`; all others 404 | Proven pattern from `/ambassadors/report` (Phase 4); `hasRoleClaim` on client, `verifyAuth` + `hasRoleClaim` on API |
| DASH-02 | Personal stats panel: referral count, events hosted, reports on-time, strike count, cohort progress, next-report-due | All source collections exist (`referrals`, `ambassador_events`, `monthly_reports`, `ambassador/v1` subdoc) |
| DASH-03 | Private cohort leaderboard — raw per-category metrics, no composite score | Hourly snapshot collection approach; Firestore reads from snapshot doc |
| DASH-04 | Leaderboard views: cumulative (default) + "this month" filter | Snapshot doc stores both windows; simple tab toggle |
| DASH-05 | Top-3 per category + private own-rank ("Your rank: #7"), nobody visibly last | Snapshot structure includes sorted arrays + ambassador-specific rank lookup |
| DASH-06 | Leaderboard hidden for first 4 weeks; shows banner with countdown | `cohort.startDate` diff math; `getCurrentCohortId` already exists |
| DASH-07 | Hourly snapshot written by GitHub Actions cron; UI shows "Updated N min ago" + manual refresh | Pattern mirrors `ambassador-report-flag.ts`; new `scripts/ambassador-leaderboard-snapshot.ts` |
| DASH-08 | Onboarding checklist with per-item completion state on ambassador subdoc | New flags on `ambassador/v1` subdoc; `onboarding.*` fields |
| DASH-09 | "Ambassador of the Month" field from `cohorts/{cohortId}` | New `ambassadorOfTheMonth` field on `CohortDoc`; admin PATCH sets it |
| ALUMNI-01 | Term completion: `active→false`, `endedAt`, swap `ambassador`→`alumni-ambassador` atomically | `syncRoleClaim` + `FieldValue.arrayRemove/arrayUnion` batch write |
| ALUMNI-02 | Strike-offboarded ambassadors do NOT get alumni flag | Separate offboarding endpoint vs alumni endpoint |
| ALUMNI-03 | Public badge renders "Alumni Ambassador"; `/ambassadors` stops listing them | `AmbassadorBadge` already handles `alumni-ambassador` (Phase 3 D-10); `active` flag gates `/ambassadors` query |
| DISC-05 | Offboarding removes Discord Ambassador role; failures surface in admin panel with retry | New `removeDiscordRole` function in `discord.ts`; same soft-failure pattern as accept flow |
| EMAIL-04 | Offboarding email on 2-strike removal | Mailgun transactional email; same pattern as EMAIL-01..03 in `src/lib/email.ts` |
</phase_requirements>

---

## Summary

Phase 5 is the **aggregation and lifecycle-completion** layer of the Ambassador Program. It sits entirely on top of the data written by Phases 2–4: the ambassador subdoc, `referrals`, `ambassador_events`, `monthly_reports`, and `ambassador_cron_flags` collections. Nothing in Phase 5 introduces new raw-data ingestion; instead it reads that data to power a personal-stats dashboard, a calm hourly-updated leaderboard, an onboarding checklist, and two distinct lifecycle-exit paths (alumni and strike-offboarding).

The key architectural insight is that Phase 5 contains three logically independent subsystems sharing one route tree:
1. **Dashboard + Leaderboard** — a new `/ambassadors/dashboard` page backed by a new hourly-snapshot cron and a few new API endpoints.
2. **Alumni transition** — an admin-triggered or term-completion API that atomically swaps the role, flips subdoc flags, and updates the public projection.
3. **2-strike offboarding** — extends the existing admin member detail page's StrikePanel with a new offboarding API endpoint that chains Firestore writes, Discord role removal (DISC-05), email (EMAIL-04), and public-projection cleanup.

All three subsystems reuse existing helpers: `syncRoleClaim` / `syncAmbassadorClaim` from `acceptance.ts`, `assignDiscordRole` / the to-be-added `removeDiscordRole` from `discord.ts`, `sendAmbassadorApplication*Email` patterns from `email.ts`, and `AmbassadorBadge` (already handles `alumni-ambassador`).

**Primary recommendation:** Plan five focused plans — (1) types + leaderboard snapshot schema, (2) leaderboard cron + API, (3) dashboard UI, (4) offboarding API + Discord role removal + email, (5) admin UI wiring + alumni endpoint. Keep offboarding and alumni as separate endpoints on the same admin member-detail page.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dashboard auth gate | API / Backend | Frontend (claim check) | `verifyAuth` + `hasRoleClaim` on API; client uses `useMentorship` role check to redirect before fetch |
| Personal stats (referrals, events, reports) | API / Backend | — | Aggregates across 4 Firestore collections; too expensive for client-side fan-out |
| Leaderboard snapshot write | GitHub Actions cron script | — | Hourly aggregation job; mirrors existing `ambassador-report-flag.ts` pattern |
| Leaderboard snapshot read | API / Backend | — | Single doc read from `leaderboard_snapshots/{cohortId}`; Dashboard client fetches via API |
| Onboarding checklist state | Database / Storage (Firestore subdoc) | API / Backend | Flags live on `ambassador/v1` subdoc; PATCH endpoint updates them |
| Ambassador of the Month | Database / Storage (cohort doc) | Admin API | Admin PATCH to `cohorts/{cohortId}` adds `ambassadorOfTheMonth` field |
| Alumni transition (role swap) | API / Backend | — | Atomic Firestore batch: `arrayRemove("ambassador")` + `arrayUnion("alumni-ambassador")` + subdoc update + public projection update + claim sync |
| 2-strike offboarding | API / Backend | — | Atomic batch: role strip + subdoc `active→false` + public projection delete/update + Discord role remove + email |
| Discord role removal (DISC-05) | API / Backend → Discord REST | — | New `removeDiscordRole` in `discord.ts`; same `DELETE /guilds/{g}/members/{m}/roles/{r}` pattern as assign |
| Offboarding email (EMAIL-04) | API / Backend → Mailgun | — | New `sendAmbassadorOffboardingEmail` in `email.ts`; same Mailgun pattern |
| Public projection update on alumni | API / Backend | — | PATCH `public_ambassadors/{uid}` to set `active: false`; `/ambassadors` query already filters `active == true` |

---

## Standard Stack

### Core (all already present — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.0.10 | App Router, server components, API routes | Locked by project |
| React | 19.2.1 | Client components, hooks | Locked by project |
| Firebase Admin | 13.6.0 | Firestore reads/writes, Auth claim sync | Locked by project |
| Zod | ^4.3.6 | API body validation | Used in every ambassador API route |
| DaisyUI | ^5.5.1-beta.2 | UI components (card, badge, alert, btn, stat) | Locked by project |
| Mailgun.js | (already in package.json) | Transactional email | Used for EMAIL-01..03 |

[VERIFIED: codebase grep — package.json, existing API routes]

### No New Runtime Dependencies

The out-of-scope constraint ("No new runtime dependencies without explicit justification") applies here too. Leaderboard snapshots, dashboard stats, and offboarding all compose existing primitives. No charting library, no real-time SDK, no extra Discord library needed.

[VERIFIED: REQUIREMENTS.md Out of Scope table]

---

## Architecture Patterns

### System Architecture Diagram

```
Ambassador Dashboard Request (GET /ambassadors/dashboard)
    │
    ▼
Layout gate (ambassadors/layout.tsx)
 └─ isAmbassadorProgramEnabled() → 404 if off
    │
    ▼
DashboardPage (client component, "use client")
 ├─ verifyAuth() via useMentorship → redirect if not authenticated
 ├─ hasRoleClaim("ambassador") → redirect to /profile if not ambassador
 │
 ├── GET /api/ambassador/dashboard/me
 │     └─ Reads: ambassador/v1 subdoc + referrals count + events count
 │              + reports for month + current cohort doc
 │              Returns: { stats, onboarding, cohort, nextReportDue }
 │
 └── GET /api/ambassador/dashboard/leaderboard?view=cumulative|this_month
       └─ Reads: leaderboard_snapshots/{cohortId} (single doc)
                Returns: { top3PerCategory, ownRank, updatedAt, graceActive }

Hourly Leaderboard Snapshot (GitHub Actions cron)
    │
    ▼
scripts/ambassador-leaderboard-snapshot.ts
 ├─ Reads all active ambassadors via public_ambassadors (active==true)
 ├─ For each: count referrals, non-hidden events, on-time reports
 ├─ Sorts per category, builds top-3 arrays
 └─ Writes leaderboard_snapshots/{cohortId} (single upsert)

Admin Offboarding Flow
    │
    ▼
Admin clicks "Offboard (2-strike)" on MemberDetailClient
    │
    ▼
POST /api/ambassador/members/[uid]/offboard
 ├─ Firestore batch:
 │   ├─ mentorship_profiles/{uid}: arrayRemove("ambassador")
 │   ├─ ambassador/v1: { active: false, endedAt, offboardedAt }
 │   └─ public_ambassadors/{uid}: delete
 ├─ removeDiscordRole(discordMemberId, DISCORD_AMBASSADOR_ROLE_ID) [soft]
 ├─ sendAmbassadorOffboardingEmail(...) [soft]
 └─ syncAmbassadorClaim(uid)

Admin Alumni Transition
    │
    ▼
POST /api/ambassador/members/[uid]/alumni
 ├─ Firestore batch:
 │   ├─ mentorship_profiles/{uid}: arrayRemove("ambassador") + arrayUnion("alumni-ambassador")
 │   ├─ ambassador/v1: { active: false, endedAt }
 │   └─ public_ambassadors/{uid}: { active: false } (keeps doc for alumni badge)
 └─ syncAmbassadorClaim(uid)
```

### Recommended Project Structure

New files Phase 5 adds to the existing structure:

```
src/
├─ app/
│   ├─ ambassadors/
│   │   └─ dashboard/
│   │       ├─ page.tsx                     # server component shell (force-dynamic)
│   │       ├─ DashboardClient.tsx          # "use client" — composes all panels
│   │       ├─ PersonalStatsPanel.tsx       # referrals / events / reports / strikes
│   │       ├─ OnboardingChecklist.tsx      # 5-item checklist + PATCH to /api/ambassador/profile
│   │       ├─ LeaderboardPanel.tsx         # grace banner OR top-3 + own rank
│   │       └─ AmbassadorOfMonthBanner.tsx  # reads cohort.ambassadorOfTheMonth
│   └─ api/ambassador/
│       ├─ dashboard/
│       │   ├─ me/route.ts                  # GET personal stats bundle
│       │   └─ leaderboard/route.ts         # GET snapshot for current cohort
│       └─ members/[uid]/
│           ├─ offboard/route.ts            # POST 2-strike offboarding
│           └─ alumni/route.ts              # POST term-completion alumni transition
├─ lib/
│   └─ ambassador/
│       └─ leaderboard.ts                   # buildLeaderboardSnapshot() helper
scripts/
└─ ambassador-leaderboard-snapshot.ts       # hourly cron script
.github/workflows/
└─ ambassador-leaderboard.yml               # hourly schedule + manual dispatch
```

### Pattern 1: Ambassador-Gated Client Dashboard

Mirrors the `ReportPageClient` pattern from Phase 4 exactly.

```typescript
// src/app/ambassadors/dashboard/DashboardClient.tsx
"use client";
import { useEffect, useState } from "react";
import { useMentorship } from "@/contexts/MentorshipContext";
import { hasRole } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/apiClient";

export function DashboardClient() {
  const { profile, isLoading } = useMentorship();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && profile && !hasRole(profile, "ambassador")) {
      router.replace("/profile");
    }
  }, [profile, isLoading, router]);

  // ... fetch /api/ambassador/dashboard/me
}
```

[VERIFIED: codebase — src/app/ambassadors/report/ReportPageClient.tsx]

### Pattern 2: Leaderboard Snapshot Document

Single Firestore doc per cohort. Written by the hourly cron, read by the API.

```typescript
// src/lib/ambassador/leaderboard.ts

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL: string;
  count: number;
}

export interface LeaderboardSnapshot {
  cohortId: string;
  updatedAt: FirebaseFirestore.Timestamp; // server timestamp
  graceEndDate: string; // ISO — cohort.startDate + 28 days; UI compares to now
  cumulative: {
    referrals: LeaderboardEntry[];     // top-3, sorted desc
    events: LeaderboardEntry[];        // top-3
    reportsOnTime: LeaderboardEntry[]; // top-3
    // IMPORTANT: no full sorted list — planner MUST NOT include it.
    // own rank is computed at cron time per ambassador and stored separately.
    ambassadorRanks: Record<string, { referralsRank: number; eventsRank: number; reportsRank: number }>;
  };
  thisMonth: {
    month: string; // "YYYY-MM"
    referrals: LeaderboardEntry[];
    events: LeaderboardEntry[];
    reportsOnTime: LeaderboardEntry[];
    ambassadorRanks: Record<string, { referralsRank: number; eventsRank: number; reportsRank: number }>;
  };
}
```

The API endpoint reads this single doc and returns only the subset the requesting ambassador needs (top-3 + their own rank). The full `ambassadorRanks` map is NOT returned to the client wholesale — the API extracts `ambassadorRanks[uid]` only.

[ASSUMED — specific doc shape; planner should validate against DASH-05 wording before locking]

### Pattern 3: Offboarding API (atomic + soft Discord + soft email)

```typescript
// POST /api/ambassador/members/[uid]/offboard
// Gate order: isAmbassadorProgramEnabled → requireAdmin → subdoc exists check
// Returns: { success, discordRemoved, emailSent }

const batch = db.batch();
// 1. Strip ambassador role from profile
batch.update(profileRef, { roles: FieldValue.arrayRemove("ambassador") });
// 2. Close subdoc (NOT delete — preserves history)
batch.update(subdocRef, { active: false, endedAt: FieldValue.serverTimestamp(), offboardedAt: FieldValue.serverTimestamp() });
// 3. Remove public projection (ALUMNI-02: offboarded ≠ alumni)
batch.delete(publicRef);
await batch.commit();

// Soft Discord removal (DISC-05) — failure persisted to response, not thrown
const discordRemoved = await removeDiscordRole(discordMemberId, DISCORD_AMBASSADOR_ROLE_ID);

// Soft email (EMAIL-04) — failure logged, response indicates status
const emailSent = await sendAmbassadorOffboardingEmail(email, displayName, cohortName);

// Sync claims (non-fatal)
await syncAmbassadorClaim(uid).catch(console.error);

return NextResponse.json({ success: true, discordRemoved, emailSent });
```

[VERIFIED: pattern mirrors assignAmbassadorDiscordRoleSoft in src/lib/ambassador/acceptance.ts]

### Pattern 4: Alumni Transition API (atomic, no Discord removal)

```typescript
// POST /api/ambassador/members/[uid]/alumni
// Gate: requireAdmin → subdoc exists + active check

const batch = db.batch();
batch.update(profileRef, {
  roles: FieldValue.arrayUnion("alumni-ambassador"),   // add alumni
  // arrayRemove in same batch is fine per Firestore docs
});
// Firestore does not support both arrayUnion and arrayRemove on same field in one update.
// Use two separate update calls in the batch (they execute sequentially in order).
batch.update(profileRef, { roles: FieldValue.arrayRemove("ambassador") });
batch.update(subdocRef, { active: false, endedAt: FieldValue.serverTimestamp() });
// Keep public projection but flip active to false (ALUMNI-03 — badge stays on /u/[username])
batch.update(publicRef, { active: false });
await batch.commit();

await syncAmbassadorClaim(uid).catch(console.error);
```

**Critical Firestore constraint:** `FieldValue.arrayUnion` and `FieldValue.arrayRemove` cannot target the same field in a single `update()` call. The workaround is two sequential `batch.update()` calls on the same ref — Firestore executes batch writes in order, so the second sees the result of the first.

[VERIFIED: Firebase Admin SDK docs — arrayUnion/arrayRemove mutual exclusion on same field]

### Pattern 5: removeDiscordRole (new function in discord.ts)

The `assignDiscordRole` function (Discord REST `PUT .../roles/{roleId}`) already exists. `removeDiscordRole` uses the symmetrical `DELETE` endpoint.

```typescript
// To add to src/lib/discord.ts
export async function removeDiscordRole(
  discordMemberIdOrUsername: string,
  roleId: string,
): Promise<boolean> {
  // Same memberId resolution pattern as assignDiscordRole
  // DELETE /guilds/{guildId}/members/{memberId}/roles/{roleId}
  // 204 = success; 404 = member not in guild (treat as success for idempotency)
}
```

[VERIFIED: codebase — discord.ts assignDiscordRole uses PUT; DELETE is the documented counterpart per Discord API v10]

### Pattern 6: Onboarding Checklist State Storage

Per-item completion lives on the ambassador subdoc (`ambassador/v1`) as a nested `onboarding` map. Avoids a separate collection. Updated via the existing `PATCH /api/ambassador/profile` endpoint — no new endpoint needed.

```typescript
// Fields added to AmbassadorSubdoc (types/ambassador.ts)
onboarding?: {
  joinedDiscord?: boolean;
  setBio?: boolean;
  uploadedVideo?: boolean;
  sharedReferralLink?: boolean;
  loggedFirstEvent?: boolean;
};
```

Some items can be auto-derived (e.g., `uploadedVideo` from `cohortPresentationVideoUrl !== undefined`, `loggedFirstEvent` from events count > 0). The auto-derived ones should be computed server-side on the dashboard `me` API response rather than written to Firestore to avoid race conditions.

[ASSUMED — specific auto-derive strategy; planner should decide which flags are stored vs computed]

### Pattern 7: Cohort PATCH for Ambassador of the Month

DASH-09 says the "Ambassador of the Month" field lives on the cohort doc. The admin sets it via the existing `PATCH /api/ambassador/cohorts/[cohortId]` endpoint — add `ambassadorOfTheMonth` (a UID or display name string) to `CohortPatchSchema`.

[VERIFIED: CohortPatchSchema in src/types/ambassador.ts — easy to extend]

### Pattern 8: Hourly Leaderboard Cron

Follows the exact same structure as `scripts/ambassador-report-flag.ts` and is added to the **existing** `.github/workflows/ambassador-activity-checks.yml` as a third job, rather than creating a new workflow file.

```yaml
ambassador-leaderboard-snapshot:
  name: Hourly leaderboard snapshot (DASH-07)
  runs-on: ubuntu-latest
  if: |
    (github.event_name == 'schedule' && github.event.schedule == '0 * * * *') ||
    (github.event_name == 'workflow_dispatch' && ...)
  steps: # same checkout/node/npm ci pattern
```

[VERIFIED: .github/workflows/ambassador-activity-checks.yml]

### Anti-Patterns to Avoid

- **Real-time leaderboard listener:** Do NOT use Firestore `onSnapshot` for the leaderboard. The snapshot doc is hourly; a real-time listener wastes connections and bypasses DASH-07's "Updated N minutes ago" UX intent.
- **arrayUnion + arrayRemove on same field in one update():** Firestore rejects this. Always use two sequential `batch.update()` calls (see Pattern 4).
- **Full ambassadorRanks map returned to client:** The API must extract only `ambassadorRanks[uid]` for the requesting ambassador. Exposing all ranks leaks other ambassadors' exact positions in a way that conflicts with DASH-05's "nobody visibly last" ethos.
- **Auto-offboarding from the cron:** The cron NEVER mutates roles or strikes (REPORT-04, DISC-04 established invariant). Phase 5's offboarding is always admin-triggered from the member detail page.
- **Deleting the ambassador subdoc on offboarding:** Keep the subdoc (`active: false`) to preserve historical data (strikes, reports, events). Only the `public_ambassadors` projection is deleted on offboarding. The alumni path keeps it too.
- **Using window.confirm for offboarding:** The existing `MemberDetailClient` uses `confirm()` for "Remove from program". Phase 5's offboarding is more consequential; use the existing `StrikeConfirmModal` pattern or a new `OffboardConfirmModal` DaisyUI dialog.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Discord role removal | Custom HTTP DELETE implementation | Extend `discord.ts` with `removeDiscordRole` mirroring `assignDiscordRole` | Rate-limit retry + logging already in `fetchWithRateLimit` |
| Offboarding email | Raw Mailgun call | `sendAmbassadorOffboardingEmail` in `email.ts` using `sendEmail()` + `wrapEmailHtml()` | All ambassador emails follow the same Mailgun wrapper |
| arrayUnion + arrayRemove in one call | Manual role array manipulation | Two sequential `batch.update()` calls | Firestore SDK enforces mutual exclusion; manual manipulation risks race conditions |
| Claims sync after role mutation | Direct `auth.setCustomUserClaims()` | `syncAmbassadorClaim(uid)` from `acceptance.ts` | Already reads current Firestore state + merges properly |
| "Updated N minutes ago" timestamp display | Custom date-diff util | `date-fns` (already in package.json via `date-fns-tz`) | Already a project dependency |
| Leaderboard rank computation | SQL-style window functions | Pre-computed in cron script (`buildLeaderboardSnapshot`), stored as integers in snapshot doc | Avoids re-computation on every dashboard load |

---

## Common Pitfalls

### Pitfall 1: arrayUnion + arrayRemove on the same field in one update()
**What goes wrong:** `batch.update(profileRef, { roles: FieldValue.arrayUnion("alumni-ambassador") })` followed immediately by `batch.update(profileRef, { roles: FieldValue.arrayRemove("ambassador") })` — if done as a single update() object, Firestore throws "Cannot use two write transforms on the same document field in a single write operation".
**Why it happens:** Firestore's atomic field transforms are mutually exclusive within a single document write.
**How to avoid:** Use two separate `batch.update()` calls targeting the same ref. The batch executes them in order.
**Warning signs:** Test with a real ambassador subdoc before shipping; unit tests that mock Firestore may not surface this.

### Pitfall 2: Leaderboard grace period date math
**What goes wrong:** `cohort.startDate` is a Firestore Timestamp; comparing it to `new Date()` without conversion gives wrong results.
**Why it happens:** `startDate.toDate()` is required before arithmetic.
**How to avoid:** In the cron and in the API, always do `cohort.startDate.toDate().getTime()` before computing `graceEndDate`.
**Warning signs:** Leaderboard shows immediately for a new cohort, or never unlocks.

### Pitfall 3: Public projection `active` flag vs subdoc `active` flag
**What goes wrong:** Phase 3 contract (STATE.md D-12, D-13): Phase 5 MUST update `public_ambassadors/{uid}` on alumni transition and DELETE it on offboarding. If only the subdoc is updated, `/ambassadors` continues to list an offboarded ambassador because its `where("active", "==", true)` filter reads the public projection, not the subdoc.
**Why it happens:** Two separate documents (`mentorship_profiles/{uid}/ambassador/v1` and `public_ambassadors/{uid}`) track `active`; they diverge if one is missed.
**How to avoid:** Always update/delete the public projection in the same batch as the subdoc write.
**Warning signs:** An offboarded ambassador still appears on the `/ambassadors` page.

### Pitfall 4: `leaderboard_snapshots/{cohortId}` collection name — cron vs API must agree
**What goes wrong:** Cron writes to `leaderboard_snapshots/{cohortId}` but API reads from a different path.
**How to avoid:** Add `LEADERBOARD_SNAPSHOTS_COLLECTION` to `src/lib/ambassador/constants.ts` and import in both the cron script (via relative path, same as `ambassador-discord-reconciliation.ts` pattern) and the API route (via `@/` alias).

### Pitfall 5: Discord role removal 404 is NOT an error
**What goes wrong:** `DELETE .../members/{id}/roles/{roleId}` returns 404 if the member is no longer in the guild (they left). Treating 404 as a failure causes the UI to show a spurious "retry" banner.
**How to avoid:** In `removeDiscordRole`, treat 204 AND 404 as success (same pattern `assignDiscordRole` uses for idempotency on re-assign). Only surface a retry banner on 4xx other than 404, or on 5xx.

### Pitfall 6: Onboarding checklist — auto-derived items must not be double-stored
**What goes wrong:** Writing `onboarding.loggedFirstEvent = true` to Firestore every time an event is submitted creates an extra write path. If the event is later hidden (EVENT-03/04), the flag stays true.
**How to avoid:** Compute `loggedFirstEvent` and `uploadedVideo` dynamically in the dashboard `me` API by reading the ambassador's event count and subdoc video URL — do not persist them to Firestore. Only persist flags that require explicit user action with no derivable source (e.g., `joinedDiscord`, which requires manual confirmation since we don't have a way to verify server-side).

### Pitfall 7: CollectionGroup query for leaderboard aggregation in cron
**What goes wrong:** Using `db.collectionGroup("ambassador").where("active", "==", true)` in the cron to find ambassadors (same pattern as `GET /api/ambassador/members`) triggers 1+2N Firestore reads for N ambassadors. For 25 ambassadors that's 51 reads per cron run = 1,200+ reads/day.
**How to avoid:** Use `public_ambassadors` (already a top-level flat collection) for the ambassador enumeration step in the leaderboard cron — same pattern as `ambassador-discord-reconciliation.ts`. This is 1 read for the list + individual subcollection reads per ambassador for counts.

---

## Code Examples

### Leaderboard API endpoint (pattern)

```typescript
// src/app/api/ambassador/dashboard/leaderboard/route.ts
// Source: verified against src/app/api/ambassador/members/route.ts pattern

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { getCurrentCohortId } from "@/lib/ambassador/currentCohort";
import { LEADERBOARD_SNAPSHOTS_COLLECTION } from "@/lib/ambassador/constants";

export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled())
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ctx = await verifyAuth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const view = (new URL(request.url).searchParams.get("view") ?? "cumulative") as "cumulative" | "this_month";
  const cohortId = await getCurrentCohortId();
  if (!cohortId) return NextResponse.json({ snapshot: null }, { status: 200 });

  const snap = await db.collection(LEADERBOARD_SNAPSHOTS_COLLECTION).doc(cohortId).get();
  if (!snap.exists) return NextResponse.json({ snapshot: null }, { status: 200 });

  const data = snap.data() as LeaderboardSnapshot;
  const viewData = view === "this_month" ? data.thisMonth : data.cumulative;

  // Return top-3 per category + own rank only — never full ranks map
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
}
```

### Email-04 offboarding email (to add to email.ts)

```typescript
// Source: verified pattern from sendAmbassadorApplicationDeclinedEmail in src/lib/email.ts

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

### Dashboard Me API — stats aggregation

```typescript
// GET /api/ambassador/dashboard/me
// Parallel reads for all stats (same strategy as /api/ambassador/members/[uid]/route.ts)

const [subdocSnap, referralsCountSnap, eventsSnap, reportsSnap, cohortSnap] = await Promise.all([
  profileRef.collection("ambassador").doc("v1").get(),
  db.collection(REFERRALS_COLLECTION).where("ambassadorId", "==", uid).count().get(),
  db.collection(AMBASSADOR_EVENTS_COLLECTION)
    .where("ambassadorId", "==", uid)
    .where("hidden", "==", false)
    .count()
    .get(),
  db.collection(MONTHLY_REPORTS_COLLECTION)
    .where("ambassadorId", "==", uid)
    .count()
    .get(),
  db.collection(AMBASSADOR_COHORTS_COLLECTION).doc(subdoc.cohortId).get(),
]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `FieldValue.arrayRemove` + `FieldValue.arrayUnion` in one `update()` | Two sequential `batch.update()` calls | Firebase Admin SDK v9+ | Required for role swap |
| Phase 3 cross-phase contract: public projection managed by acceptance | Phase 5 extends: offboarding deletes projection, alumni flips `active: false` | Established in STATE.md D-12/D-13 (2026-04-22) | Both offboard and alumni endpoints MUST update `public_ambassadors/{uid}` |

**Deprecated/outdated:**
- Direct `window.confirm()` for destructive admin actions: Phase 4 introduced `StrikeConfirmModal`. Phase 5's offboarding should use a modal too.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Leaderboard snapshot stores `ambassadorRanks` as a `Record<uid, {rank per category}>` map inside the snapshot doc | Architecture Patterns, Pattern 2 | If Firestore doc size limit (1 MB) is hit with 25+ ambassadors, need alternative (e.g., separate collection per ambassador) — but 25 ambassadors × ~100 bytes/entry is well within limit |
| A2 | Onboarding checklist items `joinedDiscord` and `sharedReferralLink` are stored flags (user confirms explicitly); `loggedFirstEvent` and `uploadedVideo` are computed at API time | Pattern 6 | If product wants all items to be persistent, add them all to subdoc; if all should be auto-derived, drop the stored flags entirely |
| A3 | "Ambassador of the Month" is a UID (string) on `cohorts/{cohortId}.ambassadorOfTheMonth` | Pattern 7, DASH-09 | If display name or photo is needed, store an object `{ uid, displayName, photoURL }` instead — planner should decide shape |
| A4 | Alumni transition does NOT send an email in v1 | (REQUIREMENTS.md — no EMAIL-05 exists) | If the product wants a "congratulations" email, needs a new EMAIL requirement |

---

## Open Questions

1. **Leaderboard "this month" for the cron** — The cron needs to know what "this month" means per ambassador's timezone. The simplest approach is to use UTC for the "this month" leaderboard window (not per-ambassador timezone), since the leaderboard is aggregate data, not per-ambassador deadline math. Is UTC acceptable for the "this month" filter?
   - What we know: `reportDeadline.ts` uses per-ambassador timezone for monthly reports.
   - What's unclear: Should "this month" leaderboard window also be per-timezone or cohort-level UTC?
   - Recommendation: Use UTC for the leaderboard snapshot; note in the UI that "this month" is UTC-based.

2. **"Ambassador of the Month" display** — DASH-09 says "admin-curated field read from `cohorts/{cohortId}`". Should it be a UID (render name from public projection), a free-text string (admin types a name), or an object `{ uid, displayName }`?
   - Recommendation: UID + displayName pair to avoid a second Firestore read on the dashboard.

3. **Onboarding checklist: `joinedDiscord` flag** — The platform has no way to verify Discord membership server-side without a fresh API call. Should the dashboard just provide a link to the Discord server and let the ambassador self-mark the item as done, or skip this item from tracked state?
   - Recommendation: Self-mark (ambassador clicks "Done" button). Store `onboarding.joinedDiscord: true` on the subdoc.

4. **Alumni trigger — who initiates?** — ROADMAP says "term-ending ambassador transitions cleanly to alumni." Is this admin-initiated only, or does the system auto-trigger when `cohort.endDate` passes?
   - What we know: All state mutations so far are admin-initiated (no auto-offboarding).
   - Recommendation: Admin-initiated POST `/api/ambassador/members/[uid]/alumni`, surfaced as a button on the member detail page after the cohort end date has passed. Consistent with the program's "human-in-the-loop" ethos.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Discord Bot (token + guild ID) | DISC-05 removeDiscordRole | Yes | Discord API v10 (env vars set in GitHub Secrets) | Surface retry in admin UI |
| Mailgun (API key) | EMAIL-04 | Yes | mailgun.js (in package.json) | Log failure, do not block offboarding |
| Firebase Admin SDK | All API routes + cron | Yes | 13.6.0 | — |
| GitHub Actions | DASH-07 leaderboard cron | Yes | Existing workflow file to extend | — |
| `date-fns-tz` | Leaderboard "this month" UTC date | Yes | Already in package.json (used by reportDeadline.ts) | — |

[VERIFIED: package.json, .github/workflows/ambassador-activity-checks.yml, scripts/ambassador-discord-reconciliation.ts]

---

## Validation Architecture

> `workflow.nyquist_validation` is not set to `false` in .planning/config.json — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (existing — `vitest.config.ts` present) |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Auth gate returns 401/403 for non-ambassador | unit | `npm test -- --run src/app/api/ambassador/dashboard` | Wave 0 |
| DASH-05 | Leaderboard API returns top-3 only + own rank (never full map) | unit | `npm test -- --run src/lib/ambassador/leaderboard` | Wave 0 |
| DASH-06 | Grace period math — before/after 28-day window | unit | `npm test -- --run src/lib/ambassador/leaderboard` | Wave 0 |
| ALUMNI-01 | Alumni transition: role array swap correct | unit | `npm test -- --run src/app/api/ambassador/members` | Wave 0 |
| ALUMNI-02 | Offboarding does NOT set alumni-ambassador | unit | `npm test -- --run src/app/api/ambassador/members` | Wave 0 |
| DISC-05 | removeDiscordRole: 404 treated as success (idempotent) | unit | `npm test -- --run src/lib/discord` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ambassador/leaderboard.test.ts` — covers DASH-05 (top-3 shape), DASH-06 (grace period math)
- [ ] `src/app/api/ambassador/dashboard/me/route.test.ts` — covers DASH-01, DASH-02
- [ ] `src/app/api/ambassador/members/[uid]/offboard.test.ts` — covers ALUMNI-02, DISC-05 idempotency
- [ ] `src/app/api/ambassador/members/[uid]/alumni.test.ts` — covers ALUMNI-01

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | `verifyAuth()` on every ambassador API route |
| V3 Session Management | No | Stateless JWT; Firebase handles session |
| V4 Access Control | Yes | `hasRoleClaim("ambassador")` for ambassador routes; `requireAdmin` for admin routes |
| V5 Input Validation | Yes | Zod schemas on all PATCH/POST bodies |
| V6 Cryptography | No | No new crypto; Discord token and Mailgun key are env vars |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on `/api/ambassador/members/[uid]/offboard` | Tampering | `requireAdmin` gate — admin token required; ambassador cannot offboard self |
| Leaderboard rank fishing (requesting another ambassador's rank) | Information Disclosure | API returns only `ambassadorRanks[ctx.uid]` — never the full map |
| Admin PATCH `ambassadorOfTheMonth` to arbitrary string | Tampering | Field stored as-is; only admin can write; rendered as text (no HTML injection) |
| Discord role removal targeting wrong guild member | Tampering | `removeDiscordRole` uses immutable `discordMemberId` snowflake (not username) — same as reconciliation cron |

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/lib/ambassador/acceptance.ts` — offboarding batch write pattern, syncAmbassadorClaim, arrayUnion/arrayRemove
- Codebase: `src/lib/discord.ts` — `assignDiscordRole` (DELETE counterpart is standard Discord API v10)
- Codebase: `src/lib/email.ts` (lines 600–691) — EMAIL-01..03 Mailgun pattern for EMAIL-04
- Codebase: `src/types/ambassador.ts` — all Phase 2–4 Firestore doc shapes
- Codebase: `.github/workflows/ambassador-activity-checks.yml` — cron job pattern
- Codebase: `src/lib/ambassador/constants.ts` — collection name registry
- Codebase: `src/app/api/ambassador/members/[uid]/route.ts` — parallel Firestore reads pattern for stats aggregation
- Codebase: `src/components/ambassador/AmbassadorBadge.tsx` — `alumni-ambassador` variant already built (D-10)
- STATE.md D-12/D-13: Phase 5 MUST update `public_ambassadors/{uid}` on both lifecycle exits

### Secondary (MEDIUM confidence)
- Firebase Admin SDK documentation: `FieldValue.arrayUnion` and `FieldValue.arrayRemove` cannot target same field in one `update()` — two sequential `batch.update()` calls required [CITED: firebase.google.com/docs/firestore/manage-data/add-data#update_elements_in_an_array]
- Discord API v10: `DELETE /guilds/{guild.id}/members/{user.id}/roles/{role.id}` — 204 on success, 404 if member not found [CITED: discord.com/developers/docs/resources/guild#remove-guild-member-role]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing project libraries, no new deps
- Architecture: HIGH — all patterns verified against live Phase 2–4 implementations
- Pitfalls: HIGH — Pitfalls 1–7 all derived from existing codebase decisions and established Firebase SDK behavior

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (stable stack; no fast-moving libraries)
