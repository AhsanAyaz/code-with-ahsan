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
} from "@/lib/permissions";
import { Project, Roadmap } from "@/types/mentorship";

// Test Fixtures
const adminUser: PermissionUser = {
  uid: "admin-123",
  role: "mentor",
  status: "accepted",
  isAdmin: true,
};

const acceptedMentor: PermissionUser = {
  uid: "mentor-456",
  role: "mentor",
  status: "accepted",
  isAdmin: false,
};

const acceptedMentorOwner: PermissionUser = {
  uid: "mentor-owner-789",
  role: "mentor",
  status: "accepted",
  isAdmin: false,
};

const pendingMentor: PermissionUser = {
  uid: "mentor-pending-001",
  role: "mentor",
  status: "pending",
  isAdmin: false,
};

const mentee: PermissionUser = {
  uid: "mentee-002",
  role: "mentee",
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
