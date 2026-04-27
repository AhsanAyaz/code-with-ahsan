/**
 * Centralized Permission System
 * Single source of truth for authorization logic across the application
 *
 * This module implements PERM-01 through PERM-09 requirements:
 * - PERM-01: Any authenticated user can create projects
 * - PERM-02: Only accepted mentors can create roadmaps
 * - PERM-03: Only admins can approve projects and roadmaps
 * - PERM-04: Only project creator or admin can edit/manage projects
 * - PERM-07: Any authenticated user can apply to projects
 * - PERM-08: Users cannot apply to their own projects
 * - PERM-09: Admins can delete any project, creators can delete their own declined projects
 */

import { MentorshipRole, Project, Roadmap } from "@/types/mentorship";
import type { Role } from "@/types/mentorship";

/**
 * User context for permission checks
 * Subset of MentorshipProfile with only fields needed for authorization
 */
export interface PermissionUser {
  uid: string;
  // `role` is optional during the roles-array dual-read window (per Plan 01/03/07): MentorshipProfile.role
  // became optional in Plan 01, and the helpers (`hasRole`, `hasAnyRole`, etc.) gracefully handle absent
  // legacy role via the `profile.roles?.includes(r) ?? profile.role === r` dual-read. Kept as legacy
  // field only; Plan 10 removes entirely in Deploy #5.
  role?: MentorshipRole;
  roles?: Role[]; // Post-migration: always present. Pre-migration: undefined -> helpers fall back to `role`.
  status?: "pending" | "accepted" | "declined" | "disabled" | "changes_requested";
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

// ─── Role Helpers (v6.0 roles-array migration) ──────────────────

/**
 * Returns true if the profile has the given role.
 *
 * Dual-read (per D-06 in 01-CONTEXT.md):
 *   - Prefers profile.roles (the new invariant shape)
 *   - Falls back to profile.role (legacy single-role field) when profile.roles is undefined
 *
 * Null-safe (per D-07): returns false for null/undefined profiles instead of throwing.
 *
 * Three-verb API (per D-05): passing an array to `role` is a TypeScript compile error.
 * Use hasAnyRole / hasAllRoles for multi-role semantics.
 */
export function hasRole(
  profile: PermissionUser | null | undefined,
  role: Role
): boolean {
  if (!profile) return false;
  return profile.roles?.includes(role) ?? profile.role === role;
}

/**
 * Returns true if the profile has AT LEAST ONE of the given roles.
 * Dual-read + null-safe (same semantics as hasRole).
 */
export function hasAnyRole(
  profile: PermissionUser | null | undefined,
  roles: Role[]
): boolean {
  if (!profile) return false;
  if (roles.length === 0) return false;
  if (profile.roles) {
    return roles.some((r) => profile.roles!.includes(r));
  }
  // Legacy fallback: compare against the single role field
  return profile.role !== null && profile.role !== undefined && roles.includes(profile.role as Role);
}

/**
 * Returns true if the profile has EVERY given role.
 * Dual-read + null-safe. During the legacy fallback window, returns true only if
 * the argument list is exactly one role matching profile.role (a single-role
 * legacy profile cannot satisfy multi-role queries).
 */
export function hasAllRoles(
  profile: PermissionUser | null | undefined,
  roles: Role[]
): boolean {
  if (!profile) return false;
  if (roles.length === 0) return true; // vacuous truth — matches Array.prototype.every
  if (profile.roles) {
    return roles.every((r) => profile.roles!.includes(r));
  }
  // Legacy fallback: only satisfiable if exactly one role requested matches the legacy field
  return (
    roles.length === 1 &&
    profile.role !== null &&
    profile.role !== undefined &&
    roles[0] === profile.role
  );
}

// ─── Claim-side Mirrors (decoded Firebase ID tokens, per D-08) ───

/**
 * Narrow structural type for decoded Firebase ID tokens with our custom claims.
 * Intentionally decoupled from firebase-admin's DecodedIdToken to keep this
 * helper module dep-free. Callers (e.g., verifyAuth) can pass the full decoded
 * token directly; extra fields are ignored.
 */
export interface DecodedRoleClaim {
  role?: string | null;     // legacy single-role claim (dropped in Deploy #5)
  roles?: string[] | null;  // new array claim (set by sync-custom-claims + roleMutation)
  admin?: boolean;
  [key: string]: unknown;
}

/**
 * Returns true if the decoded token carries the given role claim.
 *
 * Dual-claim (per D-06 + D-13): prefers token.roles, falls back to legacy token.role.
 * Null-safe (per D-07): returns false for null/undefined tokens.
 *
 * Use this in API route handlers that already have a decoded token from verifyAuth()
 * and don't want a Firestore round-trip just to authorize.
 */
export function hasRoleClaim(
  token: DecodedRoleClaim | null | undefined,
  role: Role
): boolean {
  if (!token) return false;
  return token.roles?.includes(role) ?? token.role === role;
}

/**
 * Returns true if the decoded token carries AT LEAST ONE of the given role claims.
 * Dual-claim + null-safe.
 */
export function hasAnyRoleClaim(
  token: DecodedRoleClaim | null | undefined,
  roles: Role[]
): boolean {
  if (!token) return false;
  if (roles.length === 0) return false;
  if (token.roles) {
    return roles.some((r) => token.roles!.includes(r));
  }
  // Legacy fallback: compare against the single role claim
  return token.role !== null && token.role !== undefined && roles.includes(token.role as Role);
}

/**
 * Returns true if the decoded token carries EVERY given role claim.
 * Dual-claim + null-safe. During the legacy fallback window, satisfiable only
 * when the argument list is exactly one role matching token.role.
 *
 * Name matches the D-08 contract in 01-CONTEXT.md: hasAllRoleClaimsClaim.
 */
export function hasAllRoleClaimsClaim(
  token: DecodedRoleClaim | null | undefined,
  roles: Role[]
): boolean {
  if (!token) return false;
  if (roles.length === 0) return true;
  if (token.roles) {
    return roles.every((r) => token.roles!.includes(r));
  }
  return (
    roles.length === 1 &&
    token.role !== null &&
    token.role !== undefined &&
    roles[0] === token.role
  );
}

/**
 * Check if user is an accepted mentor.
 * Refactored onto hasRole (DRY + dual-read benefit for free).
 */
export function isAcceptedMentor(user: PermissionUser | null): boolean {
  return hasRole(user, "mentor") && user?.status === "accepted";
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
 * Admin can edit any project status, creators can only edit pending/declined projects
 */
export function canEditProject(
  user: PermissionUser | null,
  project: Project
): boolean {
  // Admin can always edit any project
  if (isAdminUser(user)) return true;

  // Creator can edit pending, declined, active or update_pending projects
  if (isOwner(user, project)) {
    return project.status === "pending" 
        || project.status === "declined" 
        || project.status === "active"
        || project.status === "update_pending";
  }

  return false;
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

/**
 * PERM-09: Can delete projects
 * Admin can delete any project, creators can delete their own declined projects
 */
export function canDeleteProject(
  user: PermissionUser | null,
  project: Project
): boolean {
  // Admin can delete any project
  if (isAdminUser(user)) return true;

  // Creator can only delete their own declined projects
  if (isOwner(user, project) && project.status === "declined") return true;

  return false;
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
