---
phase: 01-foundation-roles-array-migration
plan: 09
title: Client-side claim refresh — force ID token refresh on mutation signal
type: execute
wave: 4
depends_on: [06]
files_modified:
  - src/contexts/MentorshipContext.tsx
  - src/lib/hooks/useClaimRefresh.ts
autonomous: true
requirements:
  - ROLE-05
deploy: "#4 (client side of the claims-sync — ships alongside server-side syncRoleClaim)"
must_haves:
  truths:
    - "The MentorshipContext observes the `_claimSync.refreshed === true` signal in API responses and calls `user.getIdToken(true)` to force-refresh the client's cached ID token"
    - "After a refresh, downstream reads (onAuthStateChanged, custom-claim checks via getIdTokenResult) reflect the new claims without requiring a page reload"
    - "The refresh happens ONCE per mutation — no infinite loop, no duplicate refresh on the same response"
    - "A refresh failure (network blip, token expired) is non-fatal — the mutation still succeeded server-side; the client silently retries on next interaction"
    - "src/lib/hooks/useClaimRefresh.ts exports a small helper so non-MentorshipContext consumers (e.g., future ambassador-dashboard mutations in Phase 2) can trigger the same refresh with one import"
  artifacts:
    - path: src/contexts/MentorshipContext.tsx
      provides: "Reads _claimSync from mutation responses, triggers token refresh"
      contains: "getIdToken(true)"
    - path: src/lib/hooks/useClaimRefresh.ts
      provides: "useClaimRefresh() hook — wraps Firebase's getIdToken(true) with null-check and logging"
      exports: ["useClaimRefresh", "refreshClaimsNow"]
  key_links:
    - from: src/contexts/MentorshipContext.tsx
      to: "Firebase Auth client getIdToken"
      via: "user.getIdToken(true) on mutation-signal receipt"
      pattern: "getIdToken\\(true\\)"
---

<objective>
Implement the client half of the claims-sync strategy: when a profile-mutation API response includes `_claimSync.refreshed === true` (the signal set server-side in Plan 06), force a Firebase ID-token refresh on the client so the next `onAuthStateChanged` or `getIdTokenResult()` call reflects the new custom claims. Without this, the user would wait up to 1 hour (Firebase's default token TTL) to see their updated roles reflected in client-side checks.

Purpose: Implements ROLE-05 client side. Honors D-14 (synchronous claim refresh, no stale-claim window). Paired with Plan 06 which produced the `_claimSync` signal in API responses.
Output: Extension to MentorshipContext plus a small shared hook.
Deploy: Part of Deploy #4.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md
@.planning/research/ARCHITECTURE.md
@src/contexts/MentorshipContext.tsx
</context>

<interfaces>
MentorshipContext currently exposes (scout showed):

```typescript
// src/contexts/MentorshipContext.tsx
export const MentorshipContext = createContext<MentorshipContextValue>(...);
export function MentorshipProvider({ children }: Props) {
  // reads firebase Auth user
  // calls /api/mentorship/profile on updates
  // exposes refreshProfile() to consumers
}
```

API response shape after Plan 06 (from src/app/api/mentorship/profile/route.ts):

```typescript
// response body of POST/PUT/PATCH /api/mentorship/profile
{
  uid: "...",
  // ... other profile fields ...
  _claimSync: { refreshed: true } | { refreshed: false, error: string };
}
```

Firebase Auth client API (already imported in MentorshipContext):

```typescript
import { User, onAuthStateChanged } from "firebase/auth";
// User.getIdToken(forceRefresh: boolean): Promise<string>
// User.getIdTokenResult(forceRefresh: boolean): Promise<IdTokenResult>  // includes .claims
```
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create src/lib/hooks/useClaimRefresh.ts with refreshClaimsNow helper</name>
  <files>src/lib/hooks/useClaimRefresh.ts</files>
  <read_first>
    - src/contexts/MentorshipContext.tsx (inspect how firebase/auth is imported — match the same import path for consistency)
    - src/lib/firebase.ts OR src/lib/firebaseClient.ts (confirm where the client-side Firebase Auth instance is exported; this hook needs access to the current user)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions D-14
  </read_first>
  <action>
    Create `src/lib/hooks/useClaimRefresh.ts` with this EXACT content. The hook is optional for MentorshipContext (which can call the underlying refreshClaimsNow directly) but MUST exist as a named export for future consumers (Phase 2 ambassador dashboard).

    ```typescript
    /**
     * src/lib/hooks/useClaimRefresh.ts
     *
     * Client-side helper for forcing a Firebase ID-token refresh after a profile
     * mutation. Used to pick up updated custom claims (roles, admin) without waiting
     * for Firebase's default ~1-hour TTL.
     *
     * Paired with the server-side syncRoleClaim (src/lib/ambassador/roleMutation.ts)
     * which sets the claims and returns a _claimSync.refreshed signal in the response
     * body. The client calls refreshClaimsNow() when it sees refreshed=true.
     *
     * Per D-14 in 01-CONTEXT.md: the goal is a sub-second window between server-side
     * claim update and client-side visibility of the new claims.
     */

    import { useCallback } from "react";
    import type { User } from "firebase/auth";

    /**
     * Force a fresh ID token for the given user, picking up any custom claim changes.
     * Returns true on success, false on any error (swallowed — non-fatal).
     *
     * Callers that already hold a User reference (e.g., useAuthContext) can call this
     * directly as a plain async function without the hook wrapper.
     */
    export async function refreshClaimsNow(user: User | null | undefined): Promise<boolean> {
      if (!user) return false;
      try {
        // getIdToken(true) forces Firebase to exchange the refresh token for a new ID token,
        // picking up any customClaims that were set server-side.
        await user.getIdToken(true);
        return true;
      } catch (err) {
        // Non-fatal per D-14 design — server-side write is the source of truth.
        // Log for debugging but do NOT surface to the UI.
        console.warn("[useClaimRefresh] getIdToken(true) failed:", err instanceof Error ? err.message : err);
        return false;
      }
    }

    /**
     * Hook form for components that don't already have a User reference in scope.
     * Pass the user (from useAuthContext or similar) at call time.
     *
     * Usage:
     *   const refresh = useClaimRefresh();
     *   const response = await fetch("/api/mentorship/profile", { method: "POST", body });
     *   const data = await response.json();
     *   if (data._claimSync?.refreshed) await refresh(currentUser);
     */
    export function useClaimRefresh() {
      return useCallback(
        (user: User | null | undefined) => refreshClaimsNow(user),
        []
      );
    }
    ```

    If `src/lib/hooks/` directory does not exist, create it. Do NOT put other hooks here yet — stub-minimal for Phase 1.

    Do NOT import Firebase's `auth` global into this hook directly — keep it user-parameterized so tests can inject a fake user and so MentorshipContext (which already owns the user) can call refreshClaimsNow without re-wiring auth.
  </action>
  <verify>
    <automated>ls src/lib/hooks/useClaimRefresh.ts ; npx tsc --noEmit 2>&amp;1 | grep "src/lib/hooks/useClaimRefresh.ts" | head -5</automated>
  </verify>
  <acceptance_criteria>
    - `ls src/lib/hooks/useClaimRefresh.ts` returns the path
    - `grep -c "export async function refreshClaimsNow" src/lib/hooks/useClaimRefresh.ts` returns `1`
    - `grep -c "export function useClaimRefresh" src/lib/hooks/useClaimRefresh.ts` returns `1`
    - `grep -c "user.getIdToken(true)" src/lib/hooks/useClaimRefresh.ts` returns `1`
    - `grep -c "throw " src/lib/hooks/useClaimRefresh.ts` returns `0` (never throws — returns boolean)
    - `grep -c 'from "firebase/auth"' src/lib/hooks/useClaimRefresh.ts` returns `1` (type-only import of User)
    - `grep -c "import type { User }" src/lib/hooks/useClaimRefresh.ts` returns `1` (uses `import type` to avoid runtime dep)
    - `npx tsc --noEmit` reports no errors originating from this file
  </acceptance_criteria>
  <done>
    src/lib/hooks/useClaimRefresh.ts exports refreshClaimsNow + useClaimRefresh. Never throws. Safe to call with null user.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Wire claim-refresh into src/contexts/MentorshipContext.tsx on mutation signal</name>
  <files>src/contexts/MentorshipContext.tsx</files>
  <read_first>
    - src/contexts/MentorshipContext.tsx (FULL file — locate every fetch/axios call that hits /api/mentorship/profile and note how the response body is parsed; also find the current User reference source — likely `useAuthContext()` or `auth.currentUser`)
    - src/lib/hooks/useClaimRefresh.ts (your Task 1 output)
    - src/app/api/mentorship/profile/route.ts (Plan 06 output — confirm the _claimSync response shape)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §specifics (claim refresh signal — Option A: API response carries signal)
  </read_first>
  <action>
    Edit `src/contexts/MentorshipContext.tsx` to:

    1. Add the import (top of file, merge with existing imports from "@/lib/..." paths):
       ```typescript
       import { refreshClaimsNow } from "@/lib/hooks/useClaimRefresh";
       ```

    2. For EVERY fetch/axios call that posts to `/api/mentorship/profile` (and PUT/PATCH variants), parse the response body and check for the `_claimSync` signal. Pattern:

       ```typescript
       const response = await fetch("/api/mentorship/profile", {
         method: "POST",
         body: JSON.stringify(profileData),
         headers: { "Content-Type": "application/json" },
       });
       const data = await response.json();

       // Plan 06 sets data._claimSync when the server synced Auth custom claims.
       // Force-refresh our ID token so subsequent onAuthStateChanged / getIdTokenResult
       // calls see the updated roles claim (per D-14 in 01-CONTEXT.md).
       if (data?._claimSync?.refreshed === true && auth.currentUser) {
         await refreshClaimsNow(auth.currentUser);
       }

       // continue existing profile-state-update logic ...
       ```

       The `auth.currentUser` reference should match however the existing file reads the current Firebase user (scout showed `onAuthStateChanged` is already imported — reuse the same auth global).

    3. Do NOT add a useEffect that refreshes on every render. The refresh MUST be tied to the mutation response — the server is the signal source. A cron-like or interval-based refresh would defeat Firebase's rate-limit protections.

    4. Do NOT remove any existing behavior — refreshProfile(), onAuthStateChanged hookup, etc. all stay. This edit is purely additive.

    5. Anti-pattern to AVOID: calling `user.getIdToken(true)` directly here instead of `refreshClaimsNow(user)`. The wrapper has error handling + logging that future Phase 2 code also relies on. Single entry point for token refresh = easier to add metrics/instrumentation later.

    6. If the file currently has multiple mutation paths (e.g., acceptInvitation, updateProfile, rejectApplication — any POST/PUT that mutates the user's profile), wire the claim refresh into ALL of them. Grep-verifiable: every `await fetch(.../api/mentorship/profile...)` or similar mutation endpoint call should be followed by a `_claimSync` check within 10 lines.

    7. If the context uses a shared helper function (e.g., `callProfileApi`) that wraps the fetch logic, wire the claim refresh INTO that helper — not into every call site. One change, N call sites benefit.
  </action>
  <verify>
    <automated>grep -c "refreshClaimsNow" src/contexts/MentorshipContext.tsx ; grep -c "_claimSync" src/contexts/MentorshipContext.tsx ; npx tsc --noEmit 2>&amp;1 | grep "src/contexts/MentorshipContext.tsx" | head -10</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'from "@/lib/hooks/useClaimRefresh"' src/contexts/MentorshipContext.tsx` returns `1`
    - `grep -c "refreshClaimsNow" src/contexts/MentorshipContext.tsx` returns at least `1`
    - `grep -c "_claimSync" src/contexts/MentorshipContext.tsx` returns at least `1`
    - `grep -c "data._claimSync?.refreshed === true" src/contexts/MentorshipContext.tsx` returns at least `1` OR an equivalent pattern — the key is a strict === true check (not truthiness, per the shape `{ refreshed: false, error: ... }` which would be truthy under loose checks)
    - `npx tsc --noEmit` reports no errors originating from this file
    - For every fetch/axios POST/PUT/PATCH to `/api/mentorship/profile` in this file, a subsequent `refreshClaimsNow` call appears within 10 lines. Verify with `grep -n "/api/mentorship/profile" src/contexts/MentorshipContext.tsx` and inspect surrounding context; record count in the SUMMARY.
    - No new useEffect added that polls or refreshes on a timer (grep: `setInterval|setTimeout` in git diff of this file returns zero new matches)
    - Existing tests pass (MentorshipContext tests, if any): `npm test -- src/contexts/MentorshipContext.test.tsx 2>/dev/null` exits 0, or "no tests found" (acceptable if not covered yet)
  </acceptance_criteria>
  <done>
    MentorshipContext inspects every mutation response for `_claimSync.refreshed === true` and calls refreshClaimsNow when present. No polling, no infinite loops, no breaking changes to existing behavior.
  </done>
</task>

</tasks>

<verification>
- Manual browser test via `npm run dev`: sign in as an existing mentor, update the profile (change bio or save the same data), watch the network tab — response includes `_claimSync: { refreshed: true }`. Open DevTools console, run `firebase.auth().currentUser.getIdTokenResult()` — claims object shows `roles: ["mentor"]`. Kill claim sync in the helper (comment out the setCustomUserClaims call temporarily in a local branch) — response shows `_claimSync: { refreshed: false, error: ... }` and the client does NOT crash; profile update still succeeds in Firestore.
- `npx tsc --noEmit` across the repo returns zero errors.
- No infinite loop: the claim refresh is tied to response parsing, not to a useEffect on user state change. Verify by adding a console.log inside refreshClaimsNow and confirming it fires exactly ONCE per mutation in dev.
</verification>

<success_criteria>
- [x] src/lib/hooks/useClaimRefresh.ts exports refreshClaimsNow + useClaimRefresh
- [x] src/contexts/MentorshipContext.tsx calls refreshClaimsNow after every mutation that returns _claimSync.refreshed === true
- [x] Refresh failure is non-fatal (logged only)
- [x] No polling or interval-based refresh introduced
- [x] Existing context behavior preserved (refreshProfile, onAuthStateChanged, etc.)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-roles-array-migration/01-09-SUMMARY.md` documenting:
- The exact refreshClaimsNow signature + return type
- The list of mutation call sites in MentorshipContext.tsx that now check `_claimSync` (file + line numbers)
- Confirmation that the refresh is mutation-triggered (not interval-based)
- Any Phase 2 callers that should adopt the hook pattern (forward-looking note only)
</output>
