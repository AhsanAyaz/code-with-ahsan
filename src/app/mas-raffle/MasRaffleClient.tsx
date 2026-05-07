"use client";

import { useState, useEffect, useRef } from "react";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getApp } from "firebase/app";
import confetti from "canvas-confetti";

// ── Types ──────────────────────────────────────────────────────────────────

type UiState = "form" | "waiting" | "spinning" | "winner";

interface RaffleState {
  state: "idle" | "spinning" | "winner";
  winnerName: string | null;
  date: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getTodayKey(): string {
  return `mas-raffle-submitted-${new Date().toISOString().slice(0, 10)}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export function MasRaffleClient() {
  const [uiState, setUiState] = useState<UiState>("form");
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const confettiFired = useRef(false);

  // On mount: check localStorage and subscribe to raffle state
  useEffect(() => {
    // localStorage dedup check
    if (typeof window !== "undefined") {
      const alreadySubmitted = localStorage.getItem(getTodayKey());
      if (alreadySubmitted) {
        setUiState("waiting");
      }
    }

    // Firestore onSnapshot subscription
    const db = getFirestore(getApp());
    const unsubscribe = onSnapshot(
      doc(db, "mas-raffle-state", "current"),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as RaffleState;

        if (data.state === "spinning") {
          setUiState("spinning");
          confettiFired.current = false;
        } else if (data.state === "winner") {
          setWinnerName(data.winnerName);
          setUiState("winner");
          // Fire confetti on winner reveal (once per transition)
          if (!confettiFired.current) {
            confettiFired.current = true;
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
            });
          }
        } else if (data.state === "idle") {
          // Admin reset — go back to waiting if already submitted, else form
          setUiState((prev) => {
            if (prev === "winner" || prev === "spinning") {
              const alreadySubmitted =
                typeof window !== "undefined"
                  ? localStorage.getItem(getTodayKey())
                  : null;
              return alreadySubmitted ? "waiting" : "form";
            }
            return prev;
          });
        }
      },
    );

    return unsubscribe;
  }, []);

  // Form submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/mas-raffle/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), newsletter }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Submission failed. Please try again.");
        return;
      }

      // Mark submitted in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(getTodayKey(), "1");
      }
      setUiState("waiting");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── FORM STATE ────────────────────────────────────────────────────────────
  if (uiState === "form") {
    return (
      <div className="card w-full max-w-md bg-base-100 shadow-xl mx-4">
        <div className="card-body">
          <h1 className="card-title text-2xl font-bold justify-center mb-1">
            MAS Raffle — Code With Ahsan
          </h1>
          <p className="text-center text-base-content/70 mb-4">
            Submit your details for a chance to win!
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-control mb-3">
              <label className="label" htmlFor="raffle-name">
                <span className="label-text font-medium">Full Name</span>
              </label>
              <input
                id="raffle-name"
                type="text"
                placeholder="Your name"
                className="input input-bordered w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={submitting}
                autoComplete="name"
              />
            </div>

            <div className="form-control mb-3">
              <label className="label" htmlFor="raffle-email">
                <span className="label-text font-medium">Email Address</span>
              </label>
              <input
                id="raffle-email"
                type="email"
                placeholder="you@example.com"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
                autoComplete="email"
              />
            </div>

            <div className="form-control mb-5">
              <label className="label cursor-pointer gap-3 justify-start">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                  disabled={submitting}
                  id="raffle-newsletter"
                />
                <span className="label-text text-sm">
                  I agree to receive AI, Web Dev, and Community Updates from
                  Code With Ahsan (blog.codewithahsan.dev)
                </span>
              </label>
            </div>

            {submitError && (
              <p role="alert" className="text-error text-sm mb-3">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={submitting || !name.trim() || !email.trim()}
            >
              {submitting ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Submitting...
                </>
              ) : (
                "Enter the Raffle"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── WAITING STATE ─────────────────────────────────────────────────────────
  if (uiState === "waiting") {
    return (
      <div className="card w-full max-w-md bg-base-100 shadow-xl mx-4 text-center">
        <div className="card-body items-center gap-4 py-10">
          <div
            className="w-24 h-24 rounded-full border-4 border-primary/30 animate-pulse"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle, oklch(var(--p)/0.15) 0%, transparent 70%)",
            }}
          />
          <h2 className="text-2xl font-bold">You&apos;re in the raffle!</h2>
          <p
            className="text-base-content/70"
            aria-live="polite"
            aria-atomic="true"
          >
            Waiting for the raffle to begin...
          </p>
          <span className="badge badge-success badge-lg gap-1">
            Entry submitted
          </span>
        </div>
      </div>
    );
  }

  // ── SPINNING STATE ────────────────────────────────────────────────────────
  if (uiState === "spinning") {
    return (
      <div className="flex flex-col items-center gap-8 px-4" aria-live="polite">
        {/* Dual-ring spinner */}
        <div className="relative flex items-center justify-center w-48 h-48">
          {/* Outer ring — reverse spin */}
          <div
            className="absolute w-48 h-48 rounded-full border-8 border-secondary border-b-transparent"
            style={{ animation: "spin 1.5s linear infinite reverse" }}
            aria-hidden="true"
          />
          {/* Inner ring — forward spin */}
          <div
            className="absolute w-32 h-32 rounded-full border-8 border-primary border-t-transparent animate-spin"
            aria-hidden="true"
          />
        </div>

        <div className="text-center">
          <p className="text-2xl font-semibold animate-pulse">
            The wheel is spinning...
          </p>
          <p className="text-base-content/60 mt-1">Get ready!</p>
        </div>
      </div>
    );
  }

  // ── WINNER STATE ──────────────────────────────────────────────────────────
  return (
    <div
      className="card w-full max-w-lg bg-base-100 shadow-2xl mx-4 text-center"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="card-body items-center gap-4 py-12">
        <div className="text-6xl" role="img" aria-label="Trophy">
          🏆
        </div>
        <p className="text-lg text-base-content/70 uppercase tracking-widest font-semibold">
          And the winner is...
        </p>
        <h2
          className="text-5xl font-extrabold text-primary"
          style={{ animation: "popIn 0.5s ease-out both" }}
        >
          {winnerName}
        </h2>
        <p className="text-2xl font-medium mt-2">Congratulations! 🎉</p>
      </div>

      <style>{`
        @keyframes popIn {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
