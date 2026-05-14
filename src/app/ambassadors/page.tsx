import { db } from "@/lib/firebaseAdmin";
import { getCurrentCohortId } from "@/lib/ambassador/currentCohort";
import {
  PUBLIC_AMBASSADORS_COLLECTION,
  type CohortDoc,
  type PublicAmbassadorDoc,
} from "@/types/ambassador";
import { AMBASSADOR_COHORTS_COLLECTION } from "@/lib/ambassador/constants";
import AmbassadorCard from "@/components/ambassador/AmbassadorCard";

export const dynamic = "force-dynamic";

// NOTE: feature-flag gating is handled by src/app/ambassadors/layout.tsx.
// This page inherits the 404 when FEATURE_AMBASSADOR_PROGRAM is off.

/** Client-safe shape: PublicAmbassadorDoc minus the Firestore `updatedAt` Timestamp,
 *  which isn't a plain object and can't cross the Server→Client Component boundary. */
type PublicAmbassadorCardData = Omit<PublicAmbassadorDoc, "updatedAt">;

async function loadCohortData(): Promise<{
  cohortId: string | null;
  applicationsOpen: boolean;
  items: PublicAmbassadorCardData[];
}> {
  const cohortId = await getCurrentCohortId();
  if (!cohortId) return { cohortId: null, applicationsOpen: false, items: [] };

  const [cohortSnap, ambassadorsSnap] = await Promise.all([
    db.collection(AMBASSADOR_COHORTS_COLLECTION).doc(cohortId).get(),
    db
      .collection(PUBLIC_AMBASSADORS_COLLECTION)
      .where("active", "==", true)
      .where("cohortId", "==", cohortId)
      .orderBy("updatedAt", "asc")
      .get(),
  ]);

  const cohort = cohortSnap.data() as CohortDoc | undefined;
  const applicationsOpen =
    !!cohort &&
    cohort.applicationWindowOpen === true &&
    cohort.acceptedCount < cohort.maxSize;

  return {
    cohortId,
    applicationsOpen,
    items: ambassadorsSnap.docs.map((d) => {
      const { updatedAt: _updatedAt, ...rest } = d.data() as PublicAmbassadorDoc;
      return rest;
    }),
  };
}

export default async function AmbassadorsPage() {
  const { cohortId, applicationsOpen, items } = await loadCohortData();

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
        {applicationsOpen && (
          <div className="pt-2">
            <a
              href="/ambassadors/apply"
              className="btn btn-primary btn-lg"
            >
              Apply to become an Ambassador
            </a>
          </div>
        )}
      </div>

      {cohortId === null && (
        <div className="alert alert-info">
          <span>No active cohort right now. Check back when the next cohort starts.</span>
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
