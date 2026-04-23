import { describe, it, expect } from "vitest";
import { getDeadlineUTC, getAmbassadorMonthKey, getCurrentMonthKey } from "./reportDeadline";

describe("getDeadlineUTC", () => {
  it("returns 2026-04-30 23:59:59.999 UTC for April 2026 in UTC", () => {
    const ms = getDeadlineUTC(2026, 4, "UTC");
    const d = new Date(ms);
    expect(d.toISOString()).toBe("2026-04-30T23:59:59.999Z");
  });

  it("returns earlier UTC instant for Asia/Karachi (UTC+5) than UTC", () => {
    const utc = getDeadlineUTC(2026, 4, "UTC");
    const karachi = getDeadlineUTC(2026, 4, "Asia/Karachi");
    // Karachi "end of April" arrives 5 hours earlier in UTC terms
    expect(karachi).toBeLessThan(utc);
    expect(utc - karachi).toBe(5 * 60 * 60 * 1000);
  });

  it("handles non-leap February correctly (2026)", () => {
    const ms = getDeadlineUTC(2026, 2, "UTC");
    const d = new Date(ms);
    expect(d.toISOString()).toBe("2026-02-28T23:59:59.999Z");
  });

  it("handles leap February correctly (2024)", () => {
    const ms = getDeadlineUTC(2024, 2, "UTC");
    const d = new Date(ms);
    expect(d.toISOString()).toBe("2024-02-29T23:59:59.999Z");
  });

  it("handles 31-day December", () => {
    const ms = getDeadlineUTC(2026, 12, "UTC");
    const d = new Date(ms);
    expect(d.toISOString()).toBe("2026-12-31T23:59:59.999Z");
  });
});

describe("getAmbassadorMonthKey", () => {
  it("returns previous month for mid-month UTC clock", () => {
    const now = new Date("2026-05-03T10:00:00Z");
    expect(getAmbassadorMonthKey("UTC", now)).toBe("2026-04");
  });

  it("wraps January to previous December", () => {
    const now = new Date("2026-01-05T10:00:00Z");
    expect(getAmbassadorMonthKey("UTC", now)).toBe("2025-12");
  });

  it("respects timezone shift — Karachi user on May 1 06:00 UTC sees previous month as April", () => {
    const now = new Date("2026-05-01T06:00:00Z"); // May 1 11:00 Karachi
    expect(getAmbassadorMonthKey("Asia/Karachi", now)).toBe("2026-04");
  });
});

describe("getCurrentMonthKey", () => {
  it("returns current month in UTC", () => {
    const now = new Date("2026-04-15T10:00:00Z");
    expect(getCurrentMonthKey("UTC", now)).toBe("2026-04");
  });

  it("respects timezone crossing midnight into next month", () => {
    // April 30 20:00 UTC == May 1 01:00 Karachi
    const now = new Date("2026-04-30T20:00:00Z");
    expect(getCurrentMonthKey("Asia/Karachi", now)).toBe("2026-05");
  });

  it("respects timezone crossing backward into previous month", () => {
    // May 1 02:00 UTC == April 30 19:00 Los Angeles (UTC-7 in April, DST)
    const now = new Date("2026-05-01T02:00:00Z");
    expect(getCurrentMonthKey("America/Los_Angeles", now)).toBe("2026-04");
  });
});
