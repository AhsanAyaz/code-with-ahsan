"use client";

import type { PendingConflict } from "@/lib/mentorship/useMatchRequests";

interface WithdrawToProceedDialogProps {
  conflict: PendingConflict | null;
  isSwitching: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * One-at-a-time withdrawal dialog (GH#234). Shown when a mentee tries to
 * request a new mentor while they already have a pending request with another
 * mentor. Confirming withdraws the existing request and sends the new one.
 */
export default function WithdrawToProceedDialog({
  conflict,
  isSwitching,
  onConfirm,
  onCancel,
}: WithdrawToProceedDialogProps) {
  if (!conflict) return null;

  const existingMentor = conflict.pendingMentorName || "another mentor";
  const newMentor = conflict.newMentorName || "this mentor";

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">You already have a pending request</h3>
        <p className="py-4 text-base-content/80">
          You have an active mentorship request with <strong>{existingMentor}</strong>. You can only
          have one pending request at a time. Withdraw that request to send a new one to{" "}
          <strong>{newMentor}</strong>?
        </p>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSwitching}>
            Keep existing request
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={isSwitching}
          >
            {isSwitching ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Switching...
              </>
            ) : (
              "Withdraw & Request"
            )}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onCancel} disabled={isSwitching}>
          close
        </button>
      </form>
    </dialog>
  );
}
