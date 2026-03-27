"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getApp } from "firebase/app";
import confetti from "canvas-confetti";
import SlideBackground from "../SlideBackground";
import type { WinnersData } from "@/types/events";
import { headingFont } from "../../../constants";

const EVENT_ID = "cwa-promptathon-2026";

interface WinnersSectionProps {
  revealedCount: number;
  onReveal: () => void;
}

const MEDAL_COLORS = {
  1: "#FFD600",
  2: "#C0C0C0",
  3: "#CD7F32",
};

const MEDAL_LABELS = {
  1: "1ST PLACE",
  2: "2ND PLACE",
  3: "3RD PLACE",
};

interface PlacementCardProps {
  placement: 1 | 2 | 3;
  teamName: string;
  projectDescription: string;
  judgeQuote: string;
  isFirst?: boolean;
}

function PlacementCard({
  placement,
  teamName,
  projectDescription,
  judgeQuote,
  isFirst,
}: PlacementCardProps) {
  const color = MEDAL_COLORS[placement];
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: "rgba(7,2,15,0.8)",
        border: `1px solid ${color}55`,
        borderRadius: 14,
        padding: isFirst ? "36px 32px" : "24px 20px",
        flex: isFirst ? 1.4 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: isFirst ? `0 0 60px ${color}22` : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-space-mono, monospace)",
            fontSize: isFirst ? 13 : 11,
            color,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {MEDAL_LABELS[placement]}
        </div>
      </div>
      <div
        style={{
          fontFamily: headingFont,
          fontSize: isFirst ? "clamp(32px, 4vw, 52px)" : "clamp(24px, 3vw, 38px)",
          color: "#F0EEFF",
          letterSpacing: "0.05em",
          lineHeight: 1.1,
        }}
      >
        {teamName}
      </div>
      <p
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: isFirst ? 14 : 12,
          color: "rgba(240,238,255,0.7)",
          lineHeight: 1.6,
          margin: 0,
          flex: 1,
        }}
      >
        {projectDescription}
      </p>
      {judgeQuote && (
        <p
          style={{
            fontFamily: "var(--font-space-mono, monospace)",
            fontSize: isFirst ? 12 : 11,
            color: "rgba(240,238,255,0.45)",
            lineHeight: 1.55,
            margin: 0,
            fontStyle: "italic",
          }}
        >
          &ldquo;{judgeQuote}&rdquo;
        </p>
      )}
    </motion.div>
  );
}

export default function WinnersSection({ revealedCount, onReveal: _onReveal }: WinnersSectionProps) {
  const [winners, setWinners] = useState<WinnersData | null>(null);
  const prevRevealedCount = useRef(revealedCount);

  // Firestore real-time listener — only mounted inside this component
  useEffect(() => {
    const db = getFirestore(getApp());
    const unsub = onSnapshot(
      doc(db, "events", EVENT_ID, "winners", "data"),
      (snap) => {
        if (snap.exists()) {
          setWinners(snap.data() as WinnersData);
        }
      }
    );
    return unsub;
  }, []);

  // Fire confetti when 1st place is revealed (revealedCount goes to 3)
  useEffect(() => {
    if (revealedCount === 3 && prevRevealedCount.current < 3) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FFD600", "#6C2BD9", "#00F5FF", "#ffffff"],
      });
      // Second burst for effect
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 90,
          origin: { x: 0.2, y: 0.7 },
          colors: ["#FFD600", "#6C2BD9", "#00F5FF"],
        });
        confetti({
          particleCount: 80,
          spread: 90,
          origin: { x: 0.8, y: 0.7 },
          colors: ["#FFD600", "#6C2BD9", "#00F5FF"],
        });
      }, 300);
    }
    prevRevealedCount.current = revealedCount;
  }, [revealedCount]);

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
          maxWidth: 1100,
          padding: "0 40px",
        }}
      >
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: headingFont,
            fontSize: "clamp(48px, 7vw, 88px)",
            color: "#FFD600",
            letterSpacing: "0.06em",
            margin: "0 0 12px 0",
          }}
        >
          Winners
        </motion.h2>

        {!winners ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              fontFamily: "var(--font-space-mono, monospace)",
              fontSize: 18,
              color: "rgba(240,238,255,0.5)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginTop: 60,
            }}
          >
            Awaiting Winners...
          </motion.div>
        ) : (
          <div>
            <p
              style={{
                fontFamily: "var(--font-space-mono, monospace)",
                fontSize: 12,
                color: "rgba(240,238,255,0.4)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                margin: "0 0 36px 0",
              }}
            >
              {revealedCount < 3
                ? `${revealedCount}/3 revealed — press Space to reveal next`
                : "All winners revealed!"}
            </p>
            <div
              style={{
                display: "flex",
                gap: 20,
                alignItems: "flex-start",
                justifyContent: "center",
              }}
            >
              {/* 2nd place — left */}
              <AnimatePresence>
                {revealedCount >= 2 && (
                  <PlacementCard
                    placement={2}
                    teamName={winners.second.teamName}
                    projectDescription={winners.second.projectDescription}
                    judgeQuote={winners.second.judgeQuote}
                  />
                )}
              </AnimatePresence>

              {/* 1st place — center (larger) */}
              <AnimatePresence>
                {revealedCount >= 3 && (
                  <PlacementCard
                    placement={1}
                    teamName={winners.first.teamName}
                    projectDescription={winners.first.projectDescription}
                    judgeQuote={winners.first.judgeQuote}
                    isFirst
                  />
                )}
              </AnimatePresence>

              {/* 3rd place — right */}
              <AnimatePresence>
                {revealedCount >= 1 && (
                  <PlacementCard
                    placement={3}
                    teamName={winners.third.teamName}
                    projectDescription={winners.third.projectDescription}
                    judgeQuote={winners.third.judgeQuote}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
