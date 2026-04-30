/**
 * Permission System Tests
 * Testing all PERM requirements (01-04, 07-08) across all role combinations
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

// Test Fixtures
const adminUser: PermissionUser = {
  uid: "admin-123",
  roles: ["mentor"],
  status: "accepted",
  isAdmin: true,
};

const acceptedMentor: PermissionUser = {
  uid: "mentor-456",
  roles: ["mentor"],
  status: "accepted",
  isAdmin: false,
};

const acceptedMentorOwner: PermissionUser = {
  uid: "mentor-owner-789",
  roles: ["mentor"],
  status: "accepted",
  isAdmin: false,
};

const pendingMentor: PermissionUser = {
  uid: "mentor-pending-001",
  roles: ["mentor"],
  status: "pending",
  isAdmin: false,
};

const mentee: PermissionUser = {
  uid: "mentee-002",
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

// ─── roles-array helpers ──────────────────────────────────────────
//
// These describe blocks verify the six helpers:
//   hasRole / hasAnyRole / hasAllRoles (profile-side)
//   hasRoleClaim / hasAnyRoleClaim / hasAllRoleClaimsClaim (claim-side)
//
// Edge cases covered per block:
//   - Single-role match
//   - Multi-role match
//   - No-match
//   - Empty roles array
//   - Empty argument array (plural verbs — vacuous semantics per D-05)
//   - Null / undefined profile/token (D-07 null-safe)

describe("hasRole (new helper)", () => {
  const mentorProfile: PermissionUser = {
    uid: "u1",
    roles: ["mentor"],
    status: "accepted",
    isAdmin: false,
  };
  const menteeProfile: PermissionUser = {
    uid: "u1a",
    roles: ["mentee"],
    status: "accepted",
    isAdmin: false,
  };
  const multiProfile: PermissionUser = {
    uid: "u2",
    roles: ["mentor", "ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const alumniProfile: PermissionUser = {
    uid: "u2a",
    roles: ["mentor", "alumni-ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const ambassadorOnlyProfile: PermissionUser = {
    uid: "u2b",
    roles: ["ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const emptyProfile: PermissionUser = {
    uid: "u3",
    roles: [],
    status: "pending",
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

  it("returns false for empty roles array", () => {
    expect(hasRole(emptyProfile, "mentor")).toBe(false);
    expect(hasRole(emptyProfile, "ambassador")).toBe(false);
  });

  it("returns false for null or undefined profile (D-07 null-safe)", () => {
    expect(hasRole(null, "mentor")).toBe(false);
    expect(hasRole(undefined, "mentor")).toBe(false);
  });
});

describe("hasAnyRole (new helper)", () => {
  const multiProfile: PermissionUser = {
    uid: "u1",
    roles: ["mentor", "ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const alumniMulti: PermissionUser = {
    uid: "u1a",
    roles: ["mentor", "alumni-ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const menteeOnly: PermissionUser = {
    uid: "u1b",
    roles: ["mentee"],
    status: "accepted",
    isAdmin: false,
  };
  const emptyProfile: PermissionUser = {
    uid: "u2",
    roles: [],
    status: "pending",
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

  it("returns false for null/undefined profile", () => {
    expect(hasAnyRole(null, ["mentor"])).toBe(false);
    expect(hasAnyRole(undefined, ["mentor"])).toBe(false);
  });
});

describe("hasAllRoles (new helper)", () => {
  const multiProfile: PermissionUser = {
    uid: "u1",
    roles: ["mentor", "ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const tripleRoleProfile: PermissionUser = {
    uid: "u1a",
    roles: ["mentor", "ambassador", "alumni-ambassador"],
    status: "accepted",
    isAdmin: false,
  };
  const mentorOnly: PermissionUser = {
    uid: "u2",
    roles: ["mentor"],
    status: "accepted",
    isAdmin: false,
  };
  const menteeOnly: PermissionUser = {
    uid: "u2a",
    roles: ["mentee"],
    status: "accepted",
    isAdmin: false,
  };
  const emptyProfile: PermissionUser = {
    uid: "u3",
    roles: [],
    status: "pending",
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
    expect(hasAllRoles(emptyProfile, [])).toBe(true);
  });

  it("returns false for empty profile.roles with non-empty argument", () => {
    expect(hasAllRoles(emptyProfile, ["mentor"])).toBe(false);
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
  const alumniClaim = {
    uid: "u1b",
    roles: ["mentor", "alumni-ambassador"],
    admin: false,
  };
  const emptyClaim = { uid: "u3", roles: [], admin: false };

  it("hasRoleClaim reads token.roles", () => {
    expect(hasRoleClaim(arrayClaim, "mentor")).toBe(true);
    expect(hasRoleClaim(arrayClaim, "mentee")).toBe(false);
  });

  it("hasRoleClaim returns true for alumni-ambassador via roles array", () => {
    expect(hasRoleClaim(alumniClaim, "alumni-ambassador")).toBe(true);
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

  it("hasAllRoleClaimsClaim returns true iff every argument is present", () => {
    expect(hasAllRoleClaimsClaim(arrayClaim, ["mentor", "ambassador"])).toBe(
      true
    );
    expect(hasAllRoleClaimsClaim(arrayClaim, ["mentor", "mentee"])).toBe(false);
  });

  it("hasAllRoleClaimsClaim returns vacuous-true for empty arg, false for null token", () => {
    expect(hasAllRoleClaimsClaim(arrayClaim, [])).toBe(true);
    expect(hasAllRoleClaimsClaim(null, ["mentor"])).toBe(false);
    expect(hasAllRoleClaimsClaim(undefined, ["mentor"])).toBe(false);
  });
});

// ─── Role vocabulary fixture matrix ──────────────────────────────
//
// Covers every supported (roles[]) combination across the v6.0 vocabulary.

describe("role fixture matrix", () => {
  it("mentor-only: roles=['mentor']", () => {
    const p: PermissionUser = { uid: "m-1", roles: ["mentor"], status: "accepted", isAdmin: false };
    expect(hasRole(p, "mentor")).toBe(true);
    expect(hasRole(p, "mentee")).toBe(false);
    expect(hasAnyRole(p, ["mentor"])).toBe(true);
    expect(hasAllRoles(p, ["mentor"])).toBe(true);
  });

  it("mentee-only: roles=['mentee']", () => {
    const p: PermissionUser = { uid: "m-2", roles: ["mentee"], status: "accepted", isAdmin: false };
    expect(hasRole(p, "mentee")).toBe(true);
    expect(hasRole(p, "mentor")).toBe(false);
    expect(hasAnyRole(p, ["mentee"])).toBe(true);
    expect(hasAllRoles(p, ["mentee"])).toBe(true);
  });

  it("mentor + ambassador: roles=['mentor','ambassador']", () => {
    const p: PermissionUser = { uid: "m-3", roles: ["mentor", "ambassador"], status: "accepted", isAdmin: false };
    expect(hasRole(p, "mentor")).toBe(true);
    expect(hasRole(p, "ambassador")).toBe(true);
    expect(hasAllRoles(p, ["mentor", "ambassador"])).toBe(true);
  });

  it("mentee + ambassador: roles=['mentee','ambassador']", () => {
    const p: PermissionUser = { uid: "m-4", roles: ["mentee", "ambassador"], status: "accepted", isAdmin: false };
    expect(hasRole(p, "mentee")).toBe(true);
    expect(hasRole(p, "ambassador")).toBe(true);
    expect(hasAllRoles(p, ["mentee", "ambassador"])).toBe(true);
  });

  it("mentor + alumni-ambassador: roles=['mentor','alumni-ambassador']", () => {
    const p: PermissionUser = { uid: "m-5", roles: ["mentor", "alumni-ambassador"], status: "accepted", isAdmin: false };
    expect(hasRole(p, "alumni-ambassador")).toBe(true);
    expect(hasAnyRole(p, ["alumni-ambassador"])).toBe(true);
  });

  it("triple-role: roles=['mentor','ambassador','alumni-ambassador']", () => {
    const p: PermissionUser = { uid: "m-6", roles: ["mentor", "ambassador", "alumni-ambassador"], status: "accepted", isAdmin: false };
    expect(hasAllRoles(p, ["mentor", "ambassador", "alumni-ambassador"])).toBe(true);
  });

  it("ambassador-only: roles=['ambassador']", () => {
    const p: PermissionUser = { uid: "m-12", roles: ["ambassador"], status: "accepted", isAdmin: false };
    expect(hasRole(p, "ambassador")).toBe(true);
    expect(hasRole(p, "mentor")).toBe(false);
  });

  it("alumni-ambassador-only: roles=['alumni-ambassador']", () => {
    const p: PermissionUser = { uid: "m-13", roles: ["alumni-ambassador"], status: "accepted", isAdmin: false };
    expect(hasRole(p, "alumni-ambassador")).toBe(true);
  });

  it("empty-roles: roles=[]", () => {
    const p: PermissionUser = { uid: "m-14", roles: [], status: "pending", isAdmin: false };
    expect(hasRole(p, "mentor")).toBe(false);
  });

  it("bulk fixture sanity: every permutation of the four-role vocabulary", () => {
    const fixtures: Array<{ p: PermissionUser; role: Role; expected: boolean }> = [
      { p: { uid: "b-1", roles: ["mentor"], status: "accepted", isAdmin: false }, role: "mentor", expected: true },
      { p: { uid: "b-2", roles: ["mentor"], status: "accepted", isAdmin: false }, role: "mentee", expected: false },
      { p: { uid: "b-3", roles: ["mentee"], status: "accepted", isAdmin: false }, role: "mentee", expected: true },
      { p: { uid: "b-4", roles: ["mentee"], status: "accepted", isAdmin: false }, role: "mentor", expected: false },
      { p: { uid: "b-5", roles: ["mentor", "ambassador"], status: "accepted", isAdmin: false }, role: "ambassador", expected: true },
      { p: { uid: "b-6", roles: ["mentor", "ambassador"], status: "accepted", isAdmin: false }, role: "alumni-ambassador", expected: false },
      { p: { uid: "b-7", roles: ["mentee", "ambassador"], status: "accepted", isAdmin: false }, role: "ambassador", expected: true },
      { p: { uid: "b-8", roles: ["mentor", "alumni-ambassador"], status: "accepted", isAdmin: false }, role: "alumni-ambassador", expected: true },
      { p: { uid: "b-9", roles: ["mentor", "ambassador", "alumni-ambassador"], status: "accepted", isAdmin: false }, role: "ambassador", expected: true },
      { p: { uid: "b-10", roles: ["ambassador"], status: "accepted", isAdmin: false }, role: "ambassador", expected: true },
      { p: { uid: "b-11", roles: ["alumni-ambassador"], status: "accepted", isAdmin: false }, role: "alumni-ambassador", expected: true },
      { p: { uid: "b-12", roles: [], status: "pending", isAdmin: false }, role: "mentor", expected: false },
    ];
    for (const { p, role, expected } of fixtures) {
      expect(hasRole(p, role)).toBe(expected);
    }
  });
});
