import { describe, it, expect } from "vitest";
import {
  rankByCount,
  currentUtcMonth,
  utcMonthStart,
  buildWindowCategory,
  type LeaderboardCategoryRanks,
} from "./leaderboard";
import { LEADERBOARD_GRACE_PERIOD_MS } from "./constants";

describe("rankByCount (DASH-05 ranking determinism)", () => {
  it("assigns standard competition ranks (1224)", () => {
    const ranks = rankByCount([
      { uid: "a", count: 10 },
      { uid: "b", count: 8 },
      { uid: "c", count: 8 },
      { uid: "d", count: 5 },
    ]);
    expect(ranks.get("a")).toBe(1);
    expect(ranks.get("b")).toBe(2);
    expect(ranks.get("c")).toBe(2);
    expect(ranks.get("d")).toBe(4);
  });

  it("handles all-zero counts", () => {
    const ranks = rankByCount([
      { uid: "a", count: 0 },
      { uid: "b", count: 0 },
    ]);
    expect(ranks.get("a")).toBe(1);
    expect(ranks.get("b")).toBe(1);
  });

  it("returns empty map for empty input", () => {
    expect(rankByCount([]).size).toBe(0);
  });
});

describe("DASH-06 grace period math", () => {
  it("LEADERBOARD_GRACE_PERIOD_MS equals exactly 28 days in milliseconds", () => {
    expect(LEADERBOARD_GRACE_PERIOD_MS).toBe(28 * 24 * 60 * 60 * 1000);
  });

  it("startDate + grace = expected ISO", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const graceEnd = new Date(start.getTime() + LEADERBOARD_GRACE_PERIOD_MS);
    expect(graceEnd.toISOString()).toBe("2026-01-29T00:00:00.000Z");
  });
});

describe("currentUtcMonth / utcMonthStart (DASH-04 month boundary)", () => {
  it("currentUtcMonth returns YYYY-MM in UTC", () => {
    const result = currentUtcMonth(new Date("2026-03-15T12:34:56.000Z"));
    expect(result).toBe("2026-03");
  });

  it("utcMonthStart returns first ms of month at UTC", () => {
    const start = utcMonthStart("2026-03");
    expect(start.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});

describe("buildWindowCategory (quick 260522-b08: rank field on top3 entries)", () => {
  it("attaches rank to each top3 entry (1, 2, 2 with a tie at index 1/2)", () => {
    const { top3 } = buildWindowCategory([
      { uid: "a", displayName: "A", photoURL: "", count: 10 },
      { uid: "b", displayName: "B", photoURL: "", count: 8 },
      { uid: "c", displayName: "C", photoURL: "", count: 8 },
      { uid: "d", displayName: "D", photoURL: "", count: 5 },
    ]);
    expect(top3).toHaveLength(3);
    expect(top3[0].rank).toBe(1);
    expect(top3[1].rank).toBe(2);
    expect(top3[2].rank).toBe(2);
    // Sanity: rank field is numeric on each top3 entry.
    expect(typeof top3[0].rank).toBe("number");
  });

  it("preserves the zero-count filter (no entries with count===0 in top3)", () => {
    const { top3 } = buildWindowCategory([
      { uid: "a", displayName: "A", photoURL: "", count: 0 },
      { uid: "b", displayName: "B", photoURL: "", count: 0 },
      { uid: "c", displayName: "C", photoURL: "", count: 0 },
    ]);
    expect(top3).toHaveLength(0);
  });

  it("returns at most 3 top entries with monotonically non-decreasing ranks", () => {
    const { top3 } = buildWindowCategory([
      { uid: "a", displayName: "A", photoURL: "", count: 9 },
      { uid: "b", displayName: "B", photoURL: "", count: 7 },
      { uid: "c", displayName: "C", photoURL: "", count: 5 },
      { uid: "d", displayName: "D", photoURL: "", count: 3 },
      { uid: "e", displayName: "E", photoURL: "", count: 1 },
    ]);
    expect(top3).toHaveLength(3);
    expect(top3[0].rank).toBe(1);
    expect(top3[1].rank).toBe(2);
    expect(top3[2].rank).toBe(3);
  });
});

describe("LeaderboardCategoryRanks shape (quick 260522-b08: renamed keys)", () => {
  it("accepts { referrals, events, reportsOnTime } as its full shape", () => {
    // If LeaderboardCategoryRanks still required *Rank keys, this assignment
    // would type-error at `npx tsc --noEmit` (the next gate enforces it).
    const r: LeaderboardCategoryRanks = {
      referrals: 1,
      events: 2,
      reportsOnTime: 3,
    };
    expect(r.referrals).toBe(1);
    expect(r.events).toBe(2);
    expect(r.reportsOnTime).toBe(3);
  });
});
