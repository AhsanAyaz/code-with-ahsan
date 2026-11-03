import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock(
  "@/lib/adminAccess/server",
  async () => (await import("@/lib/adminAccess/testing")).adminAccessServerMock
);

// In-memory admin_audit_log supporting where(==) / orderBy(createdAt desc) /
// startAfter(docSnap) / limit, and recording each query's shape.
const hoisted = vi.hoisted(() => {
  type Entry = { id: string; data: Record<string, unknown>; ms: number };
  const entries: Entry[] = [];
  const queries: { where: [string, unknown][]; orderBy: [string, string][] }[] = [];

  const snapOf = (e: Entry | undefined, id: string) => ({
    id,
    exists: Boolean(e),
    data: () => e?.data,
    __ms: e?.ms,
  });

  function makeQuery(state: {
    where: [string, unknown][];
    orderBy: [string, string][];
    after?: number;
    limit?: number;
  }) {
    return {
      where: (field: string, _op: string, value: unknown) =>
        makeQuery({ ...state, where: [...state.where, [field, value]] }),
      orderBy: (field: string, dir: string) =>
        makeQuery({ ...state, orderBy: [...state.orderBy, [field, dir]] }),
      startAfter: (snap: { __ms: number }) => makeQuery({ ...state, after: snap.__ms }),
      limit: (n: number) => makeQuery({ ...state, limit: n }),
      get: async () => {
        queries.push({ where: state.where, orderBy: state.orderBy });
        let rows = entries.filter((e) => state.where.every(([f, v]) => e.data[f] === v));
        rows = rows.sort((a, b) => b.ms - a.ms);
        if (state.after !== undefined) rows = rows.filter((e) => e.ms < state.after!);
        if (state.limit !== undefined) rows = rows.slice(0, state.limit);
        return { docs: rows.map((e) => snapOf(e, e.id)) };
      },
    };
  }

  const collection = vi.fn((name: string) => {
    if (name !== "admin_audit_log") throw new Error(`unexpected collection ${name}`);
    return {
      ...makeQuery({ where: [], orderBy: [] }),
      doc: (id: string) => ({
        get: async () =>
          snapOf(
            entries.find((e) => e.id === id),
            id
          ),
      }),
    };
  });

  return { entries, queries, collection };
});

vi.mock("@/lib/firebaseAdmin", () => ({
  db: { collection: hoisted.collection },
}));

import { GET } from "../route";
import { actAs } from "@/lib/adminAccess/testing";

function req(query = "") {
  return new NextRequest(`http://localhost/api/admin/activity${query}`, {
    headers: { Authorization: "Bearer t" },
  });
}

function seed() {
  hoisted.entries.length = 0;
  const base = Date.parse("2026-11-03T00:00:00.000Z");
  for (let i = 0; i < 7; i++) {
    const actorUid = i % 2 === 0 ? "alice" : "bob";
    const action = i < 3 ? "projects.delete" : "mentorship.profile.accept";
    hoisted.entries.push({
      id: `e${i}`,
      ms: base + i * 60_000,
      data: {
        actorUid,
        actorEmail: `${actorUid}@example.com`,
        actorRole: actorUid === "alice" ? "admin" : "moderator",
        action,
        target: { type: "project", id: `p${i}` },
        createdAt: { toDate: () => new Date(base + i * 60_000) },
      },
    });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  actAs("admin");
  hoisted.queries.length = 0;
  seed();
});

describe("GET /api/admin/activity", () => {
  it("is admin only: moderators get 403", async () => {
    actAs("moderator");
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Admins only");
  });

  it("returns 401 when signed out", async () => {
    actAs("signed-out");
    expect((await GET(req())).status).toBe(401);
  });

  it("returns newest first, ordered by createdAt desc", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    const { entries, nextCursor } = await res.json();
    expect(entries.map((e: { id: string }) => e.id)).toEqual([
      "e6",
      "e5",
      "e4",
      "e3",
      "e2",
      "e1",
      "e0",
    ]);
    expect(nextCursor).toBeNull();
    expect(entries[0]).toMatchObject({
      actorEmail: "alice@example.com",
      actorRole: "admin",
      action: "mentorship.profile.accept",
      target: { type: "project", id: "p6" },
      createdAt: "2026-11-03T00:06:00.000Z",
    });
    expect(hoisted.queries[0].orderBy).toEqual([["createdAt", "desc"]]);
  });

  it("paginates with a cursor (startAfter the last doc id)", async () => {
    const first = await (await GET(req("?limit=3"))).json();
    expect(first.entries.map((e: { id: string }) => e.id)).toEqual(["e6", "e5", "e4"]);
    expect(first.nextCursor).toBe("e4");

    const second = await (await GET(req(`?limit=3&cursor=${first.nextCursor}`))).json();
    expect(second.entries.map((e: { id: string }) => e.id)).toEqual(["e3", "e2", "e1"]);
    expect(second.nextCursor).toBe("e1");

    const third = await (await GET(req(`?limit=3&cursor=${second.nextCursor}`))).json();
    expect(third.entries.map((e: { id: string }) => e.id)).toEqual(["e0"]);
    expect(third.nextCursor).toBeNull();
  });

  it("rejects an unknown cursor", async () => {
    expect((await GET(req("?cursor=missing"))).status).toBe(400);
  });

  it("filters by actor uid (equality + createdAt desc)", async () => {
    const { entries } = await (await GET(req("?actor=bob"))).json();
    expect(entries.map((e: { id: string }) => e.id)).toEqual(["e5", "e3", "e1"]);
    expect(hoisted.queries[0]).toEqual({
      where: [["actorUid", "bob"]],
      orderBy: [["createdAt", "desc"]],
    });
  });

  it("filters by action id (equality + createdAt desc)", async () => {
    const { entries } = await (await GET(req("?action=projects.delete"))).json();
    expect(entries.map((e: { id: string }) => e.id)).toEqual(["e2", "e1", "e0"]);
    expect(hoisted.queries[0]).toEqual({
      where: [["action", "projects.delete"]],
      orderBy: [["createdAt", "desc"]],
    });
  });

  it("rejects an unknown action id", async () => {
    expect((await GET(req("?action=nope.nope"))).status).toBe(400);
  });

  it("rejects filtering by actor and action together (no index for that)", async () => {
    expect((await GET(req("?actor=bob&action=projects.delete"))).status).toBe(400);
  });

  it("clamps limit to 1..100", async () => {
    const { entries } = await (await GET(req("?limit=0"))).json();
    expect(entries).toHaveLength(1);
  });
});
