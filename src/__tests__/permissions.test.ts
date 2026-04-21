/**
 * Permission System Tests
 * Testing all PERM requirements (01-04, 07-08) across all role combinations
 *
 * Fixture shape (post-Plan 08 migration):
 *   Every fixture now carries BOTH the legacy `role: "mentor" | "mentee"` field
 *   AND the new `roles: ["mentor" | "mentee"]` array. This exercises the
 *   dual-read path of the hasRole/hasAnyRole/hasAllRoles helpers so the
 *   test suite proves BOTH branches (array-read + legacy-fallback) stay green
 *   during the migration window. Plan 10 removes the legacy `role:` field
 *   from fixtures at Deploy #5.
 */

import { describe, it, expect } from "vitest";
import {
  PermissionUser,
  canCreateProject,
  canCreateRoadmap,
  canApproveProject,
  canApproveRoadmap,
  canEditProject,
  canManageProjectMembers,
  canApplyToProject,
  canEditRoadmap,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  hasRoleClaim,
  hasAnyRoleClaim,
  hasAllRoleClaimsClaim,
} from "@/lib/permissions";
import { Project, Roadmap, Role } from "@/types/mentorship";

// Test Fixtures — dual-shape during the roles-array migration window.
const adminUser: PermissionUser = {
  uid: "admin-123",
  role: "mentor",
  roles: ["mentor"],
  status: "accepted",
  isAdmin: true,
};

const acceptedMentor: PermissionUser = {
  uid: "mentor-456",
  role: "mentor",
  roles: ["mentor"],
  status: "accepted",
  isAdmin: false,
};

const acceptedMentorOwner: PermissionUser = {
  uid: "mentor-owner-789",
  role: "mentor",
  roles: ["mentor"],
  status: "accepted",
  isAdmin: false,
};

const pendingMentor: PermissionUser = {
  uid: "mentor-pending-001",
  role: "mentor",
  roles: ["mentor"],
  status: "pending",
  isAdmin: false,
};

const mentee: PermissionUser = {
  uid: "mentee-002",
  role: "mentee",
  roles: ["mentee"],
  status: "accepted",
  isAdmin: false,
};

const nullUser = null;

// Test project fixture - owned by acceptedMentorOwner
const testProject: Project = {
  id: "project-123",
  title: "Test Project",
  description: "Test description",
  creatorId: "mentor-owner-789",
  status: "pending",
  techStack: ["React", "TypeScript"],
  difficulty: "intermediate",
  maxTeamSize: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Test roadmap fixture - owned by acceptedMentorOwner
const testRoadmap: Roadmap = {
  id: "roadmap-123",
  title: "Test Roadmap",
  creatorId: "mentor-owner-789",
  domain: "web-dev",
  difficulty: "beginner",
  status: "draft",
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Permission System", () => {
  describe("canCreateProject (PERM-01)", () => {
    it("returns true for admin", () => {
      expect(canCreateProject(adminUser)).toBe(true);
    });

    it("returns true for accepted mentor", () => {
      expect(canCreateProject(acceptedMentor)).toBe(true);
    });

    it("returns true for pending mentor", () => {
      expect(canCreateProject(pendingMentor)).toBe(true);
    });

    it("returns true for mentee", () => {
      expect(canCreateProject(mentee)).toBe(true);
    });

    it("returns false for null user", () => {
      expect(canCreateProject(nullUser)).toBe(false);
    });
  });

  describe("canCreateRoadmap (PERM-02)", () => {
    it("returns true for admin", () => {
      expect(canCreateRoadmap(adminUser)).toBe(true);
    });

    it("returns true for accepted mentor", () => {
      expect(canCreateRoadmap(acceptedMentor)).toBe(true);
    });

    it("returns false for pending mentor", () => {
      expect(canCreateRoadmap(pendingMentor)).toBe(false);
    });

    it("returns false for mentee", () => {
      expect(canCreateRoadmap(mentee)).toBe(false);
    });

    it("returns false for null user", () => {
      expect(canCreateRoadmap(nullUser)).toBe(false);
    });
  });

  describe("canApproveProject (PERM-03)", () => {
    it("returns true for admin", () => {
      expect(canApproveProject(adminUser, testProject)).toBe(true);
    });

    it("returns false for accepted mentor (owner)", () => {
      expect(canApproveProject(acceptedMentorOwner, testProject)).toBe(false);
    });

    it("returns false for accepted mentor (non-owner)", () => {
      expect(canApproveProject(acceptedMentor, testProject)).toBe(false);
    });

    it("returns false for pending mentor", () => {
      expect(canApproveProject(pendingMentor, testProject)).toBe(false);
    });

    it("returns false for mentee", () => {
      expect(canApproveProject(mentee, testProject)).toBe(false);
    });

    it("returns false for null user", () => {
      expect(canApproveProject(nullUser, testProject)).toBe(false);
    });
  });

  describe("canApproveRoadmap (PERM-03)", () => {
    it("returns true for admin", () => {
      expect(canApproveRoadmap(adminUser, testRoadmap)).toBe(true);
    });

    it("returns false for accepted mentor (owner)", () => {
      expect(canApproveRoadmap(acceptedMentorOwner, testRoadmap)).toBe(false);
    });

    it("returns false for accepted mentor (non-owner)", () => {
      expect(canApproveRoadmap(acceptedMentor, testRoadmap)).toBe(false);
    });

    it("returns false for pending mentor", () => {
      expect(canApproveRoadmap(pendingMentor, testRoadmap)).toBe(false);
    });

    it("returns false for mentee", () => {
      expect(canApproveRoadmap(mentee, testRoadmap)).toBe(false);
    });

    it("returns false for null user", () => {
      expect(canApproveRoadmap(nullUser, testRoadmap)).toBe(false);
    });
  });

  describe("canEditProject (PERM-04)", () => {
    it("returns true for admin (owner)", () => {
      const adminOwned = { ...testProject, creatorId: adminUser.uid };
      expect(canEditProject(adminUser, adminOwned)).toBe(true);
    });

    it("returns true for admin (non-owner)", () => {
      expect(canEditProject(adminUser, testProject)).toBe(true);
    });

    it("returns true for accepted mentor (owner)", () => {
      expect(canEditProject(acceptedMentorOwner, testProject)).toBe(true);
    });

    it("returns false for accepted mentor (non-owner)", () => {
      expect(canEditProject(acceptedMentor, testProject)).toBe(false);
    });

    it("returns true for pending mentor (owner)", () => {
      const pendingOwned = { ...testProject, creatorId: pendingMentor.uid };
      expect(canEditProject(pendingMentor, pendingOwned)).toBe(true);
    });

    it("returns true for mentee (owner)", () => {
      const menteeOwned = { ...testProject, creatorId: mentee.uid };
      expect(canEditProject(mentee, menteeOwned)).toBe(true);
    });

    it("returns false for mentee (non-owner)", () => {
      expect(canEditProject(mentee, testProject)).toBe(false);
    });

    it("returns false for null user", () => {
      expect(canEditProject(nullUser, testProject)).toBe(false);
    });
  });

  describe("canManageProjectMembers (PERM-04)", () => {
    it("returns true for admin (owner)", () => {
      const adminOwned = { ...testProject, creatorId: adminUser.uid };
      expect(canManageProjectMembers(adminUser, adminOwned)).toBe(true);
    });

    it("returns true for admin (non-owner)", () => {
      expect(canManageProjectMembers(adminUser, testProject)).toBe(true);
    });

    it("returns true for accepted mentor (owner)", () => {
      expect(canManageProjectMembers(acceptedMentorOwner, testProject)).toBe(
        true
      );
    });

    it("returns false for accepted mentor (non-owner)", () => {
      expect(canManageProjectMembers(acceptedMentor, testProject)).toBe(false);
    });

    it("returns true for pending mentor (owner)", () => {
      const pendingOwned = { ...testProject, creatorId: pendingMentor.uid };
      expect(canManageProjectMembers(pendingMentor, pendingOwned)).toBe(true);
    });

    it("returns true for mentee (owner)", () => {
      const menteeOwned = { ...testProject, creatorId: mentee.uid };
      expect(canManageProjectMembers(mentee, menteeOwned)).toBe(true);
    });

    it("returns false for mentee (non-owner)", () => {
      expect(canManageProjectMembers(mentee, testProject)).toBe(false);
    });

    it("returns false for null user", () => {
      expect(canManageProjectMembers(nullUser, testProject)).toBe(false);
    });
  });

  describe("canApplyToProject (PERM-07, PERM-08)", () => {
    it("returns false for admin (own project)", () => {
      const adminOwned = { ...testProject, creatorId: adminUser.uid };
      expect(canApplyToProject(adminUser, adminOwned)).toBe(false);
    });

    it("returns true for admin (other's project)", () => {
      expect(canApplyToProject(adminUser, testProject)).toBe(true);
    });

    it("returns false for accepted mentor (own project)", () => {
      expect(canApplyToProject(acceptedMentorOwner, testProject)).toBe(false);
    });

    it("returns true for accepted mentor (other's project)", () => {
      expect(canApplyToProject(acceptedMentor, testProject)).toBe(true);
    });

    it("returns true for pending mentor (other's project)", () => {
      expect(canApplyToProject(pendingMentor, testProject)).toBe(true);
    });

    it("returns true for mentee (other's project)", () => {
      expect(canApplyToProject(mentee, testProject)).toBe(true);
    });

    it("returns false for null user", () => {
      expect(canApplyToProject(nullUser, testProject)).toBe(false);
    });
  });

  describe("canEditRoadmap", () => {
    it("returns true for admin (owner)", () => {
      const adminOwned = { ...testRoadmap, creatorId: adminUser.uid };
      expect(canEditRoadmap(adminUser, adminOwned)).toBe(true);
    });

    it("returns true for admin (non-owner)", () => {
      expect(canEditRoadmap(adminUser, testRoadmap)).toBe(true);
    });

    it("returns true for accepted mentor (owner)", () => {
      expect(canEditRoadmap(acceptedMentorOwner, testRoadmap)).toBe(true);
    });

    it("returns false for accepted mentor (non-owner)", () => {
      expect(canEditRoadmap(acceptedMentor, testRoadmap)).toBe(false);
    });

    it("returns true for pending mentor (owner)", () => {
      const pendingOwned = { ...testRoadmap, creatorId: pendingMentor.uid };
      expect(canEditRoadmap(pendingMentor, pendingOwned)).toBe(true);
    });

    it("returns true for mentee (owner)", () => {
      const menteeOwned = { ...testRoadmap, creatorId: mentee.uid };
      expect(canEditRoadmap(mentee, menteeOwned)).toBe(true);
    });

    it("returns false for mentee (non-owner)", () => {
      expect(canEditRoadmap(mentee, testRoadmap)).toBe(false);
    });

    it("returns false for null user", () => {
      expect(canEditRoadmap(nullUser, testRoadmap)).toBe(false);
    });
  });
});

// ─── v6.0 roles-array helpers (Plan 08 — new coverage) ──────────────
//
// These describe blocks verify the six helpers introduced in Plan 03:
//   hasRole / hasAnyRole / hasAllRoles (profile-side)
//   hasRoleClaim / hasAnyRoleClaim / hasAllRoleClaimsClaim (claim-side)
//
// Edge cases covered per block:
//   - Single-role match (array path)
//   - Multi-role match (array path, new in v6.0)
//   - No-match (array path)
//   - Empty roles array (post-migration empty state — must NOT legacy-fallback)
//   - Legacy-fallback (pre-migration profile with `role` but no `roles` array)
//   - Empty argument array (plural verbs — vacuous semantics per D-05)
//   - Null / undefined profile/token (D-07 null-safe)

describe("hasRole (new helper)", () => {
  const mentorProfile: PermissionUser = {
    uid: "u1",
    role: "mentor",
    roles: ["mentor"],
    status: "accepted",
    isAdmin: false,
  };
  const menteeProfile: PermissionUser = {
    uid: "u1a",
    role: "mentee",
    roles: ["mentee"],
    status: "accepted",
    isAdmin: false,
  };
  const multiProfile: PermissionUser = {
    uid: "u2",
    role: "mentor",
    roles: ["mentor", "ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const alumniProfile: PermissionUser = {
    uid: "u2a",
    role: "mentor",
    roles: ["mentor", "alumni-ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const ambassadorOnlyProfile: PermissionUser = {
    uid: "u2b",
    role: undefined,
    roles: ["ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const emptyProfile: PermissionUser = {
    uid: "u3",
    role: undefined,
    roles: [],
    status: "pending",
    isAdmin: false,
  };
  // `legacyOnlyProfile` intentionally omits the `roles` field — forces the
  // helper to fall back to the legacy `role` field (the D-06 dual-read path).
  const legacyOnlyProfile: PermissionUser = {
    uid: "u4",
    role: "mentor",
    status: "accepted",
    isAdmin: false,
  };
  const legacyOnlyMentee: PermissionUser = {
    uid: "u4a",
    role: "mentee",
    status: "accepted",
    isAdmin: false,
  };

  it("returns true for a role present in profile.roles (mentor)", () => {
    expect(hasRole(mentorProfile, "mentor")).toBe(true);
  });

  it("returns true for a role present in profile.roles (mentee)", () => {
    expect(hasRole(menteeProfile, "mentee")).toBe(true);
  });

  it("returns true for any role in a multi-role profile (mentor + ambassador)", () => {
    expect(hasRole(multiProfile, "mentor")).toBe(true);
    expect(hasRole(multiProfile, "ambassador")).toBe(true);
  });

  it("returns true for alumni-ambassador in a multi-role profile", () => {
    expect(hasRole(alumniProfile, "mentor")).toBe(true);
    expect(hasRole(alumniProfile, "alumni-ambassador")).toBe(true);
  });

  it("returns true for a roles-only profile with no legacy role", () => {
    expect(hasRole(ambassadorOnlyProfile, "ambassador")).toBe(true);
    expect(hasRole(ambassadorOnlyProfile, "mentor")).toBe(false);
  });

  it("returns false for a role not in profile.roles (even if other roles exist)", () => {
    expect(hasRole(mentorProfile, "ambassador")).toBe(false);
    expect(hasRole(menteeProfile, "mentor")).toBe(false);
  });

  it("returns false for empty roles array (post-migration state, no legacy fallback)", () => {
    expect(hasRole(emptyProfile, "mentor")).toBe(false);
    expect(hasRole(emptyProfile, "ambassador")).toBe(false);
  });

  it("falls back to legacy profile.role when profile.roles is absent (D-06 dual-read)", () => {
    expect(hasRole(legacyOnlyProfile, "mentor")).toBe(true);
    expect(hasRole(legacyOnlyProfile, "mentee")).toBe(false);
  });

  it("falls back to legacy profile.role for mentee-only legacy profile", () => {
    expect(hasRole(legacyOnlyMentee, "mentee")).toBe(true);
    expect(hasRole(legacyOnlyMentee, "mentor")).toBe(false);
  });

  it("returns false for null or undefined profile (D-07 null-safe)", () => {
    expect(hasRole(null, "mentor")).toBe(false);
    expect(hasRole(undefined, "mentor")).toBe(false);
  });
});

describe("hasAnyRole (new helper)", () => {
  const multiProfile: PermissionUser = {
    uid: "u1",
    role: "mentor",
    roles: ["mentor", "ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const alumniMulti: PermissionUser = {
    uid: "u1a",
    role: "mentor",
    roles: ["mentor", "alumni-ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const menteeOnly: PermissionUser = {
    uid: "u1b",
    role: "mentee",
    roles: ["mentee"],
    status: "accepted",
    isAdmin: false,
  };
  const emptyProfile: PermissionUser = {
    uid: "u2",
    role: undefined,
    roles: [],
    status: "pending",
    isAdmin: false,
  };
  const legacyOnlyProfile: PermissionUser = {
    uid: "u3",
    role: "mentee",
    status: "accepted",
    isAdmin: false,
  };
  const legacyOnlyMentor: PermissionUser = {
    uid: "u3a",
    role: "mentor",
    status: "accepted",
    isAdmin: false,
  };

  it("returns true when at least one argument role is present", () => {
    expect(hasAnyRole(multiProfile, ["mentor", "alumni-ambassador"])).toBe(
      true
    );
  });

  it("returns true when the profile has all argument roles", () => {
    expect(hasAnyRole(multiProfile, ["mentor", "ambassador"])).toBe(true);
  });

  it("returns true for alumni-ambassador match", () => {
    expect(hasAnyRole(alumniMulti, ["alumni-ambassador"])).toBe(true);
    expect(hasAnyRole(alumniMulti, ["ambassador", "alumni-ambassador"])).toBe(
      true
    );
  });

  it("returns true for mentee-only profile when mentee is requested", () => {
    expect(hasAnyRole(menteeOnly, ["mentee", "ambassador"])).toBe(true);
    expect(hasAnyRole(menteeOnly, ["mentor"])).toBe(false);
  });

  it("returns false when no argument role is present", () => {
    expect(hasAnyRole(multiProfile, ["mentee", "alumni-ambassador"])).toBe(
      false
    );
  });

  it("returns false for empty argument array", () => {
    expect(hasAnyRole(multiProfile, [])).toBe(false);
    expect(hasAnyRole(menteeOnly, [])).toBe(false);
  });

  it("returns false for empty profile.roles array", () => {
    expect(hasAnyRole(emptyProfile, ["mentor"])).toBe(false);
    expect(hasAnyRole(emptyProfile, ["mentor", "mentee", "ambassador"])).toBe(
      false
    );
  });

  it("falls back to legacy role when roles is absent (mentee)", () => {
    expect(hasAnyRole(legacyOnlyProfile, ["mentee", "mentor"])).toBe(true);
    expect(hasAnyRole(legacyOnlyProfile, ["ambassador"])).toBe(false);
  });

  it("falls back to legacy role when roles is absent (mentor)", () => {
    expect(hasAnyRole(legacyOnlyMentor, ["mentor"])).toBe(true);
    expect(hasAnyRole(legacyOnlyMentor, ["mentee"])).toBe(false);
  });

  it("returns false for null/undefined profile", () => {
    expect(hasAnyRole(null, ["mentor"])).toBe(false);
    expect(hasAnyRole(undefined, ["mentor"])).toBe(false);
  });
});

describe("hasAllRoles (new helper)", () => {
  const multiProfile: PermissionUser = {
    uid: "u1",
    role: "mentor",
    roles: ["mentor", "ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const tripleRoleProfile: PermissionUser = {
    uid: "u1a",
    role: "mentor",
    roles: ["mentor", "ambassador", "alumni-ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const mentorOnly: PermissionUser = {
    uid: "u2",
    role: "mentor",
    roles: ["mentor"],
    status: "accepted",
    isAdmin: false,
  };
  const menteeOnly: PermissionUser = {
    uid: "u2a",
    role: "mentee",
    roles: ["mentee"],
    status: "accepted",
    isAdmin: false,
  };
  const emptyProfile: PermissionUser = {
    uid: "u3",
    role: undefined,
    roles: [],
    status: "pending",
    isAdmin: false,
  };
  const legacyOnlyProfile: PermissionUser = {
    uid: "u4",
    role: "mentor",
    status: "accepted",
    isAdmin: false,
  };
  const legacyOnlyMentee: PermissionUser = {
    uid: "u4a",
    role: "mentee",
    status: "accepted",
    isAdmin: false,
  };

  it("returns true when profile has every argument role", () => {
    expect(hasAllRoles(multiProfile, ["mentor", "ambassador"])).toBe(true);
  });

  it("returns true when profile has all three argument roles", () => {
    expect(
      hasAllRoles(tripleRoleProfile, [
        "mentor",
        "ambassador",
        "alumni-ambassador",
      ])
    ).toBe(true);
  });

  it("returns true for single-role mentor profile asked for mentor", () => {
    expect(hasAllRoles(mentorOnly, ["mentor"])).toBe(true);
  });

  it("returns true for single-role mentee profile asked for mentee", () => {
    expect(hasAllRoles(menteeOnly, ["mentee"])).toBe(true);
  });

  it("returns false when profile is missing one argument role", () => {
    expect(hasAllRoles(mentorOnly, ["mentor", "ambassador"])).toBe(false);
    expect(
      hasAllRoles(multiProfile, ["mentor", "ambassador", "alumni-ambassador"])
    ).toBe(false);
  });

  it("returns true (vacuous) for empty argument array", () => {
    expect(hasAllRoles(multiProfile, [])).toBe(true);
    // vacuous truth holds even on empty profile.roles
    expect(hasAllRoles(emptyProfile, [])).toBe(true);
  });

  it("returns false for empty profile.roles with non-empty argument", () => {
    expect(hasAllRoles(emptyProfile, ["mentor"])).toBe(false);
  });

  it("legacy fallback (mentor): returns true iff argument is exactly one role matching profile.role", () => {
    expect(hasAllRoles(legacyOnlyProfile, ["mentor"])).toBe(true);
    expect(hasAllRoles(legacyOnlyProfile, ["mentee"])).toBe(false);
    expect(hasAllRoles(legacyOnlyProfile, ["mentor", "ambassador"])).toBe(
      false
    );
  });

  it("legacy fallback (mentee): returns true iff argument is exactly one role matching profile.role", () => {
    expect(hasAllRoles(legacyOnlyMentee, ["mentee"])).toBe(true);
    expect(hasAllRoles(legacyOnlyMentee, ["mentor"])).toBe(false);
  });

  it("returns false for null/undefined profile", () => {
    expect(hasAllRoles(null, ["mentor"])).toBe(false);
    expect(hasAllRoles(undefined, ["mentor"])).toBe(false);
  });
});

describe("claim-side helpers (hasRoleClaim / hasAnyRoleClaim / hasAllRoleClaimsClaim)", () => {
  const arrayClaim = {
    uid: "u1",
    roles: ["mentor", "ambassador"],
    admin: false,
  };
  const dualClaim = {
    uid: "u1a",
    role: "mentor",
    roles: ["mentor", "ambassador"],
    admin: false,
  };
  const alumniClaim = {
    uid: "u1b",
    role: "mentor",
    roles: ["mentor", "alumni-ambassador"],
    admin: false,
  };
  const legacyClaim = { uid: "u2", role: "mentor", admin: false };
  const legacyMenteeClaim = { uid: "u2a", role: "mentee", admin: false };
  const emptyClaim = { uid: "u3", roles: [], admin: false };

  it("hasRoleClaim reads token.roles", () => {
    expect(hasRoleClaim(arrayClaim, "mentor")).toBe(true);
    expect(hasRoleClaim(arrayClaim, "mentee")).toBe(false);
  });

  it("hasRoleClaim prefers token.roles over token.role when both present", () => {
    expect(hasRoleClaim(dualClaim, "ambassador")).toBe(true);
    // token.role is "mentor" but ambassador is satisfiable ONLY via roles — proves array is read first
    expect(hasRoleClaim(alumniClaim, "alumni-ambassador")).toBe(true);
  });

  it("hasRoleClaim falls back to legacy token.role", () => {
    expect(hasRoleClaim(legacyClaim, "mentor")).toBe(true);
    expect(hasRoleClaim(legacyClaim, "mentee")).toBe(false);
    expect(hasRoleClaim(legacyMenteeClaim, "mentee")).toBe(true);
    expect(hasRoleClaim(legacyMenteeClaim, "mentor")).toBe(false);
  });

  it("hasRoleClaim returns false for null/undefined/empty-roles token", () => {
    expect(hasRoleClaim(null, "mentor")).toBe(false);
    expect(hasRoleClaim(undefined, "mentor")).toBe(false);
    expect(hasRoleClaim(emptyClaim, "mentor")).toBe(false);
  });

  it("hasAnyRoleClaim honors multi-role intent", () => {
    expect(hasAnyRoleClaim(arrayClaim, ["mentee", "ambassador"])).toBe(true);
    expect(hasAnyRoleClaim(arrayClaim, ["mentee", "alumni-ambassador"])).toBe(
      false
    );
  });

  it("hasAnyRoleClaim handles empty argument array + null token", () => {
    expect(hasAnyRoleClaim(arrayClaim, [])).toBe(false);
    expect(hasAnyRoleClaim(null, ["mentor"])).toBe(false);
    expect(hasAnyRoleClaim(undefined, ["mentor"])).toBe(false);
  });

  it("hasAnyRoleClaim falls back to legacy role", () => {
    expect(hasAnyRoleClaim(legacyClaim, ["mentor", "ambassador"])).toBe(true);
    expect(hasAnyRoleClaim(legacyClaim, ["mentee", "ambassador"])).toBe(false);
  });

  it("hasAllRoleClaimsClaim returns true iff every argument is present", () => {
    expect(hasAllRoleClaimsClaim(arrayClaim, ["mentor", "ambassador"])).toBe(
      true
    );
    expect(hasAllRoleClaimsClaim(arrayClaim, ["mentor", "mentee"])).toBe(false);
  });

  it("hasAllRoleClaimsClaim legacy fallback only satisfiable for single-role argument", () => {
    expect(hasAllRoleClaimsClaim(legacyClaim, ["mentor"])).toBe(true);
    expect(hasAllRoleClaimsClaim(legacyClaim, ["mentor", "ambassador"])).toBe(
      false
    );
  });

  it("hasAllRoleClaimsClaim returns vacuous-true for empty arg, false for null token", () => {
    expect(hasAllRoleClaimsClaim(arrayClaim, [])).toBe(true);
    expect(hasAllRoleClaimsClaim(null, ["mentor"])).toBe(false);
    expect(hasAllRoleClaimsClaim(undefined, ["mentor"])).toBe(false);
  });
});

// ─── Inline dual-shape fixture matrix ─────────────────────────────
//
// A broad matrix of every supported (role, roles[]) combination we expect in
// production during the dual-read window. Each assertion below constructs a
// fresh inline fixture carrying BOTH shapes (legacy `role` + new `roles:[]`)
// and confirms the helpers agree with the expected truth value. This is the
// fixture-coverage tier of ROLE-06: the existing tests prove the call-site
// helpers work; this section proves the dual-shape fixture recipe itself is
// stable across every role combination in the v6.0 vocabulary.

describe("dual-shape fixture matrix (ROLE-06 fixture migration)", () => {
  it("mentor-only dual fixture: role + roles=['mentor']", () => {
    const p: PermissionUser = {
      uid: "m-1",
      role: "mentor",
      roles: ["mentor"],
      status: "accepted",
      isAdmin: false,
    };
    expect(hasRole(p, "mentor")).toBe(true);
    expect(hasRole(p, "mentee")).toBe(false);
    expect(hasAnyRole(p, ["mentor"])).toBe(true);
    expect(hasAllRoles(p, ["mentor"])).toBe(true);
  });

  it("mentee-only dual fixture: role + roles=['mentee']", () => {
    const p: PermissionUser = {
      uid: "m-2",
      role: "mentee",
      roles: ["mentee"],
      status: "accepted",
      isAdmin: false,
    };
    expect(hasRole(p, "mentee")).toBe(true);
    expect(hasRole(p, "mentor")).toBe(false);
    expect(hasAnyRole(p, ["mentee"])).toBe(true);
    expect(hasAllRoles(p, ["mentee"])).toBe(true);
  });

  it("mentor + ambassador dual fixture: role + roles=['mentor','ambassador']", () => {
    const p: PermissionUser = {
      uid: "m-3",
      role: "mentor",
      roles: ["mentor", "ambassador"],
      status: "accepted",
      isAdmin: false,
    };
    expect(hasRole(p, "mentor")).toBe(true);
    expect(hasRole(p, "ambassador")).toBe(true);
    expect(hasAllRoles(p, ["mentor", "ambassador"])).toBe(true);
  });

  it("mentee + ambassador dual fixture: role + roles=['mentee','ambassador']", () => {
    const p: PermissionUser = {
      uid: "m-4",
      role: "mentee",
      roles: ["mentee", "ambassador"],
      status: "accepted",
      isAdmin: false,
    };
    expect(hasRole(p, "mentee")).toBe(true);
    expect(hasRole(p, "ambassador")).toBe(true);
    expect(hasAllRoles(p, ["mentee", "ambassador"])).toBe(true);
  });

  it("mentor + alumni-ambassador dual fixture: role + roles=['mentor','alumni-ambassador']", () => {
    const p: PermissionUser = {
      uid: "m-5",
      role: "mentor",
      roles: ["mentor", "alumni-ambassador"],
      status: "accepted",
      isAdmin: false,
    };
    expect(hasRole(p, "alumni-ambassador")).toBe(true);
    expect(hasAnyRole(p, ["alumni-ambassador"])).toBe(true);
  });

  it("triple-role dual fixture: role + roles=['mentor','ambassador','alumni-ambassador']", () => {
    const p: PermissionUser = {
      uid: "m-6",
      role: "mentor",
      roles: ["mentor", "ambassador", "alumni-ambassador"],
      status: "accepted",
      isAdmin: false,
    };
    expect(
      hasAllRoles(p, ["mentor", "ambassador", "alumni-ambassador"])
    ).toBe(true);
  });

  it("disabled mentor dual fixture: role + roles=['mentor'] + status=disabled", () => {
    const p: PermissionUser = {
      uid: "m-7",
      role: "mentor",
      roles: ["mentor"],
      status: "disabled",
      isAdmin: false,
    };
    expect(hasRole(p, "mentor")).toBe(true);
  });

  it("pending mentor dual fixture: role + roles=['mentor'] + status=pending", () => {
    const p: PermissionUser = {
      uid: "m-8",
      role: "mentor",
      roles: ["mentor"],
      status: "pending",
      isAdmin: false,
    };
    expect(hasRole(p, "mentor")).toBe(true);
  });

  it("admin with mentor dual fixture: role + roles=['mentor'] + isAdmin=true", () => {
    const p: PermissionUser = {
      uid: "m-9",
      role: "mentor",
      roles: ["mentor"],
      status: "accepted",
      isAdmin: true,
    };
    expect(hasRole(p, "mentor")).toBe(true);
  });

  it("changes_requested mentor dual fixture: role + roles=['mentor']", () => {
    const p: PermissionUser = {
      uid: "m-10",
      role: "mentor",
      roles: ["mentor"],
      status: "changes_requested",
      isAdmin: false,
    };
    expect(hasRole(p, "mentor")).toBe(true);
  });

  it("declined mentor dual fixture: role + roles=['mentor']", () => {
    const p: PermissionUser = {
      uid: "m-11",
      role: "mentor",
      roles: ["mentor"],
      status: "declined",
      isAdmin: false,
    };
    expect(hasRole(p, "mentor")).toBe(true);
  });

  it("ambassador-only dual fixture: role=undefined + roles=['ambassador']", () => {
    // Post-migration-only role: legacy `role` never held "ambassador" so it stays undefined.
    const p: PermissionUser = {
      uid: "m-12",
      role: undefined,
      roles: ["ambassador"],
      status: "accepted",
      isAdmin: false,
    };
    expect(hasRole(p, "ambassador")).toBe(true);
    expect(hasRole(p, "mentor")).toBe(false);
  });

  it("alumni-ambassador-only dual fixture: role=undefined + roles=['alumni-ambassador']", () => {
    const p: PermissionUser = {
      uid: "m-13",
      role: undefined,
      roles: ["alumni-ambassador"],
      status: "accepted",
      isAdmin: false,
    };
    expect(hasRole(p, "alumni-ambassador")).toBe(true);
  });

  it("empty-roles post-migration fixture: role + roles=[]", () => {
    const p: PermissionUser = {
      uid: "m-14",
      role: "mentor",
      roles: [],
      status: "pending",
      isAdmin: false,
    };
    // IMPORTANT: empty roles array does NOT fall back to legacy role per D-06
    // (the `??` nullish-coalescing in the helper short-circuits on `false`,
    // not on empty-array; `[].includes(x)` returns `false` which bypasses `??`).
    expect(hasRole(p, "mentor")).toBe(false);
  });

  it("bulk fixture sanity: every permutation of the four-role vocabulary agrees with the helper", () => {
    // One inline fixture per production role combination we expect to see in Firestore
    // during and after the migration window. Each fixture carries BOTH shapes.
    const fixtures: Array<{ p: PermissionUser; role: Role; expected: boolean }> = [
      { p: { uid: "b-1", role: "mentor", roles: ["mentor"], status: "accepted", isAdmin: false }, role: "mentor", expected: true },
      { p: { uid: "b-2", role: "mentor", roles: ["mentor"], status: "accepted", isAdmin: false }, role: "mentee", expected: false },
      { p: { uid: "b-3", role: "mentee", roles: ["mentee"], status: "accepted", isAdmin: false }, role: "mentee", expected: true },
      { p: { uid: "b-4", role: "mentee", roles: ["mentee"], status: "accepted", isAdmin: false }, role: "mentor", expected: false },
      { p: { uid: "b-5", role: "mentor", roles: ["mentor", "ambassador"], status: "accepted", isAdmin: false }, role: "ambassador", expected: true },
      { p: { uid: "b-6", role: "mentor", roles: ["mentor", "ambassador"], status: "accepted", isAdmin: false }, role: "alumni-ambassador", expected: false },
      { p: { uid: "b-7", role: "mentee", roles: ["mentee", "ambassador"], status: "accepted", isAdmin: false }, role: "ambassador", expected: true },
      { p: { uid: "b-8", role: "mentor", roles: ["mentor", "alumni-ambassador"], status: "accepted", isAdmin: false }, role: "alumni-ambassador", expected: true },
      { p: { uid: "b-9", role: "mentor", roles: ["mentor", "ambassador", "alumni-ambassador"], status: "accepted", isAdmin: false }, role: "ambassador", expected: true },
      { p: { uid: "b-10", role: undefined, roles: ["ambassador"], status: "accepted", isAdmin: false }, role: "ambassador", expected: true },
      { p: { uid: "b-11", role: undefined, roles: ["alumni-ambassador"], status: "accepted", isAdmin: false }, role: "alumni-ambassador", expected: true },
      { p: { uid: "b-12", role: undefined, roles: [], status: "pending", isAdmin: false }, role: "mentor", expected: false },
    ];
    for (const { p, role, expected } of fixtures) {
      expect(hasRole(p, role)).toBe(expected);
    }
  });
});
