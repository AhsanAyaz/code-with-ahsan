import { describe, it, expect } from "vitest";
import { ADMIN_ACTIONS, can, isAdminRole, isAdminAction, type AdminAction } from "./actions";

const entries = Object.entries(ADMIN_ACTIONS) as [AdminAction, "admin" | "moderator"][];

describe("ADMIN_ACTIONS", () => {
  it("maps every action to a valid role", () => {
    for (const [, role] of entries) {
      expect(isAdminRole(role)).toBe(true);
    }
  });

  it.each([
    ["portal.read", "moderator"],
    ["staff.manage", "admin"],
    ["audit.read", "admin"],
    ["events.winners.edit", "moderator"],
    ["events.winners.delete", "admin"],
    ["ambassador.application.accept", "moderator"],
  ] as const)("pins %s to %s", (action, role) => {
    expect(ADMIN_ACTIONS[action]).toBe(role);
  });
});

describe("can()", () => {
  describe.each(entries)("%s (min %s)", (action, minRole) => {
    it("admin is always allowed", () => {
      expect(can("admin", action)).toBe(true);
    });

    it(`moderator allowed iff min role is moderator`, () => {
      expect(can("moderator", action)).toBe(minRole === "moderator");
    });

    it("no role is never allowed", () => {
      expect(can(null, action)).toBe(false);
      expect(can(undefined, action)).toBe(false);
    });
  });

  it("rejects an unknown role value", () => {
    expect(can("superuser" as never, "portal.read")).toBe(false);
  });
});

describe("type guards", () => {
  it("isAdminRole", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("moderator")).toBe(true);
    expect(isAdminRole("mentor")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });

  it("isAdminAction", () => {
    expect(isAdminAction("portal.read")).toBe(true);
    expect(isAdminAction("toString")).toBe(false);
    expect(isAdminAction("nope")).toBe(false);
  });
});
