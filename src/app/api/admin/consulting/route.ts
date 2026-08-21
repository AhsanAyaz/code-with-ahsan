import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { db } from "@/lib/firebaseAdmin";
import { getConsultingSettings, ConsultingSettings } from "@/lib/consulting/config";
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
      };
    });

    // Compute revenue & session metrics
    const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
    const totalRevenueInCents = confirmedBookings.reduce((sum, b) => sum + (b.amountTotal || 0), 0);

    return NextResponse.json({
      settings,
      bookings,
      metrics: {
        totalRevenueInCents,
        confirmedCount: confirmedBookings.length,
        totalBookingsCount: bookings.length,
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

    const { action, bookingId } = await request.json();

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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Error in admin consulting POST action", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
