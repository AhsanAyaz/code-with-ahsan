"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SlideBackground from "../SlideBackground";
import { HACKATHON_TWIST } from "../../../constants";

interface TwistRevealSectionProps {
  twistPhase: "idle" | "countdown" | "revealed";
  onStartCountdown: () => void;
  onRevealed: () => void;
}

export default function TwistRevealSection({
  twistPhase,
  onStartCountdown: _onStartCountdown,
  onRevealed,
}: TwistRevealSectionProps) {
  const [count, setCount] = useState(5);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (twistPhase === "countdown") {
      setCount(5);
      intervalRef.current = setInterval(() => {
        setCount((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            onRevealed();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [twistPhase, onRevealed]);

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
      <SlideBackground />
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
        <AnimatePresence mode="wait">
          {twistPhase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5 }}
            >
              <motion.h2
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
                  fontSize: "clamp(48px, 8vw, 100px)",
                  color: "#FFD600",
                  letterSpacing: "0.06em",
                  margin: 0,
                }}
              >
                Ready for the Twist?
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
          )}

          {twistPhase === "countdown" && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={count}
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.5, y: -20 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    display: "block",
                    fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
                    fontSize: "clamp(100px, 20vw, 240px)",
                    color: "#FFD600",
                    letterSpacing: "0.02em",
                    lineHeight: 1,
                    textShadow: "0 0 60px rgba(255,214,0,0.4)",
                  }}
                >
                  {count > 0 ? count : ""}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          )}

          {twistPhase === "revealed" && (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{
                  fontFamily: "var(--font-space-mono, monospace)",
                  fontSize: 12,
                  color: "#FFD600",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  margin: "0 0 16px 0",
                }}
              >
                The Twist
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                style={{
                  fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
                  fontSize: "clamp(40px, 7vw, 80px)",
                  color: "#F0EEFF",
                  letterSpacing: "0.06em",
                  margin: "0 0 20px 0",
                }}
              >
                {HACKATHON_TWIST.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "clamp(14px, 1.6vw, 18px)",
                  color: "rgba(240,238,255,0.75)",
                  lineHeight: 1.65,
                  maxWidth: 700,
                  margin: "0 auto 40px",
                }}
              >
                {HACKATHON_TWIST.description}
              </motion.p>
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  justifyContent: "center",
                }}
              >
                {HACKATHON_TWIST.perThemeExamples.map((ex, i) => (
                  <motion.div
                    key={ex.theme}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 + i * 0.12 }}
                    style={{
                      flex: 1,
                      background: "rgba(255,214,0,0.05)",
                      border: "1px solid rgba(255,214,0,0.2)",
                      borderRadius: 10,
                      padding: "20px 16px",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        fontFamily:
                          "var(--font-bebas, 'Bebas Neue', sans-serif)",
                        fontSize: 16,
                        color: "#FFD600",
                        letterSpacing: "0.06em",
                        marginBottom: 8,
                      }}
                    >
                      {ex.theme}
                    </div>
                    <p
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: "rgba(240,238,255,0.6)",
                        lineHeight: 1.55,
                        margin: 0,
                      }}
                    >
                      {ex.example}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
