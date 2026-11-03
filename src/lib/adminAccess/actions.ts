/**
 * src/lib/adminAccess/actions.ts
 *
 * Admin portal access control list, shared by server routes and client UI.
 * Isomorphic: this module must never import server-only code.
 *
 * Each key is one admin operation; the value is the minimum role allowed to
 * perform it. Roles are ranked: admin can do everything a moderator can.
 *
 * Policy:
 *   - moderator: read everything + non-destructive writes (approve/accept,
 *     edit fields, resolve alerts, session status, create challenges/cohorts,
 *     raffle spin).
 *   - admin: deletes, decline/reject, strikes/offboard/alumni, role removal,
 *     email blast/broadcast, Discord channel deletion/regeneration, revoking
 *     bypasses, staff management, audit log reads.
 *
 * Mixed-action routes (one handler, several body-dispatched operations) map the
 * body's action to one of these ids before authorizing, so access is checked
 * per operation rather than per route.
 */

export type AdminRole = "admin" | "moderator";

export const ADMIN_ROLES: readonly AdminRole[] = ["admin", "moderator"] as const;

export const ADMIN_ACTIONS = {
  // ─── Portal / staff / audit ───────────────────────────────────────────
  "portal.read": "moderator", // GET /api/admin/me, portal shell
  "staff.manage": "admin", // /admin/team: grant, change, revoke roles
  "audit.read": "admin", // /admin/activity: admin_audit_log viewer

  // ─── Mentorship admin (src/app/api/mentorship/admin/**) ───────────────
  "mentorship.stats.read": "moderator", // stats GET
  "mentorship.matches.read": "moderator", // matches GET
  "mentorship.reviews.read": "moderator", // reviews GET
  "mentorship.alert.resolve": "moderator", // alerts PUT
  "mentorship.profiles.read": "moderator", // profiles GET
  "mentorship.profile.accept": "moderator", // profiles PUT status=accepted (incl. reactivate)
  "mentorship.profile.edit": "moderator", // profiles PUT discordUsername / linkedinUrl only
  "mentorship.profile.requestChanges": "admin", // profiles PUT status=changes_requested (reject family)
  "mentorship.profile.decline": "admin", // profiles PUT status=declined
  "mentorship.profile.disable": "admin", // profiles PUT status=disabled (strips roles)
  "mentorship.profile.delete": "admin", // profiles DELETE
  "mentorship.session.updateStatus": "moderator", // sessions PUT
  "mentorship.session.delete": "admin", // sessions DELETE
  "mentorship.session.regenerateChannel": "admin", // sessions/regenerate-channel POST
  "mentorship.session.deleteArchivedChannels": "admin", // sessions/delete-archived-channels DELETE
  "mentorship.mentor.preview": "moderator", // mentors/[username] GET admin preview of non-public profiles

  // ─── Projects (admin/projects/**, projects/[id] admin override) ───────
  "projects.read": "moderator", // admin/projects GET
  "projects.approve": "moderator", // PUT action=approve
  "projects.approveUpdate": "moderator", // PUT action=approve_update
  "projects.reactivate": "moderator", // PUT action=reactivate
  "projects.edit": "moderator", // admin/projects/[id] PATCH, projects/[id] PUT field update override
  "projects.decline": "admin", // PUT action=decline
  "projects.declineUpdate": "admin", // PUT action=decline_update
  "projects.delete": "admin", // admin/projects/[id] DELETE, projects/[id] DELETE override

  // ─── Roadmaps (roadmaps GET ?admin=true, roadmaps/[id]) ───────────────
  "roadmaps.read": "moderator", // roadmaps GET admin listing
  "roadmaps.approve": "moderator", // PUT action=approve / approve-draft
  "roadmaps.requestChanges": "admin", // PUT action=request-changes (marks draft rejected)
  "roadmaps.delete": "admin", // DELETE

  // ─── Challenges (admin/challenges/**) ─────────────────────────────────
  "challenges.read": "moderator", // GET list, GET [id], GET [id]/submissions
  "challenges.create": "moderator", // POST
  "challenges.update": "moderator", // PUT [id]
  "challenges.delete": "admin", // DELETE [id]

  // ─── Courses (admin/courses/**) ───────────────────────────────────────
  "courses.read": "moderator", // GET list, youtube GET
  "courses.create": "moderator", // POST
  "courses.update": "moderator", // [slug] PATCH
  "courses.reorder": "moderator", // PATCH orderedSlugs
  "courses.generateDescription": "moderator", // generate-description POST
  "courses.delete": "admin", // [slug] DELETE

  // ─── Consulting (admin/consulting) ────────────────────────────────────
  "consulting.read": "moderator", // GET
  "consulting.settings.update": "admin", // PUT (changes admin email, availability, packages)
  "consulting.booking.confirmAndResend": "moderator", // POST action=confirm_and_resend
  "consulting.review.sendInvite": "moderator", // POST action=send_review_invite
  "consulting.review.toggleApproval": "moderator", // POST action=toggle_review_approval

  // ─── Comms (admin/email-blast/**, admin/broadcast) ────────────────────
  "comms.emailBlast.drafts.read": "admin", // email-blast/drafts GET (page hidden from moderators)
  "comms.emailBlast": "admin", // email-blast POST
  "comms.broadcast": "admin", // broadcast POST

  // ─── Event winners (admin/events/[eventId]/winners) ───────────────────
  "events.winners.read": "moderator", // GET
  "events.winners.edit": "moderator", // PUT
  "events.winners.delete": "admin", // DELETE

  // ─── Raffle (raffle/entries/count, raffle/spin) ───────────────────────
  "raffle.entries.read": "moderator", // entries/count GET
  "raffle.spin": "moderator", // spin POST

  // ─── Ambassador applications (ambassador/applications/**) ─────────────
  "ambassador.applications.read": "moderator", // GET list, GET [applicationId]
  "ambassador.application.accept": "moderator", // PATCH action=accept (grants ambassador role)
  "ambassador.application.decline": "admin", // PATCH action=decline
  "ambassador.application.delete": "admin", // DELETE [applicationId]
  "ambassador.application.discordResolve": "moderator", // [applicationId]/discord-resolve POST

  // ─── Ambassador cohorts (ambassador/cohorts/**) ───────────────────────
  "ambassador.cohorts.read": "moderator", // GET list, GET [cohortId]
  "ambassador.cohort.create": "moderator", // POST
  "ambassador.cohort.update": "moderator", // PATCH [cohortId]

  // ─── Ambassador events (ambassador/events/admin) ──────────────────────
  "ambassador.events.read": "moderator", // GET
  "ambassador.event.setHidden": "moderator", // PATCH hidden flag

  // ─── Ambassador members (ambassador/members/**) ───────────────────────
  "ambassador.members.read": "moderator", // GET list, GET [uid]
  "ambassador.member.remove": "admin", // DELETE [uid] (role removal)
  "ambassador.member.strike": "admin", // [uid]/strike POST
  "ambassador.member.offboard": "admin", // [uid]/offboard POST
  "ambassador.member.alumni": "admin", // [uid]/alumni POST

  // ─── Ambassador eligibility bypasses (admin/ambassador/eligibility-bypasses/**)
  "ambassador.eligibilityBypass.read": "moderator", // GET
  "ambassador.eligibilityBypass.grant": "moderator", // POST
  "ambassador.eligibilityBypass.revoke": "admin", // [uid] DELETE
} as const satisfies Record<string, AdminRole>;

export type AdminAction = keyof typeof ADMIN_ACTIONS;

const ROLE_RANK: Record<AdminRole, number> = {
  moderator: 1,
  admin: 2,
};

export function isAdminRole(value: unknown): value is AdminRole {
  return value === "admin" || value === "moderator";
}

export function isAdminAction(value: unknown): value is AdminAction {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ADMIN_ACTIONS, value);
}

/** True when `role` meets the minimum role required for `action`. */
export function can(role: AdminRole | null | undefined, action: AdminAction): boolean {
  if (!role || !isAdminRole(role)) return false;
  const required = ADMIN_ACTIONS[action];
  if (!required) return false;
  return ROLE_RANK[role] >= ROLE_RANK[required];
}
