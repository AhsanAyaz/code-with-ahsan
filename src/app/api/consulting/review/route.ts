import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { SubmitReviewSchema, ConsultingBooking, ConsultingReview } from "@/types/consulting";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-consulting-review");

function toDateSafe(val: unknown): Date {
  if (val instanceof Date) return val;
  if (
    typeof val === "object" &&
    val !== null &&
    "toDate" in val &&
    typeof (val as { toDate: () => Date }).toDate === "function"
  ) {
    return (val as { toDate: () => Date }).toDate();
  }
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * GET: Fetch booking info for the review form (validates booking ID and checks if already reviewed).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const bookingDoc = await db.collection("consulting_bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingDoc.data() as ConsultingBooking;
    const startTime = toDateSafe(booking.startTime);
    const timezone = booking.timezone || "UTC";
    const sessionDate = format(toZonedTime(startTime, timezone), "EEEE, MMMM d, yyyy");

    // Check if review exists
    const reviewSnap = await db
      .collection("consulting_reviews")
      .where("bookingId", "==", bookingId)
      .limit(1)
      .get();

    const alreadyReviewed = !reviewSnap.empty;

    return NextResponse.json({
      booking: {
        id: bookingDoc.id,
        clientName: booking.clientName,
        packageName: booking.packageName,
        durationMinutes: booking.durationMinutes,
        sessionDate,
        githubOrLinkedinUrl: booking.githubOrLinkedinUrl || "",
      },
      alreadyReviewed,
      existingReview: alreadyReviewed ? reviewSnap.docs[0].data() : null,
    });
  } catch (error) {
    logger.error("Error fetching review booking details", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST: Submit a new review/testimonial.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = SubmitReviewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      bookingId,
      rating,
      headline,
      feedback,
      role,
      company,
      linkedinUrl,
      avatarUrl,
      permissionToFeature,
    } = parseResult.data;

    const bookingRef = db.collection("consulting_bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingDoc.data() as ConsultingBooking;
    const startTime = toDateSafe(booking.startTime);
    const timezone = booking.timezone || "UTC";
    const sessionDate = format(toZonedTime(startTime, timezone), "MMMM d, yyyy");

    const reviewRef = db.collection("consulting_reviews").doc();
    const now = new Date().toISOString();

    const reviewData: ConsultingReview = {
      id: reviewRef.id,
      bookingId,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      role: role || "",
      company: company || "",
      avatarUrl: avatarUrl || "",
      linkedinUrl: linkedinUrl || booking.githubOrLinkedinUrl || "",
      rating,
      headline,
      feedback,
      permissionToFeature: permissionToFeature ?? true,
      isApproved: false, // Moderation gate: Admin approves in /admin/consulting
      packageName: booking.packageName,
      sessionDate,
      createdAt: now,
    };

    await reviewRef.set(reviewData);

    // Link reviewId to booking document
    await bookingRef.update({
      reviewId: reviewRef.id,
      updatedAt: new Date(),
    });

    // Send instant notification to admin
    try {
      const { sendAdminNewReviewNotificationEmail } = await import("@/lib/consulting/reviewEmail");
      await sendAdminNewReviewNotificationEmail({
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        rating,
        headline,
        feedback,
        packageName: booking.packageName,
        role: role || "",
        company: company || "",
      });
    } catch (notifyErr) {
      logger.warn("Could not send admin review notification email", { notifyErr });
    }

    logger.info("Consulting review submitted successfully", {
      reviewId: reviewRef.id,
      bookingId,
      rating,
      clientName: booking.clientName,
    });

    return NextResponse.json({ success: true, review: reviewData });
  } catch (error) {
    logger.error("Error submitting consulting review", { error });
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
