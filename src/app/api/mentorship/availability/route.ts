import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import {
  TimeSlotAvailability,
  UnavailableDate,
  DayOfWeek,
} from "@/types/mentorship";

/**
 * Validate time string format (HH:mm) and range
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(time)) {
    return false;
  }

  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/**
 * GET /api/mentorship/availability?mentorId={uid}
 * Public endpoint - returns mentor's time slot availability and unavailable dates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get("mentorId");

    if (!mentorId) {
      return NextResponse.json(
        { error: "mentorId query parameter required" },
        { status: 400 }
      );
    }

    // Query mentor profile
    const profileDoc = await db
      .collection("mentorship_profiles")
      .doc(mentorId)
      .get();

    if (!profileDoc.exists) {
      return NextResponse.json(
        { error: "Mentor profile not found" },
        { status: 404 }
      );
    }

    const profileData = profileDoc.data();

    // Extract availability data (stored as timeSlotAvailability to avoid conflict with legacy availability field)
    const availability = profileData?.timeSlotAvailability || null;
    const unavailableDates = profileData?.unavailableDates || [];
    const googleCalendarConnected = !!profileData?.googleCalendarConnected;

    return NextResponse.json({
      availability,
      unavailableDates,
      googleCalendarConnected,
    });
  } catch (error) {
    console.error("Error fetching mentor availability:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mentorship/availability
 * Authenticated endpoint - allows mentors to save their weekly schedule and unavailable dates
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { availability, unavailableDates } = body as {
      availability?: TimeSlotAvailability;
      unavailableDates?: UnavailableDate[];
    };

    // Find the mentor's profile
    const profilesSnapshot = await db
      .collection("mentorship_profiles")
      .where("uid", "==", auth.uid)
      .where("role", "==", "mentor")
      .limit(1)
      .get();

    if (profilesSnapshot.empty) {
      return NextResponse.json(
        { error: "Forbidden - only mentors can set availability" },
        { status: 403 }
      );
    }

    const profileDoc = profilesSnapshot.docs[0];

    // Validate availability if provided
    if (availability) {
      // Validate timezone
      if (!availability.timezone || typeof availability.timezone !== "string") {
        return NextResponse.json(
          { error: "Invalid timezone" },
          { status: 400 }
        );
      }

      // Validate weekly schedule
      const validDays: DayOfWeek[] = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];

      for (const [day, ranges] of Object.entries(availability.weekly)) {
        // Validate day name
        if (!validDays.includes(day as DayOfWeek)) {
          return NextResponse.json(
            { error: `Invalid day name: ${day}` },
            { status: 400 }
          );
        }

        // Validate time ranges
        if (!Array.isArray(ranges)) {
          return NextResponse.json(
            { error: `Invalid time ranges for ${day}` },
            { status: 400 }
          );
        }

        for (const range of ranges) {
          if (!range.start || !range.end) {
            return NextResponse.json(
              { error: `Missing start or end time for ${day}` },
              { status: 400 }
            );
          }

          if (!isValidTimeFormat(range.start) || !isValidTimeFormat(range.end)) {
            return NextResponse.json(
              { error: `Invalid time format for ${day} (expected HH:mm)` },
              { status: 400 }
            );
          }

          // Validate start < end
          if (range.start >= range.end) {
            return NextResponse.json(
              { error: `Start time must be before end time for ${day}` },
              { status: 400 }
            );
          }
        }
      }

      // Validate slot duration
      if (
        !availability.slotDurationMinutes ||
        typeof availability.slotDurationMinutes !== "number" ||
        availability.slotDurationMinutes <= 0
      ) {
        return NextResponse.json(
          { error: "Invalid slotDurationMinutes" },
          { status: 400 }
        );
      }
    }

    // Validate unavailableDates if provided
    if (unavailableDates) {
      if (!Array.isArray(unavailableDates)) {
        return NextResponse.json(
          { error: "unavailableDates must be an array" },
          { status: 400 }
        );
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      for (const unavailableDate of unavailableDates) {
        if (!unavailableDate.date || !dateRegex.test(unavailableDate.date)) {
          return NextResponse.json(
            { error: "Invalid date format (expected YYYY-MM-DD)" },
            { status: 400 }
          );
        }
      }
    }

    // Update the profile with validated data
    const updateData: Record<string, unknown> = {};
    if (availability) {
      updateData.timeSlotAvailability = availability;
    }
    if (unavailableDates !== undefined) {
      updateData.unavailableDates = unavailableDates;
    }

    await profileDoc.ref.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating mentor availability:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
