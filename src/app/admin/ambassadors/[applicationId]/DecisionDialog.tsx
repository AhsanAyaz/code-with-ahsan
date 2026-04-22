"use client";
import { useState } from "react";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

interface Props {
  applicationId: string;
  action: "accept" | "decline";
  onClose: () => void;
  onDone: () => void;
}

export default function DecisionDialog({
  applicationId,
  action,
  onClose,
  onDone,
}: Props) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title =
    action === "accept" ? "Accept application" : "Decline application";
  const confirmLabel =
    action === "accept" ? "Confirm accept" : "Confirm decline";
  const confirmClass = action === "accept" ? "btn-success" : "btn-error";

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(ADMIN_TOKEN_KEY)
          : null;
      const res = await fetch(
        `/api/ambassador/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-admin-token": token } : {}),
          },
          body: JSON.stringify({ action, notes: notes || undefined }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (body as { error?: string }).error ?? `HTTP ${res.status}`;
        setError(
          msg === "cohort_full" ? "Cohort is full — cannot accept." : msg
        );
        return;
      }
      onDone();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="py-2 text-sm opacity-70">
          {action === "accept"
            ? "This will add the Ambassador role, attach to the cohort, and send the acceptance email."
            : "This will decline the application and send the decline email. The student-ID photo will be auto-deleted in 30 days."}
        </p>
        <label className="label">
          <span className="label-text">Reviewer notes (optional)</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full h-24"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Share any context that will help (saved with the application)..."
          disabled={busy}
        />
        {error && (
          <div className="alert alert-error mt-2 text-sm">{error}</div>
        )}
        <div className="modal-action">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className={`btn ${confirmClass}`}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
