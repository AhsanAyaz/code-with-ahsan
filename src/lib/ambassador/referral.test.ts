import { describe, it, expect, vi, beforeEach } from "vitest";

// Vitest hoists vi.mock() calls to the top of the file. Variables defined
// outside the factory are NOT accessible inside it. Use vi.hoisted() to
// create shared mocks that both the factory and the test body can access.
const { lookupGet, referralsQueryGet, referralsAdd, whereFn, collectionFn } =
  vi.hoisted(() => {
    const lookupGet = vi.fn();
    const referralsQueryGet = vi.fn();
    const referralsAdd = vi.fn();
    const whereFn = vi.fn(() => ({
      limit: vi.fn(() => ({ get: referralsQueryGet })),
    }));
    const collectionFn = vi.fn((name: string) => {
      if (name === "referral_codes") {
        return { doc: vi.fn(() => ({ get: lookupGet })) };
      }
      if (name === "referrals") {
        return { where: whereFn, add: referralsAdd };
      }
      throw new Error(`Unexpected collection: ${name}`);
    });
    return { lookupGet, referralsQueryGet, referralsAdd, whereFn, collectionFn };
  });

vi.mock("@/lib/firebaseAdmin", () => ({
  db: { collection: collectionFn },
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "server-ts-stub" },
}));

import { consumeReferral } from "./referral";

describe("consumeReferral", () => {
  beforeEach(() => {
    lookupGet.mockReset();
    referralsQueryGet.mockReset();
    referralsAdd.mockReset();
  });

  it("returns unknown_code when lookup doc missing", async () => {
    lookupGet.mockResolvedValue({ exists: false });
    const r = await consumeReferral("user-2", "MISS-0000");
    expect(r).toEqual({ ok: false, reason: "unknown_code" });
  });

  it("returns self_attribution when ambassadorId equals referredUserId", async () => {
    lookupGet.mockResolvedValue({
      exists: true,
      data: () => ({ ambassadorId: "user-1", uid: "user-1" }),
    });
    const r = await consumeReferral("user-1", "SELF-0000");
    expect(r).toEqual({ ok: false, reason: "self_attribution" });
  });

  it("returns already_attributed when existing referral doc found", async () => {
    lookupGet.mockResolvedValue({
      exists: true,
      data: () => ({ ambassadorId: "user-A", uid: "user-A" }),
    });
    referralsQueryGet.mockResolvedValue({ empty: false });
    const r = await consumeReferral("user-2", "AAA-0000");
    expect(r).toEqual({ ok: false, reason: "already_attributed" });
  });

  it("returns ok with referralId on clean attribution", async () => {
    lookupGet.mockResolvedValue({
      exists: true,
      data: () => ({ ambassadorId: "user-A", uid: "user-A" }),
    });
    referralsQueryGet.mockResolvedValue({ empty: true });
    referralsAdd.mockResolvedValue({ id: "ref-123" });
    const r = await consumeReferral("user-2", "CODE-0000");
    expect(r).toEqual({ ok: true, referralId: "ref-123", ambassadorId: "user-A" });
    expect(referralsAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        ambassadorId: "user-A",
        referredUserId: "user-2",
        sourceCode: "CODE-0000",
        convertedAt: "server-ts-stub",
      }),
    );
  });

  it("returns error reason on Firestore exception (never throws)", async () => {
    lookupGet.mockRejectedValue(new Error("Firestore down"));
    const r = await consumeReferral("user-2", "ANY-0000");
    expect(r).toEqual({ ok: false, reason: "error" });
  });
});
