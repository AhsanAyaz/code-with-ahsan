/**
 * Google Calendar Integration Library
 *
 * Handles:
 * - OAuth 2.0 authentication flow
 * - Secure token storage with AES-256-GCM encryption
 * - Calendar event creation with Google Meet conferencing
 * - Calendar event deletion with attendee notifications
 * - Automatic token refresh
 */

import { google } from "googleapis";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { db } from "@/lib/firebaseAdmin";
import { createLogger } from "@/lib/logger";

const logger = createLogger("google-calendar");
const ALGORITHM = "aes-256-gcm";

/**
 * Check if Google Calendar integration is configured.
 * Returns false if required environment variables are missing.
 */
export function isCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Create an OAuth2 client for Google Calendar API.
 */
export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate OAuth authorization URL for a mentor.
 * The mentorId is passed via the state parameter.
 */
export function getAuthUrl(mentorId: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Force consent to always get refresh_token
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state: mentorId, // Pass mentorId through OAuth flow
  });
}

/**
 * Exchange OAuth authorization code for access/refresh tokens.
 */
export async function exchangeCodeForTokens(code: string) {
  const client = getOAuthClient();
  try {
    const { tokens } = await client.getToken(code);
    logger.info("Successfully exchanged code for tokens", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
    });
    return tokens;
  } catch (error) {
    logger.error("Failed to exchange code for tokens", { error });
    throw error;
  }
}

/**
 * Encrypt a token using AES-256-GCM.
 * Returns format: iv:authTag:encryptedData
 */
export function encryptToken(token: string): string {
  const key = Buffer.from(
    process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY || "",
    "hex"
  );
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a token encrypted with encryptToken.
 */
export function decryptToken(encryptedData: string): string {
  const key = Buffer.from(
    process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY || "",
    "hex"
  );
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Get an authenticated calendar client for a mentor.
 * Returns null if the mentor hasn't connected their Google Calendar.
 */
export async function getMentorCalendarClient(mentorId: string) {
  try {
    const profileQuery = await db
      .collection("mentorship_profiles")
      .where("uid", "==", mentorId)
      .limit(1)
      .get();

    if (profileQuery.empty) {
      logger.warn("Mentor profile not found", { mentorId });
      throw new Error("Mentor profile not found");
    }

    const profile = profileQuery.docs[0].data();
    if (!profile.googleCalendarRefreshToken) {
      logger.info("Mentor has not connected Google Calendar", { mentorId });
      return null; // Calendar not connected
    }

    const client = getOAuthClient();
    const refreshToken = decryptToken(profile.googleCalendarRefreshToken);
    client.setCredentials({ refresh_token: refreshToken });

    // Listen for token refresh and update stored token
    client.on("tokens", async (tokens) => {
      if (tokens.refresh_token) {
        try {
          await profileQuery.docs[0].ref.update({
            googleCalendarRefreshToken: encryptToken(tokens.refresh_token),
          });
          logger.info("Updated refresh token after auto-refresh", { mentorId });
        } catch (error) {
          logger.error("Failed to update refresh token", { mentorId, error });
        }
      }
    });

    return client;
  } catch (error) {
    logger.error("Failed to get mentor calendar client", { mentorId, error });
    throw error;
  }
}

/**
 * Create a calendar event for a booking with Google Meet conferencing.
 * Returns the Google Calendar event ID, or null if calendar not connected.
 */
export async function createCalendarEvent(
  mentorId: string,
  booking: {
    id: string;
    startTime: Date;
    endTime: Date;
    timezone: string;
    menteeName: string;
    menteeEmail?: string;
  }
): Promise<string | null> {
  try {
    const authClient = await getMentorCalendarClient(mentorId);
    if (!authClient) {
      logger.info("Cannot create calendar event - calendar not connected", {
        mentorId,
        bookingId: booking.id,
      });
      return null;
    }

    const calendar = google.calendar({ version: "v3", auth: authClient });

    const event = {
      summary: `Mentorship Session with ${booking.menteeName}`,
      description: `Mentorship session booked via Code with Ahsan platform.\n\nBooking ID: ${booking.id}`,
      start: {
        dateTime: booking.startTime.toISOString(),
        timeZone: booking.timezone,
      },
      end: {
        dateTime: booking.endTime.toISOString(),
        timeZone: booking.timezone,
      },
      attendees: booking.menteeEmail ? [{ email: booking.menteeEmail }] : [],
      conferenceData: {
        createRequest: {
          requestId: `booking-${booking.id}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: event,
      sendUpdates: "all",
    });

    logger.info("Created calendar event", {
      mentorId,
      bookingId: booking.id,
      eventId: response.data.id,
    });

    return response.data.id || null;
  } catch (error) {
    logger.error("Failed to create calendar event", {
      mentorId,
      bookingId: booking.id,
      error,
    });
    throw error;
  }
}

/**
 * Delete a calendar event and send cancellation notifications to attendees.
 * Returns true if successful, false if calendar not connected.
 */
export async function deleteCalendarEvent(
  mentorId: string,
  eventId: string
): Promise<boolean> {
  try {
    const authClient = await getMentorCalendarClient(mentorId);
    if (!authClient) {
      logger.info("Cannot delete calendar event - calendar not connected", {
        mentorId,
        eventId,
      });
      return false;
    }

    const calendar = google.calendar({ version: "v3", auth: authClient });

    await calendar.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all", // Send cancellation emails to attendees
    });

    logger.info("Deleted calendar event", {
      mentorId,
      eventId,
    });

    return true;
  } catch (error) {
    logger.error("Failed to delete calendar event", {
      mentorId,
      eventId,
      error,
    });
    throw error;
  }
}
