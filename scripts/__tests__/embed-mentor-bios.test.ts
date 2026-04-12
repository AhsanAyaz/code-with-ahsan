import { describe, it, expect } from "vitest";
import {
  extractBioText,
  shouldEmbedMentor,
  EMBEDDING_DIM,
} from "../embed-mentor-bios";

describe("extractBioText", () => {
  it("prefers bio over about", () => {
    expect(extractBioText({ bio: "primary", about: "secondary" })).toBe("primary");
  });
  it("falls back to about when bio missing", () => {
    expect(extractBioText({ about: "fallback" })).toBe("fallback");
  });
  it("returns empty string when both missing", () => {
    expect(extractBioText({})).toBe("");
  });
  it("trims whitespace", () => {
    expect(extractBioText({ bio: "  hello  " })).toBe("hello");
  });
});

describe("shouldEmbedMentor", () => {
  it("accepts mentor with bio", () => {
    expect(
      shouldEmbedMentor({ role: "mentor", status: "accepted", bio: "x" })
    ).toBe(true);
  });
  it("rejects pending mentors", () => {
    expect(
      shouldEmbedMentor({ role: "mentor", status: "pending", bio: "x" })
    ).toBe(false);
  });
  it("rejects mentors with empty bio", () => {
    expect(
      shouldEmbedMentor({ role: "mentor", status: "accepted", bio: "" })
    ).toBe(false);
  });
  it("rejects mentees", () => {
    expect(
      shouldEmbedMentor({ role: "mentee", status: "accepted", bio: "x" })
    ).toBe(false);
  });
  it("accepts mentor with about field when bio missing", () => {
    expect(
      shouldEmbedMentor({ role: "mentor", status: "accepted", about: "some about" })
    ).toBe(true);
  });
});

describe("EMBEDDING_DIM", () => {
  it("is locked at 768 (Firestore max is 2048, do not change without updating gcloud index)", () => {
    expect(EMBEDDING_DIM).toBe(768);
  });
});
