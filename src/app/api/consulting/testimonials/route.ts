import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { ConsultingReview } from "@/types/consulting";

export async function GET() {
  try {
    const reviewsSnap = await db
      .collection("consulting_reviews")
      .where("isApproved", "==", true)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const testimonials: ConsultingReview[] = reviewsSnap.docs.map((doc) => {
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
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || "",
      };
    });

    return NextResponse.json({ testimonials });
  } catch (error) {
    console.error("Error fetching approved consulting testimonials:", error);
    return NextResponse.json({ testimonials: [] }, { status: 500 });
  }
}
