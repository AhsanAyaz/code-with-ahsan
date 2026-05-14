/**
 * Phase 4 (D-05): Admin detail bundle for a single active ambassador.
 *   GET /api/ambassador/members/[uid]
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import {
  AMBASSADOR_EVENTS_COLLECTION,
  MONTHLY_REPORTS_COLLECTION,
  AMBASSADOR_CRON_FLAGS_COLLECTION,
  REFERRALS_COLLECTION,
  PUBLIC_AMBASSADORS_COLLECTION,
} from "@/types/ambassador";
import { REFERRAL_CODES_COLLECTION } from "@/lib/ambassador/constants";
import { syncAmbassadorClaim } from "@/lib/ambassador/acceptance";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ambassador/members/[uid]");

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

export async function GET(
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

  const [profileSnap, subdocSnap] = await Promise.all([
    db.collection("mentorship_profiles").doc(uid).get(),
    db
      .collection("mentorship_profiles")
      .doc(uid)
      .collection("ambassador")
      .doc("v1")
      .get(),
  ]);

  if (!subdocSnap.exists) {
    return NextResponse.json({ error: "Ambassador not found" }, { status: 404 });
  }

  const [eventsSnap, reportsSnap, flagsSnap, referralsCountSnap] = await Promise.all([
    db
      .collection(AMBASSADOR_EVENTS_COLLECTION)
      .where("ambassadorId", "==", uid)
      .orderBy("date", "desc")
      .limit(20)
      .get(),
    db
      .collection(MONTHLY_REPORTS_COLLECTION)
      .where("ambassadorId", "==", uid)
      .orderBy("month", "desc")
      .limit(12)
      .get(),
    db
      .collection(AMBASSADOR_CRON_FLAGS_COLLECTION)
      .where("ambassadorId", "==", uid)
      .where("resolved", "==", false)
      .orderBy("flaggedAt", "desc")
      .get(),
    db
      .collection(REFERRALS_COLLECTION)
      .where("ambassadorId", "==", uid)
      .count()
      .get(),
  ]);

  return NextResponse.json(
    {
      profile: normalizeTimestamps(profileSnap.data() ?? {}),
      subdoc: normalizeTimestamps(subdocSnap.data() ?? {}),
      recentEvents: eventsSnap.docs.map((d) =>
        normalizeTimestamps({ id: d.id, ...d.data() }),
      ),
      recentReports: reportsSnap.docs.map((d) =>
        normalizeTimestamps({ id: d.id, ...d.data() }),
      ),
      unresolvedFlags: flagsSnap.docs.map((d) =>
        normalizeTimestamps({ id: d.id, ...d.data() }),
      ),
      referralsCount: referralsCountSnap.data().count ?? 0,
    },
    { status: 200 },
  );
}

/** DELETE — admin removes an ambassador: deletes subdoc + public projection, strips role + claims. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { uid: string } | Promise<{ uid: string }> },
) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { uid } = await Promise.resolve(params);
  if (!uid) return NextResponse.json({ error: "Invalid uid" }, { status: 400 });

  const profileRef = db.collection("mentorship_profiles").doc(uid);
  const subdocRef = profileRef.collection("ambassador").doc("v1");
  const subdocSnap = await subdocRef.get();
  if (!subdocSnap.exists) return NextResponse.json({ error: "Ambassador not found" }, { status: 404 });

  const referralCode = (subdocSnap.data() as { referralCode?: string }).referralCode;

  const batch = db.batch();
  batch.delete(subdocRef);
  batch.delete(db.collection(PUBLIC_AMBASSADORS_COLLECTION).doc(uid));
  batch.update(profileRef, { roles: FieldValue.arrayRemove("ambassador") });
  if (referralCode) {
    batch.delete(db.collection(REFERRAL_CODES_COLLECTION).doc(referralCode));
  }

  await batch.commit();

  try {
    await syncAmbassadorClaim(uid);
  } catch (e) {
    logger.error("syncAmbassadorClaim after member removal failed", { uid, error: e });
  }

  return NextResponse.json({ success: true });
}
