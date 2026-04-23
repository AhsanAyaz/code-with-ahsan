"use client";

import { useState } from "react";
import { StrikeConfirmModal } from "./StrikeConfirmModal";

export function StrikePanel({
  uid,
  displayName,
  strikes,
  onStrikeIncremented,
}: {
  uid: string;
  displayName: string;
  strikes: number;
  onStrikeIncremented: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Strike Management</h2>
          <p className="text-base-content/70">
            Confirmed strikes: <span className="font-bold">{strikes}</span>
          </p>

          {strikes >= 2 && (
            <div role="alert" className="alert alert-warning">
              <span>
                This ambassador has reached 2 confirmed strikes. The offboarding flow will be available in the next phase.
              </span>
            </div>
          )}

          <div className="card-actions justify-end">
            <button
              type="button"
              className="btn btn-error"
              onClick={() => setModalOpen(true)}
            >
              Confirm strike
            </button>
          </div>
        </div>
      </section>

      {modalOpen && (
        <StrikeConfirmModal
          uid={uid}
          displayName={displayName}
          onClose={() => setModalOpen(false)}
          onConfirmed={() => {
            setModalOpen(false);
            onStrikeIncremented();
          }}
        />
      )}
    </>
  );
}
