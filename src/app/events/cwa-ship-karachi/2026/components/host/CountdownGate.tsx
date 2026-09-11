"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { headingFont } from "../../constants";

export type GateState = "idle" | "counting" | "open";

/**
 * A 10-to-1 countdown that gates a slide's content, the way the old twist
 * reveal did.
 *
 * The counting view is only mounted while the state is "counting", so it starts
 * from a clean `from` every time it is armed.
 */
const Counting = ({ from, onDone }: { from: number; onDone: () => void }) => {
  const [count, setCount] = useState(from);
  const remainingRef = useRef(from);

  useEffect(() => {
    const id = window.setInterval(() => {
      remainingRef.current -= 1;
      setCount(remainingRef.current);
      if (remainingRef.current <= 0) {
        window.clearInterval(id);
        // Fired from the timer callback rather than an effect body or a state
        // updater, so it stays out of React's render path.
        onDone();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [onDone]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={count}
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.5, y: -20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: "block",
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
  );
};

type Props = {
  state: GateState;
  /** Seconds to count down from. */
  from?: number;
  /** Headline shown before the countdown starts. */
  prompt: string;
  onDone: () => void;
};

export default function CountdownGate({ state, from = 10, prompt, onDone }: Props) {
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
        {state === "idle" ? (
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
          <Counting from={from} onDone={onDone} />
        )}
      </div>
    </div>
  );
}
