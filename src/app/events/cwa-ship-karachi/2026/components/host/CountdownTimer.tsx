"use client";

import { useEffect, useState } from "react";
import { headingFont } from "../../constants";

/**
 * Host-controlled countdown.
 *
 * The authoritative state lives in HostPanel (so it survives navigating away
 * from the slide and back), and is expressed as either an absolute `endsAt`
 * timestamp while running, or a frozen `remainingMs` while paused. This
 * component owns only the tick that re-renders the digits, which keeps the
 * per-second re-render local instead of re-rendering the whole deck.
 */
export type TimerState = {
  /** Wall-clock ms at which the timer hits zero; null while paused. */
  endsAt: number | null;
  /** Frozen remaining ms; meaningful only while paused. */
  remainingMs: number;
};

export const createTimer = (minutes: number): TimerState => ({
  endsAt: null,
  remainingMs: minutes * 60_000,
});

export const isRunning = (t: TimerState) => t.endsAt !== null;

export const remainingOf = (t: TimerState) =>
  t.endsAt === null ? t.remainingMs : Math.max(0, t.endsAt - Date.now());

const two = (n: number) => String(n).padStart(2, "0");

const format = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
};

type Props = {
  state: TimerState;
  totalMs: number;
};

export default function CountdownTimer({ state, totalMs }: Props) {
  const running = isRunning(state);

  // The remaining time is derived from `state` on every render rather than
  // mirrored into state — the interval only nudges React to re-render. Syncing
  // it into state instead would mean a setState in the effect body, which
  // cascades an extra render four times a second.
  const [, setTick] = useState(0);
  const remaining = remainingOf(state);
  const done = remaining <= 0;

  useEffect(() => {
    // Stop ticking once the clock hits zero — otherwise "TIME'S UP" would
    // re-render four times a second for the rest of the event. `done` is read
    // from the render that shows 00:00, so the final tick has already landed.
    if (!running || done) return;
    // 250ms rather than 1000ms so the visible second never lags by up to a
    // full second behind the real clock.
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [running, done]);

  const lowOnTime = !done && remaining <= 5 * 60_000;
  const accent = done ? "#FF3B6B" : lowOnTime ? "#FFD600" : "#00F5FF";
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, 1 - remaining / totalMs)) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div
        style={{
          fontFamily: headingFont,
          fontSize: "clamp(72px, 13vw, 180px)",
          lineHeight: 1,
          letterSpacing: "0.04em",
          color: accent,
          textShadow: `0 0 48px ${accent}55`,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {done ? "TIME'S UP" : format(remaining)}
      </div>

      {/* Elapsed bar */}
      <div
        style={{
          width: "min(560px, 60vw)",
          height: 6,
          borderRadius: 999,
          background: "rgba(108,43,217,0.22)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: accent,
            transition: "width 250ms linear",
          }}
        />
      </div>

      <div
        style={{
          fontFamily: "var(--font-space-mono, monospace)",
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(240,238,255,0.45)",
        }}
      >
        {done
          ? "T: restart · R: reset"
          : running
            ? "Running · T: pause"
            : remaining === totalMs
              ? "T: start timer"
              : "Paused · T: resume · R: reset"}
      </div>
    </div>
  );
}
