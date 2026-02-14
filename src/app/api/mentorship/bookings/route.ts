import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { sendChannelMessage, sendChannelMessageWithComponents, isDiscordConfigured, lookupMemberByUsername } from "@/lib/discord";
import { createCalendarEvent, deleteCalendarEvent, isCalendarConfigured } from "@/lib/google-calendar";
import { FieldValue } from "firebase-admin/firestore";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { SESSION_TEMPLATES } from "@/lib/mentorship-templates";
import type { MentorBooking } from "@/types/mentorship";

/**
 * Find the Discord channel ID and session ID for a mentor-mentee pair from their active mentorship session.
 */
async function findMentorshipSessionInfo(mentorId: string, menteeId: string): Promise<{ channelId: string | null; sessionId: string | null }> {
  try {
    const sessionsSnapshot = await db.collection("mentorship_sessions")
      .where("mentorId", "==", mentorId)
      .where("menteeId", "==", menteeId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (sessionsSnapshot.empty) return { channelId: null, sessionId: null };
    const doc = sessionsSnapshot.docs[0];
    return {
      channelId: doc.data()?.discordChannelId || null,
      sessionId: doc.id,
    };
  } catch {
    return { channelId: null, sessionId: null };
  }
}

/**
 * Get Monday-Sunday bounds for the calendar week containing the given date.
 */
function getCalendarWeekBounds(date: Date): { weekStart: Date; weekEnd: Date } {
  return {
    weekStart: startOfWeek(date, { weekStartsOn: 1 }),
    weekEnd: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

/**
 * Count confirmed bookings in a given week for a specific mentee-mentor pair.
 */
async function countConfirmedBookingsInWeek(
  mentorId: string,
  menteeId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<number> {
  const snapshot = await db.collection("mentorship_bookings")
    .where("mentorId", "==", mentorId)
    .where("menteeId", "==", menteeId)
    .where("status", "==", "confirmed")
    .where("startTime", ">=", weekStart)
    .where("startTime", "<=", weekEnd)
    .get();
  return snapshot.size;
}

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
        templateId: data.templateId || null,
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
    const { mentorId, startTime, endTime, timezone, templateId } = body;

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

    // --- Approval flow: determine if this booking needs mentor approval ---
    const { weekStart, weekEnd } = getCalendarWeekBounds(startTimeDate);
    const confirmedThisWeek = await countConfirmedBookingsInWeek(mentorId, auth.uid, weekStart, weekEnd);

    let bookingStatus: "confirmed" | "pending_approval" = "confirmed";
    if (confirmedThisWeek >= 1) {
      // Check for existing pending_approval booking for this pair this week — reject if one exists
      const pendingSnapshot = await db.collection("mentorship_bookings")
        .where("mentorId", "==", mentorId)
        .where("menteeId", "==", auth.uid)
        .where("status", "==", "pending_approval")
        .limit(1)
        .get();

      if (!pendingSnapshot.empty) {
        return NextResponse.json(
          { error: "You already have a pending booking request with this mentor. Please wait for approval before booking another." },
          { status: 409 }
        );
      }

      bookingStatus = "pending_approval";
    }

    // Use Firestore transaction for atomic booking
    const bookingId = await db.runTransaction(async (transaction) => {
      // Only check for slot conflicts if this is a confirmed booking (blocks the slot)
      if (bookingStatus === "confirmed") {
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
        status: bookingStatus,
        templateId: templateId || null,
        calendarEventId: null,
        calendarSyncStatus: bookingStatus === "confirmed" ? "pending" : "not_connected",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return bookingRef.id;
    });

    // Fetch the created booking to return
    const createdBooking = await db.collection("mentorship_bookings").doc(bookingId).get();
    const bookingData = createdBooking.data();

    // Calendar event: only for confirmed bookings
    if (bookingStatus === "confirmed" && isCalendarConfigured()) {
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
        }).catch(() => {});
      }
    }

    // Send Discord channel notification (non-blocking)
    if (isDiscordConfigured()) {
      const { channelId, sessionId } = await findMentorshipSessionInfo(mentorId, auth.uid);
      if (channelId) {
        const formattedDate = format(startTimeDate, "EEEE, MMMM d, yyyy");
        const formattedTime = format(startTimeDate, "h:mm a");

        // Resolve mentor's Discord ID for tagging
        let mentorMention = mentorProfile.displayName;
        if (mentorProfile.discordUsername) {
          const member = await lookupMemberByUsername(mentorProfile.discordUsername).catch(() => null);
          if (member) mentorMention = `<@${member.id}>`;
        }

        const templateLabel = templateId
          ? SESSION_TEMPLATES.find(t => t.id === templateId)
          : null;
        const templateLine = templateLabel
          ? `**Session Type:** ${templateLabel.icon} ${templateLabel.title}\n`
          : "";

        if (bookingStatus === "confirmed") {
          sendChannelMessage(
            channelId,
            `📅 **New Session Booked!**\n\n` +
              `${mentorMention} — ${menteeProfile.displayName} has booked a session with you.\n\n` +
              `**Date:** ${formattedDate}\n` +
              `**Time:** ${formattedTime} (${timezone})\n` +
              `**Duration:** 30 minutes\n` +
              templateLine +
              `\nSee you there! 🎉`
          ).catch((err) => console.error("Failed to send booking Discord notification:", err));
        } else {
          // pending_approval: send message with URL button linking to dashboard
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev";
          const dashboardUrl = sessionId
            ? `${siteUrl}/mentorship/dashboard/${sessionId}`
            : `${siteUrl}/mentorship`;

          sendChannelMessageWithComponents(
            channelId,
            `📋 **Booking Approval Requested**\n\n` +
              `${mentorMention} — ${menteeProfile.displayName} wants to book an additional session this week.\n\n` +
              `**Date:** ${formattedDate}\n` +
              `**Time:** ${formattedTime} (${timezone})\n` +
              `**Duration:** 30 minutes\n` +
              templateLine +
              `\nPlease approve or decline from your dashboard.`,
            [
              {
                type: 1, // Action Row
                components: [
                  {
                    type: 2, // Button
                    style: 5, // Link
                    label: "View Dashboard",
                    url: dashboardUrl,
                  },
                ],
              },
            ]
          ).catch((err) => console.error("Failed to send pending booking Discord notification:", err));
        }
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
          templateId: bookingData?.templateId || null,
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

    if (!["cancel", "approve", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'cancel', 'approve', or 'decline'" },
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
        { error: "You are not authorized to modify this booking" },
        { status: 403 }
      );
    }

    // --- APPROVE action ---
    if (action === "approve") {
      if (auth.uid !== bookingData.mentorId) {
        return NextResponse.json(
          { error: "Only the mentor can approve bookings" },
          { status: 403 }
        );
      }
      if (bookingData.status !== "pending_approval") {
        return NextResponse.json(
          { error: "Only pending bookings can be approved" },
          { status: 400 }
        );
      }

      // Re-check for slot conflicts (slot wasn't blocked while pending)
      const rawStart = bookingData.startTime as unknown as { toDate?: () => Date };
      const startDate = rawStart.toDate?.() ?? new Date(bookingData.startTime);
      const rawEnd = bookingData.endTime as unknown as { toDate?: () => Date };
      const endDate = rawEnd.toDate?.() ?? new Date(bookingData.endTime);

      const conflictsSnapshot = await db.collection("mentorship_bookings")
        .where("mentorId", "==", bookingData.mentorId)
        .where("status", "==", "confirmed")
        .where("startTime", ">=", startDate)
        .where("startTime", "<", endDate)
        .get();

      if (!conflictsSnapshot.empty) {
        // Slot was taken while pending — delete the pending booking
        await bookingRef.delete();
        return NextResponse.json(
          { error: "This time slot has already been booked by someone else. The pending booking has been removed." },
          { status: 409 }
        );
      }

      // Approve: update status to confirmed
      await bookingRef.update({
        status: "confirmed",
        calendarSyncStatus: "pending",
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create calendar event (non-blocking)
      if (isCalendarConfigured()) {
        try {
          const menteeDoc = await db.collection("mentorship_profiles").doc(bookingData.menteeId).get();
          const menteeEmail = menteeDoc.data()?.email || "";
          const eventId = await createCalendarEvent(bookingData.mentorId, {
            id: bookingId,
            startTime: startDate,
            endTime: endDate,
            timezone: bookingData.timezone,
            menteeName: bookingData.menteeProfile?.displayName || "Mentee",
            menteeEmail,
          });

          if (eventId) {
            await bookingRef.update({ calendarEventId: eventId, calendarSyncStatus: "synced" });
          } else {
            await bookingRef.update({ calendarSyncStatus: "not_connected" });
          }
        } catch (calendarError) {
          console.error("Calendar event creation on approve failed (non-blocking):", calendarError);
          await bookingRef.update({ calendarSyncStatus: "failed" }).catch(() => {});
        }
      }

      // Discord: notify mentee
      if (isDiscordConfigured()) {
        const { channelId } = await findMentorshipSessionInfo(bookingData.mentorId, bookingData.menteeId);
        if (channelId) {
          let menteeMention = bookingData.menteeProfile?.displayName || "Mentee";
          if (bookingData.menteeProfile?.discordUsername) {
            const member = await lookupMemberByUsername(bookingData.menteeProfile.discordUsername).catch(() => null);
            if (member) menteeMention = `<@${member.id}>`;
          }
          const formattedDate = format(startDate, "EEEE, MMMM d, yyyy");
          const formattedTime = format(startDate, "h:mm a");
          sendChannelMessage(
            channelId,
            `✅ **Booking Approved!**\n\n` +
              `${menteeMention} — Your session on **${formattedDate}** at **${formattedTime}** (${bookingData.timezone}) has been confirmed by your mentor.\n\n` +
              `See you there! 🎉`
          ).catch((err) => console.error("Failed to send approve Discord notification:", err));
        }
      }

      return NextResponse.json({ success: true, status: "confirmed" });
    }

    // --- DECLINE action ---
    if (action === "decline") {
      if (auth.uid !== bookingData.mentorId) {
        return NextResponse.json(
          { error: "Only the mentor can decline bookings" },
          { status: 403 }
        );
      }
      if (bookingData.status !== "pending_approval") {
        return NextResponse.json(
          { error: "Only pending bookings can be declined" },
          { status: 400 }
        );
      }

      // Delete the pending booking
      await bookingRef.delete();

      // Discord: notify mentee
      if (isDiscordConfigured()) {
        const { channelId } = await findMentorshipSessionInfo(bookingData.mentorId, bookingData.menteeId);
        if (channelId) {
          const rawStart = bookingData.startTime as unknown as { toDate?: () => Date };
          const startDate = rawStart.toDate?.() ?? new Date(bookingData.startTime);
          let menteeMention = bookingData.menteeProfile?.displayName || "Mentee";
          if (bookingData.menteeProfile?.discordUsername) {
            const member = await lookupMemberByUsername(bookingData.menteeProfile.discordUsername).catch(() => null);
            if (member) menteeMention = `<@${member.id}>`;
          }
          const formattedDate = format(startDate, "EEEE, MMMM d, yyyy");
          const formattedTime = format(startDate, "h:mm a");
          sendChannelMessage(
            channelId,
            `❌ **Booking Declined**\n\n` +
              `${menteeMention} — Your booking request for **${formattedDate}** at **${formattedTime}** (${bookingData.timezone}) has been declined by your mentor.`
          ).catch((err) => console.error("Failed to send decline Discord notification:", err));
        }
      }

      return NextResponse.json({ success: true });
    }

    // --- CANCEL action ---
    if (bookingData.status !== "confirmed") {
      return NextResponse.json(
        { error: "Only confirmed bookings can be cancelled" },
        { status: 400 }
      );
    }

    // Delete the booking document (clean up, don't keep cancelled bookings)
    await bookingRef.delete();

    // Send Discord channel notification (non-blocking)
    const isMentorCancel = auth.uid === bookingData.mentorId;
    const cancellerName = isMentorCancel
      ? bookingData.mentorProfile?.displayName || "The mentor"
      : bookingData.menteeProfile?.displayName || "The mentee";

    if (isDiscordConfigured()) {
      const { channelId } = await findMentorshipSessionInfo(bookingData.mentorId, bookingData.menteeId);
      if (channelId) {
        try {
          // Firestore returns Timestamps at runtime, cast to access .toDate()
          const rawStart = bookingData.startTime as unknown as { toDate?: () => Date };
          const startDate = rawStart.toDate?.() ?? new Date(bookingData.startTime);
          const formattedDate = format(startDate, "EEEE, MMMM d, yyyy");
          const formattedTime = format(startDate, "h:mm a");

          // Resolve Discord IDs for tagging both mentor and mentee
          let mentorMention = bookingData.mentorProfile?.displayName || "Mentor";
          let menteeMention = bookingData.menteeProfile?.displayName || "Mentee";
          if (bookingData.mentorProfile?.discordUsername) {
            const member = await lookupMemberByUsername(bookingData.mentorProfile.discordUsername).catch(() => null);
            if (member) mentorMention = `<@${member.id}>`;
          }
          if (bookingData.menteeProfile?.discordUsername) {
            const member = await lookupMemberByUsername(bookingData.menteeProfile.discordUsername).catch(() => null);
            if (member) menteeMention = `<@${member.id}>`;
          }
          const mentions = `${mentorMention} ${menteeMention}`;

          const isRescheduleRequest = isMentorCancel && reason && reason.toLowerCase().includes("reschedule");

          const message = isRescheduleRequest
            ? `🔄 **Session Reschedule Requested**\n\n${mentions}\n\n${cancellerName} has cancelled the session on **${formattedDate}** at **${formattedTime}** (${bookingData.timezone}) and requests to reschedule.\n${reason ? `**Reason:** ${reason}\n` : ""}\nPlease book a new time at your convenience.`
            : `❌ **Session Cancelled**\n\n${mentions}\n\nThe mentorship session on **${formattedDate}** at **${formattedTime}** (${bookingData.timezone}) has been cancelled by ${cancellerName}.\n${reason ? `**Reason:** ${reason}` : ""}`;

          await sendChannelMessage(channelId, message);
        } catch (discordError) {
          console.error("Failed to send cancellation Discord notification:", discordError);
        }
      }
    }

    // Attempt calendar event deletion (non-blocking)
    if (isCalendarConfigured() && bookingData.calendarEventId) {
      try {
        await deleteCalendarEvent(bookingData.mentorId, bookingData.calendarEventId);
      } catch (calendarError) {
        console.error("Calendar event deletion failed (non-blocking):", calendarError);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
