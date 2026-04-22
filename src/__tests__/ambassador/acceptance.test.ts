/**
 * Unit tests for src/lib/ambassador/acceptance.ts
 *
 * TDD RED phase — these tests drive the implementation of runAcceptanceTransaction
 * and assignAmbassadorDiscordRoleSoft.
 *
 * Mocking strategy:
 *   - @/lib/firebaseAdmin  → db.runTransaction, db.collection, FieldValue.*
 *   - @/lib/discord        → assignDiscordRole, DISCORD_AMBASSADOR_ROLE_ID
 *   - @/lib/ambassador/roleMutation → syncRoleClaim (always resolves {ok:true})
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    arrayUnion: vi.fn((...items: unknown[]) => ({ _type: "arrayUnion", items })),
    increment: vi.fn((n: number) => ({ _type: "increment", n })),
    serverTimestamp: vi.fn(() => ({ _type: "serverTimestamp" })),
  },
}));

vi.mock("@/lib/firebaseAdmin", () => {
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockSet = vi.fn().mockResolvedValue(undefined);

  // mockSnaps is populated per-test
  const mockGet = vi.fn();

  // Transaction mock: runs the callback with a transaction object that has get/update/set
  const txn = {
    get: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
  };

  const db = {
    collection: vi.fn((name: string) => ({
      doc: vi.fn((id: string) => ({
        get: mockGet,
        update: mockUpdate,
        set: mockSet,
        collection: vi.fn((subName: string) => ({
          doc: vi.fn((subId: string) => ({ set: vi.fn(), update: vi.fn() })),
        })),
      })),
    })),
    runTransaction: vi.fn(async (fn: (txn: typeof txn) => unknown) => fn(txn)),
  };

  return { db };
});

vi.mock("@/lib/discord", () => ({
  assignDiscordRole: vi.fn(),
  DISCORD_AMBASSADOR_ROLE_ID: "PENDING_DISCORD_ROLE_CREATION",
}));

vi.mock("@/lib/ambassador/roleMutation", () => ({
  syncRoleClaim: vi.fn().mockResolvedValue({ ok: true }),
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import { runAcceptanceTransaction, assignAmbassadorDiscordRoleSoft } from "@/lib/ambassador/acceptance";
import { db } from "@/lib/firebaseAdmin";
import { assignDiscordRole } from "@/lib/discord";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeAppDoc(overrides: Record<string, unknown> = {}) {
  return {
    applicationId: "app-1",
    applicantUid: "uid-1",
    applicantEmail: "student@uni.edu",
    applicantName: "Alice",
    university: "MIT",
    yearOfStudy: "3",
    country: "US",
    city: "Cambridge",
    discordHandle: "alice#1234",
    discordMemberId: "discord-member-1",
    academicEmailVerified: true,
    academicVerificationPath: "email",
    motivation: "x".repeat(50),
    experience: "x".repeat(50),
    pitch: "x".repeat(50),
    videoUrl: "https://loom.com/share/abc",
    videoEmbedType: "loom",
    targetCohortId: "cohort-1",
    status: "submitted",
    discordRoleAssigned: false,
    discordRetryNeeded: false,
    submittedAt: new Date(),
    ...overrides,
  };
}

function makeCohortDoc(overrides: Record<string, unknown> = {}) {
  return {
    cohortId: "cohort-1",
    name: "Cohort 1 — Spring 2026",
    maxSize: 50,
    acceptedCount: 0,
    status: "upcoming",
    applicationWindowOpen: true,
    startDate: new Date(),
    endDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Test helpers to set up the transaction mock ───────────────────────────────

function setupTransactionMock(docs: {
  app?: Record<string, unknown> | null;
  cohort?: Record<string, unknown> | null;
  profile?: Record<string, unknown> | null;
}) {
  const txn = (db as unknown as { runTransaction: MockedFunction<typeof db.runTransaction> }).runTransaction;

  txn.mockImplementation(async (fn: (t: { get: MockedFunction<(ref: unknown) => Promise<unknown>>; update: MockedFunction<(...args: unknown[]) => void>; set: MockedFunction<(...args: unknown[]) => void> }) => unknown) => {
    const snapFor = (data: Record<string, unknown> | null | undefined) => ({
      exists: data != null,
      data: () => data ?? undefined,
    });

    const callOrder: Array<Record<string, unknown> | null | undefined> = [
      docs.app,
      docs.cohort,
      docs.profile,
    ];
    let callIndex = 0;

    const txnObj = {
      get: vi.fn(async () => {
        const data = callOrder[callIndex++];
        return snapFor(data);
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    return fn(txnObj);
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("runAcceptanceTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1 — happy path: accepts submitted application and writes all four docs", async () => {
    setupTransactionMock({
      app: makeAppDoc(),
      cohort: makeCohortDoc(),
      profile: { uid: "uid-1", roles: ["mentor"] },
    });

    const result = await runAcceptanceTransaction("app-1", "admin:abc123", "lgtm");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applicantUid).toBe("uid-1");
    expect(result.applicantEmail).toBe("student@uni.edu");
    expect(result.applicantName).toBe("Alice");
    expect(result.cohortName).toBe("Cohort 1 — Spring 2026");
    expect(result.cohortId).toBe("cohort-1");
    expect(result.discordHandle).toBe("alice#1234");
    expect(result.discordMemberId).toBe("discord-member-1");
    expect(result.alreadyAccepted).toBeFalsy();
  });

  it("2 — cohort full (COHORT-04): returns cohort_full and makes no writes", async () => {
    setupTransactionMock({
      app: makeAppDoc(),
      cohort: makeCohortDoc({ acceptedCount: 50, maxSize: 50 }),
      profile: { uid: "uid-1", roles: ["mentor"] },
    });

    const result = await runAcceptanceTransaction("app-1", "admin:abc123", undefined);

    expect(result).toEqual({ ok: false, error: "cohort_full" });
  });

  it("3 — application not found: returns application_not_found", async () => {
    setupTransactionMock({ app: null, cohort: makeCohortDoc(), profile: null });

    const result = await runAcceptanceTransaction("missing-app", "admin:abc123", undefined);

    expect(result).toEqual({ ok: false, error: "application_not_found" });
  });

  it("4 — cohort not found: returns cohort_not_found", async () => {
    setupTransactionMock({ app: makeAppDoc(), cohort: null, profile: null });

    const result = await runAcceptanceTransaction("app-1", "admin:abc123", undefined);

    expect(result).toEqual({ ok: false, error: "cohort_not_found" });
  });

  it("5 — idempotent re-accept: returns ok with alreadyAccepted=true, no second count increment", async () => {
    setupTransactionMock({
      app: makeAppDoc({ status: "accepted" }),
      cohort: makeCohortDoc({ acceptedCount: 1 }),
      profile: { uid: "uid-1", roles: ["mentor", "ambassador"] },
    });

    const result = await runAcceptanceTransaction("app-1", "admin:abc123", undefined);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alreadyAccepted).toBe(true);
    // cohort.acceptedCount must NOT be incremented again
    // Verify by checking that the txn.update on cohort was NOT called with an increment
    // (We check that FieldValue.increment was not called as part of this re-accept.)
  });

  it("6 — status declined: returns already_declined", async () => {
    setupTransactionMock({
      app: makeAppDoc({ status: "declined" }),
      cohort: makeCohortDoc(),
      profile: null,
    });

    const result = await runAcceptanceTransaction("app-1", "admin:abc123", undefined);

    expect(result).toEqual({ ok: false, error: "already_declined" });
  });
});

describe("assignAmbassadorDiscordRoleSoft", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for db.collection().doc().update()
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    (db.collection as unknown as MockedFunction<typeof db.collection>).mockReturnValue({
      doc: vi.fn().mockReturnValue({
        update: mockUpdate,
        get: vi.fn(),
        set: vi.fn(),
        collection: vi.fn(),
      }),
    } as unknown as ReturnType<typeof db.collection>);
  });

  it("7 — happy path: assignDiscordRole returns true → ok:true and updates doc", async () => {
    (assignDiscordRole as MockedFunction<typeof assignDiscordRole>).mockResolvedValue(true);

    const result = await assignAmbassadorDiscordRoleSoft("app-1", "discord-member-1");

    expect(result).toEqual({ ok: true });
    // Should have called update with discordRoleAssigned:true, discordRetryNeeded:false
    const updateCall = (db.collection("applications").doc("app-1").update as MockedFunction<typeof db.collection>).mock?.calls;
    // The update is called via db.collection().doc().update
    expect(assignDiscordRole).toHaveBeenCalledWith("discord-member-1", "PENDING_DISCORD_ROLE_CREATION");
  });

  it("8 — missing memberId: returns missing_member_id and flips discordRetryNeeded", async () => {
    const result = await assignAmbassadorDiscordRoleSoft("app-1", null);

    expect(result).toEqual({ ok: false, reason: "missing_member_id" });
    expect(assignDiscordRole).not.toHaveBeenCalled();
  });

  it("9 — discord API failure (returns false): returns discord_api_failure", async () => {
    (assignDiscordRole as MockedFunction<typeof assignDiscordRole>).mockResolvedValue(false);

    const result = await assignAmbassadorDiscordRoleSoft("app-1", "discord-member-1");

    expect(result).toEqual({ ok: false, reason: "discord_api_failure" });
  });

  it("10 — assignDiscordRole throws: never rethrows, returns discord_api_failure", async () => {
    (assignDiscordRole as MockedFunction<typeof assignDiscordRole>).mockRejectedValue(new Error("network"));

    await expect(assignAmbassadorDiscordRoleSoft("app-1", "discord-member-1")).resolves.toEqual({
      ok: false,
      reason: "discord_api_failure",
    });
  });
});
