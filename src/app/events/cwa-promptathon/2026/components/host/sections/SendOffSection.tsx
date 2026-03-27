"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import SlideBackground from "../SlideBackground";
import { headingFont } from "../../../constants";

// 17:00 PKT = UTC+5 = 12:00 UTC on March 28 2026
const DEADLINE = new Date("2026-03-28T12:00:00Z");

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

export default function SendOffSection() {
  const [timeLeft, setTimeLeft] = useState<number>(
    DEADLINE.getTime() - Date.now()
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(DEADLINE.getTime() - Date.now());
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const isPast = timeLeft <= 0;

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
          padding: "0 40px",
        }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: headingFont,
            fontSize: "clamp(72px, 14vw, 160px)",
            color: "#F0EEFF",
            letterSpacing: "0.06em",
            margin: "0 0 24px 0",
            lineHeight: 1,
          }}
        >
          Let&apos;s Hack!
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ marginBottom: 12 }}
        >
          <p
            style={{
              fontFamily: "var(--font-space-mono, monospace)",
              fontSize: 13,
              color: "#FFD600",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              margin: "0 0 16px 0",
            }}
          >
            Submission Deadline
          </p>

          {isPast ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                fontFamily: headingFont,
                fontSize: "clamp(48px, 8vw, 96px)",
                color: "#FF4D6A",
                letterSpacing: "0.06em",
              }}
            >
              TIME&apos;S UP!
            </motion.div>
          ) : (
            <div
              style={{
                fontFamily: headingFont,
                fontSize: "clamp(56px, 10vw, 120px)",
                color: "#00F5FF",
                letterSpacing: "0.08em",
                lineHeight: 1,
                textShadow: "0 0 40px rgba(0,245,255,0.3)",
              }}
            >
              {formatCountdown(timeLeft)}
            </div>
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{
            fontFamily: "var(--font-space-mono, monospace)",
            fontSize: 12,
            color: "rgba(240,238,255,0.35)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            margin: "16px 0 0",
          }}
        >
          5:00 PM PKT · March 28, 2026
        </motion.p>
      </div>
    </div>
  );
}
