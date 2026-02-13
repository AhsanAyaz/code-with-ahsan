import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  format,
  addMinutes,
  isBefore,
  isAfter,
  addDays,
  startOfDay,
  parse,
} from "date-fns";
import {
  TimeSlotAvailability,
  TimeRange,
  UnavailableDate,
  AvailableSlot,
} from "@/types/mentorship";

/**
 * Generates individual 30-minute slots from a time range for a specific date.
 * @param date - The date to generate slots for
 * @param range - Time range with start/end in "HH:mm" format
 * @param timezone - Mentor's IANA timezone (e.g., "America/New_York")
 * @param slotDurationMinutes - Duration of each slot in minutes
 * @returns Array of available slots with UTC dates and display time
 */
export function generateSlotsFromRange(
  date: Date,
  range: TimeRange,
  timezone: string,
  slotDurationMinutes: number
): AvailableSlot[] {
  const slots: AvailableSlot[] = [];

  // Convert date to timezone-aware date string (YYYY-MM-DD)
  const dateInTZ = toZonedTime(date, timezone);
  const dateStr = format(dateInTZ, "yyyy-MM-dd");

  // Parse start and end times for this date in the mentor's timezone
  const startTime = parse(
    `${dateStr} ${range.start}`,
    "yyyy-MM-dd HH:mm",
    new Date()
  );
  const endTime = parse(
    `${dateStr} ${range.end}`,
    "yyyy-MM-dd HH:mm",
    new Date()
  );

  // Convert to UTC
  const startUTC = fromZonedTime(startTime, timezone);
  const endUTC = fromZonedTime(endTime, timezone);

  // Generate slots
  let currentSlotStart = startUTC;
  while (isBefore(currentSlotStart, endUTC)) {
    const currentSlotEnd = addMinutes(currentSlotStart, slotDurationMinutes);

    // Only add slot if it doesn't exceed the range end
    if (!isAfter(currentSlotEnd, endUTC)) {
      // Format display time in mentor's timezone
      const displayTimeDate = toZonedTime(currentSlotStart, timezone);
      const displayTime = format(displayTimeDate, "hh:mm a");

      slots.push({
        start: currentSlotStart,
        end: currentSlotEnd,
        displayTime,
      });
    }

    currentSlotStart = currentSlotEnd;
  }

  return slots;
}

/**
 * Calculate available slots for a mentor on a specific date.
 * Filters out unavailable dates, past slots, far-future slots, and conflicting bookings.
 * @param availability - Mentor's weekly availability configuration
 * @param unavailableDates - Array of dates the mentor is unavailable
 * @param existingBookings - Array of existing bookings with start/end times
 * @param date - The date to calculate slots for
 * @returns Sorted array of available slots
 */
export function calculateAvailableSlots(
  availability: TimeSlotAvailability,
  unavailableDates: UnavailableDate[],
  existingBookings: { startTime: Date; endTime: Date }[],
  date: Date
): AvailableSlot[] {
  // Get day of week name (lowercase to match DayOfWeek type)
  const dayName = format(date, "EEEE").toLowerCase() as
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";

  // Check if this date is in the unavailable dates list
  const dateStr = format(date, "yyyy-MM-dd");
  const isUnavailable = unavailableDates.some(
    (unavailable) => unavailable.date === dateStr
  );
  if (isUnavailable) {
    return [];
  }

  // Get time ranges for this day
  const timeRanges = availability.weekly[dayName];
  if (!timeRanges || timeRanges.length === 0) {
    return [];
  }

  // Generate all slots for this day
  let allSlots: AvailableSlot[] = [];
  for (const range of timeRanges) {
    const slotsForRange = generateSlotsFromRange(
      date,
      range,
      availability.timezone,
      availability.slotDurationMinutes
    );
    allSlots = allSlots.concat(slotsForRange);
  }

  // Calculate time boundaries
  const now = new Date();
  const minStartTime = addMinutes(now, 120); // 2 hours from now
  const maxStartTime = addDays(now, 60); // 60 days from now

  // Filter out slots that are too soon or too far in the future
  let filteredSlots = allSlots.filter(
    (slot) =>
      !isBefore(slot.start, minStartTime) && !isAfter(slot.start, maxStartTime)
  );

  // Filter out slots that overlap with existing bookings
  filteredSlots = filteredSlots.filter((slot) => {
    // Check if this slot overlaps with any booking
    const overlaps = existingBookings.some((booking) => {
      // Overlap occurs if: slot.start < booking.end AND slot.end > booking.start
      return isBefore(slot.start, booking.endTime) && isAfter(slot.end, booking.startTime);
    });
    return !overlaps;
  });

  // Sort by start time
  filteredSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

  return filteredSlots;
}

/**
 * Helper function to get an array of dates between start and end (inclusive).
 * Used by the time-slots API to generate slots across a date range.
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of Date objects for each day in the range
 */
export function getDaysInRange(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = [];
  let currentDate = startOfDay(startDate);
  const end = startOfDay(endDate);

  while (!isAfter(currentDate, end)) {
    days.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  return days;
}
