import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Discord side-effects are not exercised by the reactivate path — stub them out.
vi.mock("@/lib/discord", () => ({
  deleteDiscordChannel: vi.fn(),
  getChannel: vi.fn(),
  sendDirectMessage: vi.fn(),
  createProjectChannel: vi.fn(),
  sendProjectDetailsMessage: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: vi.fn().mockReturnValue({ _type: "serverTimestamp" }),
    delete: vi.fn().mockReturnValue({ _type: "delete" }),
  },
}));

// Firestore mock — use vi.hoisted so variables are available in the factory.
const hoisted = vi.hoisted(() => {
  const state = {
    projectData: null as Record<string, unknown> | null,
    projectExists: true,
    sessionExists: true,
    sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };

  const mockProjectUpdate = vi.fn().mockResolvedValue(undefined);
  const mockSessionDelete = vi.fn().mockResolvedValue(undefined);

  const projectDocRef = {
    id: "project-123",
    update: mockProjectUpdate,
    get: vi.fn(async () => ({
      exists: state.projectExists,
      id: "project-123",
      data: () => state.projectData,
      ref: projectDocRef,
    })),
  };

  const sessionDocRef = {
    delete: mockSessionDelete,
    get: vi.fn(async () => ({
      exists: state.sessionExists,
      data: () => ({
        adminId: "admin-1",
        expiresAt: { toDate: () => state.sessionExpiresAt },
      }),
    })),
  };

  const mockCollection = vi.fn((name: string) => ({
    doc: vi.fn(() => (name === "projects" ? projectDocRef : sessionDocRef)),
  }));

  return { state, mockProjectUpdate, mockCollection };
});

vi.mock("@/lib/firebaseAdmin", () => ({
  db: { collection: hoisted.mockCollection },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { PUT } from "../route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, adminToken: string | null = "valid-token"): NextRequest {
  return new NextRequest("http://localhost/api/admin/projects/project-123", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(adminToken ? { "x-admin-token": adminToken } : {}),
    },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: "project-123" });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PUT /api/admin/projects/[id] — reactivate action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.state.projectExists = true;
    hoisted.state.sessionExists = true;
    hoisted.state.sessionExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    hoisted.state.projectData = { status: "completed", title: "Test Project" };
  });

  it("returns 401 when admin token is missing", async () => {
    const res = await PUT(makeRequest({ action: "reactivate" }, null), { params });

    expect(res.status).toBe(401);
    expect(hoisted.mockProjectUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when the project is not completed", async () => {
    hoisted.state.projectData = { status: "active", title: "Test Project" };

    const res = await PUT(makeRequest({ action: "reactivate" }), { params });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/only completed projects can be reactivated/i);
    expect(hoisted.mockProjectUpdate).not.toHaveBeenCalled();
  });

  it("reactivates a completed project back to active", async () => {
    const res = await PUT(makeRequest({ action: "reactivate" }), { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    expect(hoisted.mockProjectUpdate).toHaveBeenCalledTimes(1);
    const updatePayload = hoisted.mockProjectUpdate.mock.calls[0][0];
    expect(updatePayload.status).toBe("active");
    // completedAt must be cleared so the project no longer reads as completed.
    expect(updatePayload.completedAt).toEqual({ _type: "delete" });
    expect(updatePayload.reactivatedBy).toBe("admin-1");
  });
});
