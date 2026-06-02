"use client";

import { useContext, useState } from "react";
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
      disabled={joining}
    >
      {joining ? "Joining..." : "Participate"}
    </button>
  );
}
