/**
 * Phase 5 (DASH-01, DASH-02) — auth gate + stats response shape.
 *
 * Mocking strategy:
 *   - vi.mock("@/lib/features") to control isAmbassadorProgramEnabled
 *   - vi.mock("@/lib/auth") to control verifyAuth
 *   - vi.mock("@/lib/permissions") to control hasRoleClaim
 *   - vi.mock("@/lib/firebaseAdmin") with a minimal db.collection chain
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/features", () => ({ isAmbassadorProgramEnabled: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyAuth: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ hasRoleClaim: vi.fn() }));
vi.mock("@/lib/firebaseAdmin", () => {
  const subdocData = { cohortId: "c1", strikes: 1, cohortPresentationVideoUrl: "" };
  const profileData = { bio: "" };
  const profileRef = {
    get: vi.fn().mockResolvedValue({ exists: true, data: () => profileData }),
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: true, data: () => subdocData }),
      }),
    }),
  };
  const cohortDoc = {
    get: vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        name: "Cohort 1",
        startDate: { toDate: () => new Date("2026-01-01T00:00:00Z") },
        endDate: { toDate: () => new Date("2026-04-01T00:00:00Z") },
      }),
    }),
  };
  const countQuery = (n: number) => ({
    where: vi.fn().mockReturnThis(),
    count: () => ({ get: () => Promise.resolve({ data: () => ({ count: n }) }) }),
  });
  // monthly_reports needs BOTH .where().count().get() AND .where().get() returning docs
  // (INV-1: reportsOnTime derivation reads full docs to compare submittedAt vs deadline).
  // Doc 1: month "2026-01", submittedAt = Jan 31 23:59:58 UTC → on time in UTC tz
  // Doc 2: month "2026-02", submittedAt = Mar 5 → late for Feb (deadline = end-of-Feb in UTC)
  const monthlyReportsDocs = [
    {
      data: () => ({
        month: "2026-01",
        submittedAt: { toMillis: () => Date.UTC(2026, 1, 1) - 1000 }, // Jan 31 23:59:59 UTC
      }),
    },
    {
      data: () => ({
        month: "2026-02",
        submittedAt: { toMillis: () => Date.UTC(2026, 2, 5) }, // Mar 5
      }),
    },
  ];
  const monthlyReportsQuery = {
    where: vi.fn().mockReturnThis(),
    count: () => ({ get: () => Promise.resolve({ data: () => ({ count: monthlyReportsDocs.length }) }) }),
    get: () => Promise.resolve({ docs: monthlyReportsDocs, size: monthlyReportsDocs.length }),
  };
  return {
    db: {
      collection: vi.fn((name: string) => {
        if (name === "mentorship_profiles") return { doc: vi.fn().mockReturnValue(profileRef) };
        if (name === "cohorts") return { doc: vi.fn().mockReturnValue(cohortDoc) };
        if (name === "referrals") return countQuery(7);
        if (name === "ambassador_events") return countQuery(3);
        if (name === "monthly_reports") return monthlyReportsQuery;
        return { where: vi.fn().mockReturnThis(), count: () => ({ get: () => Promise.resolve({ data: () => ({ count: 0 }) }) }) };
      }),
    },
  };
});

import { isAmbassadorProgramEnabled } from "@/lib/features";
import { verifyAuth } from "@/lib/auth";
import { hasRoleClaim } from "@/lib/permissions";
import { GET } from "./route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/ambassador/dashboard/me") as unknown as NextRequest;
}

beforeEach(() => {
  vi.mocked(isAmbassadorProgramEnabled).mockReturnValue(true);
  vi.mocked(verifyAuth).mockResolvedValue({ uid: "u1" } as never);
  vi.mocked(hasRoleClaim).mockReturnValue(true);
});

describe("GET /api/ambassador/dashboard/me (DASH-01)", () => {
  it("returns 404 when feature flag is off", async () => {
    vi.mocked(isAmbassadorProgramEnabled).mockReturnValue(false);
    const res = await GET(makeReq());
    expect(res.status).toBe(404);
  });

  it("returns 401 when verifyAuth returns null", async () => {
    vi.mocked(verifyAuth).mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 when role claim fails", async () => {
    vi.mocked(hasRoleClaim).mockReturnValue(false);
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
  });
});

describe("GET /api/ambassador/dashboard/me (DASH-02)", () => {
  it("returns numeric counts under stats", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stats: Record<string, number> };
    expect(typeof body.stats.referralsCount).toBe("number");
    expect(typeof body.stats.eventsCount).toBe("number");
    expect(typeof body.stats.reportsCount).toBe("number");
    expect(typeof body.stats.strikes).toBe("number");
  });

  it("auto-derives onboarding.loggedFirstEvent from eventsCount > 0 (Pitfall 6)", async () => {
    const res = await GET(makeReq());
    const body = (await res.json()) as { onboarding: { loggedFirstEvent: boolean } };
    expect(body.onboarding.loggedFirstEvent).toBe(true); // mock has eventsCount=3
  });

  it("auto-derives onboarding.uploadedVideo as false when subdoc has empty video URL", async () => {
    const res = await GET(makeReq());
    const body = (await res.json()) as { onboarding: { uploadedVideo: boolean } };
    expect(body.onboarding.uploadedVideo).toBe(false);
  });

  it("derives stats.reportsOnTime from monthly_reports docs vs deadline (INV-1)", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stats: { reportsOnTime: number; reportsCount: number } };
    expect(typeof body.stats.reportsOnTime).toBe("number");
    expect(body.stats.reportsOnTime).toBe(1); // only Doc 1 is on time in UTC tz
    // Additive: reportsCount must still be present (do not remove)
    expect(typeof body.stats.reportsCount).toBe("number");
  });
});
