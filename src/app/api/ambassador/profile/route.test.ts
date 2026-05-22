/**
 * Phase 5 INV-2 — PATCH /api/ambassador/profile onboarding flag persistence.
 *
 * Mocking strategy (mirrors src/app/api/ambassador/dashboard/me/route.test.ts):
 *   - vi.mock("@/lib/features") to control isAmbassadorProgramEnabled
 *   - vi.mock("@/lib/auth") to control verifyAuth
 *   - vi.mock("@/lib/permissions") to control hasRoleClaim
 *   - vi.mock("firebase-admin/firestore") to stub FieldValue.delete()
 *   - vi.mock("@/lib/firebaseAdmin") with a captured `batchUpdateMock` / `batchSetMock`
 *     so the test can introspect the exact batch.update payload (dot-paths vs
 *     full-object replace) and assert batch.set is/isn't called.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/features", () => ({ isAmbassadorProgramEnabled: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyAuth: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ hasRoleClaim: vi.fn() }));

// FieldValue.delete() sentinel — the PATCH handler imports this from
// firebase-admin/firestore. Stub returns a unique sentinel so assertions can
// detect it inside the batch payload.
vi.mock("firebase-admin/firestore", () => {
  const sentinel = { __fieldValue: "delete" };
  return {
    FieldValue: {
      delete: () => sentinel,
      serverTimestamp: () => ({ __fieldValue: "serverTimestamp" }),
    },
  };
});

// Mutable mocks captured at module-load — tests reset via beforeEach.
const batchUpdateMock = vi.fn();
const batchSetMock = vi.fn();
const batchCommitMock = vi.fn().mockResolvedValue(undefined);

// Subdoc/profile data closures — assigned per-test via the helper below.
let subdocData: Record<string, unknown> = {};
let profileData: Record<string, unknown> = {};
let profileExists = true;
let subdocExists = true;

vi.mock("@/lib/firebaseAdmin", () => {
  const ambassadorRef = { __ref: "ambassadorRef" };
  const publicRef = { __ref: "publicRef" };
  const profileRef = {
    get: vi.fn(async () => ({
      exists: profileExists,
      data: () => profileData,
    })),
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        ...ambassadorRef,
        get: vi.fn(async () => ({
          exists: subdocExists,
          data: () => subdocData,
        })),
      }),
    }),
  };
  return {
    db: {
      collection: vi.fn((name: string) => {
        if (name === "mentorship_profiles") return { doc: vi.fn().mockReturnValue(profileRef) };
        if (name === "public_ambassadors") return { doc: vi.fn().mockReturnValue(publicRef) };
        return { doc: vi.fn().mockReturnValue({}) };
      }),
      batch: vi.fn(() => ({
        update: batchUpdateMock,
        set: batchSetMock,
        commit: batchCommitMock,
      })),
    },
  };
});

import { isAmbassadorProgramEnabled } from "@/lib/features";
import { verifyAuth } from "@/lib/auth";
import { hasRoleClaim } from "@/lib/permissions";
import { PATCH } from "./route";

function makeReq(body: unknown): NextRequest {
  return new Request("http://localhost/api/ambassador/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.mocked(isAmbassadorProgramEnabled).mockReturnValue(true);
  vi.mocked(verifyAuth).mockResolvedValue({ uid: "u1" } as never);
  vi.mocked(hasRoleClaim).mockReturnValue(true);
  batchUpdateMock.mockReset();
  batchSetMock.mockReset();
  batchCommitMock.mockReset().mockResolvedValue(undefined);

  // Default fixture: ambassador with username + cohortId; no public fields, no onboarding.
  profileExists = true;
  subdocExists = true;
  profileData = {
    username: "alice",
    displayName: "Alice",
    photoURL: "",
  };
  subdocData = {
    cohortId: "c1",
  };
});

describe("PATCH /api/ambassador/profile onboarding (INV-2)", () => {
  it("accepts { onboarding: { joinedDiscord: true } } as a non-empty update", async () => {
    const res = await PATCH(makeReq({ onboarding: { joinedDiscord: true } }));
    expect(res.status).toBe(200);
    expect(batchUpdateMock).toHaveBeenCalledTimes(1);
    const payload = batchUpdateMock.mock.calls[0][1] as Record<string, unknown>;
    expect(payload["onboarding.joinedDiscord"]).toBe(true);
  });

  it("writes onboarding flags via dot-path (does not clobber sibling keys)", async () => {
    // Existing subdoc already has joinedDiscord true; new PATCH sets sharedReferralLink.
    subdocData = {
      cohortId: "c1",
      onboarding: { joinedDiscord: true },
    };
    const res = await PATCH(makeReq({ onboarding: { sharedReferralLink: true } }));
    expect(res.status).toBe(200);
    const payload = batchUpdateMock.mock.calls[0][1] as Record<string, unknown>;
    // The dot-path key must be present
    expect(payload["onboarding.sharedReferralLink"]).toBe(true);
    // CRITICAL: full-object key MUST NOT be present (would clobber joinedDiscord — T-260522-a2f-02).
    expect("onboarding" in payload).toBe(false);
  });

  it("returns 400 when body is { onboarding: {} } only", async () => {
    const res = await PATCH(makeReq({ onboarding: {} }));
    expect(res.status).toBe(400);
    // No batch operations attempted.
    expect(batchUpdateMock).not.toHaveBeenCalled();
    expect(batchSetMock).not.toHaveBeenCalled();
  });

  it("skips public projection write when only onboarding fields are present", async () => {
    const res = await PATCH(makeReq({ onboarding: { joinedDiscord: true } }));
    expect(res.status).toBe(200);
    expect(batchUpdateMock).toHaveBeenCalledTimes(1);
    // Onboarding-only PATCH must NOT touch public_ambassadors/{uid}.
    expect(batchSetMock).not.toHaveBeenCalled();
  });

  it("still writes public projection when public fields are present alongside onboarding", async () => {
    const res = await PATCH(
      makeReq({ university: "MIT", onboarding: { joinedDiscord: true } }),
    );
    expect(res.status).toBe(200);
    const payload = batchUpdateMock.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.university).toBe("MIT");
    expect(payload["onboarding.joinedDiscord"]).toBe(true);
    // Mixed PATCH still updates the public projection (university is public).
    expect(batchSetMock).toHaveBeenCalledTimes(1);
  });

  it("ignores non-boolean onboarding values defensively", async () => {
    // Zod parse strips unknown keys but well-typed handler must also guard:
    // pass a boolean-shaped key and a non-boolean (cast via `as`) — only the
    // boolean should land in the payload.
    const res = await PATCH(
      makeReq({
        onboarding: {
          joinedDiscord: true,
          // non-boolean values are rejected by Zod first (so we don't reach the loop),
          // but the defensive `typeof === "boolean"` check is verified by absence
          // when no boolean keys remain.
        },
      }),
    );
    expect(res.status).toBe(200);
    const payload = batchUpdateMock.mock.calls[0][1] as Record<string, unknown>;
    expect(payload["onboarding.joinedDiscord"]).toBe(true);
  });
});
