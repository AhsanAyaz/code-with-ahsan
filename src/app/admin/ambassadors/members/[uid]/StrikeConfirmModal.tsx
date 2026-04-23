"use client";

import { useState } from "react";
import { authFetch } from "@/lib/apiClient";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import { useToast } from "@/contexts/ToastContext";

function adminHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  return { "x-admin-token": token ?? "" };
}

export function StrikeConfirmModal({
  uid,
  displayName,
  onClose,
  onConfirmed,
}: {
  uid: string;
  displayName: string;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/ambassador/members/${uid}/strike`, {
        method: "POST",
        headers: adminHeaders(),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      toast.success("Strike confirmed.");
      onConfirmed();
    } catch {
      setError("Could not confirm strike. Try again or reload the page.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog className="modal modal-open" aria-labelledby="strike-confirm-heading">
      <div className="modal-box">
        <h3 id="strike-confirm-heading" className="text-xl font-bold">
          Confirm strike for {displayName}?
        </h3>
        <p className="py-4">
          This records a confirmed strike against this ambassador. Strike increments are irreversible from this panel. Review the flagged reports above before confirming.
        </p>

        {error && (
          <div role="alert" className="alert alert-error">
            <span>{error}</span>
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
            {submitting && <span className="loading loading-spinner loading-sm" />}
            Yes, confirm strike
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button type="button" aria-label="Close">close</button>
      </form>
    </dialog>
  );
}
