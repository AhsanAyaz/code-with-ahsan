/**
 * Phase 5 (DASH-07, quick 260522-b08) — Leaderboard route contract tests.
 *
 * Tests cover:
 *   - Auth gates (404 feature off, 401 unauth, 403 non-ambassador) — preserves existing semantics.
 *   - Snapshot-read happy path with graceActive computed from graceEndDate.
 *   - Grace-expired branch (graceActive=false).
 *   - Fallback to buildLeaderboardSnapshot when snapshot doc is missing.
 *   - { snapshot: null } early return when no cohort.
 *   - ownRank shape uses { referrals, events, reportsOnTime } keys (null when uid absent from map).
 *   - Anti-pattern guard: full ambassadorRanks map MUST NOT leak into the response payload.
 *
 * Mocking strategy mirrors src/app/api/ambassador/dashboard/me/route.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/features", () => ({ isAmbassadorProgramEnabled: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyAuth: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ hasRoleClaim: vi.fn() }));
vi.mock("@/lib/ambassador/currentCohort", () => ({ getCurrentCohortId: vi.fn() }));
vi.mock("@/lib/ambassador/leaderboard", async () => {
  return {
    buildLeaderboardSnapshot: vi.fn(),
  };
});

// Mutable handle the firebaseAdmin mock reads from — tests reset it in beforeEach.
const snapshotDocState = {
  exists: false as boolean,
  data: () => ({}) as Record<string, unknown>,
};

vi.mock("@/lib/firebaseAdmin", () => {
  return {
    db: {
      collection: vi.fn((name: string) => {
        if (name === "leaderboard_snapshots") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockImplementation(() =>
                Promise.resolve({
                  exists: snapshotDocState.exists,
                  data: () => snapshotDocState.data(),
                }),
              ),
            }),
          };
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
          }),
        };
      }),
    },
  };
});

import { isAmbassadorProgramEnabled } from "@/lib/features";
import { verifyAuth } from "@/lib/auth";
import { hasRoleClaim } from "@/lib/permissions";
import { getCurrentCohortId } from "@/lib/ambassador/currentCohort";
import { buildLeaderboardSnapshot } from "@/lib/ambassador/leaderboard";
import { GET } from "./route";

function makeReq(viewParam?: "cumulative" | "this_month"): NextRequest {
  const qs = viewParam ? `?view=${viewParam}` : "";
  return new Request(
    `http://localhost/api/ambassador/dashboard/leaderboard${qs}`,
  ) as unknown as NextRequest;
}

/** Build a fully-shaped LeaderboardSnapshot fixture (NEW Task-1 shape with rank field). */
function makeFixtureSnapshot(opts: {
  cohortId?: string;
  graceEndIsoOrTs?: string | { toDate: () => Date };
  updatedAtIsoOrTs?: string | { toDate: () => Date };
  includeOwnUid?: string | null;
}) {
  const cohortId = opts.cohortId ?? "cohort1";
  const ambassadorRanks: Record<string, { referrals: number; events: number; reportsOnTime: number }> = {
    other1: { referrals: 1, events: 2, reportsOnTime: 3 },
  };
  if (opts.includeOwnUid) {
    ambassadorRanks[opts.includeOwnUid] = { referrals: 5, events: 7, reportsOnTime: 9 };
  }
  return {
    cohortId,
    updatedAt: opts.updatedAtIsoOrTs ?? "2026-05-22T07:00:00.000Z",
    graceEndDate: opts.graceEndIsoOrTs ?? "2026-06-01T00:00:00.000Z",
    cumulative: {
      referrals: [
        { uid: "other1", displayName: "Alice", photoURL: "", count: 10, rank: 1 },
        { uid: "other2", displayName: "Bob", photoURL: "", count: 7, rank: 2 },
        { uid: "other3", displayName: "Cara", photoURL: "", count: 5, rank: 3 },
      ],
      events: [
        { uid: "other1", displayName: "Alice", photoURL: "", count: 4, rank: 1 },
      ],
      reportsOnTime: [
        { uid: "other2", displayName: "Bob", photoURL: "", count: 2, rank: 1 },
      ],
      ambassadorRanks,
    },
    thisMonth: {
      month: "2026-05",
      referrals: [],
      events: [],
      reportsOnTime: [],
      ambassadorRanks,
    },
  };
}

beforeEach(() => {
  vi.mocked(isAmbassadorProgramEnabled).mockReturnValue(true);
  vi.mocked(verifyAuth).mockResolvedValue({ uid: "u1" } as never);
  vi.mocked(hasRoleClaim).mockReturnValue(true);
  vi.mocked(getCurrentCohortId).mockResolvedValue("cohort1");
  vi.mocked(buildLeaderboardSnapshot).mockReset();
  snapshotDocState.exists = false;
  snapshotDocState.data = () => ({});
});

describe("GET /api/ambassador/dashboard/leaderboard — auth gates (quick 260522-b08)", () => {
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

describe("GET /api/ambassador/dashboard/leaderboard — snapshot present (quick 260522-b08)", () => {
  it("emits graceActive=true when graceEndDate is in the future + ISO-normalizes Timestamp fields", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const updatedAtDate = new Date(Date.now() - 60_000);
    snapshotDocState.exists = true;
    snapshotDocState.data = () =>
      makeFixtureSnapshot({
        // Pass Firestore-Timestamp-shaped objects to exercise toDate() normalization.
        graceEndIsoOrTs: { toDate: () => futureDate },
        updatedAtIsoOrTs: { toDate: () => updatedAtDate },
        includeOwnUid: "u1",
      });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      graceActive: boolean;
      graceEndDate: string | null;
      updatedAt: string | null;
      top3: { referrals: Array<{ rank: number }>; events: unknown[]; reportsOnTime: unknown[] };
      ownRank: { referrals: number | null; events: number | null; reportsOnTime: number | null };
    };
    expect(body.graceActive).toBe(true);
    expect(body.graceEndDate).toBe(futureDate.toISOString());
    expect(body.updatedAt).toBe(updatedAtDate.toISOString());
    expect(typeof body.top3.referrals[0].rank).toBe("number");
    expect(body.top3.referrals[0].rank).toBe(1);
    expect(body.ownRank).toEqual({ referrals: 5, events: 7, reportsOnTime: 9 });
  });

  it("emits graceActive=false when graceEndDate is in the past", async () => {
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    snapshotDocState.exists = true;
    snapshotDocState.data = () =>
      makeFixtureSnapshot({
        graceEndIsoOrTs: pastDate.toISOString(),
        includeOwnUid: "u1",
      });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { graceActive: boolean };
    expect(body.graceActive).toBe(false);
  });

  it("ownRank is { referrals: null, events: null, reportsOnTime: null } when uid absent from ambassadorRanks", async () => {
    snapshotDocState.exists = true;
    snapshotDocState.data = () =>
      makeFixtureSnapshot({
        includeOwnUid: null, // u1 NOT in the rank map
      });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ownRank: { referrals: number | null; events: number | null; reportsOnTime: number | null };
    };
    expect(body.ownRank).toEqual({ referrals: null, events: null, reportsOnTime: null });
  });

  it("anti-pattern guard: response JSON does NOT contain ambassadorRanks at any nesting level", async () => {
    snapshotDocState.exists = true;
    snapshotDocState.data = () =>
      makeFixtureSnapshot({
        includeOwnUid: "u1",
      });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain("ambassadorRanks");
  });
});

describe("GET /api/ambassador/dashboard/leaderboard — fallback path (quick 260522-b08)", () => {
  it("falls back to buildLeaderboardSnapshot when snapshot doc is missing", async () => {
    snapshotDocState.exists = false; // cold start — no doc yet
    vi.mocked(buildLeaderboardSnapshot).mockResolvedValue(
      makeFixtureSnapshot({
        includeOwnUid: "u1",
      }) as unknown as Awaited<ReturnType<typeof buildLeaderboardSnapshot>>,
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(buildLeaderboardSnapshot).toHaveBeenCalledWith("cohort1");
    const body = (await res.json()) as {
      graceActive: boolean;
      ownRank: { referrals: number | null };
      top3: { referrals: Array<{ rank: number }> };
    };
    // Default fixture graceEndDate is in 2026-06-01 — relative to "now" this may be past or
    // future depending on system clock; just verify graceActive is a boolean and top3 has rank.
    expect(typeof body.graceActive).toBe("boolean");
    expect(body.ownRank.referrals).toBe(5);
    expect(typeof body.top3.referrals[0].rank).toBe("number");
  });
});

describe("GET /api/ambassador/dashboard/leaderboard — no cohort (quick 260522-b08)", () => {
  it("returns { snapshot: null } when getCurrentCohortId resolves null", async () => {
    vi.mocked(getCurrentCohortId).mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { snapshot: null };
    expect(body.snapshot).toBe(null);
  });
});
