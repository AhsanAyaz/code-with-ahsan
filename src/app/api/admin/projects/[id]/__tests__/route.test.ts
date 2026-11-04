import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock(
  "@/lib/adminAccess/server",
  async () => (await import("@/lib/adminAccess/testing")).adminAccessServerMock
);

// Discord side-effects are not exercised by these paths; stub them out.
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

// Firestore mock: use vi.hoisted so variables are available in the factory.
const hoisted = vi.hoisted(() => {
  const state = {
    projectData: null as Record<string, unknown> | null,
    projectExists: true,
  };

  const mockProjectUpdate = vi.fn().mockResolvedValue(undefined);

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

  const mockCollection = vi.fn(() => ({
    doc: vi.fn(() => projectDocRef),
  }));

  return { state, mockProjectUpdate, mockCollection };
});

vi.mock("@/lib/firebaseAdmin", () => ({
  db: { collection: hoisted.mockCollection },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { PUT, DELETE, PATCH } from "../route";
import { actAs, logAdminActionMock, TEST_ACTOR_UID } from "@/lib/adminAccess/testing";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(method: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/projects/project-123", {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: "project-123" });

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  actAs("admin");
  hoisted.state.projectExists = true;
  hoisted.state.projectData = { status: "completed", title: "Test Project" };
});

describe("PUT /api/admin/projects/[id]: reactivate action", () => {
  it("returns 401 when signed out", async () => {
    actAs("signed-out");
    const res = await PUT(makeRequest("PUT", { action: "reactivate" }), { params });

    expect(res.status).toBe(401);
    expect(hoisted.mockProjectUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when the project is not completed", async () => {
    hoisted.state.projectData = { status: "active", title: "Test Project" };

    const res = await PUT(makeRequest("PUT", { action: "reactivate" }), { params });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/only completed projects can be reactivated/i);
    expect(hoisted.mockProjectUpdate).not.toHaveBeenCalled();
  });

  it("reactivates a completed project and attributes it to the real actor", async () => {
    const res = await PUT(makeRequest("PUT", { action: "reactivate" }), { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    expect(hoisted.mockProjectUpdate).toHaveBeenCalledTimes(1);
    const updatePayload = hoisted.mockProjectUpdate.mock.calls[0][0];
    expect(updatePayload.status).toBe("active");
    // completedAt must be cleared so the project no longer reads as completed.
    expect(updatePayload.completedAt).toEqual({ _type: "delete" });
    expect(updatePayload.reactivatedBy).toBe(TEST_ACTOR_UID);
  });

  it("lets a moderator reactivate and logs the action", async () => {
    actAs("moderator");
    const res = await PUT(makeRequest("PUT", { action: "reactivate" }), { params });

    expect(res.status).toBe(200);
    expect(hoisted.mockProjectUpdate).toHaveBeenCalledTimes(1);
    expect(logAdminActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ uid: TEST_ACTOR_UID, role: "moderator" }),
      "projects.reactivate",
      expect.objectContaining({ type: "project", id: "project-123" })
    );
  });
});

describe("PUT /api/admin/projects/[id]: per-action authorization", () => {
  it("rejects decline from a moderator with 403 and no write", async () => {
    actAs("moderator");
    hoisted.state.projectData = { status: "pending", title: "Test Project" };

    const res = await PUT(
      makeRequest("PUT", { action: "decline", declineReason: "Not a fit for the program" }),
      { params }
    );

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Admins only");
    expect(hoisted.mockProjectUpdate).not.toHaveBeenCalled();
    expect(hoisted.mockCollection).not.toHaveBeenCalled();
    expect(logAdminActionMock).not.toHaveBeenCalled();
  });

  it("rejects decline_update from a moderator with 403", async () => {
    actAs("moderator");
    const res = await PUT(makeRequest("PUT", { action: "decline_update" }), { params });
    expect(res.status).toBe(403);
    expect(hoisted.mockProjectUpdate).not.toHaveBeenCalled();
  });

  it("lets an admin decline and records the real actor", async () => {
    hoisted.state.projectData = { status: "pending", title: "Test Project" };

    const res = await PUT(
      makeRequest("PUT", { action: "decline", declineReason: "Not a fit for the program" }),
      { params }
    );

    expect(res.status).toBe(200);
    expect(hoisted.mockProjectUpdate.mock.calls[0][0].declinedBy).toBe(TEST_ACTOR_UID);
    expect(logAdminActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ role: "admin" }),
      "projects.decline",
      expect.objectContaining({ id: "project-123" }),
      { reason: "Not a fit for the program" }
    );
  });

  it("returns 400 for an unknown action after authorizing", async () => {
    actAs("moderator");
    const res = await PUT(makeRequest("PUT", { action: "toString" }), { params });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/admin/projects/[id]", () => {
  it("rejects a moderator with 403 before reading or deleting anything", async () => {
    actAs("moderator");
    const res = await DELETE(makeRequest("DELETE", { reason: "Spam project, removing it" }), {
      params,
    });

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Admins only");
    expect(hoisted.mockCollection).not.toHaveBeenCalled();
    expect(logAdminActionMock).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/projects/[id]", () => {
  it("lets a moderator edit fields and logs the edit", async () => {
    actAs("moderator");
    hoisted.state.projectData = { status: "active", title: "Test Project" };

    const res = await PATCH(makeRequest("PATCH", { title: "Renamed project" }), { params });

    expect(res.status).toBe(200);
    expect(hoisted.mockProjectUpdate.mock.calls[0][0].title).toBe("Renamed project");
    expect(logAdminActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ role: "moderator" }),
      "projects.edit",
      expect.objectContaining({ id: "project-123" }),
      { fields: ["title"] }
    );
  });
});
