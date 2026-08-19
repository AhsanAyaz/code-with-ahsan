import { db } from "@/lib/firebaseAdmin";
import { isCalendarConfigured, getOAuthClient, decryptToken } from "@/lib/google-calendar";
import { google } from "googleapis";
import {
  addMinutes,
  addDays,
  parseISO,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";
import { DEFAULT_WEEKLY_AVAILABILITY, CONSULTING_CONFIG } from "./constants";
import { ConsultingAvailableSlot } from "@/types/consulting";
import { createLogger } from "@/lib/logger";

const logger = createLogger("consulting-availability");

interface TimeInterval {
  start: Date;
  end: Date;
}

/**
 * Check if two intervals overlap (including buffer).
 */
function intervalsOverlap(a: TimeInterval, b: TimeInterval, bufferMinutes = 0): boolean {
  const aStart = a.start.getTime();
  const aEnd = a.end.getTime() + bufferMinutes * 60 * 1000;
  const bStart = b.start.getTime();
  const bEnd = b.end.getTime() + bufferMinutes * 60 * 1000;

  return aStart < bEnd && bStart < aEnd;
}

/**
 * Fetch busy periods from Ahsan's Google Calendar via FreeBusy API.
 */
async function fetchGoogleCalendarBusyTimes(timeMin: Date, timeMax: Date): Promise<TimeInterval[]> {
  if (!isCalendarConfigured()) {
    return [];
  }

  try {
    // Find Ahsan's profile or admin user with Google Calendar refresh token
    const profilesSnapshot = await db
      .collection("mentorship_profiles")
      .where("email", "==", CONSULTING_CONFIG.adminEmail)
      .limit(1)
      .get();

    let refreshToken: string | null = null;

    if (!profilesSnapshot.empty) {
      const data = profilesSnapshot.docs[0].data();
      if (data.googleCalendarRefreshToken) {
        refreshToken = decryptToken(data.googleCalendarRefreshToken);
      }
    }

    // If not found by email, check for any profile marked isAdmin with token
    if (!refreshToken) {
      const adminSnap = await db
        .collection("mentorship_profiles")
        .where("isAdmin", "==", true)
        .limit(1)
        .get();

      if (!adminSnap.empty) {
        const data = adminSnap.docs[0].data();
        if (data.googleCalendarRefreshToken) {
          refreshToken = decryptToken(data.googleCalendarRefreshToken);
        }
      }
    }

    // Fallback: Check any profile with a connected token (e.g. in emulator/dev)
    if (!refreshToken) {
      const anySnap = await db
        .collection("mentorship_profiles")
        .where("googleCalendarConnected", "==", true)
        .limit(1)
        .get();

      if (!anySnap.empty) {
        const data = anySnap.docs[0].data();
        if (data.googleCalendarRefreshToken) {
          refreshToken = decryptToken(data.googleCalendarRefreshToken);
        }
      }
    }

    if (!refreshToken) {
      logger.info("No Google Calendar refresh token found for admin");
      return [];
    }

    const oauthClient = getOAuthClient();
    oauthClient.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: "v3", auth: oauthClient });
    const freeBusyRes = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: "primary" }],
      },
    });

    const busyList = freeBusyRes.data.calendars?.primary?.busy || [];
    return busyList
      .filter((b) => b.start && b.end)
      .map((b) => ({
        start: new Date(b.start as string),
        end: new Date(b.end as string),
      }));
  } catch (error) {
    logger.error("Error querying Google Calendar freebusy", { error });
    return [];
  }
}

/**
 * Fetch busy periods from Firestore (both confirmed bookings & active pending checkout locks).
 */
async function fetchFirestoreBusyTimes(timeMin: Date, timeMax: Date): Promise<TimeInterval[]> {
  const busyTimes: TimeInterval[] = [];
  const now = new Date();

  try {
    // 1. Consulting Bookings
    const consultingSnap = await db
      .collection("consulting_bookings")
      .where("startTime", ">=", timeMin)
      .where("startTime", "<=", timeMax)
      .get();

    for (const doc of consultingSnap.docs) {
      const data = doc.data();
      const status = data.status;
      const startTime = data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime);
      const endTime = data.endTime?.toDate ? data.endTime.toDate() : new Date(data.endTime);
      const expiresAt = data.expiresAt?.toDate
        ? data.expiresAt.toDate()
        : data.expiresAt
          ? new Date(data.expiresAt)
          : null;

      if (status === "confirmed") {
        busyTimes.push({ start: startTime, end: endTime });
      } else if (status === "pending_payment" && expiresAt && isAfter(expiresAt, now)) {
        // Slot is locked during Stripe checkout window
        busyTimes.push({ start: startTime, end: endTime });
      }
    }

    // 2. Mentorship Bookings (to ensure mentorship sessions also block consulting)
    const mentorshipSnap = await db
      .collection("mentorship_bookings")
      .where("status", "==", "confirmed")
      .where("startTime", ">=", timeMin)
      .where("startTime", "<=", timeMax)
      .get();

    for (const doc of mentorshipSnap.docs) {
      const data = doc.data();
      const startTime = data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime);
      const endTime = data.endTime?.toDate ? data.endTime.toDate() : new Date(data.endTime);
      busyTimes.push({ start: startTime, end: endTime });
    }
  } catch (error) {
    logger.error("Error fetching Firestore busy times", { error });
  }

  return busyTimes;
}

/**
 * Compute available slots for a given date range, duration, and target timezone.
 */
export async function getAvailableConsultingSlots({
  startDateStr,
  endDateStr,
  durationMinutes,
}: {
  startDateStr: string; // "YYYY-MM-DD"
  endDateStr: string; // "YYYY-MM-DD"
  durationMinutes: number;
  timezone?: string;
}): Promise<ConsultingAvailableSlot[]> {
  const startDate = parseISO(startDateStr);
  const endDate = parseISO(endDateStr);

  const now = new Date();
  const minNoticeTime = addMinutes(now, CONSULTING_CONFIG.minBookingNoticeHours * 60);
  const maxBookingTime = addDays(now, CONSULTING_CONFIG.maxBookingDaysInAdvance);

  const queryStart = startDate;
  const queryEnd = addDays(endDate, 1);

  // Fetch all existing busy intervals
  const [googleBusy, firestoreBusy] = await Promise.all([
    fetchGoogleCalendarBusyTimes(queryStart, queryEnd),
    fetchFirestoreBusyTimes(queryStart, queryEnd),
  ]);

  const allBusy = [...googleBusy, ...firestoreBusy];
  const availableSlots: ConsultingAvailableSlot[] = [];

  let currentDate = startDate;

  while (isBefore(currentDate, queryEnd)) {
    const dayOfWeek = currentDate.getDay(); // 0 (Sun) - 6 (Sat)
    const daySchedules = DEFAULT_WEEKLY_AVAILABILITY[dayOfWeek] || [];

    for (const sched of daySchedules) {
      const [startH, startM] = sched.start.split(":").map(Number);
      const [endH, endM] = sched.end.split(":").map(Number);

      let slotStart = setMilliseconds(
        setSeconds(setMinutes(setHours(currentDate, startH), startM), 0),
        0
      );

      const blockEnd = setMilliseconds(
        setSeconds(setMinutes(setHours(currentDate, endH), endM), 0),
        0
      );

      while (true) {
        const slotEnd = addMinutes(slotStart, durationMinutes);

        if (isAfter(slotEnd, blockEnd)) {
          break; // Exceeds the available block for this day
        }

        // Validate min notice and max advance limits
        if (isAfter(slotStart, minNoticeTime) && isBefore(slotStart, maxBookingTime)) {
          const slotInterval: TimeInterval = { start: slotStart, end: slotEnd };

          // Check if it overlaps with any busy period (accounting for buffer)
          const isBusy = allBusy.some((busy) =>
            intervalsOverlap(slotInterval, busy, CONSULTING_CONFIG.bufferBetweenSessionsMinutes)
          );

          if (!isBusy) {
            availableSlots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
            });
          }
        }

        // Advance by step minutes
        slotStart = addMinutes(slotStart, CONSULTING_CONFIG.slotDurationStepMinutes);
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return availableSlots;
}
