import { db } from "@/lib/firebaseAdmin";
import { getCurrentCohortId } from "@/lib/ambassador/currentCohort";
import {
  PUBLIC_AMBASSADORS_COLLECTION,
  type PublicAmbassadorDoc,
} from "@/types/ambassador";
import AmbassadorCard from "@/components/ambassador/AmbassadorCard";

export const dynamic = "force-dynamic";

// NOTE: feature-flag gating is handled by src/app/ambassadors/layout.tsx.
// This page inherits the 404 when FEATURE_AMBASSADOR_PROGRAM is off.

/** Client-safe shape: PublicAmbassadorDoc minus the Firestore `updatedAt` Timestamp,
 *  which isn't a plain object and can't cross the Server→Client Component boundary. */
type PublicAmbassadorCardData = Omit<PublicAmbassadorDoc, "updatedAt">;

async function loadCohortAmbassadors(): Promise<{
  cohortId: string | null;
  items: PublicAmbassadorCardData[];
}> {
  const cohortId = await getCurrentCohortId();
  if (!cohortId) return { cohortId: null, items: [] };

  const snap = await db
    .collection(PUBLIC_AMBASSADORS_COLLECTION)
    .where("active", "==", true)
    .where("cohortId", "==", cohortId)
    .orderBy("updatedAt", "asc")
    .get();

  return {
    cohortId,
    items: snap.docs.map((d) => {
      const { updatedAt: _updatedAt, ...rest } = d.data() as PublicAmbassadorDoc;
      return rest;
    }),
  };
}

export default async function AmbassadorsPage() {
  const { cohortId, items } = await loadCohortAmbassadors();

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">
          <span className="text-primary">🎓</span> Student Ambassadors
        </h1>
        <p className="text-base-content/70 max-w-2xl mx-auto">
          Meet the students representing Code with Ahsan in this cohort.
          They are the community builders running events, writing guides,
          and helping new members get started.
        </p>
      </div>

      {cohortId === null && (
        <div className="alert alert-info">
          <span>
            No active cohort right now. Check back when the next cohort
            starts — or {" "}
            <a href="/ambassadors/apply" className="link">
              apply to join the next one
            </a>
            .
          </span>
        </div>
      )}

      {cohortId !== null && items.length === 0 && (
        <div className="alert alert-info">
          <span>
            The current cohort is just starting — no ambassadors have been
            accepted yet. Check back soon!
          </span>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((a) => (
            <AmbassadorCard key={a.uid} ambassador={a} />
          ))}
        </div>
      )}
    </div>
  );
}
