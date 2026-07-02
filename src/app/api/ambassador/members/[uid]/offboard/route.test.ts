/**
 * Phase 5 (ALUMNI-02 + DISC-05 + EMAIL-04):
 * Offboard route — invariants and soft-fail behavior.
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
vi.mock("@/lib/discord", () => ({
  removeDiscordRole: vi.fn(),
  DISCORD_AMBASSADOR_ROLE_ID: "role-1",
}));
vi.mock("@/lib/email", () => ({
  sendAmbassadorOffboardingEmail: vi.fn(),
}));
vi.mock("@/lib/firebaseAdmin", () => {
  const subdoc = {
    active: true,
    cohortId: "c1",
    discordMemberId: "123456789012345678",
    strikes: 2,
  };
  const profile = { displayName: "Jane", email: "jane@example.com" };
  const cohort = { name: "Cohort 1" };
  const subdocRef = {
    get: vi.fn().mockResolvedValue({ exists: true, data: () => subdoc }),
  };
  const profileRef = {
    get: vi.fn().mockResolvedValue({ exists: true, data: () => profile }),
    collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(subdocRef) }),
  };
  const cohortRef = {
    get: vi.fn().mockResolvedValue({ exists: true, data: () => cohort }),
  };
  return {
    db: {
      collection: vi.fn((name: string) => {
        if (name === "mentorship_profiles") return { doc: vi.fn().mockReturnValue(profileRef) };
        if (name === "cohorts") return { doc: vi.fn().mockReturnValue(cohortRef) };
        if (name === "public_ambassadors")
          return { doc: vi.fn().mockReturnValue({ id: "pa-doc" }) };
        return { doc: vi.fn().mockReturnValue({}) };
      }),
      batch: vi.fn(() => ({ update: updateMock, delete: deleteMock, commit: commitMock })),
    },
  };
});
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "SERVER_TS",
    arrayRemove: (v: string) => ({ __op: "arrayRemove", v }),
    arrayUnion: (v: string) => ({ __op: "arrayUnion", v }),
    increment: (n: number) => ({ __op: "increment", n }),
  },
}));

import { removeDiscordRole } from "@/lib/discord";
import { sendAmbassadorOffboardingEmail } from "@/lib/email";
import { POST } from "./route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/ambassador/members/u1/offboard", {
    method: "POST",
  }) as unknown as NextRequest;
}

beforeEach(() => {
  updateMock.mockClear();
  deleteMock.mockClear();
  commitMock.mockClear();
  vi.mocked(removeDiscordRole).mockReset();
  vi.mocked(sendAmbassadorOffboardingEmail).mockReset();
});

describe("POST /api/ambassador/members/[uid]/offboard", () => {
  it("ALUMNI-02: never calls arrayUnion('alumni-ambassador')", async () => {
    vi.mocked(removeDiscordRole).mockResolvedValue(true);
    vi.mocked(sendAmbassadorOffboardingEmail).mockResolvedValue(true);
    await POST(makeReq(), { params: { uid: "u1" } });

    const arrayUnionCalls = updateMock.mock.calls.filter((args) => {
      const payload = args[1] as Record<string, unknown>;
      const roles = payload?.roles as { __op?: string; v?: string } | undefined;
      return roles?.__op === "arrayUnion" && roles.v === "alumni-ambassador";
    });
    expect(arrayUnionCalls.length).toBe(0);
  });

  it("DISC-05: returns discordRemoved=true on Discord success", async () => {
    vi.mocked(removeDiscordRole).mockResolvedValue(true);
    vi.mocked(sendAmbassadorOffboardingEmail).mockResolvedValue(true);
    const res = await POST(makeReq(), { params: { uid: "u1" } });
    const body = (await res.json()) as { discordRemoved: boolean };
    expect(res.status).toBe(200);
    expect(body.discordRemoved).toBe(true);
  });

  it("DISC-05 soft-fail: returns 200 even when Discord removal returns false", async () => {
    vi.mocked(removeDiscordRole).mockResolvedValue(false);
    vi.mocked(sendAmbassadorOffboardingEmail).mockResolvedValue(true);
    const res = await POST(makeReq(), { params: { uid: "u1" } });
    const body = (await res.json()) as { discordRemoved: boolean; emailSent: boolean };
    expect(res.status).toBe(200);
    expect(body.discordRemoved).toBe(false);
    expect(body.emailSent).toBe(true);
  });

  it("EMAIL-04 soft-fail: returns 200 even when email send fails", async () => {
    vi.mocked(removeDiscordRole).mockResolvedValue(true);
    vi.mocked(sendAmbassadorOffboardingEmail).mockResolvedValue(false);
    const res = await POST(makeReq(), { params: { uid: "u1" } });
    const body = (await res.json()) as { discordRemoved: boolean; emailSent: boolean };
    expect(res.status).toBe(200);
    expect(body.emailSent).toBe(false);
  });

  it("public_ambassadors doc is deleted in the batch (Pitfall 3)", async () => {
    vi.mocked(removeDiscordRole).mockResolvedValue(true);
    vi.mocked(sendAmbassadorOffboardingEmail).mockResolvedValue(true);
    await POST(makeReq(), { params: { uid: "u1" } });
    expect(deleteMock).toHaveBeenCalled();
  });

  it("GH#253: decrements cohort acceptedCount on offboard", async () => {
    vi.mocked(removeDiscordRole).mockResolvedValue(true);
    vi.mocked(sendAmbassadorOffboardingEmail).mockResolvedValue(true);
    await POST(makeReq(), { params: { uid: "u1" } });
    const decrements = updateMock.mock.calls.filter((args) => {
      const payload = args[1] as Record<string, unknown>;
      const field = payload?.acceptedCount as { __op?: string; n?: number } | undefined;
      return field?.__op === "increment" && field.n === -1;
    });
    expect(decrements.length).toBe(1);
  });
});
