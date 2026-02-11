/**
 * Centralized Permission System
 * Single source of truth for authorization logic across the application
 *
 * This module implements PERM-01 through PERM-08 requirements:
 * - PERM-01: Any authenticated user can create projects
 * - PERM-02: Only accepted mentors can create roadmaps
 * - PERM-03: Only admins can approve projects and roadmaps
 * - PERM-04: Only project creator or admin can edit/manage projects
 * - PERM-07: Any authenticated user can apply to projects
 * - PERM-08: Users cannot apply to their own projects
 */

import { MentorshipRole, Project, Roadmap } from "@/types/mentorship";

/**
 * User context for permission checks
 * Subset of MentorshipProfile with only fields needed for authorization
 */
export interface PermissionUser {
  uid: string;
  role: MentorshipRole;
  status?: "pending" | "accepted" | "declined" | "disabled";
  isAdmin?: boolean;
}

/**
 * Type-safe action references for projects
 */
export enum ProjectAction {
  CREATE = "create",
  APPROVE = "approve",
  EDIT = "edit",
  MANAGE_MEMBERS = "manage_members",
  APPLY = "apply",
}

/**
 * Type-safe action references for roadmaps
 */
export enum RoadmapAction {
  CREATE = "create",
  APPROVE = "approve",
  EDIT = "edit",
}

// ─── Helper Functions ───────────────────────────────────────────

/**
 * Check if user is an accepted mentor
 */
function isAcceptedMentor(user: PermissionUser | null): boolean {
  if (!user) return false;
  return user.role === "mentor" && user.status === "accepted";
}

/**
 * Check if user is an admin
 */
function isAdminUser(user: PermissionUser | null): boolean {
  if (!user) return false;
  return user.isAdmin === true;
}

/**
 * Check if user is authenticated (not null)
 */
function isAuthenticated(user: PermissionUser | null): boolean {
  return user !== null;
}

/**
 * Check if user owns a resource
 */
function isOwner(
  user: PermissionUser | null,
  resource: { creatorId: string }
): boolean {
  if (!user) return false;
  return user.uid === resource.creatorId;
}

/**
 * Generic permission check for owner or admin actions
 * Used by edit/manage functions to reduce duplication
 */
function canOwnerOrAdminAccess(
  user: PermissionUser | null,
  resource: { creatorId: string }
): boolean {
  if (isAdminUser(user)) return true;
  if (isAuthenticated(user) && isOwner(user, resource)) return true;
  return false;
}

// ─── Project Permissions ────────────────────────────────────────

/**
 * PERM-01: Can create projects
 * Any authenticated user can create projects
 */
export function canCreateProject(user: PermissionUser | null): boolean {
  return isAuthenticated(user);
}

/**
 * PERM-03: Can approve projects
 * Only admins can approve projects
 */
export function canApproveProject(
  user: PermissionUser | null,
  project: Project
): boolean {
  return isAdminUser(user);
}

/**
 * PERM-04: Can edit projects
 * Only project creator or admin can edit
 */
export function canEditProject(
  user: PermissionUser | null,
  project: Project
): boolean {
  return canOwnerOrAdminAccess(user, project);
}

/**
 * PERM-04: Can manage project members
 * Only project creator or admin can manage members
 */
export function canManageProjectMembers(
  user: PermissionUser | null,
  project: Project
): boolean {
  return canOwnerOrAdminAccess(user, project);
}

/**
 * PERM-07, PERM-08: Can apply to projects
 * Any authenticated user can apply, except the project creator
 */
export function canApplyToProject(
  user: PermissionUser | null,
  project: Project
): boolean {
  if (!isAuthenticated(user)) return false;
  if (isOwner(user, project)) return false; // PERM-08: Cannot apply to own project
  return true;
}

// ─── Roadmap Permissions ────────────────────────────────────────

/**
 * PERM-02: Can create roadmaps
 * Only accepted mentors can create roadmaps
 */
export function canCreateRoadmap(user: PermissionUser | null): boolean {
  return isAcceptedMentor(user);
}

/**
 * PERM-03: Can approve roadmaps
 * Only admins can approve roadmaps
 */
export function canApproveRoadmap(
  user: PermissionUser | null,
  roadmap: Roadmap
): boolean {
  return isAdminUser(user);
}

/**
 * Can edit roadmaps
 * Only roadmap creator or admin can edit
 */
export function canEditRoadmap(
  user: PermissionUser | null,
  roadmap: Roadmap
): boolean {
  return canOwnerOrAdminAccess(user, roadmap);
}
