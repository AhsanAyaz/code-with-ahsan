---
phase: 3
plan: "03-03"
title: "PATCH + GET /api/ambassador/profile endpoint — subdoc + projection batched write"
wave: 2
depends_on: ["03-01"]
files_modified:
  - "src/app/api/ambassador/profile/route.ts"
autonomous: true
requirements:
  - "PRESENT-03"
  - "PRESENT-04"
must_haves:
  - "`PATCH /api/ambassador/profile` accepts a partial payload validated against `AmbassadorPublicFieldsSchema` and writes updates to BOTH `mentorship_profiles/{uid}/ambassador/v1` AND `public_ambassadors/{uid}` in a single Firestore batched write (D-08 path 2) — if either write fails, neither is persisted."
  - "`cohortPresentationVideoUrl` is validated with `isValidVideoUrl` and the classifier output is persisted as `cohortPresentationVideoEmbedType` on both the subdoc and the projection (PRESENT-04, D-04)."
  - "Endpoint is feature-flag gated (isAmbassadorProgramEnabled) and role-gated (`hasRoleClaim(token, \"ambassador\") || hasRoleClaim(token, \"alumni-ambassador\")`); non-ambassador users get 403, disabled feature returns 404 (Phase 2 gate order precedent)."
  - "`GET /api/ambassador/profile` is shipped alongside PATCH (same gate order: flag → auth → role) and returns the current public-field subset of the ambassador subdoc so the `/profile` editor (plan 03-06) can hydrate its form without inventing a second endpoint."
---

<objective>
Ship the single backend endpoint that powers the /profile "Ambassador Public Card" editing surface (Plan 03-06). The endpoint exposes TWO handlers at `src/app/api/ambassador/profile/route.ts`:

1. `GET /api/ambassador/profile` — returns the current public-field subset of the ambassador subdoc so the `/profile` editor can hydrate its form.
2. `PATCH /api/ambassador/profile` — takes a partial payload of the seven editable public fields (D-03, D-05), validates them via `AmbassadorPublicFieldsSchema` (Plan 03-01), validates the optional `cohortPresentationVideoUrl` via the Phase 2 `isValidVideoUrl`/`classifyVideoUrl` helpers (D-04), and persists the diff to BOTH the ambassador subdoc AND the denormalized `public_ambassadors/{uid}` projection in a single Firestore batched write (D-08 path 2).

The batched-write discipline is non-negotiable: the projection is the read source for `/ambassadors`, so if the subdoc writes but the projection doesn't (or vice versa), the public page goes stale. Batched writes fail atomically: if one `batch.set(...)` fails, Firestore rejects the whole batch. Both endpoints are feature-flag gated AND role-gated (ambassador or alumni-ambassador only) — the route order mirrors Phase 2 Pitfall 3: `isAmbassadorProgramEnabled()` → `verifyAuth` → role check → business logic.
</objective>

<tasks>

<task id="1" title="Create PATCH /api/ambassador/profile route handler">
  <read_first>
    - src/app/api/ambassador/applications/[applicationId]/route.ts (gate order + error shape precedent)
    - src/lib/auth.ts (verifyAuth signature)
    - src/lib/permissions.ts (hasRoleClaim)
    - src/lib/ambassador/publicProjection.ts (created in Plan 03-01)
    - src/lib/ambassador/videoUrl.ts (isValidVideoUrl, classifyVideoUrl)
    - src/types/ambassador.ts (after Plan 03-01 — AmbassadorPublicFieldsSchema, PUBLIC_AMBASSADORS_COLLECTION)
    - src/lib/firebaseAdmin.ts
    - src/lib/features.ts
  </read_first>
  <action>
    Create a NEW file `src/app/api/ambassador/profile/route.ts` with the contents VERBATIM below. The gate order is: `isAmbassadorProgramEnabled()` (Pitfall 3) → `verifyAuth` → role check via `hasRoleClaim` (accepts ambassador OR alumni-ambassador per D-05) → Zod parse → video URL validation (PRESENT-04) → batched write.

    ```typescript
    /**
     * PATCH /api/ambassador/profile
     *
     * Writes the ambassador's editable public fields (D-03, D-05) to BOTH:
     *   1. mentorship_profiles/{uid}/ambassador/v1  (ambassador subdoc)
     *   2. public_ambassadors/{uid}                 (denormalized projection — D-07, D-08)
     * in a single Firestore batched write so the two stores can never drift.
     *
     * Gate order (Phase 2 Pitfall 3):
     *   1. isAmbassadorProgramEnabled() → 404 if off
     *   2. verifyAuth()                 → 401 if missing/invalid
     *   3. hasRoleClaim(token, "ambassador" | "alumni-ambassador") → 403 otherwise
     *   4. Zod parse body → 400 on shape errors
     *   5. Video URL validation (PRESENT-04) → 400 if present and invalid
     *   6. Batched write → 200 ok
     *
     * Design notes:
     *   - The PATCH is DIFF-oriented: empty-string values in the body mean "clear this field",
     *     and the handler uses FieldValue.delete() on the subdoc to remove cleared fields.
     *     The projection re-derives all fields from the post-write subdoc state to stay
     *     exactly in sync (no FieldValue.delete path needed — the helper filters undefined).
     *   - Admin SDK does NOT set ignoreUndefinedProperties (see firebaseAdmin.ts +
     *     MEMORY.md feedback_firestore_admin_undefined). ALL optional fields conditionally
     *     spread on the subdoc payload.
     *   - `cohortPresentationVideoUrl` only accepts youtube/loom/drive per
     *     CohortPresentationVideoEmbedTypeSchema — "unknown" classifier result rejects.
     */

    import { NextRequest, NextResponse } from "next/server";
    import { FieldValue } from "firebase-admin/firestore";
    import { db } from "@/lib/firebaseAdmin";
    import { isAmbassadorProgramEnabled } from "@/lib/features";
    import { verifyAuth } from "@/lib/auth";
    import { hasRoleClaim } from "@/lib/permissions";
    import {
      AmbassadorPublicFieldsSchema,
      PUBLIC_AMBASSADORS_COLLECTION,
      type AmbassadorPublicFieldsInput,
      type AmbassadorSubdoc,
      type CohortPresentationVideoEmbedType,
    } from "@/types/ambassador";
    import {
      buildPublicAmbassadorProjection,
      extractPublicFieldsFromSubdoc,
    } from "@/lib/ambassador/publicProjection";
    import { isValidVideoUrl, classifyVideoUrl } from "@/lib/ambassador/videoUrl";
    import { createLogger } from "@/lib/logger";

    const logger = createLogger("ambassador/profile/PATCH");

    export async function PATCH(request: NextRequest) {
      // 1. Feature flag gate
      if (!isAmbassadorProgramEnabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // 2. Auth gate
      const ctx = await verifyAuth(request);
      if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      // 3. Role gate — accept ambassador OR alumni-ambassador (D-05)
      const isAmbassador = hasRoleClaim(ctx, "ambassador");
      const isAlumni = hasRoleClaim(ctx, "alumni-ambassador");
      if (!isAmbassador && !isAlumni) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // 4. Zod parse body
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const parsed = AmbassadorPublicFieldsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid body", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const input: AmbassadorPublicFieldsInput = parsed.data;

      // 5. Video URL validation (PRESENT-04, D-04)
      //    - Empty string  → clear the field
      //    - Non-empty     → must pass isValidVideoUrl AND classify to youtube/loom/drive
      let videoEmbedType: CohortPresentationVideoEmbedType | undefined;
      let videoUrlToPersist: string | undefined;
      let clearVideo = false;
      if (typeof input.cohortPresentationVideoUrl === "string") {
        if (input.cohortPresentationVideoUrl.trim().length === 0) {
          clearVideo = true;
        } else if (!isValidVideoUrl(input.cohortPresentationVideoUrl)) {
          return NextResponse.json(
            { error: "cohortPresentationVideoUrl must be a YouTube, Loom, or Google Drive URL" },
            { status: 400 }
          );
        } else {
          const classified = classifyVideoUrl(input.cohortPresentationVideoUrl);
          if (classified === "unknown") {
            return NextResponse.json(
              { error: "Unsupported video URL provider" },
              { status: 400 }
            );
          }
          videoEmbedType = classified;
          videoUrlToPersist = input.cohortPresentationVideoUrl.trim();
        }
      }

      // 6. Load current subdoc + parent profile so the projection write can re-derive
      //    the full denormalized payload (joining linkedinUrl, displayName, photoURL,
      //    cohortId, username from the parent/subdoc).
      const profileRef = db.collection("mentorship_profiles").doc(ctx.uid);
      const ambassadorRef = profileRef.collection("ambassador").doc("v1");

      const [profileSnap, subdocSnap] = await Promise.all([
        profileRef.get(),
        ambassadorRef.get(),
      ]);

      if (!profileSnap.exists) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      if (!subdocSnap.exists) {
        return NextResponse.json(
          { error: "Ambassador subdoc missing — cannot edit public fields before acceptance" },
          { status: 409 }
        );
      }
      const profile = profileSnap.data() as {
        username?: string;
        displayName?: string;
        photoURL?: string;
        linkedinUrl?: string;
      };
      const subdoc = subdocSnap.data() as AmbassadorSubdoc;

      if (!profile.username || profile.username.trim().length === 0) {
        // Defensive — Plan 03-02 backfills at acceptance. If we somehow hit an older
        // ambassador without a username, refuse to write the projection rather than
        // write a uid-as-username placeholder the card would then render.
        return NextResponse.json(
          { error: "Username missing on profile — contact support" },
          { status: 409 }
        );
      }

      // 7. Build subdoc update payload. FieldValue.delete() to clear empty-string fields.
      //    Conditionally spread non-empty fields — Admin SDK rejects undefined.
      const subdocUpdate: Record<string, unknown> = {};

      const applyStringField = (key: keyof AmbassadorPublicFieldsInput, fieldName: string) => {
        const v = input[key];
        if (typeof v !== "string") return;
        const trimmed = v.trim();
        if (trimmed.length === 0) {
          subdocUpdate[fieldName] = FieldValue.delete();
        } else {
          subdocUpdate[fieldName] = trimmed;
        }
      };
      applyStringField("university", "university");
      applyStringField("city", "city");
      applyStringField("publicTagline", "publicTagline");
      applyStringField("twitterUrl", "twitterUrl");
      applyStringField("githubUrl", "githubUrl");
      applyStringField("personalSiteUrl", "personalSiteUrl");

      // Video URL + embed type — tied together. Either both set, both cleared, or neither touched.
      if (clearVideo) {
        subdocUpdate.cohortPresentationVideoUrl = FieldValue.delete();
        subdocUpdate.cohortPresentationVideoEmbedType = FieldValue.delete();
      } else if (videoUrlToPersist !== undefined && videoEmbedType !== undefined) {
        subdocUpdate.cohortPresentationVideoUrl = videoUrlToPersist;
        subdocUpdate.cohortPresentationVideoEmbedType = videoEmbedType;
      }

      if (Object.keys(subdocUpdate).length === 0) {
        return NextResponse.json(
          { error: "No valid fields to update" },
          { status: 400 }
        );
      }

      // 8. Compute the post-write subdoc shape for the projection.
      //    Apply the same input diff to a local copy so the projection stays exactly in sync.
      const postWrite: Partial<AmbassadorSubdoc> = {
        university: subdoc.university,
        city: subdoc.city,
        publicTagline: subdoc.publicTagline,
        twitterUrl: subdoc.twitterUrl,
        githubUrl: subdoc.githubUrl,
        personalSiteUrl: subdoc.personalSiteUrl,
        cohortPresentationVideoUrl: subdoc.cohortPresentationVideoUrl,
        cohortPresentationVideoEmbedType: subdoc.cohortPresentationVideoEmbedType,
      };
      const applyDiff = (
        k: keyof AmbassadorPublicFieldsInput,
        fieldName: keyof typeof postWrite
      ) => {
        const v = input[k];
        if (typeof v !== "string") return;
        const trimmed = v.trim();
        if (trimmed.length === 0) {
          delete postWrite[fieldName];
        } else {
          (postWrite as Record<string, unknown>)[fieldName] = trimmed;
        }
      };
      applyDiff("university", "university");
      applyDiff("city", "city");
      applyDiff("publicTagline", "publicTagline");
      applyDiff("twitterUrl", "twitterUrl");
      applyDiff("githubUrl", "githubUrl");
      applyDiff("personalSiteUrl", "personalSiteUrl");
      if (clearVideo) {
        delete postWrite.cohortPresentationVideoUrl;
        delete postWrite.cohortPresentationVideoEmbedType;
      } else if (videoUrlToPersist !== undefined && videoEmbedType !== undefined) {
        postWrite.cohortPresentationVideoUrl = videoUrlToPersist;
        postWrite.cohortPresentationVideoEmbedType = videoEmbedType;
      }

      const now = new Date();
      const publicRef = db.collection(PUBLIC_AMBASSADORS_COLLECTION).doc(ctx.uid);
      const projection = buildPublicAmbassadorProjection({
        uid: ctx.uid,
        username: profile.username,
        displayName: profile.displayName ?? "Ambassador",
        photoURL: profile.photoURL ?? "",
        cohortId: subdoc.cohortId,
        linkedinUrl: profile.linkedinUrl,
        ...extractPublicFieldsFromSubdoc(postWrite),
        updatedAt: now,
      });

      // 9. Single batched write — atomic between subdoc + projection (D-08 path 2).
      try {
        const batch = db.batch();
        batch.update(ambassadorRef, subdocUpdate);
        batch.set(publicRef, projection, { merge: false });
        await batch.commit();
      } catch (e) {
        logger.error("PATCH batched write failed", { uid: ctx.uid, error: e });
        return NextResponse.json(
          { error: "Failed to save changes" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        public: projection,
      });
    }
    ```

    After creating the file, run TypeScript + lint:

    ```bash
    npx tsc --noEmit
    npm run lint -- --quiet src/app/api/ambassador/profile/route.ts
    ```
  </action>
  <acceptance_criteria>
    - `test -f src/app/api/ambassador/profile/route.ts`
    - `grep -q "export async function PATCH" src/app/api/ambassador/profile/route.ts`
    - `grep -q "isAmbassadorProgramEnabled" src/app/api/ambassador/profile/route.ts`
    - `grep -q "hasRoleClaim(ctx, \"ambassador\")" src/app/api/ambassador/profile/route.ts`
    - `grep -q "hasRoleClaim(ctx, \"alumni-ambassador\")" src/app/api/ambassador/profile/route.ts`
    - `grep -q "AmbassadorPublicFieldsSchema" src/app/api/ambassador/profile/route.ts`
    - `grep -q "isValidVideoUrl" src/app/api/ambassador/profile/route.ts`
    - `grep -q "classifyVideoUrl" src/app/api/ambassador/profile/route.ts`
    - `grep -q "batch.update(ambassadorRef, subdocUpdate)" src/app/api/ambassador/profile/route.ts`
    - `grep -q "batch.set(publicRef, projection" src/app/api/ambassador/profile/route.ts`
    - `grep -q "FieldValue.delete()" src/app/api/ambassador/profile/route.ts`
    - `npx tsc --noEmit` exits 0
    - `npm run lint -- --quiet src/app/api/ambassador/profile/route.ts` exits 0
  </acceptance_criteria>
</task>

<task id="2" title="Add GET /api/ambassador/profile returning current public fields">
  <read_first>
    - src/app/api/ambassador/profile/route.ts (the PATCH handler from Task 1 — MUST already be written so the imports are in place)
    - src/lib/auth.ts (verifyAuth)
    - src/lib/permissions.ts (hasRoleClaim)
    - src/lib/firebaseAdmin.ts (db)
    - src/lib/features.ts (isAmbassadorProgramEnabled)
    - src/types/ambassador.ts (AmbassadorSubdoc — after Plan 03-01)
  </read_first>
  <action>
    EXTEND the file `src/app/api/ambassador/profile/route.ts` created in Task 1. DO NOT create a new file. Append a `GET` handler below the `PATCH` handler. This is the endpoint that Plan 03-06's form loader will call to hydrate its state.

    Contract:
    - Method: `GET` (no body, no query params required).
    - Gate order IDENTICAL to PATCH (so a disabled feature flag cannot leak ambassador presence via a 403 instead of a 404):
      1. `isAmbassadorProgramEnabled()` — return `404 { error: "not_found" }` when off.
      2. `verifyAuth(request)` — return `401 { error: "Unauthorized" }` when missing/invalid.
      3. `hasRoleClaim(ctx, "ambassador") || hasRoleClaim(ctx, "alumni-ambassador")` — return `403 { error: "Forbidden" }` otherwise.
    - Behaviour:
      - Read `mentorship_profiles/{ctx.uid}/ambassador/v1` via the Admin SDK (`db`).
      - If the subdoc does NOT exist: return `200 {}` (the acceptance transaction has not seeded it yet; the editor should treat all fields as empty rather than show an error).
      - If the subdoc DOES exist: return `200 { ...publicFields }` where `publicFields` contains ONLY the keys listed below, and ONLY when they are defined on the subdoc. Absent keys MUST be OMITTED entirely — do NOT serialize them as `null` (the client expects `Partial<PublicFieldsState>` and merges it into `EMPTY` per plan 03-06's hydrate flow).
      - Fields returned (8 — the seven editable fields plus the derived embed type):
        - `university`
        - `city`
        - `publicTagline`
        - `twitterUrl`
        - `githubUrl`
        - `personalSiteUrl`
        - `cohortPresentationVideoUrl`
        - `cohortPresentationVideoEmbedType`

    Append VERBATIM to `src/app/api/ambassador/profile/route.ts` (below the final `}` of PATCH):

    ```typescript

    /**
     * GET /api/ambassador/profile
     *
     * Returns the current public-field subset of the ambassador subdoc
     * (mentorship_profiles/{uid}/ambassador/v1) for the authenticated
     * ambassador/alumni-ambassador. Consumed by the /profile editor (plan 03-06)
     * to hydrate its form without duplicating the read elsewhere.
     *
     * Gate order matches PATCH:
     *   1. isAmbassadorProgramEnabled() → 404 if off
     *   2. verifyAuth()                 → 401 if missing/invalid
     *   3. hasRoleClaim(ctx, "ambassador" | "alumni-ambassador") → 403 otherwise
     *
     * Response shape: `Partial<{university, city, publicTagline, twitterUrl,
     * githubUrl, personalSiteUrl, cohortPresentationVideoUrl,
     * cohortPresentationVideoEmbedType}>`. Absent keys are OMITTED (not null) so
     * the client can `{ ...EMPTY, ...body }` cleanly.
     *
     * Pre-acceptance edge: if the ambassador subdoc does not yet exist (e.g. a
     * role claim was granted manually without running the acceptance transaction),
     * return 200 {} — the editor treats this as "nothing to hydrate".
     */
    export async function GET(request: NextRequest) {
      // 1. Feature flag gate
      if (!isAmbassadorProgramEnabled()) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }

      // 2. Auth gate
      const ctx = await verifyAuth(request);
      if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      // 3. Role gate — ambassador OR alumni-ambassador (D-05)
      const isAmbassador = hasRoleClaim(ctx, "ambassador");
      const isAlumni = hasRoleClaim(ctx, "alumni-ambassador");
      if (!isAmbassador && !isAlumni) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // 4. Read subdoc
      const ambassadorRef = db
        .collection("mentorship_profiles")
        .doc(ctx.uid)
        .collection("ambassador")
        .doc("v1");
      const snap = await ambassadorRef.get();
      if (!snap.exists) {
        return NextResponse.json({});
      }
      const subdoc = snap.data() as Partial<AmbassadorSubdoc>;

      // 5. Project to the public-field subset. Omit absent keys entirely — the
      //    client merges the response into its EMPTY state object, so serializing
      //    `null` would overwrite the default empty string with null.
      const body: Record<string, string> = {};
      const copyString = (key: keyof Partial<AmbassadorSubdoc>, outKey: string) => {
        const v = subdoc[key];
        if (typeof v === "string" && v.trim().length > 0) {
          body[outKey] = v;
        }
      };
      copyString("university", "university");
      copyString("city", "city");
      copyString("publicTagline", "publicTagline");
      copyString("twitterUrl", "twitterUrl");
      copyString("githubUrl", "githubUrl");
      copyString("personalSiteUrl", "personalSiteUrl");
      copyString("cohortPresentationVideoUrl", "cohortPresentationVideoUrl");
      if (
        typeof subdoc.cohortPresentationVideoEmbedType === "string" &&
        subdoc.cohortPresentationVideoEmbedType.length > 0
      ) {
        body.cohortPresentationVideoEmbedType = subdoc.cohortPresentationVideoEmbedType;
      }

      return NextResponse.json(body);
    }
    ```

    No new top-of-file imports are required — `NextRequest`, `NextResponse`, `db`, `isAmbassadorProgramEnabled`, `verifyAuth`, `hasRoleClaim`, and `AmbassadorSubdoc` are all already imported by Task 1's PATCH handler. Confirm by re-reading the completed file and grepping the import list.

    Verify:
    ```bash
    npx tsc --noEmit
    npm run lint -- --quiet src/app/api/ambassador/profile/route.ts
    ```

    Manual smoke (runbook, post-deploy):
    ```bash
    # 401 — no auth
    curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/ambassador/profile

    # 403 — authed, not an ambassador
    curl -sS -H "Authorization: Bearer <non-ambassador-token>" \
      http://localhost:3000/api/ambassador/profile

    # 200 {} or 200 {...fields} — ambassador
    curl -sS -H "Authorization: Bearer <ambassador-token>" \
      http://localhost:3000/api/ambassador/profile
    ```
  </action>
  <acceptance_criteria>
    - `grep -q "export async function GET" src/app/api/ambassador/profile/route.ts` (GET handler exists in the same file as PATCH).
    - `grep -q "hasRoleClaim" src/app/api/ambassador/profile/route.ts` (role gate wired in — shared with PATCH).
    - `grep -c "isAmbassadorProgramEnabled" src/app/api/ambassador/profile/route.ts` ≥ 2 (called from both handlers).
    - The file still has `export async function PATCH` (Task 1 unchanged).
    - `grep -q "cohortPresentationVideoEmbedType" src/app/api/ambassador/profile/route.ts` (embed type is serialized when present).
    - `npx tsc --noEmit` exits 0.
    - `npm run lint -- --quiet src/app/api/ambassador/profile/route.ts` exits 0.
    - Manual runbook check: `curl -H "Authorization: Bearer <token>" http://localhost:3000/api/ambassador/profile` returns 200 with the expected shape for an ambassador; 401 without auth; 403 for a non-ambassador authed user; 404 when the feature flag is off.
  </acceptance_criteria>
</task>

</tasks>

<verification>
- `test -f src/app/api/ambassador/profile/route.ts` (endpoint file exists)
- `grep -q "export async function PATCH" src/app/api/ambassador/profile/route.ts` (PATCH exported)
- `grep -q "export async function GET" src/app/api/ambassador/profile/route.ts` (GET exported)
- Gate-order grep check (must appear in order inside the PATCH body):
  - `awk '/export async function PATCH/,/^}/' src/app/api/ambassador/profile/route.ts | awk '/isAmbassadorProgramEnabled/ { flag_1=NR } /verifyAuth/ { flag_2=NR } /hasRoleClaim/ { flag_3=NR } /safeParse/ { flag_4=NR } /batch.commit/ { flag_5=NR } END { if (flag_1 && flag_2 && flag_3 && flag_4 && flag_5 && flag_1 < flag_2 && flag_2 < flag_3 && flag_3 < flag_4 && flag_4 < flag_5) { exit 0 } else { exit 1 } }'`
- Gate-order grep check for GET (flag → auth → role, then read):
  - `awk '/export async function GET/,/^}/' src/app/api/ambassador/profile/route.ts | awk '/isAmbassadorProgramEnabled/ { flag_1=NR } /verifyAuth/ { flag_2=NR } /hasRoleClaim/ { flag_3=NR } END { if (flag_1 && flag_2 && flag_3 && flag_1 < flag_2 && flag_2 < flag_3) { exit 0 } else { exit 1 } }'`
- `npx tsc --noEmit` exits 0
- Smoke tests (manual, post-deploy):
  - `curl -X PATCH $SITE_URL/api/ambassador/profile -H "Content-Type: application/json" -d '{}'` returns 401 (no auth); with valid non-ambassador token returns 403; with valid ambassador token + valid body returns 200.
  - `curl $SITE_URL/api/ambassador/profile` returns 401; with ambassador token returns 200 with `{...}` body (empty object if subdoc missing).
</verification>

<must_haves>
- `PATCH /api/ambassador/profile` accepts a partial payload validated against `AmbassadorPublicFieldsSchema` and writes updates to BOTH `mentorship_profiles/{uid}/ambassador/v1` AND `public_ambassadors/{uid}` in a single Firestore batched write (D-08 path 2) — if either write fails, neither is persisted.
- `cohortPresentationVideoUrl` is validated with `isValidVideoUrl` and the classifier output is persisted as `cohortPresentationVideoEmbedType` on both the subdoc and the projection (PRESENT-04, D-04).
- Both endpoints are feature-flag gated (isAmbassadorProgramEnabled) and role-gated (`hasRoleClaim(ctx, "ambassador") || hasRoleClaim(ctx, "alumni-ambassador")`); non-ambassador users get 403, disabled feature returns 404.
- `GET /api/ambassador/profile` is shipped alongside PATCH and returns the current public-field subset of the ambassador subdoc so the `/profile` editor (plan 03-06) can hydrate its form without inventing a second endpoint.
</must_haves>
