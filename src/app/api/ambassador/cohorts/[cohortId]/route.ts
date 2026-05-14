import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { CohortPatchSchema } from "@/types/ambassador";
import { AMBASSADOR_COHORTS_COLLECTION, AMBASSADOR_APPLICATIONS_COLLECTION } from "@/lib/ambassador/constants";
import { createLogger } from "@/lib/logger";

const log = createLogger("ambassador-cohort-detail-api");

function featureGate(): NextResponse | null {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

interface RouteContext {
  params: Promise<{ cohortId: string }>;
}

/** GET single cohort — admin sees full details + accepted ambassador count (COHORT-03). */
export async function GET(request: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const gate = featureGate();
  if (gate) return gate;
  try {
    const { cohortId } = await ctx.params;
    const admin = await requireAdmin(request);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const doc = await db.collection(AMBASSADOR_COHORTS_COLLECTION).doc(cohortId).get();
    if (!doc.exists) return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
    const data = doc.data()!;

    // COHORT-03: count accepted ambassadors attached to this cohort.
    const acceptedSnap = await db
      .collection(AMBASSADOR_APPLICATIONS_COLLECTION)
      .where("targetCohortId", "==", cohortId)
      .where("status", "==", "accepted")
      .get();

    return NextResponse.json(
      {
        cohort: {
          ...data,
          cohortId: doc.id,
          startDate: data.startDate?.toDate?.() ?? null,
          endDate: data.endDate?.toDate?.() ?? null,
          createdAt: data.createdAt?.toDate?.() ?? null,
          updatedAt: data.updatedAt?.toDate?.() ?? null,
        },
        acceptedAmbassadorCount: acceptedSnap.size,
      },
      { status: 200 }
    );
  } catch (error) {
    log.error("GET /cohorts/[id] failed", { error });
    return NextResponse.json({ error: "Failed to fetch cohort" }, { status: 500 });
  }
}

/** PATCH — admin only. Toggles applicationWindowOpen (COHORT-02) or updates name/status/maxSize. */
export async function PATCH(request: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const gate = featureGate();
  if (gate) return gate;
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const { cohortId } = await ctx.params;
    const body = await request.json();
    const parsed = CohortPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid patch payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ref = db.collection(AMBASSADOR_COHORTS_COLLECTION).doc(cohortId);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ error: "Cohort not found" }, { status: 404 });

    const patch: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    await ref.update(patch);
    log.info("Cohort updated", { cohortId, fields: Object.keys(parsed.data), by: admin.uid });
    return NextResponse.json({ cohortId, ...patch }, { status: 200 });
  } catch (error) {
    log.error("PATCH /cohorts/[id] failed", { error });
    return NextResponse.json({ error: "Failed to update cohort" }, { status: 500 });
  }
}
