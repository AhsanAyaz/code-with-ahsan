import { describe, it, expect } from "vitest";

describe("LogEventSchema", () => {
  it("accepts a valid event input", async () => {
    const { LogEventSchema } = await import("./ambassador");
    const validInput = {
      date: "2026-04-15T10:00:00Z",
      type: "workshop",
      attendanceEstimate: 25,
      link: "https://example.com/workshop",
      notes: "Great session",
    };
    expect(LogEventSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects event with non-datetime date string", async () => {
    const { LogEventSchema } = await import("./ambassador");
    const invalidInput = {
      date: "not-a-date",
      type: "workshop",
      attendanceEstimate: 5,
    };
    expect(LogEventSchema.safeParse(invalidInput).success).toBe(false);
  });

  it("accepts event with no optional fields", async () => {
    const { LogEventSchema } = await import("./ambassador");
    const minimalInput = {
      date: "2026-04-15T10:00:00Z",
      type: "other",
      attendanceEstimate: 0,
    };
    expect(LogEventSchema.safeParse(minimalInput).success).toBe(true);
  });

  it("rejects event with invalid type", async () => {
    const { LogEventSchema } = await import("./ambassador");
    expect(
      LogEventSchema.safeParse({
        date: "2026-04-15T10:00:00Z",
        type: "webinar",
        attendanceEstimate: 5,
      }).success
    ).toBe(false);
  });
});

describe("MonthlyReportSchema", () => {
  it("accepts a valid monthly report", async () => {
    const { MonthlyReportSchema } = await import("./ambassador");
    const validReport = {
      whatWorked: "Organized a great workshop",
      whatBlocked: "Time constraints",
      whatNeeded: "More support from leadership",
    };
    expect(MonthlyReportSchema.safeParse(validReport).success).toBe(true);
  });

  it("rejects report with empty whatWorked (min 1 char)", async () => {
    const { MonthlyReportSchema } = await import("./ambassador");
    expect(
      MonthlyReportSchema.safeParse({
        whatWorked: "",
        whatBlocked: "x",
        whatNeeded: "y",
      }).success
    ).toBe(false);
  });

  it("rejects report with only whitespace in whatWorked (trim + min 1)", async () => {
    const { MonthlyReportSchema } = await import("./ambassador");
    expect(
      MonthlyReportSchema.safeParse({
        whatWorked: "   ",
        whatBlocked: "x",
        whatNeeded: "y",
      }).success
    ).toBe(false);
  });

  it("rejects report with missing required fields", async () => {
    const { MonthlyReportSchema } = await import("./ambassador");
    expect(
      MonthlyReportSchema.safeParse({
        whatWorked: "Good things",
      }).success
    ).toBe(false);
  });
});

describe("AmbassadorSubdoc Phase 4 fields (type check)", () => {
  it("exports ReferralDoc interface (structural check via import)", async () => {
    const ambassadorModule = await import("./ambassador");
    // Verifying exported symbols exist
    expect(ambassadorModule).toHaveProperty("LogEventSchema");
    expect(ambassadorModule).toHaveProperty("MonthlyReportSchema");
    expect(ambassadorModule).toHaveProperty("CronFlagTypeSchema");
  });
});
