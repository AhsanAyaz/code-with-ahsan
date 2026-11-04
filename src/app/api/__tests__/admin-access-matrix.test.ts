import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Cross-route access matrix for the admin portal cutover.
 *
 *   - Destructive (admin-only) operations: a moderator gets 403 "Admins only"
 *     and the handler performs no Firestore reads or writes and no side effects.
 *   - Moderator-allowed writes: a moderator succeeds and the write is audited
 *     through logAdminAction with the real actor.
 *
 * Per-route behaviour beyond authorization is covered by each route's own tests.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock(
  "@/lib/adminAccess/server",
  async () => (await import("@/lib/adminAccess/testing")).adminAccessServerMock
);

const fx = vi.hoisted(() => {
  // Every Firestore call is recorded as "op path" so tests can assert that a
  // rejected request touched nothing.
  const ops: string[] = [];
  const docData: Record<string, unknown> = {
    title: "Thing",
    name: "Thing",
    email: "x@example.com",
    status: "pending",
    isApproved: false,
  };

  const makeDoc = (path: string): Record<string, unknown> => {
    const ref: Record<string, unknown> = {
      id: path.split("/").pop(),
      path,
      get: vi.fn(async () => {
        ops.push(`get ${path}`);
        return { exists: true, id: path.split("/").pop(), data: () => docData, ref };
      }),
      set: vi.fn(async () => {
        ops.push(`set ${path}`);
      }),
      update: vi.fn(async () => {
        ops.push(`update ${path}`);
      }),
      delete: vi.fn(async () => {
        ops.push(`delete ${path}`);
      }),
      collection: (name: string) => makeCollection(`${path}/${name}`),
    };
    return ref;
  };

  const makeCollection = (path: string): Record<string, unknown> => ({
    doc: (id?: string) => makeDoc(`${path}/${id ?? "auto-id"}`),
    add: vi.fn(async () => {
      ops.push(`add ${path}`);
      return { id: "auto-id" };
    }),
    get: vi.fn(async () => {
      ops.push(`query ${path}`);
      return { docs: [], empty: true, size: 0 };
    }),
    where: () => makeCollection(path),
    orderBy: () => makeCollection(path),
    limit: () => makeCollection(path),
  });

  const db = {
    collection: (name: string) => makeCollection(name),
    doc: (path: string) => makeDoc(path),
    batch: () => ({
      update: (ref: { path: string }) => ops.push(`batch.update ${ref.path}`),
      delete: (ref: { path: string }) => ops.push(`batch.delete ${ref.path}`),
      set: (ref: { path: string }) => ops.push(`batch.set ${ref.path}`),
      commit: vi.fn(async () => {
        ops.push("batch.commit");
      }),
    }),
    runTransaction: vi.fn(async () => {
      ops.push("transaction");
      return { ok: true, strikes: 1 };
    }),
  };

  return { ops, db };
});

vi.mock("@/lib/firebaseAdmin", () => ({ db: fx.db, auth: {}, storage: null }));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "SERVER_TS",
    delete: () => "DELETE",
    arrayRemove: (v: unknown) => ({ arrayRemove: v }),
    arrayUnion: (v: unknown) => ({ arrayUnion: v }),
    increment: (n: number) => ({ increment: n }),
  },
}));
vi.mock("@/lib/features", () => ({ isAmbassadorProgramEnabled: () => true }));
vi.mock("@/lib/discord", () => ({
  announceChallenge: vi.fn(),
  isDiscordConfigured: () => false,
  createProjectChannel: vi.fn(),
  sendProjectDetailsMessage: vi.fn(),
  archiveProjectChannel: vi.fn(),
  sendDirectMessage: vi.fn(),
  sendNewProjectAnnouncementToCollaborators: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  verifyAuth: vi.fn(async () => ({ uid: "staff-uid-1", email: "staff@example.com" })),
}));
vi.mock("@/lib/email", () => ({
  sendEmailBatch: vi.fn(async () => []),
  sendAmbassadorApplicationAcceptedEmail: vi.fn(),
  sendAmbassadorApplicationDeclinedEmail: vi.fn(),
}));
vi.mock("@/lib/ambassador/acceptance", () => ({
  runAcceptanceTransaction: vi.fn(),
  assignAmbassadorDiscordRoleSoft: vi.fn(),
  syncAmbassadorClaim: vi.fn(),
}));
vi.mock("@/lib/admin-broadcast/resolveRecipients", () => ({
  resolveGroupRecipients: vi.fn(async () => []),
}));
vi.mock("@/services/ChallengeService", () => ({
  getChallenges: vi.fn(async () => []),
  getChallenge: vi.fn(async () => ({ id: "ch1", title: "Challenge", status: "draft" })),
  createChallenge: vi.fn(async (data: Record<string, unknown>) => ({ id: "ch-new", ...data })),
  updateChallenge: vi.fn(async () => {}),
  deleteChallenge: vi.fn(async () => {}),
}));
vi.mock("@/lib/course-mdx", () => ({
  deleteCourse: vi.fn(async () => {}),
  updateCourse: vi.fn(async () => {}),
}));
vi.mock("child_process", () => ({ execSync: vi.fn() }));
vi.mock("@/lib/consulting/config", () => ({ getConsultingSettings: vi.fn(async () => ({})) }));
vi.mock("@/lib/consulting/reviewEmail", () => ({ sendConsultingReviewRequestEmail: vi.fn() }));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { actAs, logAdminActionMock, TEST_ACTOR_UID } from "@/lib/adminAccess/testing";
import { deleteChallenge, createChallenge } from "@/services/ChallengeService";
import { deleteCourse, updateCourse } from "@/lib/course-mdx";
import { sendEmailBatch } from "@/lib/email";
import { runAcceptanceTransaction } from "@/lib/ambassador/acceptance";
import { DELETE as challengeDELETE } from "../admin/challenges/[id]/route";
import { POST as challengePOST } from "../admin/challenges/route";
import { DELETE as courseDELETE, PATCH as coursePATCH } from "../admin/courses/[slug]/route";
import { PUT as consultingPUT, POST as consultingPOST } from "../admin/consulting/route";
import { POST as broadcastPOST } from "../admin/broadcast/route";
import {
  PUT as winnersPUT,
  DELETE as winnersDELETE,
} from "../admin/events/[eventId]/winners/route";
import { DELETE as bypassDELETE } from "../admin/ambassador/eligibility-bypasses/[uid]/route";
import {
  PATCH as applicationPATCH,
  DELETE as applicationDELETE,
} from "../ambassador/applications/[applicationId]/route";
import { DELETE as memberDELETE } from "../ambassador/members/[uid]/route";
import { POST as strikePOST } from "../ambassador/members/[uid]/strike/route";
import { PATCH as eventsAdminPATCH } from "../ambassador/events/admin/route";
import { POST as cohortPOST } from "../ambassador/cohorts/route";
import { POST as rafflePOST } from "../raffle/spin/route";
import { PUT as alertsPUT } from "../mentorship/admin/alerts/route";
import { PUT as projectPUT } from "../projects/[id]/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function req(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const p = <T extends Record<string, string>>(v: T) => ({ params: Promise.resolve(v) });

type Call = () => Promise<Response>;

beforeEach(() => {
  vi.clearAllMocks();
  fx.ops.length = 0;
  actAs("admin");
});

// ─── Destructive operations: moderator gets 403, nothing happens ──────────────

const destructive: Array<{ name: string; call: Call; sideEffect?: () => unknown }> = [
  {
    name: "DELETE admin/challenges/[id]",
    call: () => challengeDELETE(req("DELETE"), p({ id: "ch1" })),
    sideEffect: () => deleteChallenge,
  },
  {
    name: "DELETE admin/courses/[slug]",
    call: () => courseDELETE(req("DELETE"), p({ slug: "course-a" })),
    sideEffect: () => deleteCourse,
  },
  {
    name: "PUT admin/consulting (settings)",
    call: () => consultingPUT(req("PUT", { adminEmail: "evil@example.com" })),
  },
  {
    name: "POST admin/broadcast",
    call: () => broadcastPOST(req("POST", { group: "mentors", subject: "Hi", message: "Hello" })),
    sideEffect: () => sendEmailBatch,
  },
  {
    name: "DELETE admin/events/[eventId]/winners",
    call: () => winnersDELETE(req("DELETE"), p({ eventId: "ev1" })),
  },
  {
    name: "DELETE admin/ambassador/eligibility-bypasses/[uid]",
    call: () => bypassDELETE(req("DELETE"), p({ uid: "u1" })),
  },
  {
    name: "PATCH ambassador/applications/[id] action=decline",
    call: () => applicationPATCH(req("PATCH", { action: "decline" }), p({ applicationId: "a1" })),
  },
  {
    name: "DELETE ambassador/applications/[id]",
    call: () => applicationDELETE(req("DELETE"), p({ applicationId: "a1" })),
  },
  {
    name: "DELETE ambassador/members/[uid]",
    call: () => memberDELETE(req("DELETE"), { params: { uid: "u1" } }),
  },
  {
    name: "POST ambassador/members/[uid]/strike",
    call: () => strikePOST(req("POST"), { params: { uid: "u1" } }),
  },
];

describe("destructive admin operations", () => {
  describe.each(destructive)("$name", ({ call, sideEffect }) => {
    it("returns 403 Admins only for a moderator and has no side effects", async () => {
      actAs("moderator");
      const res = await call();
      expect(res.status).toBe(403);
      expect((await res.json()).error).toBe("Admins only");
      expect(fx.ops).toEqual([]);
      expect(logAdminActionMock).not.toHaveBeenCalled();
      if (sideEffect) expect(sideEffect()).not.toHaveBeenCalled();
    });

    it("returns 401 when signed out", async () => {
      actAs("signed-out");
      const res = await call();
      expect(res.status).toBe(401);
      expect(fx.ops).toEqual([]);
    });
  });

  it("accept on the same application route is allowed for a moderator", async () => {
    actAs("moderator");
    vi.mocked(runAcceptanceTransaction).mockResolvedValue({
      ok: true,
      applicationId: "a1",
      applicantUid: "app-uid",
      applicantEmail: "a@example.com",
      applicantName: "Applicant",
      cohortName: "Cohort",
      alreadyAccepted: true,
    } as never);
    const res = await applicationPATCH(
      req("PATCH", { action: "accept" }),
      p({ applicationId: "a1" })
    );
    expect(res.status).toBe(200);
    expect(runAcceptanceTransaction).toHaveBeenCalledWith("a1", TEST_ACTOR_UID, undefined);
    expect(logAdminActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ role: "moderator" }),
      "ambassador.application.accept",
      expect.objectContaining({ id: "a1" }),
      expect.anything()
    );
  });
});

// ─── Moderator-allowed writes: succeed and are audited ────────────────────────

const moderatorWrites: Array<{ name: string; action: string; call: Call; ok?: number }> = [
  {
    name: "PUT mentorship/admin/alerts",
    action: "mentorship.alert.resolve",
    call: () => alertsPUT(req("PUT", { alertId: "al1" })),
  },
  {
    name: "POST admin/challenges",
    action: "challenges.create",
    ok: 201,
    call: () =>
      challengePOST(
        req("POST", {
          title: "New challenge",
          description: "A challenge description that is long enough",
          startDate: "2026-11-10T00:00:00.000Z",
          endDate: "2026-11-20T00:00:00.000Z",
        })
      ),
  },
  {
    name: "PATCH admin/courses/[slug]",
    action: "courses.update",
    call: () => coursePATCH(req("PATCH", { isVisible: false }), p({ slug: "course-a" })),
  },
  {
    name: "POST admin/consulting toggle_review_approval",
    action: "consulting.review.toggleApproval",
    call: () => consultingPOST(req("POST", { action: "toggle_review_approval", reviewId: "r1" })),
  },
  {
    name: "PUT admin/events/[eventId]/winners",
    action: "events.winners.edit",
    call: () =>
      winnersPUT(
        req("PUT", {
          first: { teamName: "A" },
          second: { teamName: "B" },
          third: { teamName: "C" },
        }),
        p({ eventId: "ev1" })
      ),
  },
  {
    name: "PATCH ambassador/events/admin",
    action: "ambassador.event.setHidden",
    call: () => eventsAdminPATCH(req("PATCH", { eventId: "e1", hidden: true })),
  },
  {
    name: "POST ambassador/cohorts",
    action: "ambassador.cohort.create",
    ok: 201,
    call: () =>
      cohortPOST(
        req("POST", {
          name: "Cohort 9",
          startDate: "2026-12-01T00:00:00.000Z",
          endDate: "2027-03-01T00:00:00.000Z",
          maxSize: 20,
          status: "upcoming",
        })
      ),
  },
  {
    name: "POST raffle/spin action=reset",
    action: "raffle.spin",
    call: () => rafflePOST(req("POST", { action: "reset" })),
  },
];

describe("moderator-allowed admin writes", () => {
  describe.each(moderatorWrites)("$name", ({ action, call, ok }) => {
    it("succeeds for a moderator and calls logAdminAction", async () => {
      actAs("moderator");
      const res = await call();
      expect(res.status).toBe(ok ?? 200);
      expect(logAdminActionMock).toHaveBeenCalledTimes(1);
      expect(logAdminActionMock).toHaveBeenCalledWith(
        expect.objectContaining({ uid: TEST_ACTOR_UID, role: "moderator" }),
        action,
        expect.objectContaining({ type: expect.any(String), id: expect.any(String) }),
        ...(logAdminActionMock.mock.calls[0]?.length === 4 ? [expect.anything()] : [])
      );
    });
  });

  it("moderator challenge create reaches the service", async () => {
    actAs("moderator");
    await moderatorWrites[1].call();
    expect(createChallenge).toHaveBeenCalled();
  });

  it("moderator course visibility update reaches the service", async () => {
    actAs("moderator");
    await moderatorWrites[2].call();
    expect(updateCourse).toHaveBeenCalledWith("course-a", { isVisible: false });
  });
});

// ─── projects/[id] PUT: approve / decline are staff operations ────────────────

describe("PUT /api/projects/[id] approve and decline", () => {
  it("rejects approve from a signed-in user with no staff role", async () => {
    actAs("no-role");
    const res = await projectPUT(req("PUT", { action: "approve" }), p({ id: "pr1" }));
    expect(res.status).toBe(403);
    expect(fx.ops.filter((op) => !op.startsWith("get "))).toEqual([]);
  });

  it("rejects decline from a moderator", async () => {
    actAs("moderator");
    const res = await projectPUT(req("PUT", { action: "decline" }), p({ id: "pr1" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Admins only");
    expect(fx.ops.filter((op) => !op.startsWith("get "))).toEqual([]);
  });

  it("lets a moderator approve, attributed to the real actor", async () => {
    actAs("moderator");
    const res = await projectPUT(req("PUT", { action: "approve" }), p({ id: "pr1" }));
    expect(res.status).toBe(200);
    expect(fx.ops).toContain("update projects/pr1");
    expect(logAdminActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ uid: TEST_ACTOR_UID, role: "moderator" }),
      "projects.approve",
      expect.objectContaining({ type: "project", id: "pr1" })
    );
  });
});
