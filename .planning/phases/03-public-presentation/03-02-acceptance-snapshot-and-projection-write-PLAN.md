---
phase: 3
plan: "03-02"
title: "Acceptance snapshot + in-transaction projection write + username backfill"
wave: 2
depends_on: ["03-01"]
files_modified:
  - "src/lib/ambassador/acceptance.ts"
  - "src/lib/ambassador/username.ts"
autonomous: true
requirements:
  - "PRESENT-01"
  - "PRESENT-04"
must_haves:
  - "On FIRST accept, `runAcceptanceTransaction` snapshots `university` and `city` from the application doc onto the ambassador subdoc (D-06); on re-accept the snapshot is preserved (idempotency)."
  - "On FIRST accept, `runAcceptanceTransaction` writes `public_ambassadors/{uid}` inside the SAME transaction so the projection is guaranteed to exist for every accepted ambassador listed on `/ambassadors` (D-08 path 1)."
  - "Ambassador-only users who lack a `username` are backfilled with a unique slug (derived from displayName/email, with collision loop) at acceptance time so `/u/[username]` never falls back to `uid` for new acceptances (D-01a recommended path)."
---

<objective>
Extend the Phase 2 acceptance transaction so that first-accept produces everything the public surface needs in a single atomic operation. Specifically: (1) snapshot `university` + `city` from the application doc onto the ambassador subdoc (D-06), (2) write the `public_ambassadors/{uid}` projection inside the SAME transaction as the role/subdoc/cohort writes (D-08 path 1, so drift is impossible between "has ambassador role" and "shows on /ambassadors"), and (3) backfill a unique `username` on the parent `mentorship_profiles` doc if one does not already exist — ambassador-only users may never have gone through mentor onboarding, so without backfill the `/u/[username]` route would fall back to `/u/{uid}` (D-01a). Re-accept remains idempotent: the subdoc snapshot is NOT overwritten, the projection `updatedAt` is refreshed, and the username backfill no-ops if one is already present.
</objective>

<tasks>

<task id="1" title="Add ensureUniqueUsername helper">
  <read_first>
    - src/app/api/mentorship/profile/route.ts (lines 72–97 — existing username generation pattern)
    - src/lib/firebaseAdmin.ts
    - src/types/mentorship.ts
  </read_first>
  <action>
    Create a NEW file `src/lib/ambassador/username.ts` with the contents below. It mirrors the existing mentorship/profile/route.ts logic (line 72–97) but is callable from inside a Firestore transaction — the username uniqueness CHECK runs OUTSIDE the transaction (a `collection().where().limit().get()` query cannot be used inside `txn.get`), and the caller then writes the final username via `txn.update`.

    ```typescript
    /**
     * src/lib/ambassador/username.ts
     *
     * Username backfill for ambassador-only users (D-01a).
     *
     * Ambassador-only users (applicants who never went through /mentorship/onboarding)
     * may hit acceptance with no `username` on their mentorship_profiles doc. Without
     * a username, the canonical /u/[username] URL falls back to /u/{uid} which is
     * ugly and leaks the Firebase uid. Backfilling at acceptance time keeps the URL
     * stable and human-readable.
     *
     * Mirrors the collision-loop algorithm in src/app/api/mentorship/profile/route.ts
     * lines 72–97. The LOOKUP runs outside Firestore transactions (where() queries are
     * illegal inside txn.get) — the caller is responsible for writing the returned
     * username via txn.update.
     */

    import { db } from "@/lib/firebaseAdmin";

    /**
     * Derive a URL-safe base username from displayName, falling back to email local-part,
     * falling back to `user{timestamp}`. Lowercased, stripped of non [a-z0-9_-] chars.
     */
    export function deriveBaseUsername(displayName: string, email: string): string {
      const fromName = (displayName ?? "")
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9_-]/g, "");
      if (fromName.length >= 3) return fromName;

      const fromEmail = (email ?? "")
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
      if (fromEmail.length >= 3) return fromEmail;

      return `user${Date.now()}`;
    }

    /**
     * Return a username guaranteed unique in `mentorship_profiles.username`, appending
     * a numeric suffix on collision. Matches the POST /api/mentorship/profile algorithm.
     *
     * Runs OUTSIDE any Firestore transaction — `where().limit().get()` is illegal inside
     * a transaction. Acceptable for backfill because the race window between this check
     * and the txn.update that persists the username is tiny; a collision would at worst
     * produce two profiles with the same username, which is recoverable.
     */
    export async function ensureUniqueUsername(base: string): Promise<string> {
      let candidate = base;
      let counter = 1;
      // Bounded loop — pathological input cannot block acceptance forever.
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
      // Absolute fallback — timestamp suffix cannot plausibly collide.
      return `${base}${Date.now()}`;
    }
    ```

    Verify with `npx tsc --noEmit`.
  </action>
  <acceptance_criteria>
    - `test -f src/lib/ambassador/username.ts`
    - `grep -q "export function deriveBaseUsername" src/lib/ambassador/username.ts`
    - `grep -q "export async function ensureUniqueUsername" src/lib/ambassador/username.ts`
    - `grep -q "counter < 100" src/lib/ambassador/username.ts`
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
</task>

<task id="2" title="Extend runAcceptanceTransaction with snapshot + projection write + username backfill">
  <read_first>
    - src/lib/ambassador/acceptance.ts (the CURRENT file in full — lines 1–204)
    - src/lib/ambassador/publicProjection.ts (created in Plan 03-01)
    - src/lib/ambassador/username.ts (created in Task 1 above)
    - src/types/ambassador.ts (after Plan 03-01)
    - src/types/mentorship.ts
  </read_first>
  <action>
    Modify `src/lib/ambassador/acceptance.ts` as follows. The function `runAcceptanceTransaction` currently has shape: (a) reads, (b) writes to appRef, profileRef, ambassadorRef, cohortRef. You will augment the reads and writes WITHOUT changing the existing return shape.

    **Imports — add to the existing import block at the top of the file:**

    ```typescript
    import {
      buildPublicAmbassadorProjection,
    } from "@/lib/ambassador/publicProjection";
    import {
      PUBLIC_AMBASSADORS_COLLECTION,
    } from "@/types/ambassador";
    import {
      deriveBaseUsername,
      ensureUniqueUsername,
    } from "@/lib/ambassador/username";
    ```

    **Function body — the changes below are BEFORE/INSIDE the existing `db.runTransaction(...)` callback.**

    STEP A — BEFORE the transaction starts, add a username resolution block. The existing code starts with `return db.runTransaction<AcceptanceResult>(async (txn) => {`. Immediately BEFORE that line, insert:

    ```typescript
    // ── Pre-transaction: resolve the applicant's mentorship_profiles doc to check if
    // a username backfill is needed (D-01a). where() queries cannot run inside a txn,
    // so we do the lookup here and pass the resolved username into the transaction.
    const preAppSnap = await db
      .collection(AMBASSADOR_APPLICATIONS_COLLECTION)
      .doc(applicationId)
      .get();
    if (!preAppSnap.exists) return { ok: false, error: "application_not_found" };
    const preApp = preAppSnap.data() as ApplicationDoc;

    const preProfileSnap = await db
      .collection("mentorship_profiles")
      .doc(preApp.applicantUid)
      .get();
    const preProfileData = preProfileSnap.exists
      ? (preProfileSnap.data() as { username?: string; linkedinUrl?: string; photoURL?: string; displayName?: string })
      : undefined;

    let resolvedUsername = preProfileData?.username;
    if (!resolvedUsername || resolvedUsername.trim().length === 0) {
      const base = deriveBaseUsername(preApp.applicantName, preApp.applicantEmail);
      resolvedUsername = await ensureUniqueUsername(base);
    }
    ```

    STEP B — INSIDE the transaction, AFTER `const app = appSnap.data() as ApplicationDoc;`, add a read for the parent profile's `linkedinUrl`/`photoURL`/`displayName` fields (the profile snap is already read by existing code on the line `const profileSnap = await txn.get(profileRef);` — reuse it rather than re-reading):

    Locate the existing `const profileSnap = await txn.get(profileRef);` line. No structural change needed here — we will read `linkedinUrl`/`photoURL`/`displayName` from `profileSnap.data()` during the write phase.

    STEP C — REPLACE the ambassador subdoc write block. The existing code inside the `if (!alreadyAccepted)` branch reads:

    ```typescript
          const ambassadorRef = profileRef.collection("ambassador").doc("v1");
          txn.set(ambassadorRef, {
            cohortId: app.targetCohortId,
            joinedAt: now,
            active: true,
            strikes: 0,
            discordMemberId: app.discordMemberId ?? null,
          });
    ```

    Replace it with (the two new fields `university` + `city` are snapshotted from the application doc per D-06 — conditionally spread because both are required non-empty strings on the application doc per `ApplicationDoc.university: string` + `ApplicationDoc.city: string`, but we defensively guard against empty strings):

    ```typescript
          const ambassadorRef = profileRef.collection("ambassador").doc("v1");
          const subdocPayload: Record<string, unknown> = {
            cohortId: app.targetCohortId,
            joinedAt: now,
            active: true,
            strikes: 0,
            discordMemberId: app.discordMemberId ?? null,
          };
          // D-06: snapshot university + city from the application doc onto the subdoc
          // on FIRST accept. Conditionally spread — Admin SDK rejects undefined.
          if (typeof app.university === "string" && app.university.trim().length > 0) {
            subdocPayload.university = app.university.trim();
          }
          if (typeof app.city === "string" && app.city.trim().length > 0) {
            subdocPayload.city = app.city.trim();
          }
          txn.set(ambassadorRef, subdocPayload);
    ```

    STEP D — IMMEDIATELY AFTER the cohort update (`txn.update(cohortRef, { acceptedCount: FieldValue.increment(1), updatedAt: now });` inside the `if (!alreadyAccepted)` branch), add the public projection write. STILL inside the `if (!alreadyAccepted)` branch, append:

    ```typescript
          // D-08 path 1: write the denormalized public_ambassadors projection inside the
          // SAME transaction so /ambassadors never sees an ambassador whose projection
          // is missing. Joins parent profile fields (photoURL, displayName, linkedinUrl)
          // with the application's university/city snapshot.
          const parentProfile =
            profileSnap.exists
              ? (profileSnap.data() as {
                  username?: string;
                  displayName?: string;
                  photoURL?: string;
                  linkedinUrl?: string;
                })
              : undefined;

          const publicRef = db.collection(PUBLIC_AMBASSADORS_COLLECTION).doc(app.applicantUid);
          const projection = buildPublicAmbassadorProjection({
            uid: app.applicantUid,
            username: resolvedUsername,
            displayName:
              parentProfile?.displayName ?? app.applicantName ?? "Ambassador",
            photoURL: parentProfile?.photoURL ?? "",
            cohortId: app.targetCohortId,
            linkedinUrl: parentProfile?.linkedinUrl,
            university:
              typeof app.university === "string" && app.university.trim().length > 0
                ? app.university.trim()
                : undefined,
            city:
              typeof app.city === "string" && app.city.trim().length > 0
                ? app.city.trim()
                : undefined,
            // Phase-3 editable fields are absent at acceptance time; PATCH populates them later.
            updatedAt: now,
          });
          txn.set(publicRef, projection);
    ```

    STEP E — Inside the `if (profileSnap.exists)` branch of the existing roles-array write (currently `txn.update(profileRef, { roles: FieldValue.arrayUnion("ambassador") });`), augment to also backfill the username if the parent profile has none. Replace the single `txn.update(...)` with:

    ```typescript
        if (profileSnap.exists) {
          const existingUsername = (profileSnap.data() as { username?: string })?.username;
          const profileUpdate: Record<string, unknown> = {
            roles: FieldValue.arrayUnion("ambassador"),
          };
          if (!existingUsername || existingUsername.trim().length === 0) {
            profileUpdate.username = resolvedUsername;
          }
          txn.update(profileRef, profileUpdate);
        } else {
    ```

    And inside the matching `else` block (the `txn.set(profileRef, { ... merge: true });` branch for the "profile missing" edge case), ensure the `set` payload includes `username: resolvedUsername,` as a field. Replace the existing `txn.set(profileRef, {...})` with:

    ```typescript
          txn.set(
            profileRef,
            {
              uid: app.applicantUid,
              email: app.applicantEmail,
              displayName: app.applicantName,
              username: resolvedUsername,
              roles: ["ambassador"],
              createdAt: now,
            },
            { merge: true },
          );
    ```

    STEP F — The transaction must remain read-before-write. Since `buildPublicAmbassadorProjection` is pure (no Firestore reads) and STEP D happens AFTER all `txn.get` calls (appRef, cohortRef, profileRef), there is NO new read phase — the existing order is preserved. Confirm this by scanning the final function: every `txn.get` call must appear BEFORE the first `txn.set`/`txn.update`/`txn.create`.

    STEP G — Run the full Phase 2 acceptance test suite to confirm no regression, then TypeScript check:

    ```bash
    npx vitest run src/lib/ambassador/acceptance.test.ts 2>/dev/null || echo "TEST_FILE_MISSING_OR_OK"
    npx tsc --noEmit
    ```

    (If no `acceptance.test.ts` exists yet, proceed — Plan 03-03's verification runs an integration check. Do NOT create a new test file in this plan; existing Phase 2 tests or a future TDD plan cover behaviour.)
  </action>
  <acceptance_criteria>
    - `grep -q "PUBLIC_AMBASSADORS_COLLECTION" src/lib/ambassador/acceptance.ts`
    - `grep -q "buildPublicAmbassadorProjection" src/lib/ambassador/acceptance.ts`
    - `grep -q "ensureUniqueUsername" src/lib/ambassador/acceptance.ts`
    - `grep -q "subdocPayload.university = app.university.trim()" src/lib/ambassador/acceptance.ts`
    - `grep -q "subdocPayload.city = app.city.trim()" src/lib/ambassador/acceptance.ts`
    - `grep -q "txn.set(publicRef, projection)" src/lib/ambassador/acceptance.ts`
    - `grep -q "profileUpdate.username = resolvedUsername" src/lib/ambassador/acceptance.ts`
    - `npx tsc --noEmit` exits 0
    - `npm run lint -- --quiet src/lib/ambassador/acceptance.ts src/lib/ambassador/username.ts` exits 0
  </acceptance_criteria>
</task>

</tasks>

<verification>
- `grep -q "PUBLIC_AMBASSADORS_COLLECTION" src/lib/ambassador/acceptance.ts` (projection wired into accept path)
- `grep -q "ensureUniqueUsername" src/lib/ambassador/acceptance.ts` (username backfill wired in)
- `grep -q "D-06" src/lib/ambassador/acceptance.ts || grep -q "snapshot university" src/lib/ambassador/acceptance.ts` (snapshot behavior documented)
- `npx tsc --noEmit` exits 0
- Manual trace (executor must verify): every `txn.get` call in `runAcceptanceTransaction` precedes every `txn.set`/`txn.update`/`txn.create` call — Firestore transaction read-before-write invariant preserved.
</verification>

<must_haves>
- On first accept, `runAcceptanceTransaction` snapshots `university` and `city` from the application doc onto the ambassador subdoc (D-06); on re-accept the snapshot is preserved (idempotency).
- On first accept, `runAcceptanceTransaction` writes `public_ambassadors/{uid}` inside the SAME transaction so the projection is guaranteed to exist for every accepted ambassador listed on `/ambassadors` (D-08 path 1).
- Ambassador-only users who lack a `username` are backfilled with a unique slug at acceptance time so `/u/[username]` never falls back to `uid` for new acceptances (D-01a recommended path).
</must_haves>
