import { db } from "@/lib/firebaseAdmin";
import { getOAuthClient, decryptToken, isCalendarConfigured } from "@/lib/google-calendar";
import { CONSULTING_CONFIG, DEFAULT_WEEKLY_AVAILABILITY } from "./constants";
import { ConsultingAvailableSlot } from "@/types/consulting";
import {
  addDays,
  addMinutes,
  isAfter,
  isBefore,
  parseISO,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";
import { google } from "googleapis";
import { createLogger } from "@/lib/logger";

const logger = createLogger("consulting-availability");

interface TimeInterval {
  start: Date;
  end: Date;
}

function intervalsOverlap(
  intervalA: TimeInterval,
  intervalB: TimeInterval,
  bufferMinutes: number
): boolean {
  const bufferedStartB = addMinutes(intervalB.start, -bufferMinutes);
  const bufferedEndB = addMinutes(intervalB.end, bufferMinutes);
  return isBefore(intervalA.start, bufferedEndB) && isAfter(intervalA.end, bufferedStartB);
}

/**
 * Fetch Google Calendar OAuth client for admin/mentor.
 */
async function getAdminOAuthClient() {
  if (!isCalendarConfigured()) return null;

  try {
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

    if (!refreshToken) return null;

    const oauthClient = getOAuthClient();
    oauthClient.setCredentials({ refresh_token: refreshToken });
    return oauthClient;
  } catch (error) {
    logger.error("Error getting admin OAuth client", { error });
    return null;
  }
}

/**
 * Directly fetch explicit appointment slots from Google Calendar events
 * titled "1:1 with Ahsan" or similar appointment schedule titles.
 */
async function fetchGoogleCalendarAppointmentSlots(
  timeMin: Date,
  timeMax: Date
): Promise<TimeInterval[]> {
  const oauthClient = await getAdminOAuthClient();
  if (!oauthClient) return [];

  const appointmentSlots: TimeInterval[] = [];

  try {
    const calendar = google.calendar({ version: "v3", auth: oauthClient });
    const eventsRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const items = eventsRes.data.items || [];
    for (const item of items) {
      const summary = (item.summary || "").toLowerCase();
      const description = (item.description || "").toLowerCase();

      // Match events created by Google Calendar Appointment Schedules or titled "1:1 with Ahsan"
      const isAppointmentSlot =
        summary.includes("1:1 with ahsan") ||
        summary.includes("bookable appointment") ||
        description.includes("bookable appointments") ||
        summary.includes("30 min bookable") ||
        item.eventType === "workingHours";

      if (isAppointmentSlot && item.start?.dateTime && item.end?.dateTime) {
        appointmentSlots.push({
          start: new Date(item.start.dateTime),
          end: new Date(item.end.dateTime),
        });
      }
    }

    logger.info("Fetched Google Calendar appointment slots", {
      count: appointmentSlots.length,
    });
  } catch (error) {
    logger.error("Error fetching Google Calendar appointment slots", { error });
  }

  return appointmentSlots;
}

/**
 * Fetch busy periods from Ahsan's Google Calendar using events.list
 * (matches the authorized calendar.events scope without throwing 403 freebusy errors).
 */
async function fetchGoogleCalendarBusyTimes(timeMin: Date, timeMax: Date): Promise<TimeInterval[]> {
  const oauthClient = await getAdminOAuthClient();
  if (!oauthClient) return [];

  try {
    const calendar = google.calendar({ version: "v3", auth: oauthClient });
    const eventsRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
    });

    const busyTimes: TimeInterval[] = [];
    const items = eventsRes.data.items || [];

    for (const item of items) {
      // Ignore transparent (free) events
      if (item.transparency === "transparent") continue;

      if (item.start?.dateTime && item.end?.dateTime) {
        busyTimes.push({
          start: new Date(item.start.dateTime),
          end: new Date(item.end.dateTime),
        });
      } else if (item.start?.date && item.end?.date) {
        // All-day events
        busyTimes.push({
          start: new Date(item.start.date),
          end: new Date(item.end.date),
        });
      }
    }

    return busyTimes;
  } catch (error) {
    logger.error("Error querying Google Calendar events for busy times", { error });
    return [];
  }
}

/**
 * Fetch busy periods from Firestore in memory to avoid index requirements.
 */
async function fetchFirestoreBusyTimes(timeMin: Date, timeMax: Date): Promise<TimeInterval[]> {
  const busyTimes: TimeInterval[] = [];
  const now = new Date();

  try {
    // 1. Consulting Bookings (try indexed query, fallback to full fetch)
    let consultingDocs;
    try {
      const indexedSnap = await db
        .collection("consulting_bookings")
        .where("startTime", ">=", timeMin)
        .where("startTime", "<=", timeMax)
        .get();
      consultingDocs = indexedSnap.docs;
    } catch {
      const fullSnap = await db.collection("consulting_bookings").get();
      consultingDocs = fullSnap.docs;
    }

    for (const doc of consultingDocs) {
      const data = doc.data();
      const status = data.status;
      if (!data.startTime || !data.endTime) continue;

      const startTime = data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime);
      const endTime = data.endTime?.toDate ? data.endTime.toDate() : new Date(data.endTime);
      const expiresAt = data.expiresAt?.toDate
        ? data.expiresAt.toDate()
        : data.expiresAt
          ? new Date(data.expiresAt)
          : null;

      if (endTime < timeMin || startTime > timeMax) continue;

      if (status === "confirmed") {
        busyTimes.push({ start: startTime, end: endTime });
      } else if (status === "pending_payment" && expiresAt && isAfter(expiresAt, now)) {
        busyTimes.push({ start: startTime, end: endTime });
      }
    }

    // 2. Mentorship Bookings (try indexed query, fallback to full fetch)
    let mentorshipDocs;
    try {
      const indexedMentorshipSnap = await db
        .collection("mentorship_bookings")
        .where("status", "==", "confirmed")
        .where("startTime", ">=", timeMin)
        .where("startTime", "<=", timeMax)
        .get();
      mentorshipDocs = indexedMentorshipSnap.docs;
    } catch {
      const fullMentorshipSnap = await db.collection("mentorship_bookings").get();
      mentorshipDocs = fullMentorshipSnap.docs;
    }

    for (const doc of mentorshipDocs) {
      const data = doc.data();
      if (data.status !== "confirmed" || !data.startTime || !data.endTime) continue;

      const startTime = data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime);
      const endTime = data.endTime?.toDate ? data.endTime.toDate() : new Date(data.endTime);

      if (endTime < timeMin || startTime > timeMax) continue;

      busyTimes.push({ start: startTime, end: endTime });
    }
  } catch (error) {
    logger.error("Error fetching Firestore busy times", { error });
  }

  return busyTimes;
}

/**
 * Get profile custom availability if configured.
 */
async function getProfileWeeklyAvailability(): Promise<Record<
  number,
  { start: string; end: string }[]
> | null> {
  try {
    const profileSnap = await db
      .collection("mentorship_profiles")
      .where("email", "==", CONSULTING_CONFIG.adminEmail)
      .limit(1)
      .get();

    if (profileSnap.empty) return null;
    const data = profileSnap.docs[0].data();
    if (!data.availability) return null;

    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const schedule: Record<number, { start: string; end: string }[]> = {};

    if (typeof data.availability === "object") {
      for (const [key, slots] of Object.entries(data.availability)) {
        const dayNum = dayMap[key.toLowerCase()] ?? Number(key);
        if (!isNaN(dayNum) && Array.isArray(slots)) {
          const validSlots = slots.filter(
            (s: unknown): s is { start: string; end: string } =>
              typeof s === "object" &&
              s !== null &&
              "start" in s &&
              "end" in s &&
              typeof (s as { start: unknown }).start === "string" &&
              typeof (s as { end: unknown }).end === "string"
          );
          schedule[dayNum] = validSlots.map((s) => ({
            start: s.start,
            end: s.end,
          }));
        }
      }
    }

    return Object.keys(schedule).length > 0 ? schedule : null;
  } catch (err) {
    logger.warn("Could not fetch profile availability, using defaults", { err });
    return null;
  }
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

  // 1. First, check if explicit "1:1 with Ahsan" Google Calendar Appointment Slots exist
  const explicitCalendarSlots = await fetchGoogleCalendarAppointmentSlots(queryStart, queryEnd);
  const firestoreBusy = await fetchFirestoreBusyTimes(queryStart, queryEnd);

  const availableSlots: ConsultingAvailableSlot[] = [];

  if (explicitCalendarSlots.length > 0) {
    logger.info("Using explicit Google Calendar appointment slots as master schedule", {
      count: explicitCalendarSlots.length,
    });

    for (const slot of explicitCalendarSlots) {
      if (isAfter(slot.start, minNoticeTime) && isBefore(slot.start, maxBookingTime)) {
        const isBusy = firestoreBusy.some((busy) =>
          intervalsOverlap(slot, busy, CONSULTING_CONFIG.bufferBetweenSessionsMinutes)
        );

        if (!isBusy) {
          availableSlots.push({
            start: slot.start.toISOString(),
            end: slot.end.toISOString(),
          });
        }
      }
    }

    return availableSlots;
  }

  // 2. Fallback to general schedule minus freebusy if no explicit "1:1 with Ahsan" event titles match
  const [googleBusy, customSchedule] = await Promise.all([
    fetchGoogleCalendarBusyTimes(queryStart, queryEnd),
    getProfileWeeklyAvailability(),
  ]);

  const weeklySchedule = customSchedule || DEFAULT_WEEKLY_AVAILABILITY;
  const allBusy = [...googleBusy, ...firestoreBusy];

  let currentDate = startDate;

  while (isBefore(currentDate, queryEnd)) {
    const dayOfWeek = currentDate.getDay();
    const daySchedules = weeklySchedule[dayOfWeek] || [];

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
          break;
        }

        if (isAfter(slotStart, minNoticeTime) && isBefore(slotStart, maxBookingTime)) {
          const slotInterval: TimeInterval = { start: slotStart, end: slotEnd };

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

        slotStart = addMinutes(slotStart, CONSULTING_CONFIG.slotDurationStepMinutes);
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return availableSlots;
}
