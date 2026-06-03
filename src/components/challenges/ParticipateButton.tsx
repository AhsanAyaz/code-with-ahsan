"use client";

import { useContext, useState, useEffect } from "react";
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
  const [hasJoined, setHasJoined] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!user) {
        setLoadingStatus(false);
        return;
      }
      try {
        const res = await authFetch(`/api/challenges/${challengeId}/participants`, {
          method: "GET",
        });
        if (res.ok) {
          const data = await res.json();
          setHasJoined(data.joined);
        }
      } catch (err) {
        console.error("Failed to fetch participant status:", err);
      } finally {
        setLoadingStatus(false);
      }
    };

    fetchStatus();
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
      
      if (res.status === 409) {
        setHasJoined(true);
        toast.info("You already joined the challenge.");
        return;
      }

      if (!res.ok) throw new Error(data.error || "Failed to join challenge");

      setHasJoined(true);
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

  if (hasJoined) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-disabled"
        disabled
      >
        Joined
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      onClick={handleJoin}
      disabled={joining || loadingStatus}
    >
      {joining ? "Joining..." : "Participate"}
    </button>
  );
}
