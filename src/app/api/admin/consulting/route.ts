import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { db } from "@/lib/firebaseAdmin";
import { getConsultingSettings, ConsultingSettings } from "@/lib/consulting/config";
import { ConsultingBooking, ConsultingReview } from "@/types/consulting";
import { sendConsultingReviewRequestEmail } from "@/lib/consulting/reviewEmail";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-admin-consulting");

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getConsultingSettings();

    // Fetch recent consulting bookings
    const bookingsSnap = await db
      .collection("consulting_bookings")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const bookings = bookingsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        packageName: data.packageName,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        status: data.status,
        startTime: data.startTime?.toDate ? data.startTime.toDate().toISOString() : data.startTime,
        endTime: data.endTime?.toDate ? data.endTime.toDate().toISOString() : data.endTime,
        amountTotal: data.amountTotal || 0,
        currency: data.currency || "usd",
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        googleMeetLink: data.googleMeetLink || null,
        reviewEmailSentAt: data.reviewEmailSentAt?.toDate
          ? data.reviewEmailSentAt.toDate().toISOString()
          : data.reviewEmailSentAt || null,
        reviewId: data.reviewId || null,
      };
    });

    // Fetch consulting testimonials / reviews
    const reviewsSnap = await db
      .collection("consulting_reviews")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const reviews: ConsultingReview[] = reviewsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        bookingId: data.bookingId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        role: data.role || "",
        company: data.company || "",
        avatarUrl: data.avatarUrl || "",
        linkedinUrl: data.linkedinUrl || "",
        rating: data.rating || 5,
        headline: data.headline || "",
        feedback: data.feedback || "",
        permissionToFeature: data.permissionToFeature ?? true,
        isApproved: data.isApproved ?? false,
        packageName: data.packageName || "",
        sessionDate: data.sessionDate || "",
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || "",
      };
    });

    // Compute revenue & session metrics
    const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
    const totalRevenueInCents = confirmedBookings.reduce((sum, b) => sum + (b.amountTotal || 0), 0);

    return NextResponse.json({
      settings,
      bookings,
      reviews,
      metrics: {
        totalRevenueInCents,
        confirmedCount: confirmedBookings.length,
        totalBookingsCount: bookings.length,
        reviewsCount: reviews.length,
        approvedReviewsCount: reviews.filter((r) => r.isApproved).length,
      },
    });
  } catch (error) {
    logger.error("Error fetching admin consulting data", { error });
    return NextResponse.json({ error: "Failed to fetch consulting data" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const updatePayload: Partial<ConsultingSettings> = {
      adminEmail: body.adminEmail,
      adminName: body.adminName,
      adminTimezone: body.adminTimezone,
      weeklyAvailability: body.weeklyAvailability,
      slotDurationStepMinutes: Number(body.slotDurationStepMinutes) || 30,
      bufferBetweenSessionsMinutes: Number(body.bufferBetweenSessionsMinutes) || 15,
      minBookingNoticeHours: Number(body.minBookingNoticeHours) || 4,
      maxBookingDaysInAdvance: Number(body.maxBookingDaysInAdvance) || 30,
      slotLockExpirationMinutes: Number(body.slotLockExpirationMinutes) || 15,
      packages: Array.isArray(body.packages) ? body.packages : undefined,
      updatedAt: new Date().toISOString(),
    };

    // Remove undefined keys
    const cleanPayload = Object.fromEntries(
      Object.entries(updatePayload).filter(([_, v]) => v !== undefined)
    );

    await db.collection("config").doc("consulting").set(cleanPayload, { merge: true });

    logger.info("Admin consulting settings updated successfully", {
      timezone: cleanPayload.adminTimezone,
      packagesCount: Array.isArray(cleanPayload.packages) ? cleanPayload.packages.length : 0,
    });

    const updatedSettings = await getConsultingSettings();
    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error) {
    logger.error("Error updating admin consulting settings", { error });
    return NextResponse.json({ error: "Failed to update consulting settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, bookingId, reviewId, isApproved } = body;

    // Action 1: Manual confirmation & resend confirmation email
    if (action === "confirm_and_resend" && bookingId) {
      const { confirmConsultingBooking } = await import("@/lib/consulting/confirmBooking");
      const result = await confirmConsultingBooking({
        bookingId,
        forceResendEmail: true,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error || "Failed to confirm" }, { status: 400 });
      }

      return NextResponse.json({ success: true, booking: result.booking });
    }

    // Action 2: Send review request email manually for a booking
    if (action === "send_review_invite" && bookingId) {
      const bookingDoc = await db.collection("consulting_bookings").doc(bookingId).get();
      if (!bookingDoc.exists) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      const booking = { ...bookingDoc.data(), id: bookingDoc.id } as ConsultingBooking;
      const emailSent = await sendConsultingReviewRequestEmail(booking);

      if (!emailSent) {
        return NextResponse.json(
          { error: "Failed to send review email via Resend" },
          { status: 500 }
        );
      }

      const now = new Date();
      await bookingDoc.ref.update({
        reviewEmailSentAt: now,
        updatedAt: now,
      });

      return NextResponse.json({ success: true, sentAt: now.toISOString() });
    }

    // Action 3: Toggle testimonial approval (Make Live / Hide)
    if (action === "toggle_review_approval" && reviewId) {
      const reviewRef = db.collection("consulting_reviews").doc(reviewId);
      const reviewDoc = await reviewRef.get();

      if (!reviewDoc.exists) {
        return NextResponse.json({ error: "Review not found" }, { status: 404 });
      }

      const newApprovedState =
        typeof isApproved === "boolean" ? isApproved : !reviewDoc.data()?.isApproved;

      await reviewRef.update({
        isApproved: newApprovedState,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, isApproved: newApprovedState });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Error in admin consulting POST action", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
