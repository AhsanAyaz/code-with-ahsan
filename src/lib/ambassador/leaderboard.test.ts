import { describe, it, expect } from "vitest";
import {
  rankByCount,
  currentUtcMonth,
  utcMonthStart,
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
