import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/ambassador/adminAuth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/mentorship/deleteMenteeCascade", () => ({
  cascadeDeleteMentee: vi.fn(),
}));

// Unused-by-DELETE deps still imported by the route module — stub them out.
vi.mock("@/lib/email", () => ({
  sendRegistrationStatusEmail: vi.fn(),
  sendAccountStatusEmail: vi.fn(),
}));
vi.mock("@/lib/discord", () => ({
  sendMentorChangesRequestedNotification: vi.fn(),
}));
vi.mock("@/lib/ambassador/roleMutation", () => ({
  syncRoleClaim: vi.fn(),
}));

const { mockAdd, mockGet, mockCollection } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockAdd = vi.fn().mockResolvedValue({ id: "audit-doc" });
  const mockDoc = vi.fn().mockReturnValue({ get: mockGet });
  const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc, add: mockAdd });
  return { mockAdd, mockGet, mockDoc, mockCollection };
});

vi.mock("@/lib/firebaseAdmin", () => ({
  db: { collection: mockCollection },
  auth: {},
}));

// ─── Imports (after mocks) ─────────────────────────────────────────────────────
import { DELETE } from "../route";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { cascadeDeleteMentee } from "@/lib/mentorship/deleteMenteeCascade";

const requireAdminMock = vi.mocked(requireAdmin);
const cascadeMock = vi.mocked(cascadeDeleteMentee);

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/mentorship/admin/profiles", {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("DELETE /api/mentorship/admin/profiles (cascade delete mentee)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ ok: true, uid: "admin:abc123" });
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ email: "m@e.com", displayName: "Mentee" }),
    });
    cascadeMock.mockResolvedValue({
      uid: "u1",
      profileDeleted: true,
      userDocDeleted: true,
      authAccountDeleted: true,
      counts: {
        sessions: 1,
        goals: 0,
        scheduledSessions: 0,
        alerts: 0,
        bookings: 0,
        ratings: 0,
        projectApplications: 0,
        projectMembers: 0,
        projectInvitations: 0,
      },
      discord: { channelsDeleted: 0, rolesRemoved: 0 },
      errors: [],
    });
  });

  it("returns 401 when the caller is not an admin", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Admin token required",
    });
    const res = await DELETE(makeRequest({ uid: "u1", confirmed: true }));
    expect(res.status).toBe(401);
    expect(cascadeMock).not.toHaveBeenCalled();
  });

  it("returns 400 when confirmation flag is missing", async () => {
    const res = await DELETE(makeRequest({ uid: "u1" }));
    expect(res.status).toBe(400);
    expect(cascadeMock).not.toHaveBeenCalled();
  });

  it("returns 400 when confirmed is not exactly true", async () => {
    const res = await DELETE(makeRequest({ uid: "u1", confirmed: "yes" }));
    expect(res.status).toBe(400);
    expect(cascadeMock).not.toHaveBeenCalled();
  });

  it("returns 400 when uid is missing", async () => {
    const res = await DELETE(makeRequest({ confirmed: true }));
    expect(res.status).toBe(400);
    expect(cascadeMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the profile does not exist", async () => {
    mockGet.mockResolvedValue({ exists: false, data: () => undefined });
    const res = await DELETE(makeRequest({ uid: "u1", confirmed: true }));
    expect(res.status).toBe(404);
    expect(cascadeMock).not.toHaveBeenCalled();
  });

  it("cascades, writes an audit log, and returns 200 on the happy path", async () => {
    const res = await DELETE(makeRequest({ uid: "u1", confirmed: true }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(cascadeMock).toHaveBeenCalledWith("u1");
    expect(json.success).toBe(true);
    expect(json.summary.counts.sessions).toBe(1);

    // Audit log recorded with the acting admin + target.
    expect(mockCollection).toHaveBeenCalledWith("mentorship_admin_audit_log");
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "delete_mentee",
        targetUid: "u1",
        performedBy: "admin:abc123",
      })
    );
  });
});
