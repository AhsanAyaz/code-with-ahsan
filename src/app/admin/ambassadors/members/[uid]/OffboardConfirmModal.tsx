"use client";

import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

function adminHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  return { "x-admin-token": token ?? "" };
}

export function OffboardConfirmModal({
  uid,
  displayName,
  isOpen,
  onClose,
  onCompleted,
}: {
  uid: string;
  displayName: string;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (result: { discordRemoved: boolean; emailSent: boolean }) => void;
}) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleConfirm() {
    if (submitting) return;
    setInlineError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/ambassador/members/${uid}/offboard`, {
        method: "POST",
        headers: adminHeaders(),
      });

      if (res.status === 409) {
        setInlineError(
          "This ambassador is already inactive. Refresh and try again."
        );
        return;
      }

      if (!res.ok) {
        setInlineError("Offboarding failed. Try again.");
        return;
      }

      const data = (await res.json()) as {
        success: boolean;
        discordRemoved: boolean;
        emailSent: boolean;
      };

      if (data.emailSent === false) {
        toast.error(
          "Offboarding email could not be sent. Follow up manually."
        );
      }

      onCompleted({ discordRemoved: data.discordRemoved, emailSent: data.emailSent });
      onClose();
    } catch {
      setInlineError("Offboarding failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog className="modal modal-open" aria-labelledby="offboard-confirm-heading">
      <div className="modal-box">
        <h3 id="offboard-confirm-heading" className="text-xl font-bold">
          Offboard {displayName}?
        </h3>
        <p className="py-4">
          This will revoke {displayName}&apos;s ambassador role, remove their
          Discord Ambassador role, mark their cohort membership as ended, and
          send an offboarding email. This action cannot be undone. They will not
          receive the Alumni Ambassador status.
        </p>

        {inlineError && (
          <div role="alert" className="alert alert-error">
            <span>{inlineError}</span>
          </div>
        )}

        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Go back
          </button>
          <button
            type="button"
            className="btn btn-error"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Yes, offboard {displayName}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button type="button" aria-label="Close">
          close
        </button>
      </form>
    </dialog>
  );
}
