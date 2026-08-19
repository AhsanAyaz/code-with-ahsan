import { describe, it, expect } from "vitest";
import { CreateCheckoutSchema } from "@/types/consulting";
import {
  CONSULTING_PACKAGES,
  DEFAULT_WEEKLY_AVAILABILITY,
  CONSULTING_CONFIG,
} from "@/lib/consulting/constants";

describe("Consulting Schemas & Configuration", () => {
  it("validates valid checkout requests", () => {
    const validData = {
      packageId: "architecture-review",
      startTime: "2026-09-01T14:00:00.000Z",
      endTime: "2026-09-01T15:00:00.000Z",
      timezone: "America/New_York",
      clientName: "Jane Doe",
      clientEmail: "jane@example.com",
      clientNotes: "Discussing Angular microfrontends",
      githubOrLinkedinUrl: "https://github.com/janedoe",
    };

    const result = CreateCheckoutSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("fails on invalid email", () => {
    const invalidData = {
      packageId: "rapid-guidance",
      startTime: "2026-09-01T14:00:00.000Z",
      endTime: "2026-09-01T14:30:00.000Z",
      timezone: "UTC",
      clientName: "Jane Doe",
      clientEmail: "not-an-email",
    };

    const result = CreateCheckoutSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("fails when required fields are missing", () => {
    const missingData = {
      packageId: "rapid-guidance",
      clientEmail: "jane@example.com",
    };

    const result = CreateCheckoutSchema.safeParse(missingData);
    expect(result.success).toBe(false);
  });

  it("contains valid package definitions with non-zero prices", () => {
    expect(CONSULTING_PACKAGES.length).toBeGreaterThanOrEqual(3);
    for (const pkg of CONSULTING_PACKAGES) {
      expect(pkg.id).toBeTruthy();
      expect(pkg.name).toBeTruthy();
      expect(pkg.durationMinutes).toBeGreaterThan(0);
      expect(pkg.priceInCents).toBeGreaterThan(0);
      expect(pkg.currency).toBe("usd");
      expect(pkg.features.length).toBeGreaterThan(0);
    }
  });

  it("has default weekly availability configured", () => {
    expect(DEFAULT_WEEKLY_AVAILABILITY).toBeDefined();
    // Check Monday
    expect(DEFAULT_WEEKLY_AVAILABILITY[1].length).toBeGreaterThan(0);
    expect(CONSULTING_CONFIG.bufferBetweenSessionsMinutes).toBe(15);
  });
});
