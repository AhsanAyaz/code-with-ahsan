/**
 * Phase 5 (DISC-05, EMAIL-04, ALUMNI-02):
 * POST /api/ambassador/members/[uid]/offboard
 *
 * Admin-triggered 2-strike removal. Atomic Firestore batch first
 * (roles strip + subdoc active:false + offboardedAt + delete public projection),
 * then Discord role removal + offboarding email as soft post-commit steps.
 *
 * INVARIANT (ALUMNI-02): does NOT add "alumni-ambassador" to roles.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import {
  PUBLIC_AMBASSADORS_COLLECTION,
  type AmbassadorSubdoc,
  type CohortDoc,
} from "@/types/ambassador";
import { AMBASSADOR_COHORTS_COLLECTION } from "@/lib/ambassador/constants";
import { syncAmbassadorClaim } from "@/lib/ambassador/acceptance";
import { removeDiscordRole, DISCORD_AMBASSADOR_ROLE_ID } from "@/lib/discord";
import { sendAmbassadorOffboardingEmail } from "@/lib/email";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ambassador/members/[uid]/offboard");

export async function POST(
  request: NextRequest,
  { params }: { params: { uid: string } | Promise<{ uid: string }> },
) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { uid } = await Promise.resolve(params);
  if (!uid) return NextResponse.json({ error: "Invalid uid" }, { status: 400 });

  const profileRef = db.collection("mentorship_profiles").doc(uid);
  const subdocRef = profileRef.collection("ambassador").doc("v1");

  const [profileSnap, subdocSnap] = await Promise.all([profileRef.get(), subdocRef.get()]);
  if (!subdocSnap.exists) {
    return NextResponse.json({ error: "Ambassador not found" }, { status: 404 });
  }
  const subdoc = subdocSnap.data() as AmbassadorSubdoc;
  if (subdoc.active === false) {
    return NextResponse.json(
      { error: "Ambassador is already inactive" },
      { status: 409 },
    );
  }

  const profile = (profileSnap.data() ?? {}) as { displayName?: string; email?: string };
  const cohortSnap = await db
    .collection(AMBASSADOR_COHORTS_COLLECTION)
    .doc(subdoc.cohortId)
    .get();
  const cohort = cohortSnap.exists ? (cohortSnap.data() as CohortDoc) : null;

  // Atomic Firestore batch — hard failure boundary.
  // ALUMNI-02 invariant: this route must NOT add the alumni-ambassador role.
  const batch = db.batch();
  batch.update(profileRef, { roles: FieldValue.arrayRemove("ambassador") });
  batch.update(subdocRef, {
    active: false,
    endedAt: FieldValue.serverTimestamp(),
    offboardedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.delete(db.collection(PUBLIC_AMBASSADORS_COLLECTION).doc(uid));
  await batch.commit();

  // Soft step 1: Discord role removal (DISC-05).
  let discordRemoved = false;
  if (subdoc.discordMemberId) {
    try {
      discordRemoved = await removeDiscordRole(
        subdoc.discordMemberId,
        DISCORD_AMBASSADOR_ROLE_ID,
      );
    } catch (e) {
      logger.error("removeDiscordRole threw unexpectedly", { uid, error: e });
      discordRemoved = false;
    }
  }

  // Soft step 2: Offboarding email (EMAIL-04).
  let emailSent = false;
  if (profile.email && profile.displayName && cohort) {
    try {
      emailSent = await sendAmbassadorOffboardingEmail(
        profile.email,
        profile.displayName,
        cohort.name,
      );
    } catch (e) {
      logger.error("sendAmbassadorOffboardingEmail threw unexpectedly", { uid, error: e });
      emailSent = false;
    }
  }

  // Soft step 3: claim sync.
  try {
    await syncAmbassadorClaim(uid);
  } catch (e) {
    logger.error("syncAmbassadorClaim after offboarding failed", { uid, error: e });
  }

  return NextResponse.json({ success: true, discordRemoved, emailSent });
}
