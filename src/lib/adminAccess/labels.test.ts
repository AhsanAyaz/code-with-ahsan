import { describe, it, expect } from "vitest";
import { ADMIN_ACTIONS } from "./actions";
import { actionLabel, actionOptionsByDomain, targetHref } from "./labels";

describe("actionLabel", () => {
  it("turns action ids into readable labels", () => {
    expect(actionLabel("mentorship.profile.decline")).toBe("Mentorship: profile decline");
    expect(actionLabel("ambassador.eligibilityBypass.revoke")).toBe(
      "Ambassadors: eligibility bypass revoke"
    );
    expect(actionLabel("staff.manage")).toBe("Team: role changed");
  });

  it("returns unknown ids unchanged", () => {
    expect(actionLabel("weird")).toBe("weird");
  });

  it("never produces an em-dash", () => {
    for (const id of Object.keys(ADMIN_ACTIONS)) {
      expect(actionLabel(id)).not.toContain("—");
    }
  });
});

describe("actionOptionsByDomain", () => {
  it("covers every ACL action exactly once", () => {
    const ids = actionOptionsByDomain().flatMap((g) => g.actions.map((a) => a.id));
    expect(ids.sort()).toEqual(Object.keys(ADMIN_ACTIONS).sort());
  });
});

describe("targetHref", () => {
  it("links targets with an obvious page", () => {
    expect(targetHref({ type: "project", id: "p1" })).toBe("/projects/p1");
    expect(targetHref({ type: "ambassador", id: "u1" })).toBe("/admin/ambassadors/members/u1");
  });

  it("returns null otherwise", () => {
    expect(targetHref({ type: "user", id: "u1" })).toBeNull();
    expect(targetHref(null)).toBeNull();
  });
});
