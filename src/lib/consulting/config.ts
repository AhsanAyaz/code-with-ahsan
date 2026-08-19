import { db } from "@/lib/firebaseAdmin";
import { CONSULTING_CONFIG, DEFAULT_WEEKLY_AVAILABILITY, CONSULTING_PACKAGES } from "./constants";
import { ConsultingPackage } from "@/types/consulting";
import { createLogger } from "@/lib/logger";

const logger = createLogger("consulting-config");

export interface ConsultingSettings {
  adminEmail: string;
  adminName: string;
  adminTimezone: string;
  weeklyAvailability: Record<number, { start: string; end: string }[]>;
  slotDurationStepMinutes: number;
  bufferBetweenSessionsMinutes: number;
  minBookingNoticeHours: number;
  maxBookingDaysInAdvance: number;
  slotLockExpirationMinutes: number;
  packages: ConsultingPackage[];
  updatedAt?: string;
}

export const DEFAULT_CONSULTING_SETTINGS: ConsultingSettings = {
  adminEmail: CONSULTING_CONFIG.adminEmail,
  adminName: CONSULTING_CONFIG.adminName,
  adminTimezone: CONSULTING_CONFIG.adminTimezone,
  weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
  slotDurationStepMinutes: CONSULTING_CONFIG.slotDurationStepMinutes,
  bufferBetweenSessionsMinutes: CONSULTING_CONFIG.bufferBetweenSessionsMinutes,
  minBookingNoticeHours: CONSULTING_CONFIG.minBookingNoticeHours,
  maxBookingDaysInAdvance: CONSULTING_CONFIG.maxBookingDaysInAdvance,
  slotLockExpirationMinutes: CONSULTING_CONFIG.slotLockExpirationMinutes,
  packages: CONSULTING_PACKAGES,
};

/**
 * Fetch dynamic consulting settings from Firestore (config/consulting).
 * Falls back to default constants if document is not set up yet.
 */
export async function getConsultingSettings(): Promise<ConsultingSettings> {
  try {
    const docSnap = await db.collection("config").doc("consulting").get();

    if (!docSnap.exists) {
      return DEFAULT_CONSULTING_SETTINGS;
    }

    const data = docSnap.data();
    if (!data) return DEFAULT_CONSULTING_SETTINGS;

    return {
      adminEmail: data.adminEmail || DEFAULT_CONSULTING_SETTINGS.adminEmail,
      adminName: data.adminName || DEFAULT_CONSULTING_SETTINGS.adminName,
      adminTimezone: data.adminTimezone || DEFAULT_CONSULTING_SETTINGS.adminTimezone,
      weeklyAvailability: data.weeklyAvailability || DEFAULT_CONSULTING_SETTINGS.weeklyAvailability,
      slotDurationStepMinutes:
        typeof data.slotDurationStepMinutes === "number"
          ? data.slotDurationStepMinutes
          : DEFAULT_CONSULTING_SETTINGS.slotDurationStepMinutes,
      bufferBetweenSessionsMinutes:
        typeof data.bufferBetweenSessionsMinutes === "number"
          ? data.bufferBetweenSessionsMinutes
          : DEFAULT_CONSULTING_SETTINGS.bufferBetweenSessionsMinutes,
      minBookingNoticeHours:
        typeof data.minBookingNoticeHours === "number"
          ? data.minBookingNoticeHours
          : DEFAULT_CONSULTING_SETTINGS.minBookingNoticeHours,
      maxBookingDaysInAdvance:
        typeof data.maxBookingDaysInAdvance === "number"
          ? data.maxBookingDaysInAdvance
          : DEFAULT_CONSULTING_SETTINGS.maxBookingDaysInAdvance,
      slotLockExpirationMinutes:
        typeof data.slotLockExpirationMinutes === "number"
          ? data.slotLockExpirationMinutes
          : DEFAULT_CONSULTING_SETTINGS.slotLockExpirationMinutes,
      packages:
        Array.isArray(data.packages) && data.packages.length > 0
          ? data.packages
          : DEFAULT_CONSULTING_SETTINGS.packages,
      updatedAt: data.updatedAt || undefined,
    };
  } catch (error) {
    logger.warn("Could not read dynamic consulting config, using defaults", { error });
    return DEFAULT_CONSULTING_SETTINGS;
  }
}
