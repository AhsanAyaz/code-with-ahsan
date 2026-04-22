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
import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions";
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
  const isAmbassador = hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador");
  const isAlumni = hasRoleClaim(ctx as unknown as DecodedRoleClaim, "alumni-ambassador");
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
  const isAmbassador = hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador");
  const isAlumni = hasRoleClaim(ctx as unknown as DecodedRoleClaim, "alumni-ambassador");
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
