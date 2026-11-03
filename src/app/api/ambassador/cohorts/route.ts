import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdminAccess, logAdminAction } from "@/lib/adminAccess/server";
import { CohortCreateSchema, type CohortDoc } from "@/types/ambassador";
import { AMBASSADOR_COHORTS_COLLECTION } from "@/lib/ambassador/constants";
import { createLogger } from "@/lib/logger";

const log = createLogger("ambassador-cohorts-api");

function featureGate(): NextResponse | null {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/**
 * GET /api/ambassador/cohorts
 * Query: ?scope=open | ?scope=all
 *   - open (default, any signed-in user): returns cohorts with status=upcoming AND applicationWindowOpen=true
 *   - all (admin only): returns every cohort
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = featureGate();
  if (gate) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") ?? "open";

    let query = db.collection(AMBASSADOR_COHORTS_COLLECTION).orderBy("startDate", "desc");
    if (scope === "open") {
      query = query.where("status", "==", "upcoming").where("applicationWindowOpen", "==", true);
    } else if (scope === "all") {
      const access = await requireAdminAccess(request, "ambassador.cohorts.read");
      if (!access.ok) return access.response;
    }

    const snapshot = await query.get();
    const cohorts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        cohortId: doc.id,
        startDate: data.startDate?.toDate?.() ?? null,
        endDate: data.endDate?.toDate?.() ?? null,
        createdAt: data.createdAt?.toDate?.() ?? null,
        updatedAt: data.updatedAt?.toDate?.() ?? null,
      };
    });
    return NextResponse.json({ cohorts }, { status: 200 });
  } catch (error) {
    log.error("GET /cohorts failed", { error });
    return NextResponse.json({ error: "Failed to fetch cohorts" }, { status: 500 });
  }
}

/**
 * POST /api/ambassador/cohorts — admin only. Creates a new cohort (COHORT-01).
 * Body: CohortCreateSchema.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const gate = featureGate();
  if (gate) return gate;

  try {
    const access = await requireAdminAccess(request, "ambassador.cohort.create");
    if (!access.ok) return access.response;

    const body = await request.json();
    const parsed = CohortCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid cohort payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const now = new Date();
    const newDoc: Omit<CohortDoc, "cohortId"> = {
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      maxSize: parsed.data.maxSize,
      acceptedCount: 0,
      status: parsed.data.status,
      applicationWindowOpen: false,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection(AMBASSADOR_COHORTS_COLLECTION).add(newDoc);
    log.info("Cohort created", { cohortId: ref.id, name: parsed.data.name, by: access.actor.uid });
    await logAdminAction(access.actor, "ambassador.cohort.create", {
      type: "ambassador_cohort",
      id: ref.id,
      label: parsed.data.name,
    });
    return NextResponse.json({ cohortId: ref.id, ...newDoc }, { status: 201 });
  } catch (error) {
    log.error("POST /cohorts failed", { error });
    return NextResponse.json({ error: "Failed to create cohort" }, { status: 500 });
  }
}
