/**
 * Admin broadcast — recipient-group helpers (GH#298).
 * Pure logic only; Firestore resolution is exercised separately.
 */

import { describe, it, expect } from "vitest";
import {
  BROADCAST_GROUPS,
  BROADCAST_GROUP_LABELS,
  isBroadcastGroup,
  dedupeRecipients,
  type BroadcastRecipient,
} from "@/lib/admin-broadcast/groups";

describe("BROADCAST_GROUPS", () => {
  it("covers exactly the four MVP recipient groups", () => {
    expect([...BROADCAST_GROUPS].sort()).toEqual(
      ["ambassadors", "collaborators", "mentees", "mentors"].sort()
    );
  });

  it("has a human label for every group", () => {
    for (const group of BROADCAST_GROUPS) {
      expect(BROADCAST_GROUP_LABELS[group]).toBeTruthy();
    }
  });
});

describe("isBroadcastGroup", () => {
  it("accepts valid groups", () => {
    expect(isBroadcastGroup("mentors")).toBe(true);
    expect(isBroadcastGroup("mentees")).toBe(true);
    expect(isBroadcastGroup("collaborators")).toBe(true);
    expect(isBroadcastGroup("ambassadors")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isBroadcastGroup("everyone")).toBe(false);
    expect(isBroadcastGroup("")).toBe(false);
    expect(isBroadcastGroup(null)).toBe(false);
    expect(isBroadcastGroup(undefined)).toBe(false);
    expect(isBroadcastGroup(42)).toBe(false);
  });
});

describe("dedupeRecipients", () => {
  const a: BroadcastRecipient = { name: "Ann", email: "ann@example.com" };
  const b: BroadcastRecipient = { name: "Bob", email: "bob@example.com" };

  it("removes duplicate emails case-insensitively, keeping first occurrence", () => {
    const dup: BroadcastRecipient = { name: "Ann Two", email: "ANN@example.com" };
    const result = dedupeRecipients([a, dup, b]);
    expect(result).toEqual([a, b]);
  });

  it("drops entries without a usable email", () => {
    const result = dedupeRecipients([
      a,
      { name: "NoEmail", email: "" },
      { name: "Spacey", email: "   " },
    ]);
    expect(result).toEqual([a]);
  });

  it("trims surrounding whitespace on email while preserving name", () => {
    const result = dedupeRecipients([{ name: "Pad", email: " pad@example.com " }]);
    expect(result).toEqual([{ name: "Pad", email: "pad@example.com" }]);
  });

  it("returns an empty array for empty input", () => {
    expect(dedupeRecipients([])).toEqual([]);
  });
});
