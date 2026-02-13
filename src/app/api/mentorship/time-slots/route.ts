import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import {
  calculateAvailableSlots,
  getDaysInRange,
} from "@/lib/availability";
import type {
  TimeSlotAvailability,
  UnavailableDate,
  AvailableSlot,
} from "@/types/mentorship";
import { format } from "date-fns";

/**
 * GET /api/mentorship/time-slots?mentorId={uid}&startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
 *
 * Returns available time slots for a mentor within a date range.
 * Public endpoint - no auth required (mentees browse slots before booking).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get("mentorId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    // Validate required parameters
    if (!mentorId || !startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: "Missing required parameters: mentorId, startDate, endDate" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDateStr) || !dateRegex.test(endDateStr)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Validate endDate >= startDate
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "endDate must be greater than or equal to startDate" },
        { status: 400 }
      );
    }

    // Validate range <= 14 days (prevent excessive queries)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 14) {
      return NextResponse.json(
        { error: "Date range must not exceed 14 days" },
        { status: 400 }
      );
    }

    // Fetch mentor profile
    const profileDoc = await db
      .collection("mentorship_profiles")
      .doc(mentorId)
      .get();

    if (!profileDoc.exists) {
      return NextResponse.json(
        { error: "Mentor not found" },
        { status: 404 }
      );
    }

    const profileData = profileDoc.data();

    // Get timeSlotAvailability and unavailableDates
    const availability = profileData?.timeSlotAvailability as TimeSlotAvailability | undefined;
    const unavailableDates = (profileData?.unavailableDates || []) as UnavailableDate[];

    if (!availability) {
      return NextResponse.json({
        slots: [],
        timezone: "UTC",
        slotDurationMinutes: 30,
        message: "Mentor has not set up availability",
      });
    }

    // Fetch existing confirmed bookings for this mentor in the date range
    const startOfRange = new Date(startDateStr);
    startOfRange.setHours(0, 0, 0, 0);

    const endOfRange = new Date(endDateStr);
    endOfRange.setDate(endOfRange.getDate() + 1);
    endOfRange.setHours(0, 0, 0, 0);

    const bookingsSnapshot = await db
      .collection("mentorship_bookings")
      .where("mentorId", "==", mentorId)
      .where("status", "==", "confirmed")
      .where("startTime", ">=", startOfRange)
      .where("startTime", "<", endOfRange)
      .get();

    const existingBookings = bookingsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        startTime: data.startTime.toDate(),
        endTime: data.endTime.toDate(),
      };
    });

    // Get all days in the range
    const days = getDaysInRange(startDate, endDate);

    // Calculate available slots for each day
    const slotsByDate: Record<string, AvailableSlot[]> = {};

    for (const day of days) {
      const slotsForDay = calculateAvailableSlots(
        availability,
        unavailableDates,
        existingBookings,
        day
      );

      if (slotsForDay.length > 0) {
        const dateKey = format(day, "yyyy-MM-dd");
        slotsByDate[dateKey] = slotsForDay.map(slot => ({
          start: slot.start,
          end: slot.end,
          displayTime: slot.displayTime,
        }));
      }
    }

    return NextResponse.json({
      slots: slotsByDate,
      timezone: availability.timezone,
      slotDurationMinutes: availability.slotDurationMinutes,
    });

  } catch (error) {
    console.error("Error fetching time slots:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
