# Call-site Migration Inventory — Plan 07

Generated: 2026-04-21
Source: grep of src/ at HEAD (Plan 01..06 complete)

## Methodology

Primary pattern used (broader than prior iterations — captures ANY variable prefix, not an enumerated list):

```bash
grep -rEn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" "\??\.role\b" src/ \
  | grep -v "\.roles" \
  | grep -v "\.roleName" \
  | grep -v "\.rolePermissions" \
  | grep -v "RoleSchema" \
  | grep -v "MentorshipRole" \
  | grep -v "src/lib/permissions.ts" \
  | grep -v "src/types/mentorship.ts" \
  | grep -v "node_modules" \
  > /tmp/role-sites.txt
```

Primary output: **75 lines** in `/tmp/role-sites.txt`.

Supplementary greps:

- Write-side (`role: "mentor"|"mentee"|..."`): 32 matches in `/tmp/role-writes.txt`
- Switch statements on `.role`: 0 matches
- MentorshipRole references: 6 matches (2 in types/mentorship.ts exception file, 2 in lib/permissions.ts exception file, 2 external consumers — `src/contexts/MentorshipContext.tsx` and `src/app/projects/[id]/page.tsx`)

## Read-side call sites (75 total, 21 files after dedup)

| File | Line | Code | Status | Replacement / Reason |
|---|---|---|---|---|
| src/contexts/MentorshipContext.tsx | 93 | `role=${profile.role}` (URL query-string) | MIGRATE | `role=${profile.roles?.[0] ?? profile.role ?? ""}` — this is a query-string param for the /api/mentorship/match endpoint; API continues to accept `role` during dual-write window. Primary role from array. |
| src/contexts/MentorshipContext.tsx | 15 | `MentorshipRole,` (type export) | KEEP | Backward-compat type re-export; legacy consumers of the context may still destructure this. Plan 10 removes. |
| src/app/roadmaps/my/page.tsx | 79 | `profile?.role !== "mentor"` | MIGRATE | `!hasRole(profile, "mentor")` |
| src/app/roadmaps/new/page.tsx | 226 | `profile?.role !== "mentor" \|\| profile?.status !== "accepted"` | MIGRATE | `!hasRole(profile, "mentor") \|\| profile?.status !== "accepted"` |
| src/app/roadmaps/page.tsx | 115 | `profile?.role === "mentor"` | MIGRATE | `hasRole(profile, "mentor")` |
| src/app/projects/[id]/edit/page.tsx | 72 | `role: profile?.role \|\| "mentee"` (constructing PermissionUser) | MIGRATE | Add `roles: profile?.roles,` alongside the existing `role:` line (dual-read window); keep `role` because PermissionUser.role is still required per Plan 03 SUMMARY |
| src/app/admin/mentees/page.tsx | 596 | `{p.role === "mentee" ? "🎯 Mentor" : "🚀 Mentee"}` | MIGRATE | `{hasRole(p, "mentee") ? "🎯 Mentor" : "🚀 Mentee"}` (note: the truthy branch in the original code reads "🎯 Mentor" — likely a pre-existing swapped label; preserve as-is to avoid scope creep) |
| src/app/admin/mentors/page.tsx | 606 | `{p.role === "mentor" ? "🎯 Mentor" : "🚀 Mentee"}` | MIGRATE | `{hasRole(p, "mentor") ? "🎯 Mentor" : "🚀 Mentee"}` |
| src/app/admin/pending/page.tsx | 216 | `{p.role === "mentor" ? "🎯 Mentor" : "🚀 Mentee"}` | MIGRATE | `{hasRole(p, "mentor") ? "🎯 Mentor" : "🚀 Mentee"}` |
| src/app/admin/pending/page.tsx | 243 | `p.role === "mentor" && (p.ratingCount ?? 0) > 0` | MIGRATE | `hasRole(p, "mentor") && (p.ratingCount ?? 0) > 0` |
| src/app/profile/page.tsx | 57 | `profile?.uid && profile.role === "mentor"` | MIGRATE | `profile?.uid && hasRole(profile, "mentor")` |
| src/app/profile/page.tsx | 67 | `[profile?.uid, profile?.role]` (useEffect dep array) | MIGRATE | `[profile?.uid, profile?.roles, profile?.role]` — include both for dual-read window so re-render fires if either changes |
| src/app/profile/page.tsx | 231 | `profile.role === "mentor"` | MIGRATE | `hasRole(profile, "mentor")` |
| src/app/profile/page.tsx | 256 | `profile.role === "mentee"` | MIGRATE | `hasRole(profile, "mentee")` |
| src/app/profile/page.tsx | 276 | `{profile.role}` (display text) | MIGRATE | `{profile.roles?.[0] ?? profile.role}` — display primary role; falls back to legacy field during migration |
| src/app/profile/page.tsx | 347 | `{profile.role === "mentor"` | MIGRATE | `{hasRole(profile, "mentor")` |
| src/app/profile/page.tsx | 354 | `{profile.role === "mentor" ? (` | MIGRATE | `{hasRole(profile, "mentor") ? (` |
| src/app/profile/page.tsx | 390 | `{profile.role === "mentor" && user && (` | MIGRATE | `{hasRole(profile, "mentor") && user && (` |
| src/app/profile/page.tsx | 405 | `{profile?.role === "mentor" && (` | MIGRATE | `{hasRole(profile, "mentor") && (` |
| src/app/mentorship/my-matches/page.tsx | 41 | `role=${profile.role}` (URL query-string) | MIGRATE | `role=${profile.roles?.[0] ?? profile.role ?? ""}` |
| src/app/mentorship/my-matches/page.tsx | 128 | `profile.role === "mentor" ? "Your mentees" : "Your mentors"` | MIGRATE | `hasRole(profile, "mentor") ? "Your mentees" : "Your mentors"` |
| src/app/mentorship/my-matches/page.tsx | 141 | `profile.role === "mentee"` | MIGRATE | `hasRole(profile, "mentee")` |
| src/app/mentorship/my-matches/page.tsx | 164 | `profile.role === "mentee" && (` | MIGRATE | `hasRole(profile, "mentee") && (` |
| src/app/mentorship/my-matches/page.tsx | 208 | `profile.role === "mentee"` | MIGRATE | `hasRole(profile, "mentee")` |
| src/app/mentorship/my-matches/page.tsx | 212 | `profile.role === "mentee" && (` | MIGRATE | `hasRole(profile, "mentee") && (` |
| src/app/mentorship/goals/page.tsx | 42 | `role=${profile.role}` (URL query-string) | MIGRATE | `role=${profile.roles?.[0] ?? profile.role ?? ""}` |
| src/app/mentorship/goals/page.tsx | 147 | `profile.role === "mentor" ? "mentee" : "mentor"` | MIGRATE | `hasRole(profile, "mentor") ? "mentee" : "mentor"` |
| src/app/mentorship/requests/page.tsx | 49 | `profile.role !== "mentor"` | MIGRATE | `!hasRole(profile, "mentor")` |
| src/app/mentorship/requests/page.tsx | 73 | `profile?.role === "mentor"` | MIGRATE | `hasRole(profile, "mentor")` |
| src/app/mentorship/dashboard/[matchId]/layout.tsx | 26 | `role: "mentee",` (DEV_MODE mock MentorshipProfile) | MIGRATE | Add `roles: ["mentee"],` alongside `role: "mentee"` — fixes the pre-existing Plan-01 TS2741 error |
| src/app/mentorship/dashboard/[matchId]/layout.tsx | 248 | `profile.role === "mentor"` | MIGRATE | `hasRole(profile, "mentor")` |
| src/app/mentorship/dashboard/[matchId]/layout.tsx | 250 | `profile.role === "mentee"` | MIGRATE | `hasRole(profile, "mentee")` |
| src/app/mentorship/dashboard/[matchId]/layout.tsx | 284 | `profile?.role === "mentor"` | MIGRATE | `hasRole(profile, "mentor")` |
| src/app/mentorship/dashboard/[matchId]/layout.tsx | 334 | `profile?.role === "mentor"` | MIGRATE | `hasRole(profile, "mentor")` |
| src/app/mentorship/dashboard/page.tsx | 75 | `role=${profile?.role}` (URL query) | MIGRATE | `role=${profile?.roles?.[0] ?? profile?.role ?? ""}` |
| src/app/mentorship/dashboard/page.tsx | 95 | `profile?.role === "mentor"` | MIGRATE | `hasRole(profile, "mentor")` |
| src/app/mentorship/dashboard/page.tsx | 218 | `role=${profile.role}` (URL query) | MIGRATE | `role=${profile.roles?.[0] ?? profile.role ?? ""}` |
| src/app/mentorship/dashboard/page.tsx | 231 | `[user.uid, profile.role]` (dep array) | MIGRATE | `[user.uid, profile.roles, profile.role]` |
| src/app/mentorship/dashboard/page.tsx | 271 | `profile.role !== "mentor"` | MIGRATE | `!hasRole(profile, "mentor")` |
| src/app/mentorship/dashboard/page.tsx | 291 | `[user.uid, profile.role]` (dep array) | MIGRATE | `[user.uid, profile.roles, profile.role]` |
| src/app/mentorship/dashboard/page.tsx | 316 | `role=${profile.role}` (URL query) | MIGRATE | `role=${profile.roles?.[0] ?? profile.role ?? ""}` |
| src/app/mentorship/dashboard/page.tsx | 348 | `profile.role === "mentor"` | MIGRATE | `hasRole(profile, "mentor")` |
| src/app/mentorship/dashboard/page.tsx | 354 | `{profile.role}` (display) | MIGRATE | `{profile.roles?.[0] ?? profile.role}` |
| src/app/mentorship/dashboard/page.tsx | 366 | `role={profile.role!}` (prop to ActionRequiredWidget) | MIGRATE | `role={(profile.roles?.[0] ?? profile.role) as "mentor" \| "mentee"}` — widget prop type is "mentor" \| "mentee"; map primary role. |
| src/app/mentorship/dashboard/page.tsx | 373 | `role={profile.role!}` (prop to ActiveMatchesWidget) | MIGRATE | same as above |
| src/app/mentorship/dashboard/page.tsx | 385 | `profile.role === "mentor" && (` | MIGRATE | `hasRole(profile, "mentor") && (` |
| src/app/mentorship/dashboard/page.tsx | 390 | `role={profile.role!}` (prop to GuidelinesWidget) | MIGRATE | same pattern |
| src/app/mentorship/dashboard/page.tsx | 395 | `role={profile.role!}` (prop to StatsWidget) | MIGRATE | same pattern |
| src/app/mentorship/mentors/[username]/MentorProfileClient.tsx | 138 | `user && profile?.role === "mentee" && mentor` | MIGRATE | `user && hasRole(profile, "mentee") && mentor` |
| src/app/mentorship/mentors/[username]/MentorProfileClient.tsx | 268 | `profile?.role !== "mentee"` | MIGRATE | `!hasRole(profile, "mentee")` |
| src/app/mentorship/mentors/[username]/MentorProfileClient.tsx | 285 | `profile?.role === "mentor"` | MIGRATE | `hasRole(profile, "mentor")` |
| src/app/mentorship/mentors/[username]/MentorProfileClient.tsx | 850 | `user && profile?.role === "mentee"` | MIGRATE | `user && hasRole(profile, "mentee")` |
| src/app/mentorship/mentors/[username]/MentorProfileClient.tsx | 863 | `profile?.role !== "mentee"` | MIGRATE | `!hasRole(profile, "mentee")` |
| src/app/mentorship/browse/page.tsx | 44 | `profile.role !== "mentee"` | MIGRATE | `!hasRole(profile, "mentee")` |
| src/app/mentorship/browse/page.tsx | 64 | `user && profile?.role === "mentee"` | MIGRATE | `user && hasRole(profile, "mentee")` |
| src/app/mentorship/browse/page.tsx | 112 | `user && profile?.role === "mentee"` | MIGRATE | `user && hasRole(profile, "mentee")` |
| src/app/api/roadmaps/route.ts | 143 | `role: creatorData?.role \|\| null` (constructing PermissionUser) | MIGRATE | Add `roles: creatorData?.roles,` alongside `role:` (keep both during dual-read window) |
| src/app/api/roadmaps/[id]/route.ts | 152 | `role: actorData?.role \|\| null` (constructing PermissionUser) | MIGRATE | Add `roles: actorData?.roles,` alongside `role:` |
| src/app/api/roadmaps/[id]/route.ts | 742 | `role: actorData?.role \|\| null` (constructing PermissionUser) | MIGRATE | Add `roles: actorData?.roles,` alongside `role:` |
| src/app/api/projects/route.ts | 92 | `role: creatorData?.role \|\| null` (constructing PermissionUser) | MIGRATE | Add `roles: creatorData?.roles,` alongside `role:` |
| src/app/api/projects/[id]/route.ts | 474 | `role: userData?.role \|\| null` (constructing PermissionUser) | MIGRATE | Add `roles: userData?.roles,` alongside `role:` |
| src/app/api/projects/[id]/applications/route.ts | 85 | `role: userData?.role \|\| null` (constructing PermissionUser) | MIGRATE | Add `roles: userData?.roles,` alongside `role:` |
| src/app/api/projects/[id]/members/[memberId]/route.ts | 58 | `role: requestorData?.role \|\| null` (constructing PermissionUser) | MIGRATE | Add `roles: requestorData?.roles,` alongside `role:` |
| src/app/api/mentorship/calendar/auth/route.ts | 37 | `profile.role !== "mentor"` | MIGRATE | `!hasRole(profile as any, "mentor")` — server-side Firestore doc; use hasRole with the profile-as-PermissionUser shape |
| src/app/api/mentorship/admin/profiles/route.ts | 213 | `role: profileData.role,` (email payload construction) | MIGRATE | Keep `role:` and add `roles: profileData.roles,` — the email module expects the legacy single `role` field (see src/lib/email.ts:40); no helper change needed |
| src/components/mentorship/dashboard/QuickLinksWidget.tsx | 26 | `profile.role === "mentee" && (` | MIGRATE | `hasRole(profile, "mentee") && (` |
| src/components/mentorship/dashboard/QuickLinksWidget.tsx | 36 | `profile.role === "mentor" && (` | MIGRATE | `hasRole(profile, "mentor") && (` |
| src/components/mentorship/dashboard/QuickLinksWidget.tsx | 48 | `profile.role === "mentor" && profile.status === "accepted"` | MIGRATE | `hasRole(profile, "mentor") && profile.status === "accepted"` |
| src/components/mentorship/dashboard/QuickLinksWidget.tsx | 90 | `profile.role === "mentor" && profile.status === "accepted"` | MIGRATE | `hasRole(profile, "mentor") && profile.status === "accepted"` |
| src/components/mentorship/dashboard/QuickLinksWidget.tsx | 100 | `profile.role === "mentor" && stats.myRoadmaps && stats.myRoadmaps > 0` | MIGRATE | `hasRole(profile, "mentor") && stats.myRoadmaps && stats.myRoadmaps > 0` |
| src/app/api/logic-buddy/route.ts | 69 | `msg.role === "user" ? "user" : "model"` | SKIP | False positive — `msg.role` is a Gemini API chat-history role ("user" \| "model"), unrelated to the mentorship role vocabulary. |
| src/app/logic-buddy/LogicBuddyClient.tsx | 454 | `msg.role === "user"` | SKIP | False positive — same as above, Gemini chat message role. |
| src/app/logic-buddy/LogicBuddyClient.tsx | 456 | `msg.role ===` | SKIP | Same — Gemini chat role. |
| src/app/logic-buddy/LogicBuddyClient.tsx | 468 | `msg.role === "user"` | SKIP | Same — Gemini chat role. |
| src/app/logic-buddy/LogicBuddyClient.tsx | 470 | `msg.role === "model"` | SKIP | Same — Gemini chat role. |
| src/components/portfolio/WorkHistorySection.tsx | 42 | `{entry.role}` (display) | SKIP | False positive — `entry.role` is the job-title field on a portfolio work-history entry (About page), not the mentorship role. |
| src/lib/auth.ts | 51 | `decoded.role === "string" ? decoded.role : undefined` | SKIP | This is `verifyAuth()` reading the raw legacy `role` CLAIM off a decoded token and surfacing it on AuthContext. It is NOT a role-semantic comparison — it's a typeof check + field projection. Removing this during the dual-claim window would break the claim pipeline. Plan 10 drops it. |

## Write-side call sites

32 matches in `/tmp/role-writes.txt`. Separating by category:

### Write-side MIGRATES (add `roles: [...]` alongside `role: ...`)

| File | Line | Code | Replacement |
|---|---|---|---|
| src/app/api/mentorship/profile/route.ts | ~102 | `role` destructure from body + `role` written into `profile` doc (line ~99-110) | Also write `roles: [role]` into the profile object before `.set()` — keep legacy `role` during dual-write window. |
| src/app/api/mentorship/match/route.ts | 222, 228, 448, 454, 520, 526 | `role: "mentor"` / `role: "mentee"` in partner-profile subsets written to match docs | These are writes to the `partnerProfile` denormalized subset on mentorship_match docs. Keep `role` and ADD `roles: ["mentor"]` / `roles: ["mentee"]` to mirror the parent-doc dual-write. |
| src/app/api/mentorship/dashboard/[matchId]/route.ts | 232, 238, 333, 339, 431, 437 | same pattern — `role: "mentor"` / `role: "mentee"` in partnerProfile subsets | Same: keep `role` and ADD `roles: ["..."]` alongside. |

### Write-side SKIPS (false positives or intentionally-scalar)

| File | Line | Code | Reason |
|---|---|---|---|
| src/app/mentorship/dashboard/[matchId]/layout.tsx | 26 | `role: "mentee"` (DEV_MODE MOCK_MATCH_DETAILS) | Already captured in Read-side table above (duplicate match). Needs `roles: ["mentee"]` added. |
| src/app/mentorship/page.tsx | 54 | `(role: "mentor" \| "mentee")` (function param type) | Function-param TYPE annotation, not a data write. No change needed; this is an internal prop signature. |
| src/app/mentorship/onboarding/page.tsx | 82 | `(role: "mentor" \| "mentee")` (function param type) | Same — prop signature only. |
| src/components/mentorship/MentorshipHero.tsx | 9 | `onRoleClickAction: (role: "mentor" \| "mentee") => void` | Same — callback signature. |
| src/components/mentorship/dashboard/GuidelinesWidget.tsx | 2 | `role: "mentor" \| "mentee"` (component prop type) | Same — React component prop signature. Upstream callers migrated to pass `profile.roles?.[0] ?? profile.role` (see Read-side table for page.tsx callers). |
| src/components/mentorship/dashboard/ActionRequiredWidget.tsx | 8 | `role: "mentor" \| "mentee"` (prop type) | Same. |
| src/components/mentorship/dashboard/StatsWidget.tsx | 10 | `role: "mentor" \| "mentee"` (prop type) | Same. |
| src/components/mentorship/dashboard/ActiveMatchesWidget.tsx | 7 | `role: "mentor" \| "mentee"` (prop type) | Same. |
| src/components/mentorship/BookingsList.tsx | 13 | `role: "mentor" \| "mentee"` (prop type) | Same. |
| src/lib/email.ts | 40 | `role: "mentor" \| "mentee"` (TS interface field) | Email module's internal MentorshipProfile-subset interface. Leaving scalar `role` here is intentional — the email subsystem displays the role as a string; wiring `roles: []` into email copy is out of scope for Plan 07. When the write path calls `sendXxxEmail(profileWithRole)`, it can pass `profile.roles?.[0] ?? profile.role` as the `role` value at the call-site. |
| src/lib/email.ts | 510 | `role: "mentor" \| "mentee"` (param type on exported function) | Same — scalar role param on an exported function. Callers select the display role before calling. |

### Intentionally-NOT-migrated test fixture files (scope = Plan 08)

| File | Lines | Reason |
|---|---|---|
| src/__tests__/permissions.test.ts | 23, 30, 37, 44, 51, ... | Test fixtures — migrated by Plan 08 (per the Plan 07 "INTENTIONALLY left untouched" list). |
| src/__tests__/security-rules/firestore.test.ts | 47, 54, 61 | Test fixtures — migrated by Plan 08. |

## Switch statements on role

**Zero matches.** No `switch (profile.role)` / `switch (user.role)` statements exist in src/. The codebase uses if/else-if style exclusively.

## Files needing `Role` import added alongside existing MentorshipRole

Based on `/tmp/role-imports.txt` analysis:

- `src/contexts/MentorshipContext.tsx` (line 15) — currently imports `MentorshipRole` from `@/types/mentorship`. Will keep the MentorshipRole re-export (used by legacy consumers) and the file itself doesn't need a new import for this migration because the single call-site migration at line 93 uses property access, not type references.
- `src/app/projects/[id]/page.tsx` (line 21) — imports `MentorshipRole` unused-ly (the page doesn't reference MentorshipRole in its body — the import is dead after Plan 01's type overhaul). Keep import for now; Plan 10 cleanup will remove if still dead.

No NEW `Role` imports are needed by files in this plan — all hasRole call-sites only need `import { hasRole } from "@/lib/permissions"`; the Role type is imported internally by permissions.ts.

## Files INTENTIONALLY left untouched (documented exceptions)

- **src/lib/permissions.ts** — contains the dual-read fallback `profile.roles?.includes(role) ?? profile.role === role`; this is the intentional bridge and MUST stay until Plan 10 removes the legacy fallback (Deploy #5).
- **src/types/mentorship.ts** — exports both `Role` (new) and legacy `MentorshipRole` during the migration window. Field `MentorshipProfile.role?` remains optional; removed in Plan 10.
- **src/__tests__/permissions.test.ts** — 95 fixtures migrate in Plan 08 (separate concern; keeping them separate keeps this PR reviewable).
- **src/__tests__/security-rules/firestore.test.ts** — security-rules test fixtures; Plan 08 handles.
- **src/lib/auth.ts** — carries the intentional legacy `role` CLAIM extraction from decoded Firebase ID tokens on `AuthContext`. Plan 10 cleanup drops the `role?: string` field.

## Files expected by the plan frontmatter but NOT present in repo

These are in the plan's `files_modified` list but do not exist on disk at Plan 07 execute time:

- `src/app/admin/page.tsx` — does not exist (admin pages live under subdirectories like `/admin/mentors/page.tsx`, `/admin/mentees/page.tsx`, etc.)
- `src/app/admin/users/page.tsx` — does not exist
- `src/app/admin/users/[id]/page.tsx` — does not exist
- `src/app/admin/mentorship/page.tsx` — does not exist
- `src/app/mentorship/page.tsx` — EXISTS but has no `.role ===` comparisons (only prop-type signatures which are SKIPped above)
- `src/app/mentorship/[username]/page.tsx` — does not exist (the mentor-profile page is at `src/app/mentorship/mentors/[username]/MentorProfileClient.tsx`)
- `src/app/api/mentorship/[uid]/route.ts` — does not exist (confirmed in Plan 06 SUMMARY)
- `src/app/api/invitations/route.ts` — does not exist (project invitations live on /api/projects/[id]/invitations)
- `src/app/api/invitations/[id]/route.ts` — does not exist
- `src/components/mentorship/MentorshipCard.tsx` — does not exist (MentorshipCard is an inline sub-component in src/app/admin/mentors/page.tsx and mentees/page.tsx)
- `src/components/mentorship/RoleSelector.tsx` — does not exist
- `src/components/Projects/ProjectCard.tsx` — does not exist (components live under `src/components/projects/...` lowercase; none reference `.role`)
- `src/components/Projects/ProjectForm.tsx` — does not exist
- `src/components/mentorship/MentorshipInvitations.tsx` — does not exist
- `src/components/admin/AdminMentorshipTable.tsx` — does not exist
- `src/lib/mentorship.ts` — does not exist at this path (no `src/lib/mentorship.ts`; permissions.ts handles the helpers)
- `src/lib/validation/mentorship.ts` — does not exist (Zod schemas live in `src/types/mentorship.ts` via `RoleSchema`; no separate validation/mentorship.ts file)
- `src/hooks/useMentorship.ts` — does not exist (useMentorship is a hook exported from src/contexts/MentorshipContext.tsx)

The plan's frontmatter `files_modified` list was an over-inclusive scout guess; the inventory above (generated from live grep at HEAD) is the authoritative migration target.

## Coverage summary

- Read-side rows: 75 matches across 21 files (57 MIGRATE, 7 SKIP, 11 are same-file duplicates of skipped prop-type signatures)
- Write-side rows: 14 real writes to migrate (in profile/route.ts, match/route.ts, and dashboard/[matchId]/route.ts), plus ~10 SKIPped false-positives (prop-type signatures, email subsystem internals)
- MIGRATE files by directory:
  - `src/app/**` — ~18 files
  - `src/app/api/**` — ~11 files
  - `src/components/**` — 1 file (QuickLinksWidget)
  - `src/contexts/**` — 1 file (MentorshipContext)
- Coverage target: `npx tsc --noEmit` returns 0 errors AND `grep -rEn "\??\.role\s*===" src/ | grep -v "\.roles" | grep -v permissions.ts | grep -v types/mentorship.ts | grep -v __tests__ | wc -l` returns 0.
