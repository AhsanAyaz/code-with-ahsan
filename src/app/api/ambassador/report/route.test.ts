import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted() ensures mock factory values are available when vi.mock() factories are hoisted
const {
  isEnabledMock,
  verifyAuthMock,
  hasRoleClaimMock,
  txnGet,
  txnSet,
  runTransaction,
  subdocGet,
  getCurrentMonthKeyMock,
} = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txnGet = vi.fn<() => Promise<any>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txnSet = vi.fn<(ref: any, data: any) => void>();
  return {
    isEnabledMock: vi.fn<() => boolean>(() => true),
    verifyAuthMock: vi.fn<() => Promise<{ uid: string } | null>>(),
    hasRoleClaimMock: vi.fn<() => boolean>(() => true),
    txnGet,
    txnSet,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runTransaction: vi.fn<(cb: (txn: any) => Promise<void>) => Promise<void>>(),
    subdocGet: vi.fn<() => Promise<unknown>>(),
    getCurrentMonthKeyMock: vi.fn<() => string>(() => "2026-04"),
  };
});

vi.mock("@/lib/features", () => ({
  isAmbassadorProgramEnabled: () => isEnabledMock(),
}));
vi.mock("@/lib/auth", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verifyAuth: (_req: unknown) => verifyAuthMock(),
}));
vi.mock("@/lib/permissions", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasRoleClaim: (_ctx: unknown, _role: string) => hasRoleClaimMock(),
}));

vi.mock("@/lib/ambassador/reportDeadline", () => ({
  getCurrentMonthKey: () => getCurrentMonthKeyMock(),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "__SERVER_TS__" },
}));

vi.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

// Firestore mock with inline factory using the hoisted fns
vi.mock("@/lib/firebaseAdmin", () => ({
  db: {
    collection: vi.fn((_name: string) => ({
      doc: vi.fn((_id: string) => ({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({ get: subdocGet })),
        })),
        get: subdocGet,
      })),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runTransaction: (cb: (txn: any) => Promise<void>) => runTransaction(cb),
  },
}));

import { POST } from "./route";

const validBody = {
  whatWorked: "Hosted a workshop.",
  whatBlocked: "Exams.",
  whatNeeded: "Better Discord tools.",
};

function makeRequest(body: unknown) {
  return {
    json: async () => body,
  } as unknown as Request;
}

describe("POST /api/ambassador/report (REPORT-01, REPORT-02)", () => {
  beforeEach(() => {
    txnGet.mockReset();
    txnSet.mockReset();
    subdocGet.mockReset();
    verifyAuthMock.mockReset();
    runTransaction.mockReset();
    // Default: runTransaction runs the callback with a txn object
    runTransaction.mockImplementation(async (cb) => {
      await cb({ get: txnGet, set: txnSet });
    });
  });

  it("returns 400 on invalid body (empty whatWorked)", async () => {
    verifyAuthMock.mockResolvedValue({ uid: "u1" });
    subdocGet.mockResolvedValue({
      exists: true,
      data: () => ({ cohortId: "cohort-3", timezone: "UTC" }),
    });
    const res = await POST(makeRequest({ whatWorked: "", whatBlocked: "a", whatNeeded: "b" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 201 + { reportId, month } on first submit for the month", async () => {
    verifyAuthMock.mockResolvedValue({ uid: "u1" });
    subdocGet.mockResolvedValue({
      exists: true,
      data: () => ({ cohortId: "cohort-3", timezone: "Asia/Karachi" }),
    });
    txnGet.mockResolvedValue({ exists: false });
    const res = await POST(makeRequest(validBody) as never);
    expect(res.status).toBe(201);
    const json = await (res as Response).json();
    expect(json.reportId).toBe("u1_2026-04");
    expect(json.month).toBe("2026-04");
    expect(txnSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ambassadorId: "u1",
        cohortId: "cohort-3",
        month: "2026-04",
        whatWorked: "Hosted a workshop.",
        whatBlocked: "Exams.",
        whatNeeded: "Better Discord tools.",
      }),
    );
  });

  it("returns 409 Already submitted when doc already exists for this month", async () => {
    verifyAuthMock.mockResolvedValue({ uid: "u1" });
    subdocGet.mockResolvedValue({
      exists: true,
      data: () => ({ cohortId: "cohort-3", timezone: "UTC" }),
    });
    txnGet.mockResolvedValue({ exists: true });
    // runTransaction throws __ALREADY_SUBMITTED__ marker
    runTransaction.mockImplementation(async (cb) => {
      await cb({ get: txnGet, set: txnSet });
    });
    const res = await POST(makeRequest(validBody) as never);
    expect(res.status).toBe(409);
    expect(txnSet).not.toHaveBeenCalled();
  });

  it("returns 409 No cohort attached when ambassador subdoc has no cohortId", async () => {
    verifyAuthMock.mockResolvedValue({ uid: "u1" });
    subdocGet.mockResolvedValue({
      exists: true,
      data: () => ({ timezone: "UTC" }), // no cohortId
    });
    const res = await POST(makeRequest(validBody) as never);
    expect(res.status).toBe(409);
    const json = await (res as Response).json();
    expect(json.error).toBe("No cohort attached");
  });
});
