---
phase: 02-application-subsystem
plan: 06
type: execute
wave: 3
depends_on:
  - "02-01"
  - "02-03"
  - "02-04"
  - "02-05"
files_modified:
  - src/app/api/ambassador/applications/[applicationId]/route.ts
  - src/app/api/ambassador/applications/[applicationId]/discord-resolve/route.ts
  - src/lib/ambassador/acceptance.ts
  - src/__tests__/ambassador/acceptance.test.ts
autonomous: true
requirements:
  - COHORT-04
  - REVIEW-03
  - REVIEW-05
  - DISC-02
  - DISC-03
  - EMAIL-02
  - EMAIL-03
  - APPLY-08
must_haves:
  truths:
    - "PATCH {action:'accept'} runs Firestore writes (roles += 'ambassador', ambassador subdoc, cohort acceptedCount increment) in a Firestore TRANSACTION, not a batch — guarantees COHORT-04 maxSize is never exceeded."
    - "If Firestore transaction succeeds but Discord role assignment fails, the application is still marked 'accepted' and the admin sees a retry banner (D-17: Discord failure never rolls back Firestore)."
    - "Acceptance idempotency: the transaction checks current `roles` via `hasRole(profile, 'ambassador')` semantics; re-accepting an already-accepted application is a no-op that still returns 200 (DISC-03)."
    - "PATCH {action:'decline'} sets status='declined', declinedAt=now, reviewerNotes=notes, and triggers EMAIL-03 — does NOT touch mentorship_profiles or cohorts."
    - "POST discord-resolve re-calls lookupMemberByUsername (NOT cached from submission — Pitfall 2 — handle may have changed), writes fresh discordMemberId, then re-attempts assignDiscordRole, flipping discordRoleAssigned / discordRetryNeeded on the doc."
    - "All handlers gate on isAmbassadorProgramEnabled() and require admin via requireAdmin() from Plan 04."
    - "COHORT-04: if cohort.acceptedCount >= cohort.maxSize at transaction-read time, return 409 'Cohort is full' and do NOT write anything."
    - "reviewedBy audit field on the application doc is populated from admin.uid returned by Plan 04's requireAdmin (APPLY-08 — admin identity captured on every decision)."
  artifacts:
    - path: "src/app/api/ambassador/applications/[applicationId]/route.ts"
      provides: "GET detail (admin, returns signed student-ID URL), PATCH accept/decline (admin)"
      exports:
        - "GET"
        - "PATCH"
    - path: "src/app/api/ambassador/applications/[applicationId]/discord-resolve/route.ts"
      provides: "POST retry: re-resolves Discord handle and re-attempts role assignment"
      exports:
        - "POST"
    - path: "src/lib/ambassador/acceptance.ts"
      provides: "runAcceptanceTransaction (Firestore commit only), assignAmbassadorDiscordRoleSoft (Discord call, catches errors)"
      exports:
        - "runAcceptanceTransaction"
        - "assignAmbassadorDiscordRoleSoft"
    - path: "src/__tests__/ambassador/acceptance.test.ts"
      provides: "Unit coverage for runAcceptanceTransaction: maxSize enforcement, idempotency, cohort/application not found. Mocks db.runTransaction."
      exports: []
  key_links:
    - from: "src/lib/ambassador/acceptance.ts"
      to: "db.runTransaction"
      via: "atomic read+check+write of cohort.acceptedCount vs. maxSize (Pitfall 1)"
      pattern: "runTransaction"
    - from: "src/lib/ambassador/acceptance.ts"
      to: "syncRoleClaim"
      via: "Phase 1 claim sync after the role is appended to Firestore (ROLE-05 dual-write semantics)"
      pattern: "syncRoleClaim"
    - from: "src/lib/ambassador/acceptance.ts"
      to: "FieldValue.arrayUnion"
      via: "append 'ambassador' to roles array (Phase 1 pattern; idempotent)"
      pattern: "arrayUnion"
    - from: "src/app/api/ambassador/applications/[applicationId]/route.ts"
      to: "DISCORD_AMBASSADOR_ROLE_ID"
      via: "role id constant from Plan 01 (Plan 09 checkpoint replaces placeholder with real id)"
      pattern: "DISCORD_AMBASSADOR_ROLE_ID"
    - from: "src/app/api/ambassador/applications/[applicationId]/route.ts"
      to: "sendAmbassadorApplicationAcceptedEmail | sendAmbassadorApplicationDeclinedEmail"
      via: "EMAIL-02/03 triggered after decision persisted"
      pattern: "sendAmbassadorApplication(Accepted|Declined)Email"
    - from: "src/app/api/ambassador/applications/[applicationId]/route.ts"
      to: "admin.uid (from requireAdmin)"
      via: "APPLY-08 — reviewedBy audit field populated from Plan 04's discriminated-union requireAdmin() return"
      pattern: "reviewedBy.*admin\\.uid"
    - from: "src/app/api/ambassador/applications/[applicationId]/discord-resolve/route.ts"
      to: "lookupMemberByUsername"
      via: "Pitfall 2 — re-resolve on retry to avoid stale discordMemberId"
      pattern: "lookupMemberByUsername"
---

<objective>
Build the admin decision endpoints. Two routes:

1. `PATCH /api/ambassador/applications/[applicationId]` — admin accepts or declines.
2. `POST /api/ambassador/applications/[applicationId]/discord-resolve` — admin retries Discord resolution + role assignment after a soft failure.

Plus a shared helper `src/lib/ambassador/acceptance.ts` that isolates the two-stage commit (Firestore transaction first, Discord second) so the logic can be unit-tested without spinning up a full route test.

Purpose:
- COHORT-04 race-safe enforcement: a naive `db.batch()` can over-enroll (Pitfall 1). Use `db.runTransaction()` to read the cohort doc and decide atomically.
- D-17 / DISC-02: the Firestore transaction MUST commit independently of Discord. Discord failure stores `discordRoleAssigned: false, discordRetryNeeded: true` on the doc and surfaces as the admin retry banner (REVIEW-05).
- DISC-03 idempotency: the transaction uses `FieldValue.arrayUnion("ambassador")` (already idempotent); Discord's PUT-based role assignment via `assignDiscordRole` is idempotent at the API level; the retry endpoint re-resolves member ID (Pitfall 2).
- APPLY-08: every decision persists `reviewedBy: admin.uid` on the application doc — admin identity is captured from Plan 04's discriminated-union `requireAdmin()` which synthesises a stable uid from the admin_sessions token.
- Pre-flight note: `DISCORD_AMBASSADOR_ROLE_ID` is a placeholder (`"PENDING_DISCORD_ROLE_CREATION"`) from Plan 01. Plan 09's checkpoint replaces it with the real role ID before the first acceptance.

Output:
- PATCH endpoint that accepts/declines, triggers EMAIL-02/03, and surfaces Discord status.
- POST discord-resolve endpoint for retry flow.
- src/lib/ambassador/acceptance.ts shared helper with unit tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-application-subsystem/02-CONTEXT.md
@.planning/phases/02-application-subsystem/02-RESEARCH.md
@.planning/phases/02-application-subsystem/02-01-SUMMARY.md
@.planning/phases/02-application-subsystem/02-03-SUMMARY.md
@.planning/phases/02-application-subsystem/02-04-SUMMARY.md
@.planning/phases/02-application-subsystem/02-05-SUMMARY.md
@.planning/phases/01-foundation-roles-array-migration/01-06-SUMMARY.md

<interfaces>
<!-- Contracts the executor needs — no codebase scavenging required. -->

From @/types/ambassador (Plan 01):
```typescript
export const ApplicationReviewSchema: z.ZodObject<{
  action: z.ZodEnum<["accept", "decline"]>;
  notes: z.ZodOptional<z.ZodString>;
}>;
export type ApplicationReviewInput = { action: "accept" | "decline"; notes?: string };
export interface ApplicationDoc { /* see RESEARCH.md line 480 */ }
export interface CohortDoc { /* see RESEARCH.md line 513 */ }
```

From @/lib/ambassador/constants (Plan 01):
```typescript
export const AMBASSADOR_APPLICATIONS_COLLECTION: "applications";
export const AMBASSADOR_COHORTS_COLLECTION: "cohorts";
export const ADMIN_SIGNED_URL_EXPIRY_MS: number;   // 1 hour (Plan 01)
```

From @/lib/ambassador/adminAuth (Plan 04):
```typescript
// Plan 04 formally guarantees uid on the ok branch. uid is synthesised from the
// admin_sessions token (legacy admin flow has no Firebase uid) — stable per-session.
export async function requireAdmin(
  request: Request,
): Promise<
  | { ok: true; uid: string }
  | { ok: false; status: number; error: string }
>;
```

From @/lib/ambassador/roleMutation (Phase 1):
```typescript
export async function syncRoleClaim(
  uid: string,
  claims: { roles: string[]; admin?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }>;
// Non-fatal: logs + returns on failure. Callers MUST NOT throw on {ok:false}.
```

From @/lib/discord (existing):
```typescript
export const DISCORD_AMBASSADOR_ROLE_ID: string;   // Plan 01 placeholder; Plan 09 checkpoint replaces
export async function assignDiscordRole(usernameOrId: string, roleId: string): Promise<boolean>;
export async function lookupMemberByUsername(username: string): Promise<{ id: string; username: string } | null>;
```

From @/lib/email (Plan 03):
```typescript
export function sendAmbassadorApplicationAcceptedEmail(applicantEmail: string, applicantName: string, cohortName: string): Promise<boolean>;
export function sendAmbassadorApplicationDeclinedEmail(applicantEmail: string, applicantName: string, reviewerNotes?: string): Promise<boolean>;
```

From @/lib/firebaseAdmin (existing):
```typescript
export const db: admin.firestore.Firestore;
export const storage: admin.storage.Bucket | null;
export const FieldValue: typeof admin.firestore.FieldValue;
```

Phase 1 precedent for role writes (read this before implementing):
- src/lib/ambassador/roleMutation.ts — `syncRoleClaim` appends to `roles` and writes custom claims. The route MUST call it after the Firestore transaction commits.
- src/types/mentorship.ts — `MentorshipProfile.roles: Role[]` is the authoritative roles field; `.role` legacy is tolerated during dual-claim window (still active in Phase 2).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Build src/lib/ambassador/acceptance.ts with unit tests (TDD)</name>
  <files>src/lib/ambassador/acceptance.ts, src/__tests__/ambassador/acceptance.test.ts</files>
  <read_first>
    - @src/lib/ambassador/roleMutation.ts (Phase 1 syncRoleClaim contract)
    - @src/lib/discord.ts (assignDiscordRole signature + existing non-blocking pattern)
    - @src/lib/firebaseAdmin.ts (db, FieldValue exports)
    - @src/types/ambassador.ts (ApplicationDoc, CohortDoc)
    - @vitest.config.ts (alias @ → ./src, node env)
    - @.planning/phases/02-application-subsystem/02-VALIDATION.md (Wave 0 acceptance.test.ts stub requirement)
  </read_first>
  <behavior>
RED-phase tests to write in `src/__tests__/ambassador/acceptance.test.ts` — all MUST fail until Task 1's implementation exists.

1. `runAcceptanceTransaction` — happy path
   - Given: cohort exists with `acceptedCount=0, maxSize=50`, application exists with `status='submitted'`, profile exists with `roles=['mentor']`.
   - When: runAcceptanceTransaction(applicationId, adminUid, notes='lgtm') is called.
   - Then: transaction callback receives updates to (a) application → `status='accepted', decidedAt set, reviewedBy=adminUid, reviewerNotes='lgtm'`, (b) profile → `roles arrayUnion 'ambassador'`, (c) ambassador subdoc created with `cohortId, joinedAt, active:true, strikes:0`, (d) cohort → `acceptedCount arrayIncrement 1`.
   - Return value: `{ ok: true, applicantUid, applicantEmail, applicantName, cohortName, cohortId, discordHandle, discordMemberId }`.

2. `runAcceptanceTransaction` — cohort full (COHORT-04)
   - Given: cohort with `acceptedCount=50, maxSize=50`.
   - When: runAcceptanceTransaction() is called.
   - Then: returns `{ ok: false, error: 'cohort_full' }` and the transaction callback makes NO writes.

3. `runAcceptanceTransaction` — application not found
   - Given: applicationId that doesn't exist.
   - Then: returns `{ ok: false, error: 'application_not_found' }`.

4. `runAcceptanceTransaction` — cohort not found
   - Given: application exists but its `targetCohortId` points to a missing cohort.
   - Then: returns `{ ok: false, error: 'cohort_not_found' }`.

5. `runAcceptanceTransaction` — already accepted (idempotent)
   - Given: application with `status='accepted'`.
   - When: runAcceptanceTransaction() is called.
   - Then: returns `{ ok: true, alreadyAccepted: true, ...same fields as happy path }` and the transaction callback does NOT increment cohort.acceptedCount a second time.

6. `runAcceptanceTransaction` — status is declined (cannot re-accept)
   - Given: application with `status='declined'`.
   - Then: returns `{ ok: false, error: 'already_declined' }`.

7. `assignAmbassadorDiscordRoleSoft` — happy path
   - Given: discordMemberId is non-null, assignDiscordRole mock returns true.
   - Then: returns `{ ok: true }` and flips `discordRoleAssigned=true, discordRetryNeeded=false` on the app doc.

8. `assignAmbassadorDiscordRoleSoft` — missing memberId
   - Given: discordMemberId is null.
   - Then: returns `{ ok: false, reason: 'missing_member_id' }` and flips `discordRetryNeeded=true`.

9. `assignAmbassadorDiscordRoleSoft` — discord API failure
   - Given: assignDiscordRole returns false.
   - Then: returns `{ ok: false, reason: 'discord_api_failure' }` and flips `discordRetryNeeded=true`.

10. `assignAmbassadorDiscordRoleSoft` — never throws
   - Given: assignDiscordRole mock throws `new Error("network")`.
   - Then: returns `{ ok: false, reason: 'discord_api_failure' }` — NEVER rethrows.

Use Vitest's `vi.mock` to stub `@/lib/firebaseAdmin` (db.runTransaction, FieldValue.arrayUnion/increment/serverTimestamp) and `@/lib/discord` (assignDiscordRole, DISCORD_AMBASSADOR_ROLE_ID) and `@/lib/ambassador/roleMutation` (syncRoleClaim → returns {ok:true}). See vitest.config.ts alias — imports use `@/...`.
  </behavior>
  <action>
GREEN-phase implementation in `src/lib/ambassador/acceptance.ts`:

```typescript
import { db, FieldValue } from "@/lib/firebaseAdmin";
import { assignDiscordRole, DISCORD_AMBASSADOR_ROLE_ID } from "@/lib/discord";
import { syncRoleClaim } from "@/lib/ambassador/roleMutation";
import {
  AMBASSADOR_APPLICATIONS_COLLECTION,
  AMBASSADOR_COHORTS_COLLECTION,
} from "@/lib/ambassador/constants";
import type { ApplicationDoc, CohortDoc } from "@/types/ambassador";

export type AcceptanceResult =
  | {
      ok: true;
      alreadyAccepted?: boolean;
      applicationId: string;
      applicantUid: string;
      applicantEmail: string;
      applicantName: string;
      cohortId: string;
      cohortName: string;
      discordHandle: string;
      discordMemberId: string | null;
    }
  | { ok: false; error: "application_not_found" | "cohort_not_found" | "cohort_full" | "already_declined" };

export async function runAcceptanceTransaction(
  applicationId: string,
  adminUid: string,
  notes: string | undefined,
): Promise<AcceptanceResult> {
  return db.runTransaction<AcceptanceResult>(async (txn) => {
    const appRef = db.collection(AMBASSADOR_APPLICATIONS_COLLECTION).doc(applicationId);
    const appSnap = await txn.get(appRef);
    if (!appSnap.exists) return { ok: false, error: "application_not_found" };
    const app = appSnap.data() as ApplicationDoc;

    if (app.status === "declined") return { ok: false, error: "already_declined" };

    const cohortRef = db.collection(AMBASSADOR_COHORTS_COLLECTION).doc(app.targetCohortId);
    const cohortSnap = await txn.get(cohortRef);
    if (!cohortSnap.exists) return { ok: false, error: "cohort_not_found" };
    const cohort = cohortSnap.data() as CohortDoc;

    const profileRef = db.collection("mentorship_profiles").doc(app.applicantUid);
    const profileSnap = await txn.get(profileRef);
    // Profile doc should exist for any authenticated user; tolerate missing (edge case) by creating it.

    const alreadyAccepted = app.status === "accepted";

    // COHORT-04: enforce maxSize unless this is an idempotent re-accept (which doesn't change the count).
    if (!alreadyAccepted) {
      const current = typeof cohort.acceptedCount === "number" ? cohort.acceptedCount : 0;
      const max = typeof cohort.maxSize === "number" ? cohort.maxSize : Infinity;
      if (current >= max) return { ok: false, error: "cohort_full" };
    }

    const now = FieldValue.serverTimestamp();

    // Application doc — status + audit fields. Only write decidedAt if not already accepted.
    const appUpdate: Record<string, unknown> = {
      status: "accepted",
      reviewedBy: adminUid,
    };
    if (notes !== undefined) appUpdate.reviewerNotes = notes;
    if (!alreadyAccepted) appUpdate.decidedAt = now;
    txn.update(appRef, appUpdate);

    // Profile roles — arrayUnion is idempotent, safe to call on re-accept.
    if (profileSnap.exists) {
      txn.update(profileRef, { roles: FieldValue.arrayUnion("ambassador") });
    } else {
      txn.set(profileRef, {
        uid: app.applicantUid,
        email: app.applicantEmail,
        displayName: app.applicantName,
        roles: ["ambassador"],
        createdAt: now,
      }, { merge: true });
    }

    // Ambassador subdoc — set only on first accept so we don't overwrite existing strikes/active.
    if (!alreadyAccepted) {
      const ambassadorRef = profileRef.collection("ambassador").doc("v1");
      txn.set(ambassadorRef, {
        cohortId: app.targetCohortId,
        joinedAt: now,
        active: true,
        strikes: 0,
        discordMemberId: app.discordMemberId ?? null,
      });
      txn.update(cohortRef, { acceptedCount: FieldValue.increment(1), updatedAt: now });
    }

    return {
      ok: true,
      alreadyAccepted,
      applicationId,
      applicantUid: app.applicantUid,
      applicantEmail: app.applicantEmail,
      applicantName: app.applicantName,
      cohortId: app.targetCohortId,
      cohortName: cohort.name,
      discordHandle: app.discordHandle,
      discordMemberId: app.discordMemberId ?? null,
    };
  });
}

export type DiscordAssignmentResult =
  | { ok: true }
  | { ok: false; reason: "missing_member_id" | "discord_api_failure" };

/**
 * Wrapper around assignDiscordRole that NEVER throws and persists the result back to the application doc.
 * D-17: Discord failure NEVER rolls back Firestore. Called AFTER runAcceptanceTransaction.
 */
export async function assignAmbassadorDiscordRoleSoft(
  applicationId: string,
  discordHandleOrMemberId: string | null,
): Promise<DiscordAssignmentResult> {
  const appRef = db.collection(AMBASSADOR_APPLICATIONS_COLLECTION).doc(applicationId);

  if (!discordHandleOrMemberId) {
    await appRef.update({ discordRoleAssigned: false, discordRetryNeeded: true });
    return { ok: false, reason: "missing_member_id" };
  }

  let ok = false;
  try {
    ok = await assignDiscordRole(discordHandleOrMemberId, DISCORD_AMBASSADOR_ROLE_ID);
  } catch {
    ok = false;
  }

  await appRef.update({
    discordRoleAssigned: ok,
    discordRetryNeeded: !ok,
  });

  return ok ? { ok: true } : { ok: false, reason: "discord_api_failure" };
}

/** Convenience wrapper used by the PATCH route — syncs custom claims after the role is on the profile. */
export async function syncAmbassadorClaim(uid: string): Promise<void> {
  // Read current roles, include 'ambassador' (arrayUnion has already applied).
  const snap = await db.collection("mentorship_profiles").doc(uid).get();
  const data = snap.data() as { roles?: string[]; admin?: boolean } | undefined;
  const roles = data?.roles ?? ["ambassador"];
  await syncRoleClaim(uid, { roles, admin: data?.admin === true });
}
```

Notes:
- `runAcceptanceTransaction` does ALL reads inside the transaction before any writes (Firestore transaction constraint).
- `syncRoleClaim` is NOT called inside the transaction (it does Firebase Auth + Firestore writes outside the cohort/app ref set — doing it inside would double up the work on retry). Instead the PATCH route (Task 2) calls `syncAmbassadorClaim(applicantUid)` after the transaction commits.
- `assignAmbassadorDiscordRoleSoft` swallows all errors. Callers NEVER need a try/catch.
- `FieldValue.arrayUnion("ambassador")` is idempotent — re-accepting will not add the role twice.

After GREEN, verify all 10 tests pass. No REFACTOR expected beyond removing duplication.
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/ambassador/acceptance.test.ts</automated>
  </verify>
  <done>All 10 tests pass. `src/lib/ambassador/acceptance.ts` exports runAcceptanceTransaction, assignAmbassadorDiscordRoleSoft, syncAmbassadorClaim. Uses db.runTransaction (not db.batch). Acceptance is idempotent. Discord failures never throw.</done>
  <acceptance_criteria>
    - `grep -q "runTransaction" src/lib/ambassador/acceptance.ts` (Pitfall 1 fix)
    - `grep -q "arrayUnion.*ambassador" src/lib/ambassador/acceptance.ts`
    - `grep -q "increment.*1" src/lib/ambassador/acceptance.ts`
    - `grep -q "DISCORD_AMBASSADOR_ROLE_ID" src/lib/ambassador/acceptance.ts`
    - `grep -q "cohort_full" src/lib/ambassador/acceptance.ts` (COHORT-04)
    - `grep -q "already_declined" src/lib/ambassador/acceptance.ts`
    - `grep -q "alreadyAccepted" src/lib/ambassador/acceptance.ts` (DISC-03 idempotency)
    - `grep -q "syncRoleClaim" src/lib/ambassador/acceptance.ts`
    - File does NOT contain `db.batch()`
    - `grep -cE "^\s*(it|test)\(" src/__tests__/ambassador/acceptance.test.ts` returns >= 10
    - `npx vitest run src/__tests__/ambassador/acceptance.test.ts` — all tests pass, 0 failing
  </acceptance_criteria>
</task>

<task type="auto" tdd="false">
  <name>Task 2: GET detail + PATCH accept/decline at /api/ambassador/applications/[applicationId]</name>
  <files>src/app/api/ambassador/applications/[applicationId]/route.ts</files>
  <read_first>
    - @src/lib/ambassador/acceptance.ts (Task 1 helpers)
    - @src/lib/ambassador/adminAuth.ts (Plan 04 requireAdmin — discriminated union with uid)
    - @src/lib/firebaseAdmin.ts (storage may be null — Pitfall 7)
    - @src/types/ambassador.ts (ApplicationReviewSchema)
    - @src/lib/email.ts (Plan 03 email helpers)
    - @src/lib/ambassador/constants.ts (ADMIN_SIGNED_URL_EXPIRY_MS)
  </read_first>
  <action>
Create `src/app/api/ambassador/applications/[applicationId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, storage } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import {
  ApplicationReviewSchema,
  type ApplicationDoc,
} from "@/types/ambassador";
import {
  AMBASSADOR_APPLICATIONS_COLLECTION,
  ADMIN_SIGNED_URL_EXPIRY_MS,
} from "@/lib/ambassador/constants";
import {
  runAcceptanceTransaction,
  assignAmbassadorDiscordRoleSoft,
  syncAmbassadorClaim,
} from "@/lib/ambassador/acceptance";
import {
  sendAmbassadorApplicationAcceptedEmail,
  sendAmbassadorApplicationDeclinedEmail,
} from "@/lib/email";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ambassador/applications/[id]");

type RouteParams = { params: Promise<{ applicationId: string }> };

/** GET detail — admin reads full application + 1-hour signed URL for student-ID (REVIEW-02). */
export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { applicationId } = await params;
  const snap = await db.collection(AMBASSADOR_APPLICATIONS_COLLECTION).doc(applicationId).get();
  if (!snap.exists) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  const app = { ...(snap.data() as ApplicationDoc), applicationId: snap.id };

  // Signed URL for student-ID photo (if path B). 1-hour expiry per REVIEW-02 + D-14.
  let studentIdSignedUrl: string | null = null;
  if (app.studentIdStoragePath && storage) {
    try {
      const [url] = await storage.file(app.studentIdStoragePath).getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + ADMIN_SIGNED_URL_EXPIRY_MS,
      });
      studentIdSignedUrl = url;
    } catch (e) {
      logger.warn("signed URL generation failed", { applicationId, path: app.studentIdStoragePath, error: e });
    }
  }

  return NextResponse.json({ application: app, studentIdSignedUrl });
}

/** PATCH — admin accepts or declines. Body: { action: "accept" | "decline", notes?: string } */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  // APPLY-08: Plan 04's requireAdmin formally guarantees uid on the ok branch (synthesised from
  // the admin_sessions token). Every decision persists it to reviewedBy for admin attribution.
  const adminUid = admin.uid;

  const { applicationId } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = ApplicationReviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  const { action, notes } = parsed.data;

  if (action === "decline") {
    const ref = db.collection(AMBASSADOR_APPLICATIONS_COLLECTION).doc(applicationId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    const app = snap.data() as ApplicationDoc;
    if (app.status === "accepted") return NextResponse.json({ error: "Cannot decline an accepted application" }, { status: 409 });

    await ref.update({
      status: "declined",
      reviewedBy: adminUid,
      reviewerNotes: notes ?? null,
      decidedAt: new Date(),
      declinedAt: new Date(),
    });

    // EMAIL-03 — non-fatal
    try {
      await sendAmbassadorApplicationDeclinedEmail(app.applicantEmail, app.applicantName, notes);
    } catch (e) {
      logger.error("EMAIL-03 send failed", { applicationId, error: e });
    }

    return NextResponse.json({ success: true, status: "declined" });
  }

  // action === "accept"
  const result = await runAcceptanceTransaction(applicationId, adminUid, notes);
  if (!result.ok) {
    const status = result.error === "cohort_full" ? 409
                 : result.error === "application_not_found" || result.error === "cohort_not_found" ? 404
                 : 409;
    return NextResponse.json({ error: result.error }, { status });
  }

  // Sync custom claims (non-fatal) — NOT inside the transaction.
  try { await syncAmbassadorClaim(result.applicantUid); } catch (e) { logger.error("syncAmbassadorClaim failed", { uid: result.applicantUid, error: e }); }

  // Attempt Discord role assignment (D-17: never rolls back; REVIEW-05 surfaces failures).
  // Skip on idempotent re-accept IF discord is already assigned — we still attempt if discordRetryNeeded was true.
  let discord: { ok: true } | { ok: false; reason: string };
  if (result.alreadyAccepted) {
    discord = { ok: true }; // already-accepted path: assume prior Discord state, admin uses retry endpoint if needed
  } else {
    discord = await assignAmbassadorDiscordRoleSoft(
      result.applicationId,
      result.discordMemberId ?? result.discordHandle ?? null,
    );
  }

  // EMAIL-02 — non-fatal; don't resend on idempotent re-accept.
  if (!result.alreadyAccepted) {
    try {
      await sendAmbassadorApplicationAcceptedEmail(result.applicantEmail, result.applicantName, result.cohortName);
    } catch (e) {
      logger.error("EMAIL-02 send failed", { applicationId, error: e });
    }
  }

  return NextResponse.json({
    success: true,
    status: "accepted",
    alreadyAccepted: result.alreadyAccepted === true,
    discordAssigned: discord.ok,
    discordReason: discord.ok ? null : discord.reason,
  });
}
```

Implementation notes:
- `action: "accept"` routes through `runAcceptanceTransaction` (Task 1) — all COHORT-04 + DISC-03 idempotency logic lives there.
- `action: "decline"` is a simple update; it does NOT touch `mentorship_profiles` or `cohorts`.
- `adminUid = admin.uid` — Plan 04 now formally guarantees this field on the ok branch (synthesised per-session from the admin_sessions token). No fallback needed (APPLY-08).
- Discord role assignment runs AFTER the transaction commits. If it fails, the doc has `discordRetryNeeded: true` and the admin UI (Plan 08) shows a retry banner (REVIEW-05).
- EMAIL-02/03 are non-fatal — the decision is already persisted.
- D-15 note: declined applications do NOT trigger the 30-day Storage cleanup here. The `declinedAt` timestamp is the clock, and Plan 09's cron reads it.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>GET returns application + 1-hour signed URL for student-ID. PATCH accepts (via transaction, idempotent, maxSize-guarded) or declines (simple update). Discord failure never rolls back Firestore. reviewedBy captured from admin.uid (APPLY-08).</done>
  <acceptance_criteria>
    - `grep -q "isAmbassadorProgramEnabled" src/app/api/ambassador/applications/\[applicationId\]/route.ts`
    - `grep -q "requireAdmin" src/app/api/ambassador/applications/\[applicationId\]/route.ts`
    - `grep -q "admin.uid" src/app/api/ambassador/applications/\[applicationId\]/route.ts` (APPLY-08 reviewedBy attribution)
    - `grep -q "runAcceptanceTransaction" src/app/api/ambassador/applications/\[applicationId\]/route.ts`
    - `grep -q "assignAmbassadorDiscordRoleSoft" src/app/api/ambassador/applications/\[applicationId\]/route.ts`
    - `grep -q "sendAmbassadorApplicationAcceptedEmail" src/app/api/ambassador/applications/\[applicationId\]/route.ts`
    - `grep -q "sendAmbassadorApplicationDeclinedEmail" src/app/api/ambassador/applications/\[applicationId\]/route.ts`
    - `grep -q "ApplicationReviewSchema" src/app/api/ambassador/applications/\[applicationId\]/route.ts`
    - `grep -q "getSignedUrl" src/app/api/ambassador/applications/\[applicationId\]/route.ts` (REVIEW-02)
    - `grep -q "ADMIN_SIGNED_URL_EXPIRY_MS" src/app/api/ambassador/applications/\[applicationId\]/route.ts` (1-hour expiry via constant)
    - `grep -q "declinedAt" src/app/api/ambassador/applications/\[applicationId\]/route.ts` (cleanup cron clock)
    - `grep -q "syncAmbassadorClaim" src/app/api/ambassador/applications/\[applicationId\]/route.ts`
    - File does NOT call `assignDiscordRole` directly (uses soft wrapper)
    - File does NOT call `db.batch()` (uses runTransaction via helper)
    - `npx tsc --noEmit` passes
  </acceptance_criteria>
</task>

<task type="auto" tdd="false">
  <name>Task 3: POST /api/ambassador/applications/[applicationId]/discord-resolve retry endpoint</name>
  <files>src/app/api/ambassador/applications/[applicationId]/discord-resolve/route.ts</files>
  <read_first>
    - @src/lib/discord.ts (lookupMemberByUsername — fresh resolution, NOT cached)
    - @src/lib/ambassador/acceptance.ts (assignAmbassadorDiscordRoleSoft from Task 1)
    - @src/lib/ambassador/adminAuth.ts (Plan 04 requireAdmin)
    - @src/types/ambassador.ts (ApplicationDoc)
    - @.planning/phases/02-application-subsystem/02-RESEARCH.md (Pitfall 2 — stale discordMemberId)
  </read_first>
  <action>
Create `src/app/api/ambassador/applications/[applicationId]/discord-resolve/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { lookupMemberByUsername } from "@/lib/discord";
import { assignAmbassadorDiscordRoleSoft } from "@/lib/ambassador/acceptance";
import { AMBASSADOR_APPLICATIONS_COLLECTION } from "@/lib/ambassador/constants";
import type { ApplicationDoc } from "@/types/ambassador";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ambassador/discord-resolve");

type RouteParams = { params: Promise<{ applicationId: string }> };

/**
 * POST — admin clicks "Retry Discord" on the detail page.
 * MUST re-resolve the Discord handle freshly (Pitfall 2: stored discordMemberId may be stale
 * because the applicant changed their Discord username between submission and acceptance).
 * Then re-attempts assignDiscordRole via the soft wrapper.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { applicationId } = await params;
  const ref = db.collection(AMBASSADOR_APPLICATIONS_COLLECTION).doc(applicationId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  const app = snap.data() as ApplicationDoc;

  // Only accepted applications get Discord role retries.
  if (app.status !== "accepted") {
    return NextResponse.json({ error: "Application must be accepted before Discord retry" }, { status: 409 });
  }

  // Pitfall 2: ALWAYS re-resolve by username on retry, never trust the stored memberId.
  let freshMember: { id: string; username: string } | null = null;
  try {
    freshMember = await lookupMemberByUsername(app.discordHandle);
  } catch (e) {
    logger.warn("discord lookup error", { applicationId, handle: app.discordHandle, error: e });
  }

  // Persist the freshly resolved (or null) memberId before attempting role assignment
  // so admin panel reads reflect reality even if the next step fails.
  await ref.update({
    discordMemberId: freshMember?.id ?? null,
    discordHandleResolved: freshMember != null,
  });

  if (!freshMember) {
    await ref.update({ discordRoleAssigned: false, discordRetryNeeded: true });
    return NextResponse.json({
      success: false,
      resolved: false,
      reason: "handle_not_found",
      message: `Could not find '${app.discordHandle}' in the Discord server. Ask the applicant to verify their handle and try again.`,
    }, { status: 200 });
  }

  const discord = await assignAmbassadorDiscordRoleSoft(applicationId, freshMember.id);
  return NextResponse.json({
    success: discord.ok,
    resolved: true,
    discordMemberId: freshMember.id,
    reason: discord.ok ? null : discord.reason,
  });
}
```

Implementation notes:
- Pitfall 2 (stale memberId) is the sole reason this endpoint exists — without it, the admin would retry against a dead member ID indefinitely.
- The re-resolve + persist happens BEFORE the role assignment, so if the assignment itself fails the admin still sees the fresh memberId on the detail page.
- Returns HTTP 200 even when resolution fails — this is a soft operation, not an error. The payload signals success/failure via `resolved` and `success` fields.
- `discordHandleResolved: true/false` on the doc lets Plan 08's banner render "couldn't find handle" specifically, vs. generic "Discord assignment failed."
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>POST endpoint re-resolves the Discord handle via lookupMemberByUsername (not cached), persists the fresh memberId, and re-attempts assignDiscordRole via the soft wrapper. Returns resolved:false with a helpful message when the handle is no longer in the server.</done>
  <acceptance_criteria>
    - `grep -q "isAmbassadorProgramEnabled" src/app/api/ambassador/applications/\[applicationId\]/discord-resolve/route.ts`
    - `grep -q "requireAdmin" src/app/api/ambassador/applications/\[applicationId\]/discord-resolve/route.ts`
    - `grep -q "lookupMemberByUsername" src/app/api/ambassador/applications/\[applicationId\]/discord-resolve/route.ts` (Pitfall 2 re-resolution)
    - `grep -q "assignAmbassadorDiscordRoleSoft" src/app/api/ambassador/applications/\[applicationId\]/discord-resolve/route.ts`
    - `grep -q "discordMemberId" src/app/api/ambassador/applications/\[applicationId\]/discord-resolve/route.ts`
    - `grep -q "handle_not_found" src/app/api/ambassador/applications/\[applicationId\]/discord-resolve/route.ts`
    - File does NOT trust `app.discordMemberId` — always re-resolves
    - `npx tsc --noEmit` passes
  </acceptance_criteria>
</task>

</tasks>

<verification>
```bash
npx tsc --noEmit
npx vitest run src/__tests__/ambassador/acceptance.test.ts
npx vitest run src/__tests__/ambassador/
```

Smoke test (requires local dev):
1. With feature flag on, GET /api/ambassador/applications/abc (admin, x-admin-token) → returns application + signed URL.
2. PATCH with body `{"action":"accept"}` on a submitted application → 200 with `alreadyAccepted:false, discordAssigned:<bool>`. Firestore should show: `applications/{id}.status=accepted`, `mentorship_profiles/{uid}.roles contains 'ambassador'`, ambassador subdoc exists, cohort `acceptedCount` incremented.
3. PATCH the same application again → 200 with `alreadyAccepted:true`. Cohort count DID NOT re-increment.
4. PATCH on a cohort at capacity → 409 "cohort_full".
5. PATCH with `{"action":"decline","notes":"..."}` → 200, status=declined, declinedAt set, EMAIL-03 fired.
6. POST /discord-resolve when Discord is failing → returns `success:false, reason:"discord_api_failure"`, app.discordRetryNeeded=true.
7. POST /discord-resolve after fixing Discord handle → returns `success:true, resolved:true`.
</verification>

<success_criteria>
- [ ] `runAcceptanceTransaction` uses `db.runTransaction()` (not `db.batch()`) and is proven race-safe by unit tests for COHORT-04.
- [ ] Acceptance is idempotent: re-accepting returns 200, does NOT double-increment cohort.acceptedCount, does NOT duplicate ambassador subdoc, does NOT resend EMAIL-02.
- [ ] Discord role assignment failure flips `discordRetryNeeded:true` on the doc and does NOT roll back the Firestore commit (D-17).
- [ ] Decline path writes `declinedAt` used by Plan 09 cron.
- [ ] `/discord-resolve` re-resolves the Discord handle freshly (Pitfall 2), never trusts the cached `discordMemberId`.
- [ ] All three handlers gate on `isAmbassadorProgramEnabled()` and `requireAdmin`.
- [ ] EMAIL-02 fires on first accept; EMAIL-03 fires on decline; both failures are logged and non-fatal.
- [ ] `reviewedBy` is set from `admin.uid` on every accept/decline (APPLY-08 admin attribution).
- [ ] `npx tsc --noEmit` passes.
- [ ] 10+ acceptance.test.ts assertions pass.
</success_criteria>

<output>
After completion, create `.planning/phases/02-application-subsystem/02-06-SUMMARY.md` with:
- Summary of the two-stage commit shape (txn first, Discord second, retry endpoint for failures)
- Exports from `src/lib/ambassador/acceptance.ts` that Plan 08 (admin detail UI) should call
- Confirmation that COHORT-04 is enforced race-safely via transaction
- Confirmation that APPLY-08 is satisfied via `reviewedBy = admin.uid` on both accept and decline paths
- Any deviations from the plan with rationale
</output>
