"use client";

import { motion, AnimatePresence } from "framer-motion";
import SlideBackground from "../SlideBackground";
import { HACKATHON_TEAMS } from "../../../constants";

interface TeamRollCallSectionProps {
  revealedCount: number;
  onReveal: () => void;
}

export default function TeamRollCallSection({
  revealedCount,
  onReveal: _onReveal,
}: TeamRollCallSectionProps) {
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
          maxWidth: 1000,
          padding: "0 40px",
        }}
      >
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
            fontSize: "clamp(48px, 7vw, 88px)",
            color: "#F0EEFF",
            letterSpacing: "0.06em",
            margin: "0 0 12px 0",
          }}
        >
          Team Roll Call
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontFamily: "var(--font-space-mono, monospace)",
            fontSize: 12,
            color: "rgba(240,238,255,0.4)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: "0 0 40px 0",
          }}
        >
          {revealedCount}/{HACKATHON_TEAMS.length} teams — press Space to reveal next
        </motion.p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 16,
          }}
        >
          {HACKATHON_TEAMS.map((team, i) => (
            <AnimatePresence key={team}>
              {i < revealedCount ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, y: 20 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    boxShadow:
                      i === revealedCount - 1
                        ? [
                            "0 0 0px rgba(0,245,255,0)",
                            "0 0 30px rgba(0,245,255,0.6)",
                            "0 0 0px rgba(0,245,255,0)",
                          ]
                        : "0 0 0px rgba(0,245,255,0)",
                  }}
                  transition={{
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                    boxShadow: { duration: 1, times: [0, 0.5, 1] },
                  }}
                  style={{
                    background: "rgba(108,43,217,0.1)",
                    border:
                      i === revealedCount - 1
                        ? "1px solid rgba(0,245,255,0.5)"
                        : "1px solid rgba(108,43,217,0.3)",
                    borderRadius: 10,
                    padding: "20px 12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-space-mono, monospace)",
                      fontSize: 10,
                      color: "rgba(240,238,255,0.3)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Team {String(i + 1).padStart(2, "0")}
                  </div>
                  <div
                    style={{
                      fontFamily:
                        "var(--font-bebas, 'Bebas Neue', sans-serif)",
                      fontSize: 28,
                      color: "#F0EEFF",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {team}
                  </div>
                </motion.div>
              ) : (
                <div
                  style={{
                    background: "rgba(108,43,217,0.03)",
                    border: "1px solid rgba(108,43,217,0.12)",
                    borderRadius: 10,
                    padding: "20px 12px",
                    height: 88,
                  }}
                />
              )}
            </AnimatePresence>
          ))}
        </div>
      </div>
    </div>
  );
}
