"use client";

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { useMentorship } from "@/contexts/MentorshipContext";
import { authFetch } from "@/lib/apiClient";
import { useToast } from "@/contexts/ToastContext";

/**
 * A client-side button that allows logged-in users to join a challenge.
 * Automatically handles the authentication check and redirects to login
 * if necessary.
 */
export default function ParticipateButton({
  challengeId,
}: {
  challengeId: string;
}) {
  const { setShowLoginPopup } = useContext(AuthContext);
  const { user } = useMentorship();
  const toast = useToast();
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const fetchJoinStatus = async () => {
      try {
        const res = await authFetch(
          `/api/challenges/${challengeId}/participants`,
          { method: "GET" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setJoined(Boolean(data.joined));
      } catch (err) {
        console.error("Error fetching join status:", err);
      }
    };

    fetchJoinStatus();
    return () => {
      cancelled = true;
    };
  }, [user, challengeId]);

  const handleJoin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!user) {
      setShowLoginPopup(true);
      return;
    }

    setJoining(true);
    try {
      const res = await authFetch(
        `/api/challenges/${challengeId}/participants`,
        {
          method: "POST",
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join challenge");

      setJoined(true);
      toast.success(
        "You joined the challenge — you can now submit your project.",
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to join challenge";
      toast.error(msg);
    } finally {
      setJoining(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      onClick={handleJoin}
      disabled={joining || joined}
    >
      {joined ? "Joined" : joining ? "Joining..." : "Participate"}
    </button>
  );
}
