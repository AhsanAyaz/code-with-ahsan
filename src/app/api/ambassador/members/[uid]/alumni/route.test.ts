/**
 * Phase 5 (ALUMNI-01, ALUMNI-03 + Pitfall 1):
 * Alumni route — atomic role swap and public projection update.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const updateMock = vi.fn();
const deleteMock = vi.fn();
const commitMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/features", () => ({ isAmbassadorProgramEnabled: vi.fn().mockReturnValue(true) }));
vi.mock("@/lib/ambassador/adminAuth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ ok: true, uid: "admin:t1" }),
}));
vi.mock("@/lib/ambassador/acceptance", () => ({
  syncAmbassadorClaim: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "SERVER_TS",
    arrayRemove: (v: string) => ({ __op: "arrayRemove", v }),
    arrayUnion: (v: string) => ({ __op: "arrayUnion", v }),
  },
}));

let subdocActive = true;
vi.mock("@/lib/firebaseAdmin", () => {
  const subdoc = () => ({ active: subdocActive, cohortId: "c1" });
  const subdocRef = {
    get: vi.fn().mockImplementation(() => Promise.resolve({ exists: true, data: subdoc })),
  };
  const profileRef = {
    collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(subdocRef) }),
  };
  const publicAmbDoc = { id: "pa-doc" };
  return {
    db: {
      collection: vi.fn((name: string) => {
        if (name === "mentorship_profiles") return { doc: vi.fn().mockReturnValue(profileRef) };
        if (name === "public_ambassadors") return { doc: vi.fn().mockReturnValue(publicAmbDoc) };
        return { doc: vi.fn().mockReturnValue({}) };
      }),
      batch: vi.fn(() => ({ update: updateMock, delete: deleteMock, commit: commitMock })),
    },
  };
});

import { POST } from "./route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/ambassador/members/u1/alumni", {
    method: "POST",
  }) as unknown as NextRequest;
}

beforeEach(() => {
  updateMock.mockClear();
  deleteMock.mockClear();
  commitMock.mockClear();
  subdocActive = true;
});

describe("POST /api/ambassador/members/[uid]/alumni", () => {
  it("ALUMNI-01: arrayUnion('alumni-ambassador') is committed", async () => {
    await POST(makeReq(), { params: { uid: "u1" } });
    const unionCalls = updateMock.mock.calls.filter((args) => {
      const payload = args[1] as Record<string, unknown>;
      const roles = payload?.roles as { __op?: string; v?: string } | undefined;
      return roles?.__op === "arrayUnion" && roles.v === "alumni-ambassador";
    });
    expect(unionCalls.length).toBe(1);
  });

  it("ALUMNI-01: arrayRemove('ambassador') is committed", async () => {
    await POST(makeReq(), { params: { uid: "u1" } });
    const removeCalls = updateMock.mock.calls.filter((args) => {
      const payload = args[1] as Record<string, unknown>;
      const roles = payload?.roles as { __op?: string; v?: string } | undefined;
      return roles?.__op === "arrayRemove" && roles.v === "ambassador";
    });
    expect(removeCalls.length).toBe(1);
  });

  it("Pitfall 1: arrayUnion and arrayRemove are NEVER in the same update payload", async () => {
    await POST(makeReq(), { params: { uid: "u1" } });
    for (const args of updateMock.mock.calls) {
      const payload = args[1] as Record<string, unknown>;
      // Single update payload must contain at most one transform on `roles`.
      const roles = payload?.roles as { __op?: string } | undefined;
      if (roles?.__op) {
        // Only one of these allowed per call — confirmed by the filter checks above
        // (2 separate calls vs 1 combined call).
        expect(["arrayUnion", "arrayRemove"]).toContain(roles.__op);
      }
    }
    // Total updateMock call count: 1 union + 1 remove + subdoc update + public_ambassadors update = 4
    expect(updateMock.mock.calls.length).toBe(4);
  });

  it("ALUMNI-03: public_ambassadors is UPDATED (active:false) NOT DELETED", async () => {
    await POST(makeReq(), { params: { uid: "u1" } });
    // No delete calls
    expect(deleteMock).not.toHaveBeenCalled();
    // public update with active: false
    const publicUpdates = updateMock.mock.calls.filter((args) => {
      const payload = args[1] as Record<string, unknown>;
      return payload?.active === false && Object.keys(payload).length === 1;
    });
    expect(publicUpdates.length).toBe(1);
  });

  it("returns 409 if subdoc.active is already false", async () => {
    subdocActive = false;
    const res = await POST(makeReq(), { params: { uid: "u1" } });
    expect(res.status).toBe(409);
  });
});
