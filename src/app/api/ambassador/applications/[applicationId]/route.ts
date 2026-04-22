/**
 * GET  /api/ambassador/applications/[applicationId] — Admin detail view.
 * PATCH /api/ambassador/applications/[applicationId] — Admin accepts or declines.
 *
 * Gate order (Pitfall 3): isAmbassadorProgramEnabled() → requireAdmin() → business logic.
 *
 * Design:
 *   - GET returns full application doc + a 1-hour signed URL for student-ID photos (REVIEW-02).
 *   - PATCH accept: runs runAcceptanceTransaction (COHORT-04 race-safe), then
 *     syncAmbassadorClaim, then assignAmbassadorDiscordRoleSoft (D-17: Discord failure
 *     never rolls back Firestore).
 *   - PATCH decline: simple update; does NOT touch mentorship_profiles or cohorts.
 *   - reviewedBy is populated from admin.uid (APPLY-08 admin attribution).
 */

import { NextRequest, NextResponse } from "next/server";
import { db, storage } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { ApplicationReviewSchema, type ApplicationDoc } from "@/types/ambassador";
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

/** Discord invite URL for the #ambassadors channel (fallback to server invite). */
const DISCORD_AMBASSADORS_INVITE = "https://codewithahsan.dev/discord";

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

  // Signed URL for student-ID photo (path B). 1-hour expiry per REVIEW-02 + ADMIN_SIGNED_URL_EXPIRY_MS.
  // storage may be null when GOOGLE_APPLICATION_CREDENTIALS is unset (Pitfall 7).
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
      logger.warn("signed URL generation failed", {
        applicationId,
        path: app.studentIdStoragePath,
        error: e,
      });
    }
  }

  return NextResponse.json({ application: app, studentIdSignedUrl });
}

/** PATCH — admin accepts or declines. Body: { action: "accept" | "decline", notes?: string } */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  // APPLY-08: Plan 04's requireAdmin formally guarantees uid on the ok branch.
  // uid is synthesised from the admin_sessions token — stable per session.
  const adminUid = admin.uid;

  const { applicationId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ApplicationReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { action, notes } = parsed.data;

  // ── Decline path ──────────────────────────────────────────────────────────
  if (action === "decline") {
    const ref = db.collection(AMBASSADOR_APPLICATIONS_COLLECTION).doc(applicationId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    const app = snap.data() as ApplicationDoc;

    if (app.status === "accepted") {
      return NextResponse.json({ error: "Cannot decline an accepted application" }, { status: 409 });
    }

    const now = new Date();
    await ref.update({
      status: "declined",
      reviewedBy: adminUid,
      reviewerNotes: notes ?? null,
      decidedAt: now,
      declinedAt: now, // Used by Plan 09 cleanup cron (REVIEW-04)
    });

    // EMAIL-03 — non-fatal; log on failure, decision is already persisted.
    try {
      // Fetch cohort name for the decline email
      const cohortSnap = await db
        .collection("cohorts")
        .doc(app.targetCohortId)
        .get();
      const cohortName = cohortSnap.exists
        ? (cohortSnap.data() as { name?: string }).name ?? "the ambassador program"
        : "the ambassador program";
      await sendAmbassadorApplicationDeclinedEmail(
        app.applicantEmail,
        app.applicantName,
        cohortName,
        notes,
      );
    } catch (e) {
      logger.error("EMAIL-03 send failed", { applicationId, error: e });
    }

    return NextResponse.json({ success: true, status: "declined" });
  }

  // ── Accept path ───────────────────────────────────────────────────────────
  const result = await runAcceptanceTransaction(applicationId, adminUid, notes);

  if (!result.ok) {
    const httpStatus =
      result.error === "cohort_full" || result.error === "already_declined"
        ? 409
        : 404; // application_not_found | cohort_not_found
    return NextResponse.json({ error: result.error }, { status: httpStatus });
  }

  // Sync custom claims (non-fatal) — must NOT run inside the transaction.
  try {
    await syncAmbassadorClaim(result.applicantUid);
  } catch (e) {
    logger.error("syncAmbassadorClaim failed", { uid: result.applicantUid, error: e });
  }

  // Discord role assignment — D-17: failure never rolls back Firestore.
  // On idempotent re-accept we skip re-assignment (admin uses retry endpoint if needed).
  let discord: { ok: true } | { ok: false; reason: string };
  if (result.alreadyAccepted) {
    // Assume Discord was already handled; admin can use /discord-resolve to retry.
    discord = { ok: true };
  } else {
    discord = await assignAmbassadorDiscordRoleSoft(
      result.applicationId,
      result.discordMemberId ?? result.discordHandle ?? null,
    );
  }

  // EMAIL-02 — non-fatal; do NOT resend on idempotent re-accept.
  if (!result.alreadyAccepted) {
    try {
      await sendAmbassadorApplicationAcceptedEmail(
        result.applicantEmail,
        result.applicantName,
        result.cohortName,
        DISCORD_AMBASSADORS_INVITE,
      );
    } catch (e) {
      logger.error("EMAIL-02 send failed", { applicationId, error: e });
    }
  }

  return NextResponse.json({
    success: true,
    status: "accepted",
    alreadyAccepted: result.alreadyAccepted === true,
    discordAssigned: discord.ok,
    discordReason: discord.ok ? null : (discord as { ok: false; reason: string }).reason,
  });
}
