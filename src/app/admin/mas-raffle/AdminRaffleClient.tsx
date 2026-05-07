"use client";

import { useState, useEffect, useRef } from "react";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getApp } from "firebase/app";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

// ── Types ──────────────────────────────────────────────────────────────────

interface RaffleState {
  state: "idle" | "spinning" | "winner";
  winnerName: string | null;
  date: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function adminHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(ADMIN_TOKEN_KEY)
      : null;
  return { "x-admin-token": token ?? "" };
}

const STATE_BADGE: Record<RaffleState["state"], string> = {
  idle: "badge-neutral",
  spinning: "badge-warning",
  winner: "badge-success",
};

const STATE_LABEL: Record<RaffleState["state"], string> = {
  idle: "Idle",
  spinning: "Spinning",
  winner: "Winner Revealed",
};

// ── Component ──────────────────────────────────────────────────────────────

export function AdminRaffleClient() {
  const [raffleState, setRaffleState] = useState<RaffleState | null>(null);
  const [entryCount, setEntryCount] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState("");
  const pendingWinner = useRef<{ winnerName: string; docId: string } | null>(
    null,
  );

  // ── Subscribe to raffle state + fetch entry count on mount ───────────────
  useEffect(() => {
    const db = getFirestore(getApp());
    const unsubscribe = onSnapshot(
      doc(db, "mas-raffle-state", "current"),
      (snap) => {
        if (snap.exists()) {
          setRaffleState(snap.data() as RaffleState);
        } else {
          setRaffleState({ state: "idle", winnerName: null, date: "" });
        }
      },
      (err) => {
        console.error("[AdminRaffleClient] Firestore onSnapshot error:", err);
        setRaffleState({ state: "idle", winnerName: null, date: "" });
      },
    );

    fetchEntryCount();

    return unsubscribe;
  }, []);

  async function fetchEntryCount() {
    try {
      const res = await fetch("/api/mas-raffle/entries/count", {
        headers: adminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setEntryCount(data.count as number);
      }
    } catch (err) {
      console.error("[AdminRaffleClient] fetchEntryCount error:", err);
    }
  }

  // ── Spin flow ────────────────────────────────────────────────────────────
  async function handleSpin() {
    setSpinning(true);
    setError("");

    try {
      // Step 1: Pick winner + write "spinning" state
      const res = await fetch("/api/mas-raffle/spin", {
        method: "POST",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "spin" }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Spin failed. Try again.");
        setSpinning(false);
        return;
      }

      const { winnerName, docId } = (await res.json()) as {
        winnerName: string;
        docId: string;
      };
      pendingWinner.current = { winnerName, docId };

      // Step 2: After animation delay, confirm winner + delete doc
      setTimeout(async () => {
        const winner = pendingWinner.current;
        if (!winner) return;

        try {
          const confirmRes = await fetch("/api/mas-raffle/spin", {
            method: "POST",
            headers: { ...adminHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "confirm",
              winnerName: winner.winnerName,
              docId: winner.docId,
            }),
          });

          if (!confirmRes.ok) {
            const confirmData = await confirmRes.json();
            setError(confirmData.error ?? "Confirm failed.");
          } else {
            // Decrement entry count
            setEntryCount((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
          }
        } catch (err) {
          console.error("[AdminRaffleClient] confirm error:", err);
          setError("Network error during confirm.");
        } finally {
          setSpinning(false);
          pendingWinner.current = null;
        }
      }, 4000);
    } catch (err) {
      console.error("[AdminRaffleClient] spin error:", err);
      setError("Network error. Try again.");
      setSpinning(false);
    }
  }

  // ── Reset flow ───────────────────────────────────────────────────────────
  async function handleReset() {
    setError("");
    try {
      const res = await fetch("/api/mas-raffle/spin", {
        method: "POST",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Reset failed.");
      } else {
        // Re-fetch entry count after reset
        await fetchEntryCount();
      }
    } catch (err) {
      console.error("[AdminRaffleClient] reset error:", err);
      setError("Network error during reset.");
    }
  }

  const currentState = raffleState?.state ?? "idle";
  const isWinner = currentState === "winner";
  const canSpin =
    !spinning && currentState !== "winner" && (entryCount ?? 0) > 0;

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-6">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl">
        <div className="card-body gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="card-title text-2xl font-bold">
              MAS Raffle — Admin
            </h1>
            {raffleState && (
              <span className={`badge badge-lg ${STATE_BADGE[currentState]}`}>
                {STATE_LABEL[currentState]}
              </span>
            )}
          </div>

          {/* Entry count stat */}
          <div className="stats bg-base-200 shadow-sm">
            <div className="stat">
              <div className="stat-title">Today&apos;s Entries</div>
              <div className="stat-value text-primary">
                {entryCount === null ? (
                  <span className="loading loading-dots loading-sm" />
                ) : (
                  entryCount
                )}
              </div>
              <div className="stat-desc">
                <button
                  className="link link-hover text-xs"
                  onClick={fetchEntryCount}
                  aria-label="Refresh entry count"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div role="alert" className="alert alert-error text-sm py-2">
              {error}
            </div>
          )}

          {/* Winner reveal card */}
          {isWinner && raffleState?.winnerName && (
            <div
              className="card bg-success/10 border border-success/30"
              aria-live="assertive"
              aria-atomic="true"
            >
              <div className="card-body items-center py-6 gap-2">
                <span className="text-4xl" role="img" aria-label="Trophy">
                  🏆
                </span>
                <p className="text-success font-semibold uppercase tracking-wide text-sm">
                  Winner
                </p>
                <p className="text-3xl font-extrabold text-success-content">
                  {raffleState.winnerName}
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSpin}
              disabled={!canSpin}
              aria-busy={spinning}
            >
              {spinning ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Spinning...
                </>
              ) : (
                "Spin the Wheel 🎰"
              )}
            </button>

            {isWinner && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleReset}
              >
                Reset for next spin
              </button>
            )}
          </div>

          {/* Helper text */}
          {!canSpin && !spinning && !isWinner && (
            <p className="text-sm text-base-content/60 text-center">
              {(entryCount ?? 0) === 0
                ? "No entries yet for today — share the raffle link!"
                : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
