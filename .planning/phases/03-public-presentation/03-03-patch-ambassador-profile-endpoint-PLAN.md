---
phase: 3
plan: "03-03"
title: "PATCH /api/ambassador/profile endpoint — subdoc + projection batched write"
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
---

<objective>
Ship the single backend endpoint that powers the /profile "Ambassador Public Card" editing surface (Plan 03-06). `PATCH /api/ambassador/profile` takes a partial payload of the seven editable public fields (D-03, D-05), validates them via `AmbassadorPublicFieldsSchema` (Plan 03-01), validates the optional `cohortPresentationVideoUrl` via the Phase 2 `isValidVideoUrl`/`classifyVideoUrl` helpers (D-04), and persists the diff to BOTH the ambassador subdoc AND the denormalized `public_ambassadors/{uid}` projection in a single Firestore batched write (D-08 path 2). The batched-write discipline is non-negotiable: the projection is the read source for `/ambassadors`, so if the subdoc writes but the projection doesn't (or vice versa), the public page goes stale. Batched writes fail atomically: if one `batch.set(...)` fails, Firestore rejects the whole batch. The endpoint is feature-flag gated AND role-gated (ambassador or alumni-ambassador only) — the route order mirrors Phase 2 Pitfall 3: `isAmbassadorProgramEnabled()` → `verifyAuth` → role check → business logic.
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

</tasks>

<verification>
- `test -f src/app/api/ambassador/profile/route.ts` (endpoint file exists)
- `grep -q "PATCH" src/app/api/ambassador/profile/route.ts` (PATCH exported)
- Gate-order grep check (must appear in order inside the file):
  - `awk '/isAmbassadorProgramEnabled/ { flag_1=NR } /verifyAuth/ { flag_2=NR } /hasRoleClaim/ { flag_3=NR } /safeParse/ { flag_4=NR } /batch.commit/ { flag_5=NR } END { if (flag_1 && flag_2 && flag_3 && flag_4 && flag_5 && flag_1 < flag_2 && flag_2 < flag_3 && flag_3 < flag_4 && flag_4 < flag_5) { exit 0 } else { exit 1 } }' src/app/api/ambassador/profile/route.ts`
- `npx tsc --noEmit` exits 0
- Smoke test (manual, post-deploy): `curl -X PATCH $SITE_URL/api/ambassador/profile -H "Content-Type: application/json" -d '{}'` returns 401 (no auth); with valid non-ambassador token returns 403; with valid ambassador token + valid body returns 200.
</verification>

<must_haves>
- `PATCH /api/ambassador/profile` accepts a partial payload validated against `AmbassadorPublicFieldsSchema` and writes updates to BOTH `mentorship_profiles/{uid}/ambassador/v1` AND `public_ambassadors/{uid}` in a single Firestore batched write (D-08 path 2) — if either write fails, neither is persisted.
- `cohortPresentationVideoUrl` is validated with `isValidVideoUrl` and the classifier output is persisted as `cohortPresentationVideoEmbedType` on both the subdoc and the projection (PRESENT-04, D-04).
- Endpoint is feature-flag gated (isAmbassadorProgramEnabled) and role-gated (`hasRoleClaim(token, "ambassador") || hasRoleClaim(token, "alumni-ambassador")`); non-ambassador users get 403, disabled feature returns 404.
</must_haves>
