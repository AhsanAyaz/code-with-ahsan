import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { sendDirectMessage, isDiscordConfigured } from "@/lib/discord";
import { createCalendarEvent, deleteCalendarEvent, isCalendarConfigured } from "@/lib/google-calendar";
import { FieldValue } from "firebase-admin/firestore";
import { format } from "date-fns";
import type { MentorBooking } from "@/types/mentorship";

/**
 * GET /api/mentorship/bookings?userId={uid}&role={mentor|mentee}&status={confirmed|cancelled|all}
 *
 * Returns bookings filtered by user role and status.
 * Authenticated endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");
    const status = searchParams.get("status") || "confirmed";

    if (!userId || !role) {
      return NextResponse.json(
        { error: "Missing required parameters: userId, role" },
        { status: 400 }
      );
    }

    if (role !== "mentor" && role !== "mentee") {
      return NextResponse.json(
        { error: "Invalid role. Must be 'mentor' or 'mentee'" },
        { status: 400 }
      );
    }

    // Build query based on role
    let query = db.collection("mentorship_bookings");

    if (role === "mentor") {
      query = query.where("mentorId", "==", userId) as FirebaseFirestore.CollectionReference;
    } else {
      query = query.where("menteeId", "==", userId) as FirebaseFirestore.CollectionReference;
    }

    // Filter by status (unless "all")
    if (status !== "all") {
      query = query.where("status", "==", status) as FirebaseFirestore.CollectionReference;
    }

    // Order by start time
    query = query.orderBy("startTime", "asc") as FirebaseFirestore.CollectionReference;

    const snapshot = await query.get();

    const bookings = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        mentorId: data.mentorId,
        menteeId: data.menteeId,
        mentorProfile: data.mentorProfile || null,
        menteeProfile: data.menteeProfile || null,
        startTime: data.startTime?.toDate()?.toISOString() || null,
        endTime: data.endTime?.toDate()?.toISOString() || null,
        timezone: data.timezone || "UTC",
        status: data.status,
        calendarEventId: data.calendarEventId || null,
        calendarSyncStatus: data.calendarSyncStatus || "not_connected",
        cancelledBy: data.cancelledBy || null,
        cancelledAt: data.cancelledAt?.toDate()?.toISOString() || null,
        cancellationReason: data.cancellationReason || null,
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
      };
    });

    return NextResponse.json({ bookings });

  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mentorship/bookings
 *
 * Creates a new booking with Firestore transaction for double-booking prevention.
 * Authenticated endpoint (mentee books a slot).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { mentorId, startTime, endTime, timezone } = body;

    // Validate required fields
    if (!mentorId || !startTime || !endTime || !timezone) {
      return NextResponse.json(
        { error: "Missing required fields: mentorId, startTime, endTime, timezone" },
        { status: 400 }
      );
    }

    // Parse dates
    const startTimeDate = new Date(startTime);
    const endTimeDate = new Date(endTime);

    if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format for startTime or endTime" },
        { status: 400 }
      );
    }

    // Validate duration is 30 minutes
    const durationMinutes = (endTimeDate.getTime() - startTimeDate.getTime()) / (1000 * 60);
    if (durationMinutes !== 30) {
      return NextResponse.json(
        { error: "Booking duration must be exactly 30 minutes" },
        { status: 400 }
      );
    }

    // Validate startTime is at least 2 hours in the future
    const now = new Date();
    const minStartTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (startTimeDate < minStartTime) {
      return NextResponse.json(
        { error: "Booking must be at least 2 hours in the future" },
        { status: 400 }
      );
    }

    // Validate startTime is within 60 days
    const maxStartTime = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    if (startTimeDate > maxStartTime) {
      return NextResponse.json(
        { error: "Booking must be within 60 days" },
        { status: 400 }
      );
    }

    // Verify user is not booking their own slot
    if (auth.uid === mentorId) {
      return NextResponse.json(
        { error: "Cannot book your own time slots" },
        { status: 400 }
      );
    }

    // Fetch mentor profile
    const mentorDoc = await db.collection("mentorship_profiles").doc(mentorId).get();
    if (!mentorDoc.exists) {
      return NextResponse.json(
        { error: "Mentor not found" },
        { status: 404 }
      );
    }

    const mentorData = mentorDoc.data();
    if (!mentorData?.timeSlotAvailability) {
      return NextResponse.json(
        { error: "Mentor has not set up availability" },
        { status: 400 }
      );
    }

    // Fetch mentee profile
    const menteeDoc = await db.collection("mentorship_profiles").doc(auth.uid).get();
    if (!menteeDoc.exists) {
      return NextResponse.json(
        { error: "Mentee profile not found" },
        { status: 404 }
      );
    }

    const menteeData = menteeDoc.data() as Record<string, string> | undefined;
    if (!menteeData) {
      return NextResponse.json(
        { error: "Mentee profile data not found" },
        { status: 404 }
      );
    }

    // Create denormalized profile subsets
    const mentorProfile = {
      displayName: mentorData.displayName || "Unknown Mentor",
      photoURL: mentorData.photoURL || "",
      username: mentorData.username || "",
      discordUsername: mentorData.discordUsername || "",
    };

    const menteeProfile = {
      displayName: (menteeData as Record<string, string>).displayName || "Unknown Mentee",
      photoURL: (menteeData as Record<string, string>).photoURL || "",
      username: (menteeData as Record<string, string>).username || "",
      discordUsername: (menteeData as Record<string, string>).discordUsername || "",
    };

    // Use Firestore transaction for atomic booking
    const bookingId = await db.runTransaction(async (transaction) => {
      // Query existing confirmed bookings in this time window for the mentor
      const conflictsSnapshot = await transaction.get(
        db.collection("mentorship_bookings")
          .where("mentorId", "==", mentorId)
          .where("status", "==", "confirmed")
          .where("startTime", ">=", startTimeDate)
          .where("startTime", "<", endTimeDate)
      );

      if (!conflictsSnapshot.empty) {
        throw new Error("TIME_SLOT_ALREADY_BOOKED");
      }

      // Create the booking
      const bookingRef = db.collection("mentorship_bookings").doc();
      transaction.set(bookingRef, {
        mentorId,
        menteeId: auth.uid,
        mentorProfile,
        menteeProfile,
        startTime: startTimeDate,
        endTime: endTimeDate,
        timezone,
        status: "confirmed",
        calendarEventId: null,
        calendarSyncStatus: "pending",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return bookingRef.id;
    });

    // Fetch the created booking to return
    const createdBooking = await db.collection("mentorship_bookings").doc(bookingId).get();
    const bookingData = createdBooking.data();

    // After booking created successfully, attempt calendar event creation (non-blocking)
    if (isCalendarConfigured()) {
      try {
        const eventId = await createCalendarEvent(mentorId, {
          id: bookingId,
          startTime: startTimeDate,
          endTime: endTimeDate,
          timezone,
          menteeName: menteeProfile.displayName,
          menteeEmail: (menteeData as Record<string, string>).email,
        });

        if (eventId) {
          // Update booking with calendar event ID
          await db.collection("mentorship_bookings").doc(bookingId).update({
            calendarEventId: eventId,
            calendarSyncStatus: "synced",
          });
        } else {
          await db.collection("mentorship_bookings").doc(bookingId).update({
            calendarSyncStatus: "not_connected",
          });
        }
      } catch (calendarError) {
        console.error("Calendar event creation failed (non-blocking):", calendarError);
        await db.collection("mentorship_bookings").doc(bookingId).update({
          calendarSyncStatus: "failed",
        }).catch(() => {}); // Double catch: don't fail if update fails too
      }
    }

    return NextResponse.json(
      {
        success: true,
        booking: {
          id: createdBooking.id,
          mentorId: bookingData?.mentorId,
          menteeId: bookingData?.menteeId,
          mentorProfile: bookingData?.mentorProfile,
          menteeProfile: bookingData?.menteeProfile,
          startTime: bookingData?.startTime?.toDate()?.toISOString(),
          endTime: bookingData?.endTime?.toDate()?.toISOString(),
          timezone: bookingData?.timezone,
          status: bookingData?.status,
          calendarEventId: bookingData?.calendarEventId,
          calendarSyncStatus: bookingData?.calendarSyncStatus,
          createdAt: bookingData?.createdAt?.toDate()?.toISOString(),
          updatedAt: bookingData?.updatedAt?.toDate()?.toISOString(),
        },
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    // Handle double-booking conflict
    if (error instanceof Error && error.message === "TIME_SLOT_ALREADY_BOOKED") {
      return NextResponse.json(
        { error: "This time slot has already been booked" },
        { status: 409 }
      );
    }

    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mentorship/bookings
 *
 * Cancels a booking and sends Discord DM notification to the affected party.
 * Authenticated endpoint (mentor or mentee can cancel).
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, action, reason } = body;

    if (!bookingId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: bookingId, action" },
        { status: 400 }
      );
    }

    if (action !== "cancel") {
      return NextResponse.json(
        { error: "Only 'cancel' action is supported" },
        { status: 400 }
      );
    }

    // Fetch the booking
    const bookingRef = db.collection("mentorship_bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const bookingData = bookingDoc.data() as MentorBooking;

    // Verify the authenticated user is either the mentor or the mentee
    if (auth.uid !== bookingData.mentorId && auth.uid !== bookingData.menteeId) {
      return NextResponse.json(
        { error: "You are not authorized to cancel this booking" },
        { status: 403 }
      );
    }

    // Verify booking is confirmed (can't cancel already cancelled)
    if (bookingData.status !== "confirmed") {
      return NextResponse.json(
        { error: "Only confirmed bookings can be cancelled" },
        { status: 400 }
      );
    }

    // Update booking status
    await bookingRef.update({
      status: "cancelled",
      cancelledBy: auth.uid,
      cancelledAt: new Date(),
      cancellationReason: reason || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Send Discord DM notification (non-blocking)
    const isMentorCancel = auth.uid === bookingData.mentorId;
    const recipientDiscordUsername = isMentorCancel
      ? bookingData.menteeProfile?.discordUsername
      : bookingData.mentorProfile?.discordUsername;

    const cancellerName = isMentorCancel
      ? bookingData.mentorProfile?.displayName || "Your mentor"
      : bookingData.menteeProfile?.displayName || "Your mentee";

    if (recipientDiscordUsername && isDiscordConfigured()) {
      try {
        // Format date and time for the notification
        const startDate = bookingData.startTime instanceof Date
          ? bookingData.startTime
          : new Date(bookingData.startTime);
        const formattedDate = format(startDate, "MMMM d, yyyy");
        const formattedTime = format(startDate, "h:mm a");

        // Check if this is a reschedule request (mentor cancels with "reschedule" in reason)
        const isRescheduleRequest = isMentorCancel && reason && reason.toLowerCase().includes("reschedule");

        const message = isRescheduleRequest
          ? `**Reschedule Requested**\n\nYour mentor ${cancellerName} has requested to reschedule your mentorship session on ${formattedDate} at ${formattedTime} (${bookingData.timezone}).\n${reason ? `Reason: ${reason}\n` : ""}\nPlease visit the platform to book a new time: https://codewithahsan.dev/mentorship/book/${bookingData.mentorId}`
          : `**Session Cancelled**\n\nYour mentorship session on ${formattedDate} at ${formattedTime} (${bookingData.timezone}) has been cancelled by ${cancellerName}.\n${reason ? `Reason: ${reason}\n` : ""}\nPlease visit the platform to manage your bookings: https://codewithahsan.dev/mentorship/dashboard`;

        await sendDirectMessage(recipientDiscordUsername, message);
      } catch (discordError) {
        // Log but don't fail the API response
        console.error("Failed to send Discord DM for booking cancellation:", discordError);
      }
    }

    // After booking cancelled, attempt calendar event deletion (non-blocking)
    if (isCalendarConfigured() && bookingData.calendarEventId) {
      try {
        await deleteCalendarEvent(bookingData.mentorId, bookingData.calendarEventId);
        // Update booking to clear calendar reference
        await db.collection("mentorship_bookings").doc(bookingId).update({
          calendarSyncStatus: "cancelled",
        });
      } catch (calendarError) {
        console.error("Calendar event deletion failed (non-blocking):", calendarError);
        // Don't fail the cancel operation
      }
    }

    return NextResponse.json({
      success: true,
      calendarEventId: bookingData.calendarEventId || null,
    });

  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
