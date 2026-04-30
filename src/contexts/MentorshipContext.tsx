"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getApp } from "firebase/app";
import { refreshClaimsNow } from "@/lib/hooks/useClaimRefresh";

// Import and re-export types from centralized types file
export type {
  MentorshipProfile,
  MentorshipMatch,
} from "@/types/mentorship";
import type { MentorshipProfile, MentorshipMatch } from "@/types/mentorship";

/**
 * Shape of the `_claimSync` server-generated signal that Plan 06's
 * /api/mentorship/profile POST/PUT handlers attach to their response body
 * after calling syncRoleClaim(). When `refreshed === true`, the client should
 * force a Firebase ID-token refresh so the next getIdTokenResult() call
 * reflects the updated custom claims (per D-14 in 01-CONTEXT.md).
 */
type ClaimSyncSignal =
  | { refreshed: true }
  | { refreshed: false; error?: string };

interface MutationResponseWithClaimSync {
  _claimSync?: ClaimSyncSignal;
}

interface MentorshipContextType {
  user: User | null;
  profile: MentorshipProfile | null;
  loading: boolean;
  profileLoading: boolean;
  matches: MentorshipMatch[];
  pendingRequests: MentorshipMatch[];
  refreshProfile: () => Promise<void>;
  refreshMatches: () => Promise<void>;
  /**
   * Inspect a mutation response body for the `_claimSync.refreshed === true`
   * signal (set server-side by syncRoleClaim in Plan 06's route handlers) and,
   * when present, force-refresh the current user's Firebase ID token so the
   * updated custom claims (roles, admin) become visible to subsequent
   * getIdTokenResult() calls without waiting for Firebase's ~1-hour TTL.
   *
   * Non-fatal: if the refresh fails (network blip, token expired, etc.) the
   * mutation still succeeded server-side; the client silently retries on next
   * interaction. See src/lib/hooks/useClaimRefresh.ts.
   *
   * Call sites: /profile, /mentorship/onboarding and any future page that
   * POSTs/PUTs to /api/mentorship/profile. Per the D-14 contract this is
   * mutation-triggered — NEVER wire it into a setInterval or useEffect on
   * user-state changes.
   */
  syncClaimsFromResponse: (data: unknown) => Promise<boolean>;
}

const MentorshipContext = createContext<MentorshipContextType | undefined>(
  undefined,
);

export function useMentorship() {
  const context = useContext(MentorshipContext);
  if (!context) {
    throw new Error("useMentorship must be used within a MentorshipProvider");
  }
  return context;
}

// Safe version that returns null if outside provider (for optional usage in layouts)
export function useMentorshipSafe() {
  const context = useContext(MentorshipContext);
  return context || null;
}

interface MentorshipProviderProps {
  children: ReactNode;
}

export function MentorshipProvider({ children }: MentorshipProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MentorshipProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [matches, setMatches] = useState<MentorshipMatch[]>([]);
  const [pendingRequests, setPendingRequests] = useState<MentorshipMatch[]>([]);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      const response = await fetch(`/api/mentorship/profile?uid=${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching mentorship profile:", error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Inspect a mutation response body for _claimSync.refreshed === true and
   * force-refresh the Firebase ID token when the signal is present.
   *
   * Strict `=== true` check (NOT truthy) — the failure shape is
   * `{ refreshed: false, error: string }` which would be truthy under a loose
   * check. The server is the signal source; the refresh is mutation-triggered,
   * never time-based (per D-14).
   *
   * Safe to call with any value — non-objects, null, objects without the
   * signal field — all short-circuit to false.
   */
  const syncClaimsFromResponse = async (data: unknown): Promise<boolean> => {
    if (!data || typeof data !== "object") return false;
    const payload = data as MutationResponseWithClaimSync;
    if (payload._claimSync?.refreshed === true && user) {
      return refreshClaimsNow(user);
    }
    return false;
  };

  const refreshMatches = async () => {
    if (!user || !profile) {
      setMatches([]);
      setPendingRequests([]);
      return;
    }
    try {
      const response = await fetch(
        `/api/mentorship/match?uid=${user.uid}&role=${profile.roles?.[0] ?? ""}`,
      );
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
        setPendingRequests(data.pendingRequests || []);
      }
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
  };

  useEffect(() => {
    const auth = getAuth(getApp());
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch profile before marking loading as complete
        setProfileLoading(true);
        try {
          const response = await fetch(
            `/api/mentorship/profile?uid=${firebaseUser.uid}`,
          );
          if (response.ok) {
            const data = await response.json();
            setProfile(data.profile);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching mentorship profile:", error);
          setProfile(null);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
        setProfileLoading(false);
        setMatches([]);
        setPendingRequests([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Only refresh profile on subsequent user changes (not initial load)
    // Initial profile fetch is handled in the auth callback above
    if (!loading && user) {
      // This effect runs for refreshes triggered by other parts of the app
    }
  }, [loading, user]);

  useEffect(() => {
    if (profile) {
      refreshMatches();
    }
  }, [profile]);

  return (
    <MentorshipContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        matches,
        pendingRequests,
        refreshProfile,
        refreshMatches,
        syncClaimsFromResponse,
      }}
    >
      {children}
    </MentorshipContext.Provider>
  );
}
