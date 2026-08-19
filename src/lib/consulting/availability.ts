import { db } from "@/lib/firebaseAdmin";
import { getOAuthClient, decryptToken, isCalendarConfigured } from "@/lib/google-calendar";
import { CONSULTING_CONFIG, DEFAULT_WEEKLY_AVAILABILITY } from "./constants";
import { ConsultingAvailableSlot } from "@/types/consulting";
import { addDays, addMinutes, format, isAfter, isBefore, parseISO } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { google } from "googleapis";
import { createLogger } from "@/lib/logger";

const logger = createLogger("consulting-availability");

interface TimeInterval {
  start: Date;
  end: Date;
}

interface AppointmentBlock extends TimeInterval {
  summary: string;
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
 * Fetch and categorize all Google Calendar events into:
 * 1. appointmentBlocks: explicit bookable appointment schedules / date overrides (e.g. "1:1 with Ahsan")
 * 2. busyTimes: actual meetings/events to subtract from availability
 */
async function fetchGoogleCalendarData(
  timeMin: Date,
  timeMax: Date
): Promise<{ appointmentBlocks: AppointmentBlock[]; busyTimes: TimeInterval[] }> {
  const oauthClient = await getAdminOAuthClient();
  if (!oauthClient) return { appointmentBlocks: [], busyTimes: [] };

  const appointmentBlocks: AppointmentBlock[] = [];
  const busyTimes: TimeInterval[] = [];

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
    logger.info("Google Calendar Raw Events Retrieved", { totalEvents: items.length });

    for (const item of items) {
      const summary = (item.summary || "").trim();
      const summaryLower = summary.toLowerCase();
      const descriptionLower = (item.description || "").toLowerCase();

      // Check if event is an appointment slot or date override created by Ahsan
      const isAppointment =
        summaryLower.includes("1:1 with ahsan") ||
        summaryLower.includes("30 min bookable") ||
        summaryLower.includes("bookable appointment") ||
        descriptionLower.includes("bookable appointment") ||
        item.eventType === "workingHours";

      if (isAppointment) {
        if (item.start?.dateTime && item.end?.dateTime) {
          const start = new Date(item.start.dateTime);
          const end = new Date(item.end.dateTime);
          appointmentBlocks.push({ start, end, summary });
          logger.info("Google Calendar -> APPOINTMENT_OVERRIDE", {
            summary,
            start: item.start.dateTime,
            end: item.end.dateTime,
          });
        }
      } else {
        // Real busy event (meeting, personal event, etc.)
        if (item.transparency === "transparent") {
          logger.info("Google Calendar -> TRANSPARENT_IGNORED", {
            summary: summary || "(transparent)",
          });
          continue;
        }

        if (item.start?.dateTime && item.end?.dateTime) {
          busyTimes.push({
            start: new Date(item.start.dateTime),
            end: new Date(item.end.dateTime),
          });
          logger.info("Google Calendar -> BUSY_CONFLICT", {
            summary: summary || "(busy)",
            start: item.start.dateTime,
            end: item.end.dateTime,
          });
        } else if (item.start?.date && item.end?.date) {
          busyTimes.push({
            start: new Date(item.start.date),
            end: new Date(item.end.date),
          });
          logger.info("Google Calendar -> ALL_DAY_BUSY", {
            summary: summary || "(all-day busy)",
            start: item.start.date,
            end: item.end.date,
          });
        }
      }
    }
  } catch (error) {
    logger.error("Error querying Google Calendar events", { error });
  }

  return { appointmentBlocks, busyTimes };
}

/**
 * Fetch busy periods from Firestore (both confirmed bookings & active pending checkout locks).
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
        logger.info("Firestore Busy -> CONFIRMED_CONSULTING_BOOKING", {
          id: doc.id,
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        });
      } else if (status === "pending_payment" && expiresAt && isAfter(expiresAt, now)) {
        busyTimes.push({ start: startTime, end: endTime });
        logger.info("Firestore Busy -> ACTIVE_PENDING_CHECKOUT_LOCK", {
          id: doc.id,
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          expiresAt: expiresAt.toISOString(),
        });
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
      logger.info("Firestore Busy -> CONFIRMED_MENTORSHIP_BOOKING", {
        id: doc.id,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      });
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
    if (!data.availability || typeof data.availability !== "object") return null;

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

    for (const [key, slots] of Object.entries(data.availability)) {
      const dayNum = dayMap[key.toLowerCase()] ?? Number(key);
      if (isNaN(dayNum) || !Array.isArray(slots) || slots.length === 0) continue;

      // Check if slots contains time range objects: [{ start: "14:30", end: "18:30" }]
      const objectSlots = slots.filter(
        (s: unknown): s is { start: string; end: string } =>
          typeof s === "object" &&
          s !== null &&
          "start" in s &&
          "end" in s &&
          typeof (s as { start: unknown }).start === "string" &&
          typeof (s as { end: unknown }).end === "string"
      );

      if (objectSlots.length > 0) {
        schedule[dayNum] = objectSlots.map((s) => ({
          start: s.start,
          end: s.end,
        }));
      } else if (slots.includes("flexible") || slots.some((s) => typeof s === "string")) {
        // Mentor profile has active day with tag like "flexible" -> use default working hours for that day
        schedule[dayNum] = DEFAULT_WEEKLY_AVAILABILITY[dayNum] || [
          { start: "14:30", end: "18:30" },
        ];
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

  // 1. Fetch Google Calendar events (categorized into appointment overrides and real busy conflicts) & Firestore bookings
  const [{ appointmentBlocks, busyTimes }, firestoreBusy, customSchedule] = await Promise.all([
    fetchGoogleCalendarData(queryStart, queryEnd),
    fetchFirestoreBusyTimes(queryStart, queryEnd),
    getProfileWeeklyAvailability(),
  ]);

  const weeklySchedule = customSchedule || DEFAULT_WEEKLY_AVAILABILITY;
  const allBusy = [...busyTimes, ...firestoreBusy];
  const candidateSlotsMap = new Map<string, { start: Date; end: Date }>();
  const adminTz = CONSULTING_CONFIG.adminTimezone || "Europe/Stockholm";

  // 2. Generate candidate slots from explicit Google Calendar Appointment Blocks / Date Overrides (e.g. 9am Friday, 10am Thursday)
  for (const block of appointmentBlocks) {
    let slotStart = block.start;
    while (true) {
      const slotEnd = addMinutes(slotStart, durationMinutes);
      if (isAfter(slotEnd, block.end)) break;

      const key = slotStart.toISOString();
      if (!candidateSlotsMap.has(key)) {
        candidateSlotsMap.set(key, { start: slotStart, end: slotEnd });
      }
      slotStart = addMinutes(slotStart, CONSULTING_CONFIG.slotDurationStepMinutes);
    }
  }

  // 3. Generate candidate slots from recurring Weekly Schedule (e.g. Mon, Wed, Thu 2:30 PM - 6:30 PM Stockholm)
  let currentDate = startDate;
  while (isBefore(currentDate, queryEnd)) {
    const dayOfWeek = currentDate.getDay();
    const daySchedules = weeklySchedule[dayOfWeek] || [];
    const dateStr = format(currentDate, "yyyy-MM-dd");

    for (const sched of daySchedules) {
      let slotStart = fromZonedTime(`${dateStr}T${sched.start}:00`, adminTz);
      const blockEnd = fromZonedTime(`${dateStr}T${sched.end}:00`, adminTz);

      while (true) {
        const slotEnd = addMinutes(slotStart, durationMinutes);
        if (isAfter(slotEnd, blockEnd)) break;

        const key = slotStart.toISOString();
        if (!candidateSlotsMap.has(key)) {
          candidateSlotsMap.set(key, { start: slotStart, end: slotEnd });
        }
        slotStart = addMinutes(slotStart, CONSULTING_CONFIG.slotDurationStepMinutes);
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  // 4. Filter candidate slots against advance notice, max booking limit, and all busy periods (Google + Firestore)
  const availableSlots: ConsultingAvailableSlot[] = [];

  for (const candidate of candidateSlotsMap.values()) {
    if (isAfter(candidate.start, minNoticeTime) && isBefore(candidate.start, maxBookingTime)) {
      const isBusy = allBusy.some((busy) =>
        intervalsOverlap(candidate, busy, CONSULTING_CONFIG.bufferBetweenSessionsMinutes)
      );

      if (!isBusy) {
        availableSlots.push({
          start: candidate.start.toISOString(),
          end: candidate.end.toISOString(),
        });
      }
    }
  }

  // Sort chronologically
  availableSlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  logger.info("Generated Available Consulting Slots", {
    totalSlots: availableSlots.length,
    durationMinutes,
    slots: availableSlots.map((s) => ({
      start: s.start,
      end: s.end,
      stockholmStart: format(fromZonedTime(s.start, "UTC"), "yyyy-MM-dd HH:mm"),
    })),
  });

  return availableSlots;
}
