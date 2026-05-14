import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted() so mock variables are available when vi.mock factories run
const { mockGet, mockFindNearest, mockWhere, mockCollection } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockFindNearest = vi.fn(() => ({ get: mockGet }));
  const mockWhere = vi.fn(() => ({ where: mockWhere, findNearest: mockFindNearest }));
  const mockCollection = vi.fn(() => ({ where: mockWhere }));
  return { mockGet, mockFindNearest, mockWhere, mockCollection };
});

// Mock @google/genai BEFORE importing the route
// Must use a regular function (not arrow) so `new GoogleGenAI()` works
vi.mock("@google/genai", () => ({
  GoogleGenAI: function () {
    return {
      models: {
        embedContent: vi.fn().mockResolvedValue({
          embeddings: [{ values: new Array(768).fill(0.1) }],
        }),
      },
    };
  },
}));

// Mock @/lib/firebaseAdmin and firebase-admin/firestore
vi.mock("@/lib/firebaseAdmin", () => ({
  db: { collection: mockCollection },
}));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { vector: (v: number[]) => v },
}));

import { GET } from "../route";
import { NextRequest } from "next/server";

beforeEach(() => {
  process.env.GOOGLE_API_KEY = "test-key";
  mockGet.mockReset();
  mockFindNearest.mockReset();
  mockWhere.mockReset();
  mockCollection.mockReset();
  // Re-wire chained mock implementations after reset
  mockFindNearest.mockImplementation(() => ({ get: mockGet }));
  mockWhere.mockImplementation(() => ({ where: mockWhere, findNearest: mockFindNearest }));
  mockCollection.mockImplementation(() => ({ where: mockWhere }));
});

describe("GET /api/mentorship/mentors/semantic-search", () => {
  it("returns 400 when q is missing", async () => {
    const req = new NextRequest("http://test.local/api/mentorship/mentors/semantic-search");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing q/i);
  });

  it("returns shaped mentors when q is provided", async () => {
    mockGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            username: "muhammad-ali",
            displayName: "Muhammad Ali",
            bio: "Frontend specialist with 8 years of Angular and React experience.",
            expertise: ["Web Development"],
            status: "accepted",
            role: "mentor",
            avgRating: 4.8,
            completedMentorships: 12,
            activeMenteeCount: 2,
            maxMentees: 5,
            isAtCapacity: false,
          }),
          get: (field: string) => (field === "vector_distance" ? 0.18 : null),
        },
      ],
    });
    const req = new NextRequest("http://test.local/api/mentorship/mentors/semantic-search?q=Angular");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mentors).toHaveLength(1);
    expect(body.mentors[0]).toMatchObject({
      name: "Muhammad Ali",
      username: "muhammad-ali",
      url: "https://codewithahsan.dev/mentors/muhammad-ali",
      match_score: 0.18,
    });
    expect(body.mentors[0].bio_excerpt).toContain("Angular");
  });

  it("falls back to wider query on FAILED_PRECONDITION", async () => {
    // First .get() throws index error, second succeeds
    mockGet
      .mockRejectedValueOnce(new Error("FAILED_PRECONDITION: requires an index"))
      .mockResolvedValueOnce({ docs: [] });
    const req = new NextRequest("http://test.local/api/mentorship/mentors/semantic-search?q=test");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mentors).toEqual([]);
  });

  it("returns 500 on unexpected errors", async () => {
    mockGet.mockRejectedValue(new Error("network down"));
    const req = new NextRequest("http://test.local/api/mentorship/mentors/semantic-search?q=test");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("post-filters out non-accepted mentors", async () => {
    mockGet.mockResolvedValue({
      docs: [
        { data: () => ({ status: "pending", username: "x" }), get: () => 0.1 },
        { data: () => ({ status: "accepted", username: "y", bio: "ok" }), get: () => 0.2 },
      ],
    });
    const req = new NextRequest("http://test.local/api/mentorship/mentors/semantic-search?q=test");
    const res = await GET(req);
    const body = await res.json();
    expect(body.mentors).toHaveLength(1);
    expect(body.mentors[0].username).toBe("y");
  });
});
