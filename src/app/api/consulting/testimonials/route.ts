import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { ConsultingReview } from "@/types/consulting";

const MAX_TESTIMONIALS = 10;

type ReviewDoc = FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>;

const toIsoDate = (value: unknown): string => {
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof value === "string" ? value : "";
};

export async function GET() {
  try {
    const approvedQuery = db.collection("consulting_reviews").where("isApproved", "==", true);

    let docs: ReviewDoc[];
    try {
      const snap = await approvedQuery.orderBy("createdAt", "desc").limit(MAX_TESTIMONIALS).get();
      docs = snap.docs;
    } catch (orderError) {
      // The composite index (isApproved + createdAt) may still be building.
      // Fall back to an unordered read and sort in memory so the section stays live.
      console.warn("Falling back to unordered testimonials query:", orderError);
      const snap = await approvedQuery.get();
      docs = snap.docs
        .sort((a, b) => toIsoDate(b.data().createdAt).localeCompare(toIsoDate(a.data().createdAt)))
        .slice(0, MAX_TESTIMONIALS);
    }

    const testimonials: ConsultingReview[] = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        bookingId: data.bookingId,
        clientName: data.clientName,
        clientEmail: "", // Sanitized for privacy
        role: data.role || "",
        company: data.company || "",
        avatarUrl: data.avatarUrl || "",
        linkedinUrl: data.linkedinUrl || "",
        rating: data.rating || 5,
        headline: data.headline || "",
        feedback: data.feedback || "",
        permissionToFeature: data.permissionToFeature ?? true,
        isApproved: true,
        packageName: data.packageName || "",
        sessionDate: data.sessionDate || "",
        createdAt: toIsoDate(data.createdAt),
      };
    });

    return NextResponse.json({ testimonials });
  } catch (error) {
    console.error("Error fetching approved consulting testimonials:", error);
    return NextResponse.json({ testimonials: [] }, { status: 500 });
  }
}
