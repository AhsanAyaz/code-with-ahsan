"use client";

import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

function adminHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  return { "x-admin-token": token ?? "" };
}

export function AlumniTransitionButton({
  uid,
  displayName,
  cohortEndDate,
  subdocActive,
  onCompleted,
}: {
  uid: string;
  displayName: string;
  cohortEndDate: string | null;
  subdocActive: boolean;
  onCompleted: () => void;
}) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Visibility gate: only render when cohort has ended AND subdoc is still active
  if (
    cohortEndDate === null ||
    Date.parse(cohortEndDate) > Date.now() ||
    !subdocActive
  ) {
    return null;
  }

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/ambassador/members/${uid}/alumni`, {
        method: "POST",
        headers: adminHeaders(),
      });

      if (res.status === 409) {
        toast.error("This ambassador is already inactive.");
        setConfirming(false);
        return;
      }

      if (!res.ok) {
        toast.error(
          "Could not complete the alumni transition. Check your connection and try again."
        );
        return;
      }

      toast.success(`${displayName} is now an Alumni Ambassador.`);
      setConfirming(false);
      onCompleted();
    } catch {
      toast.error(
        "Could not complete the alumni transition. Check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (confirming) {
    return (
      <div role="alert" className="alert mt-2">
        <div className="flex flex-col gap-2 flex-1">
          <span>
            Mark {displayName} as Alumni Ambassador? This will swap their role
            and remove them from the active cohort listing.
          </span>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting && (
                <span className="loading loading-spinner loading-sm" />
              )}
              Yes, mark as alumni
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirming(false)}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      onClick={() => setConfirming(true)}
    >
      Mark as Alumni
    </button>
  );
}
