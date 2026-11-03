# Admin portal: per-person roles (admin + moderator)

Date: 2026-11-03
Status: approved, in delivery (PR 2 of 4: access core)

## Context

Admin portal access is one shared password (`config/admin.passwordHash`). Login mints an anonymous
token in `admin_sessions/{token}` (no uid, no role), stored in `localStorage` and sent as
`x-admin-token`. As a result:

- There is only one access level, so nobody can be given limited (non-destructive) access.
- There is no attribution: every `performedBy` / `reviewedBy` is a fake `admin:<token prefix>`.
- Revoking one person means rotating the password for everyone.
- The session check is copy-pasted about six times across `src/lib/adminAuth.ts`,
  `src/lib/ambassador/adminAuth.ts` and inline copies in several routes.
- Several `src/app/api/mentorship/admin/` handlers had no auth at all (fixed in PR 1).
- A second admin system already exists: `mentorship_profiles.isAdmin` plus the `admin` custom claim.

Goal: let Ahsan grant **moderators** (read + non-destructive writes) alongside **admins**, each
person signing in with their own Firebase identity, with a real audit trail.

## Decisions

| Topic           | Decision                                                                                                                                                                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Moderator scope | Read everything plus safe writes (approve/accept, edit fields, resolve alerts, session status, create challenges/cohorts, raffle spin). No deletes, decline/reject, strikes/offboard/alumni, role changes, email blast/broadcast, Discord channel deletion, staff management. |
| Auth            | Firebase ID token (existing `authFetch`) plus a server-side role. The shared admin password is retired, with no break-glass path.                                                                                                                                             |
| Role management | Admin-only `/admin/team` page: add an existing user by email, choose a role, revoke. The first admin is bootstrapped by script.                                                                                                                                               |
| Moderator UI    | Forbidden actions are shown disabled with a lock and an "Admins only" tooltip. Pages that are entirely destructive (Email blast, Broadcast, Team, Activity) are hidden from moderators.                                                                                       |
| Audit           | Every portal write (admin and moderator) is logged with real uid, email, role, action and target. Admin-only `/admin/activity` viewer.                                                                                                                                        |

## Design

### Source of truth: `admin_roles/{uid}`

```
admin_roles/{uid}: { role: "admin" | "moderator", email, displayName?, grantedBy: {uid, email}, grantedAt, updatedAt }
```

- The server reads this doc on every admin request (one Firestore read), so revocation is
  immediate and does not wait for ID token claim refresh (up to 1 hour).
- Firestore rules deny all client access to `admin_roles` and `admin_audit_log`, including clients
  holding the `admin` claim. Only the Admin SDK touches them.
- Admins keep the `admin: true` custom claim (via `syncRoleClaim`, preserving the `roles` claim) so
  existing `firestore.rules` `isAdmin()` and `storage.rules` keep working. Moderators get no claim;
  everything they do goes through API routes.
- `mentorship_profiles.isAdmin` stays mirrored for admins for backward compatibility, but routes stop
  reading it.

### ACL: one action map for server and client

`src/lib/adminAccess/actions.ts` is isomorphic. It exports `AdminRole`, the `ADMIN_ACTIONS` map
(action id to minimum role), `AdminAction`, `can(role, action)` and `isAdminRole`. Roles are ranked:
admin includes everything a moderator can do. Action ids are typed, so a typo is a compile error on
both sides. The map holds one entry per operation across every admin route, grouped by area.

Accepting an ambassador application grants a role but is mapped to moderator under "approve/accept
is safe". Flipping it to admin is a one-line change in the map.

### Server helper

`src/lib/adminAccess/server.ts`:

- `requireAdminAccess(req, action)` returns `{ ok: true, actor }` or `{ ok: false, response }`:
  401 when the Bearer token is missing or invalid, 403 `{ error: "No admin access" }` when there is
  no role doc, 403 `{ error: "Admins only", action }` when the role is below the action's minimum.
- `logAdminAction(actor, action, target, meta?)` appends to `admin_audit_log`
  (`actorUid, actorEmail, actorRole, action, target, meta?, createdAt`). It never throws into the
  caller and omits undefined fields (the Admin SDK rejects them).
- `setAdminRole(subject, role | null, grantedBy)` writes or deletes the role doc, mirrors
  `mentorship_profiles.isAdmin` when a profile exists, and syncs the `admin` claim.

Mixed-action routes (one handler, several body-dispatched operations) map the body's action to an
`AdminAction` before calling `requireAdminAccess`, so authorization is per operation, not per route.
`performedBy` / `reviewedBy` style fields record the real actor.

### Client

- `adminFetch` wraps `authFetch`, so the Bearer ID token replaces `x-admin-token`.
- `GET /api/admin/me` returns `{ uid, email, role }`.
- `AdminAccessProvider` and `useAdminAccess()` expose
  `{ status: "loading" | "signed-out" | "no-access" | "ready", role, email, can(action), refresh }`.
- In the cutover and UI PRs: `AdminAuthGate` is rewritten around this provider (no password form),
  the sidebar hides items the role cannot use, and an `AdminActionButton` disables destructive
  buttons for moderators.

### New pages (PR 4)

- `/admin/team` (`staff.manage`): list staff, add by email, change role, revoke. Guards: no
  self-change, no removing the last admin. Every change is audited.
- `/admin/activity` (`audit.read`): paginated `admin_audit_log`, newest first, filters by actor and
  action. Composite indexes ship in `firestore.indexes.json` in the same commit.

### Bootstrap and migration

- `scripts/set-admin-role.ts <email> <admin|moderator|none>` (`npm run admin-role:set`).
- `scripts/migrate-admin-roles.ts` seeds `admin_roles` (role admin) from every
  `mentorship_profiles` doc with `isAdmin == true`. Dry run by default, `--apply` to write.

Both run against production before the cutover PR deploys, so no admin is locked out.

## Delivery

1. **Security hotfix:** auth on the unauthenticated `mentorship/admin` handlers, crypto-random
   session tokens.
2. **Access core (this PR):** `actions.ts`, `server.ts`, `client.tsx`, `/api/admin/me`, rules denying
   clients on `admin_roles` and `admin_audit_log`, scripts, unit and rules tests. No behavior change.
3. **Cutover:** move every admin route and client call site to the new helpers, rewrite the gate,
   remove the password system and `admin_sessions`, record real attribution. Run the migration
   script on production first.
4. **UI:** Team page, Activity page, sidebar filtering, `AdminActionButton`, role banner, no-access
   screen.

## Verification

- Vitest: table-driven `can()` over every action, `requireAdminAccess` 401/403/ok, `logAdminAction`
  error swallowing and undefined handling, route-level 403 for moderators on destructive routes.
- `npm run test:rules`: clients denied on `admin_roles` and `admin_audit_log`.
- `npm run check:firestore-indexes`.
- Manual on the emulator: seed one admin and one moderator, confirm hidden pages, disabled buttons,
  403 on direct destructive calls, and audit entries.
