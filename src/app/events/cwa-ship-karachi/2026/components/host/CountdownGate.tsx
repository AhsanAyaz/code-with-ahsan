"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { headingFont } from "../../constants";

export type GateState = "idle" | "counting" | "open";

/** Seconds the gate counts down from once it is armed. */
export const GATE_COUNTDOWN_SECONDS = 10;

/**
 * A 10-to-1 countdown that gates a slide's content, the way the old twist
 * reveal did.
 *
 * The digit is derived from an absolute `endsAt` timestamp owned by HostPanel,
 * not from local state — so navigating off the slide mid-countdown and back
 * resumes where the room is, instead of replaying from 10.
 */
const Counting = ({ endsAt, onDone }: { endsAt: number; onDone: () => void }) => {
  const secondsLeft = useCallback(
    () => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
    [endsAt]
  );
  const [count, setCount] = useState(secondsLeft);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setCount(left);
      if (left <= 0) {
        window.clearInterval(id);
        // Fired from the timer callback rather than an effect body or a state
        // updater, so it stays out of React's render path.
        onDone();
      }
    };
    // Sub-second tick so the digit flips on the real second boundary rather
    // than up to a second late after a remount.
    const id = window.setInterval(tick, 200);
    tick();
    return () => window.clearInterval(id);
  }, [endsAt, onDone]);

  return (
    // Fixed-height stage with the digits stacked on top of each other, so the
    // outgoing and incoming digit cross-fade instead of the slot going blank
    // for the length of the exit animation.
    <div
      style={{
        position: "relative",
        height: "clamp(120px, 24vw, 300px)",
      }}
    >
      <AnimatePresence>
        <motion.span
          key={count}
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.5, y: -20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: headingFont,
            fontSize: "clamp(120px, 24vw, 300px)",
            color: "#FFD600",
            letterSpacing: "0.02em",
            lineHeight: 1,
            textShadow: "0 0 70px rgba(255,214,0,0.45)",
          }}
        >
          {count > 0 ? count : ""}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

type Props = {
  state: GateState;
  /** Wall-clock ms the countdown ends at; null until the gate is armed. */
  endsAt?: number | null;
  /** Headline shown before the countdown starts. */
  prompt: string;
  onDone: () => void;
};

export default function CountdownGate({ state, endsAt = null, prompt, onDone }: Props) {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#07020F",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          width: "100%",
          maxWidth: 900,
          padding: "0 40px",
        }}
      >
        {state === "idle" || endsAt === null ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h2
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                fontFamily: headingFont,
                fontSize: "clamp(48px, 8vw, 100px)",
                color: "#FFD600",
                letterSpacing: "0.06em",
                margin: 0,
              }}
            >
              {prompt}
            </motion.h2>
            <p
              style={{
                fontFamily: "var(--font-space-mono, monospace)",
                fontSize: 13,
                color: "rgba(240,238,255,0.4)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginTop: 24,
              }}
            >
              Press Space to begin countdown
            </p>
          </motion.div>
        ) : (
          <Counting endsAt={endsAt} onDone={onDone} />
        )}
      </div>
    </div>
  );
}
