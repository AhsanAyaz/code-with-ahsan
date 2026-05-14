/**
 * Phase 4: Timezone-aware month deadline math for the monthly-report cron (REPORT-04)
 * and DM reminders (REPORT-05).
 *
 * Uses date-fns-tz v3.2.0 (already in package.json) rather than hand-rolling Intl math —
 * RESEARCH §Don't Hand-Roll flags "last day of month + IANA timezone" as a zone that is
 * simple in theory but easy to mis-DST in practice.
 */
import { toZonedTime, fromZonedTime } from "date-fns-tz";

/**
 * Returns the UTC milliseconds of the final millisecond of the given calendar month
 * in the given IANA timezone. i.e. "last day of month, 23:59:59.999 local time".
 *
 * @param year Full year (e.g. 2026)
 * @param month 1-indexed month (1 = January, 12 = December)
 * @param timezone IANA timezone (e.g. "Asia/Karachi"). Defaults to "UTC" at the call site.
 */
export function getDeadlineUTC(year: number, month: number, timezone: string): number {
  // "day 0 of next month" == "last day of this month". JS Date handles month overflow.
  // We want 23:59:59.999 LOCAL TIME in the target zone, then convert to UTC.
  const lastDayZero = new Date(Date.UTC(year, month, 0)); // UTC date equal to last day of `month`
  const lastDayNumber = lastDayZero.getUTCDate(); // e.g. 30 for April, 29 for Feb 2024

  // Build a Date that REPRESENTS the local wall-clock time in the target zone,
  // then fromZonedTime converts that wall-clock to the equivalent UTC instant.
  const yyyy = year.toString().padStart(4, "0");
  const mm = month.toString().padStart(2, "0");
  const dd = lastDayNumber.toString().padStart(2, "0");
  const wallClockIso = `${yyyy}-${mm}-${dd}T23:59:59.999`;
  const utcInstant = fromZonedTime(wallClockIso, timezone);
  return utcInstant.getTime();
}

/**
 * Returns the "YYYY-MM" string for the PREVIOUS calendar month in the ambassador's
 * timezone — this is what the daily cron flags against (REPORT-04).
 *
 * Example: now=2026-05-03 in timezone "UTC" → "2026-04" (April, the month whose
 * deadline has just passed).
 *
 * @param timezone IANA timezone
 * @param now Clock injection point (defaults to current time)
 */
export function getAmbassadorMonthKey(timezone: string, now: Date = new Date()): string {
  const zoned = toZonedTime(now, timezone);
  const year = zoned.getFullYear();
  const month = zoned.getMonth() + 1; // 1-indexed
  // Previous month, wrapping to December of previous year if needed.
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear.toString().padStart(4, "0")}-${prevMonth.toString().padStart(2, "0")}`;
}

/**
 * Returns the "YYYY-MM" string for the CURRENT calendar month in the ambassador's
 * timezone — used by the report-submit handler to compute the doc id
 * `${uid}_${YYYY-MM}` (REPORT-02).
 */
export function getCurrentMonthKey(timezone: string, now: Date = new Date()): string {
  const zoned = toZonedTime(now, timezone);
  const year = zoned.getFullYear();
  const month = zoned.getMonth() + 1;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}`;
}
