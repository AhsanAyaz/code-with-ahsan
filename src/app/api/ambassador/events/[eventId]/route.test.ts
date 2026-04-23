import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted() so these are available inside vi.mock() factories (Vitest hoists vi.mock to top)
const { isEnabledMock, verifyAuthMock, hasRoleClaimMock, eventGet, eventUpdate, eventDelete } =
  vi.hoisted(() => ({
    isEnabledMock: vi.fn(() => true),
    verifyAuthMock: vi.fn(),
    hasRoleClaimMock: vi.fn(() => true),
    eventGet: vi.fn(),
    eventUpdate: vi.fn(),
    eventDelete: vi.fn(),
  }));

vi.mock("@/lib/features", () => ({
  isAmbassadorProgramEnabled: () => isEnabledMock(),
}));
vi.mock("@/lib/auth", () => ({ verifyAuth: (req: unknown) => verifyAuthMock(req) }));
vi.mock("@/lib/permissions", () => ({
  hasRoleClaim: (ctx: unknown, role: string) => hasRoleClaimMock(ctx, role),
}));

// Firestore mocks
vi.mock("@/lib/firebaseAdmin", () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: eventGet,
        update: eventUpdate,
        delete: eventDelete,
      })),
    })),
  },
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "server-ts-stub",
    delete: () => "delete-stub",
  },
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

import { PATCH, DELETE } from "./route";

function makeRequest(body: unknown): unknown {
  return {
    json: async () => body,
  };
}

function setEventAgeDays(days: number, ambassadorId = "user-1") {
  const eventDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  eventGet.mockResolvedValue({
    exists: true,
    data: () => ({ ambassadorId, date: eventDate, type: "workshop" }),
  });
}

describe("PATCH /api/ambassador/events/[eventId]", () => {
  beforeEach(() => {
    isEnabledMock.mockReturnValue(true);
    verifyAuthMock.mockResolvedValue({ uid: "user-1" });
    hasRoleClaimMock.mockReturnValue(true);
    eventGet.mockReset();
    eventUpdate.mockReset();
    eventDelete.mockReset();
  });

  it("returns 200 when within 30-day window and owns the event", async () => {
    setEventAgeDays(5);
    const res = await PATCH(makeRequest({ attendanceEstimate: 42 }) as never, {
      params: Promise.resolve({ eventId: "evt-1" }),
    });
    expect(res.status).toBe(200);
    expect(eventUpdate).toHaveBeenCalled();
  });

  it("returns 409 when event is older than 30 days (server-side window)", async () => {
    setEventAgeDays(31);
    const res = await PATCH(makeRequest({ attendanceEstimate: 42 }) as never, {
      params: Promise.resolve({ eventId: "evt-1" }),
    });
    expect(res.status).toBe(409);
    expect(eventUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when uid does not own the event", async () => {
    setEventAgeDays(5, "other-user");
    const res = await PATCH(makeRequest({ attendanceEstimate: 42 }) as never, {
      params: Promise.resolve({ eventId: "evt-1" }),
    });
    expect(res.status).toBe(403);
    expect(eventUpdate).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    verifyAuthMock.mockResolvedValue(null);
    const res = await PATCH(makeRequest({}) as never, {
      params: Promise.resolve({ eventId: "evt-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when auth but not ambassador role", async () => {
    hasRoleClaimMock.mockReturnValue(false);
    const res = await PATCH(makeRequest({}) as never, {
      params: Promise.resolve({ eventId: "evt-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when feature flag off", async () => {
    isEnabledMock.mockReturnValue(false);
    const res = await PATCH(makeRequest({}) as never, {
      params: Promise.resolve({ eventId: "evt-1" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/ambassador/events/[eventId]", () => {
  beforeEach(() => {
    isEnabledMock.mockReturnValue(true);
    verifyAuthMock.mockResolvedValue({ uid: "user-1" });
    hasRoleClaimMock.mockReturnValue(true);
    eventGet.mockReset();
    eventDelete.mockReset();
  });

  it("returns 200 when within 30-day window", async () => {
    setEventAgeDays(5);
    const res = await DELETE(makeRequest({}) as never, {
      params: Promise.resolve({ eventId: "evt-1" }),
    });
    expect(res.status).toBe(200);
    expect(eventDelete).toHaveBeenCalled();
  });

  it("returns 409 when outside 30-day window", async () => {
    setEventAgeDays(31);
    const res = await DELETE(makeRequest({}) as never, {
      params: Promise.resolve({ eventId: "evt-1" }),
    });
    expect(res.status).toBe(409);
    expect(eventDelete).not.toHaveBeenCalled();
  });
});
