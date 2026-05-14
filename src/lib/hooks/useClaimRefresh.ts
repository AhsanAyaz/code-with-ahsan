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
