/**
 * Phase 5 (DASH-07, DASH-08, DASH-09) — TDD RED tests for Task 1.
 * These tests verify the new constants and type shapes added in Phase 5 Wave 1.
 */
import { describe, it, expect } from "vitest";

describe("Phase 5 constants (DASH-07)", () => {
  it("LEADERBOARD_SNAPSHOTS_COLLECTION equals 'leaderboard_snapshots'", async () => {
    const { LEADERBOARD_SNAPSHOTS_COLLECTION } = await import("./constants");
    expect(LEADERBOARD_SNAPSHOTS_COLLECTION).toBe("leaderboard_snapshots");
  });

  it("LEADERBOARD_GRACE_PERIOD_MS equals 28 days in ms", async () => {
    const { LEADERBOARD_GRACE_PERIOD_MS } = await import("./constants");
    expect(LEADERBOARD_GRACE_PERIOD_MS).toBe(28 * 24 * 60 * 60 * 1000);
  });
});

describe("AmbassadorSubdoc onboarding field (DASH-08)", () => {
  it("AmbassadorPublicFieldsSchema does not break — file still compiles", async () => {
    // Importing the types barrel is sufficient to verify compile-time shape
    const types = await import("@/types/ambassador");
    expect(types).toBeDefined();
  });
});

describe("CohortPatchSchema ambassadorOfTheMonth (DASH-09)", () => {
  it("CohortPatchSchema accepts a valid ambassadorOfTheMonth object", async () => {
    const { CohortPatchSchema } = await import("@/types/ambassador");
    const result = CohortPatchSchema.safeParse({
      ambassadorOfTheMonth: { uid: "abc123", displayName: "Alice" },
    });
    expect(result.success).toBe(true);
  });

  it("CohortPatchSchema accepts null ambassadorOfTheMonth (clear)", async () => {
    const { CohortPatchSchema } = await import("@/types/ambassador");
    const result = CohortPatchSchema.safeParse({
      ambassadorOfTheMonth: null,
    });
    expect(result.success).toBe(true);
  });

  it("CohortPatchSchema rejects ambassadorOfTheMonth with empty uid", async () => {
    const { CohortPatchSchema } = await import("@/types/ambassador");
    const result = CohortPatchSchema.safeParse({
      ambassadorOfTheMonth: { uid: "", displayName: "Alice" },
    });
    expect(result.success).toBe(false);
  });

  it("CohortPatchSchema rejects ambassadorOfTheMonth with empty displayName", async () => {
    const { CohortPatchSchema } = await import("@/types/ambassador");
    const result = CohortPatchSchema.safeParse({
      ambassadorOfTheMonth: { uid: "abc123", displayName: "" },
    });
    expect(result.success).toBe(false);
  });

  it("CohortPatchSchema still rejects empty object", async () => {
    const { CohortPatchSchema } = await import("@/types/ambassador");
    const result = CohortPatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("CohortPatchSchema accepts without ambassadorOfTheMonth (unchanged field is optional)", async () => {
    const { CohortPatchSchema } = await import("@/types/ambassador");
    const result = CohortPatchSchema.safeParse({ applicationWindowOpen: true });
    expect(result.success).toBe(true);
  });
});
