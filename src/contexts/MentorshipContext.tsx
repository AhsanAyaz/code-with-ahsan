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

// Import and re-export types from centralized types file
export type {
  MentorshipRole,
  MentorshipProfile,
  MentorshipMatch,
} from "@/types/mentorship";
import type { MentorshipProfile, MentorshipMatch } from "@/types/mentorship";

interface MentorshipContextType {
  user: User | null;
  profile: MentorshipProfile | null;
  loading: boolean;
  matches: MentorshipMatch[];
  pendingRequests: MentorshipMatch[];
  refreshProfile: () => Promise<void>;
  refreshMatches: () => Promise<void>;
}

const MentorshipContext = createContext<MentorshipContextType | undefined>(
  undefined
);

export function useMentorship() {
  const context = useContext(MentorshipContext);
  if (!context) {
    throw new Error("useMentorship must be used within a MentorshipProvider");
  }
  return context;
}

interface MentorshipProviderProps {
  children: ReactNode;
}

export function MentorshipProvider({ children }: MentorshipProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MentorshipProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MentorshipMatch[]>([]);
  const [pendingRequests, setPendingRequests] = useState<MentorshipMatch[]>([]);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }
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
    }
  };

  const refreshMatches = async () => {
    if (!user || !profile) {
      setMatches([]);
      setPendingRequests([]);
      return;
    }
    try {
      const response = await fetch(
        `/api/mentorship/match?uid=${user.uid}&role=${profile.role}`
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
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshProfile();
    } else {
      setProfile(null);
      setMatches([]);
      setPendingRequests([]);
    }
  }, [user]);

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
        matches,
        pendingRequests,
        refreshProfile,
        refreshMatches,
      }}
    >
      {children}
    </MentorshipContext.Provider>
  );
}
