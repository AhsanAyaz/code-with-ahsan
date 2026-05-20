"use client";

import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";

// ── Types ──────────────────────────────────────────────────────────────────

type UiState = "form" | "waiting" | "spinning" | "winner";

// ── Helpers ────────────────────────────────────────────────────────────────

function getTodayKey(): string {
  return `raffle-submitted-${new Date().toISOString().slice(0, 10)}`;
}

// ── Shared card wrapper ────────────────────────────────────────────────────

function GoldCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full max-w-md relative rounded-2xl p-px ${className}`}
      style={{
        background:
          "linear-gradient(135deg, rgba(251,191,36,0.6) 0%, rgba(251,191,36,0.1) 40%, rgba(251,191,36,0.4) 100%)",
      }}
    >
      <div
        className="rounded-2xl px-8 py-10 flex flex-col items-center"
        style={{ background: "#0d1117" }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function RaffleClient() {
  const [uiState, setUiState] = useState<UiState>("form");
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("Raffle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const confettiFired = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem(getTodayKey())) setUiState("waiting");
    }

    function applyRaffleState(data: { state: string; winnerName: string | null; title?: string }) {
      setTitle(data.title ?? "Raffle");
      if (data.state === "spinning") {
        setUiState("spinning");
        confettiFired.current = false;
      } else if (data.state === "winner") {
        setWinnerName(data.winnerName);
        setUiState("winner");
        if (!confettiFired.current) {
          confettiFired.current = true;
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ["#FBBF24", "#F59E0B", "#ffffff", "#FDE68A"] });
        }
      } else if (data.state === "idle") {
        setUiState((prev) => {
          if (prev === "winner" || prev === "spinning") {
            const already = typeof window !== "undefined" ? localStorage.getItem(getTodayKey()) : null;
            return already ? "waiting" : "form";
          }
          return prev;
        });
      }
    }

    async function pollState() {
      try {
        const res = await fetch("/api/raffle/state");
        if (res.ok) applyRaffleState(await res.json());
      } catch {
        // silent — network blip, next poll will recover
      }
    }

    pollState();
    const interval = setInterval(pollState, 2000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/raffle/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), newsletter }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Submission failed. Please try again.");
        return;
      }
      if (typeof window !== "undefined") localStorage.setItem(getTodayKey(), "1");
      setUiState("waiting");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !submitting && name.trim() && email.trim();

  // ── FORM STATE ─────────────────────────────────────────────────────────────
  if (uiState === "form") {
    return (
      <>
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .raffle-field {
            width: 100%;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(251,191,36,0.4);
            border-radius: 10px;
            padding: 12px 16px;
            color: #f8fafc;
            font-size: 15px;
            outline: none;
            transition: border-color 0.2s;
          }
          .raffle-field::placeholder { color: rgba(241,245,249,0.55); }
          .raffle-field:focus { border-color: rgba(251,191,36,0.7); }
          .raffle-btn {
            width: 100%;
            padding: 14px;
            border-radius: 10px;
            border: none;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 0.04em;
            cursor: pointer;
            transition: opacity 0.2s, transform 0.1s;
            background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 60%, #FCD34D 100%);
            color: #1a0a00;
          }
          .raffle-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
          .raffle-btn:active:not(:disabled) { transform: translateY(0); }
          .raffle-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        `}</style>

        <GoldCard>
          <div style={{ animation: "fadeUp 0.5s ease both" }} className="w-full">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-4xl mb-3" aria-hidden="true">🎟️</div>
              <h1
                className="text-3xl font-black mb-2 tracking-tight"
                style={{ color: "#FBBF24" }}
              >
                {title}
              </h1>
              <p className="text-sm" style={{ color: "rgba(241,245,249,0.75)" }}>
                Code With Ahsan
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="w-full flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="raffle-name"
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(251,191,36,0.7)" }}
                >
                  Full Name
                </label>
                <input
                  id="raffle-name"
                  type="text"
                  placeholder="Your name"
                  className="raffle-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={submitting}
                  autoComplete="name"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="raffle-email"
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(251,191,36,0.7)" }}
                >
                  Email Address
                </label>
                <input
                  id="raffle-email"
                  type="email"
                  placeholder="you@example.com"
                  className="raffle-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                  autoComplete="email"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="raffle-newsletter"
                  className="mt-0.5 shrink-0"
                  style={{ accentColor: "#FBBF24", width: 16, height: 16 }}
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                  disabled={submitting}
                />
                <span className="text-xs leading-relaxed" style={{ color: "rgba(241,245,249,0.78)" }}>
                  I agree to receive AI, Web Dev, and Community Updates from{" "}
                  <span style={{ color: "rgba(251,191,36,0.95)" }}>Code With Ahsan</span>{" "}
                  (blog.codewithahsan.dev)
                </span>
              </label>

              {submitError && (
                <p role="alert" className="text-sm text-red-400 -mt-2">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                className="raffle-btn mt-1"
                disabled={!canSubmit}
              >
                {submitting ? "Submitting…" : "Enter the Raffle ✦"}
              </button>
            </form>
          </div>
        </GoldCard>
      </>
    );
  }

  // ── WAITING STATE ──────────────────────────────────────────────────────────
  if (uiState === "waiting") {
    return (
      <>
        <style>{`
          @keyframes pulseRing {
            0%, 100% { transform: scale(1);   opacity: 0.6; }
            50%       { transform: scale(1.15); opacity: 1;   }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <GoldCard>
          <div style={{ animation: "fadeUp 0.5s ease both" }} className="flex flex-col items-center gap-6 text-center w-full">
            <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: "rgba(251,191,36,0.6)" }}>
              {title}
            </p>
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
              style={{
                background: "rgba(251,191,36,0.1)",
                border: "2px solid rgba(251,191,36,0.35)",
                animation: "pulseRing 2.5s ease-in-out infinite",
              }}
              aria-hidden="true"
            >
              🎟️
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2" style={{ color: "#FBBF24" }}>
                You&apos;re in!
              </h2>
              <p style={{ color: "rgba(241,245,249,0.8)" }} aria-live="polite" aria-atomic="true">
                Waiting for the raffle to begin…
              </p>
            </div>
            <span
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full"
              style={{
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#4ade80",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Entry confirmed
            </span>
          </div>
        </GoldCard>
      </>
    );
  }

  // ── SPINNING STATE ─────────────────────────────────────────────────────────
  if (uiState === "spinning") {
    return (
      <>
        <style>{`
          @keyframes spinCW  { to { transform: rotate(360deg);  } }
          @keyframes spinCCW { to { transform: rotate(-360deg); } }
          @keyframes textPop {
            0%, 100% { opacity: 1;   transform: scale(1);    }
            50%       { opacity: 0.6; transform: scale(0.97); }
          }
        `}</style>
        <div
          className="flex flex-col items-center gap-10 text-center"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: "rgba(251,191,36,0.6)" }}>
            {title}
          </p>
          {/* Triple-ring wheel */}
          <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
            <div
              className="absolute rounded-full"
              style={{
                width: 200, height: 200,
                border: "4px solid transparent",
                borderTopColor: "#FBBF24",
                borderRightColor: "rgba(251,191,36,0.3)",
                animation: "spinCW 1.2s linear infinite",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: 155, height: 155,
                border: "4px solid transparent",
                borderTopColor: "#F59E0B",
                borderLeftColor: "rgba(245,158,11,0.3)",
                animation: "spinCCW 0.9s linear infinite",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: 110, height: 110,
                border: "4px solid transparent",
                borderTopColor: "#FCD34D",
                borderRightColor: "rgba(252,211,77,0.2)",
                animation: "spinCW 1.6s linear infinite",
              }}
            />
            <span className="text-4xl z-10" role="img" aria-label="Wheel">🎰</span>
          </div>

          <div>
            <p
              className="text-3xl font-black tracking-tight"
              style={{ color: "#FBBF24", animation: "textPop 1.5s ease-in-out infinite" }}
            >
              Spinning…
            </p>
            <p className="text-sm mt-2" style={{ color: "rgba(241,245,249,0.75)" }}>
              Get ready — a winner is being chosen!
            </p>
          </div>
        </div>
      </>
    );
  }

  // ── WINNER STATE ───────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.6) translateY(10px); }
          65%  { opacity: 1; transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        className="w-full max-w-lg text-center relative rounded-2xl p-px"
        style={{
          background:
            "linear-gradient(135deg, rgba(251,191,36,0.8) 0%, rgba(252,211,77,0.3) 50%, rgba(251,191,36,0.7) 100%)",
          animation: "fadeUp 0.6s ease both",
        }}
        aria-live="assertive"
        aria-atomic="true"
      >
        <div className="rounded-2xl px-8 py-14 flex flex-col items-center gap-6" style={{ background: "#0d1117" }}>
          <div className="text-6xl" style={{ animation: "popIn 0.6s ease both" }} role="img" aria-label="Trophy">
            🏆
          </div>

          <p
            className="text-xs font-bold uppercase tracking-[0.25em]"
            style={{ color: "rgba(251,191,36,0.6)" }}
          >
            And the winner is…
          </p>

          <h2
            className="text-5xl font-black leading-tight"
            style={{
              animation: "popIn 0.7s 0.15s ease both",
              backgroundImage: "linear-gradient(90deg, #F59E0B, #FCD34D, #FBBF24, #F59E0B)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animationFillMode: "both",
            }}
          >
            {winnerName}
          </h2>

          <p
            className="text-xl font-semibold mt-1"
            style={{ color: "rgba(241,245,249,0.75)", animation: "fadeUp 0.5s 0.4s ease both", animationFillMode: "both" }}
          >
            Congratulations! 🎉
          </p>

          <div
            className="w-16 h-px mt-2"
            style={{ background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)" }}
          />

          <p className="text-xs" style={{ color: "rgba(241,245,249,0.6)" }}>
            {`Code With Ahsan · ${title}`}
          </p>
        </div>
      </div>
    </>
  );
}
