import { describe, it, expect } from "vitest";
import {
  ApplicationSubmitSchema,
  CohortCreateSchema,
  ApplicationReviewSchema,
} from "@/types/ambassador";

const validApplication = {
  applicantName: "Jane Doe",
  university: "Test University",
  yearOfStudy: "3",
  country: "PK",
  city: "Karachi",
  discordHandle: "jane#1234",
  motivation: "x".repeat(60),
  experience: "x".repeat(60),
  pitch: "x".repeat(60),
  videoUrl: "https://loom.com/share/abc",
  targetCohortId: "cohort-1",
  academicVerificationPath: "email" as const,
  academicEmail: "jane@test.edu",
};

describe("ApplicationSubmitSchema", () => {
  it("accepts a valid email-path submission", () => {
    expect(ApplicationSubmitSchema.safeParse(validApplication).success).toBe(true);
  });

  it("rejects missing motivation", () => {
    const { motivation, ...rest } = validApplication;
    void motivation;
    expect(ApplicationSubmitSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects motivation shorter than 50 chars", () => {
    expect(
      ApplicationSubmitSchema.safeParse({ ...validApplication, motivation: "short" }).success
    ).toBe(false);
  });

  it("rejects path=email with no academicEmail", () => {
    const { academicEmail, ...rest } = validApplication;
    void academicEmail;
    expect(ApplicationSubmitSchema.safeParse(rest).success).toBe(false);
  });

  it("accepts path=student_id with studentIdStoragePath", () => {
    const { academicEmail, ...rest } = validApplication;
    void academicEmail;
    const input = {
      ...rest,
      academicVerificationPath: "student_id" as const,
      studentIdStoragePath: "applications/uid/app/student_id.jpg",
    };
    expect(ApplicationSubmitSchema.safeParse(input).success).toBe(true);
  });

  it("rejects path=student_id with no studentIdStoragePath", () => {
    const { academicEmail, ...rest } = validApplication;
    void academicEmail;
    expect(
      ApplicationSubmitSchema.safeParse({ ...rest, academicVerificationPath: "student_id" as const })
        .success
    ).toBe(false);
  });
});

describe("CohortCreateSchema", () => {
  const valid = {
    name: "Spring 2026",
    startDate: "2026-05-01T00:00:00+00:00",
    endDate: "2026-08-01T00:00:00+00:00",
    maxSize: 25,
    status: "upcoming" as const,
  };

  it("accepts a valid cohort", () => {
    expect(CohortCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects endDate equal to startDate", () => {
    expect(
      CohortCreateSchema.safeParse({ ...valid, endDate: valid.startDate }).success
    ).toBe(false);
  });

  it("rejects endDate before startDate", () => {
    expect(
      CohortCreateSchema.safeParse({
        ...valid,
        startDate: "2026-08-01T00:00:00+00:00",
        endDate: "2026-05-01T00:00:00+00:00",
      }).success
    ).toBe(false);
  });

  it("rejects maxSize = 0", () => {
    expect(CohortCreateSchema.safeParse({ ...valid, maxSize: 0 }).success).toBe(false);
  });

  it("rejects non-integer maxSize", () => {
    expect(CohortCreateSchema.safeParse({ ...valid, maxSize: 5.5 }).success).toBe(false);
  });
});

describe("ApplicationReviewSchema", () => {
  it("accepts accept with no notes", () => {
    expect(ApplicationReviewSchema.safeParse({ action: "accept" }).success).toBe(true);
  });

  it("accepts decline with notes", () => {
    expect(
      ApplicationReviewSchema.safeParse({ action: "decline", notes: "Not this round." })
        .success
    ).toBe(true);
  });

  it("rejects unknown action", () => {
    expect(ApplicationReviewSchema.safeParse({ action: "maybe" }).success).toBe(false);
  });
});
