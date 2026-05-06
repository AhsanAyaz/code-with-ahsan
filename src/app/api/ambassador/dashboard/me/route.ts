/**
 * Phase 5 (DASH-01, DASH-02): Personal dashboard stats endpoint.
 *
 * GET /api/ambassador/dashboard/me
 *   Gate: feature flag → verifyAuth → hasRoleClaim("ambassador")
 *   Reads (parallel):
 *     - mentorship_profiles/{uid} (for displayName, photoURL, bio — bio drives setBio derive)
 *     - mentorship_profiles/{uid}/ambassador/v1 (subdoc — strikes, onboarding map, video URL, cohortId)
 *     - referrals where ambassadorId == uid (count)
 *     - ambassador_events where ambassadorId == uid && hidden == false (count)
 *     - monthly_reports where ambassadorId == uid (count)
 *     - cohorts/{subdoc.cohortId} (name, dates, ambassadorOfTheMonth)
 *
 * Auto-derived onboarding flags (Pitfall 6):
 *   setBio          ← profile.bio non-empty
 *   uploadedVideo   ← subdoc.cohortPresentationVideoUrl truthy
 *   loggedFirstEvent ← eventsCount > 0
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import {
  AMBASSADOR_EVENTS_COLLECTION,
  MONTHLY_REPORTS_COLLECTION,
  REFERRALS_COLLECTION,
  AMBASSADOR_COHORTS_COLLECTION,
} from "@/lib/ambassador/constants";
import type { AmbassadorSubdoc, CohortDoc, AmbassadorOfTheMonth } from "@/types/ambassador";

function isoOrNull(v: unknown): string | null {
  if (!v) return null;
  const t = v as { toDate?: () => Date };
  if (typeof t.toDate === "function") return t.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
}

/** Compute next-month UTC start as a quick "next report due" approximation. */
function nextReportDue(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  ).toISOString();
}

export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await verifyAuth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const uid = ctx.uid;

  const profileRef = db.collection("mentorship_profiles").doc(uid);
  const subdocRef = profileRef.collection("ambassador").doc("v1");

  const [profileSnap, subdocSnap] = await Promise.all([profileRef.get(), subdocRef.get()]);
  if (!subdocSnap.exists) {
    return NextResponse.json({ error: "Ambassador not found" }, { status: 404 });
  }
  const subdoc = subdocSnap.data() as AmbassadorSubdoc;
  const profile = (profileSnap.data() ?? {}) as { bio?: string };

  const [referralsAgg, eventsAgg, reportsAgg, cohortSnap] = await Promise.all([
    db.collection(REFERRALS_COLLECTION).where("ambassadorId", "==", uid).count().get(),
    db
      .collection(AMBASSADOR_EVENTS_COLLECTION)
      .where("ambassadorId", "==", uid)
      .where("hidden", "==", false)
      .count()
      .get(),
    db.collection(MONTHLY_REPORTS_COLLECTION).where("ambassadorId", "==", uid).count().get(),
    db.collection(AMBASSADOR_COHORTS_COLLECTION).doc(subdoc.cohortId).get(),
  ]);

  const referralsCount = referralsAgg.data().count ?? 0;
  const eventsCount = eventsAgg.data().count ?? 0;
  const reportsCount = reportsAgg.data().count ?? 0;

  const cohort = cohortSnap.exists
    ? (() => {
        const c = cohortSnap.data() as CohortDoc;
        return {
          cohortId: subdoc.cohortId,
          name: c.name,
          startDate: isoOrNull(c.startDate),
          endDate: isoOrNull(c.endDate),
          ambassadorOfTheMonth: (c.ambassadorOfTheMonth ?? null) as AmbassadorOfTheMonth | null,
        };
      })()
    : null;

  // Pitfall 6: derive these — do NOT read from subdoc.onboarding (those flags are user-self-mark only).
  const setBio = typeof profile.bio === "string" && profile.bio.trim().length > 0;
  const uploadedVideo =
    typeof subdoc.cohortPresentationVideoUrl === "string" &&
    subdoc.cohortPresentationVideoUrl.trim().length > 0;
  const loggedFirstEvent = eventsCount > 0;

  const onboarding = {
    joinedDiscord: subdoc.onboarding?.joinedDiscord === true,
    setBio,
    uploadedVideo,
    sharedReferralLink: subdoc.onboarding?.sharedReferralLink === true,
    loggedFirstEvent,
  };

  return NextResponse.json({
    stats: {
      referralsCount,
      eventsCount,
      reportsCount,
      strikes: subdoc.strikes ?? 0,
      nextReportDue: nextReportDue(),
    },
    cohort,
    onboarding,
  });
}
