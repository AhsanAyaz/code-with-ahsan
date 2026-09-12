"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getApp } from "firebase/app";
import confetti from "canvas-confetti";
import SlideBackground from "../SlideBackground";
import type { WinnersData, WinnerPlacement } from "@/types/events";
import { headingFont, EVENT, HACKATHON_TEAMS } from "../../../constants";

const EVENT_ID = EVENT.eventId;

interface WinnersSectionProps {
  revealedCount: number;
  onReveal: () => void;
}

type Place = 1 | 2 | 3;

const MEDAL: Record<Place, { color: string; glow: string; label: string; height: number }> = {
  1: { color: "#FFD600", glow: "255,214,0", label: "1st Place", height: 150 },
  2: { color: "#C9D1E8", glow: "201,209,232", label: "2nd Place", height: 104 },
  3: { color: "#E08A4B", glow: "224,138,75", label: "3rd Place", height: 76 },
};

/** Confetti gets bigger as the placements climb. */
const celebrate = (place: Place) => {
  const { color } = MEDAL[place];
  const palette = [color, "#6C2BD9", "#00F5FF", "#ffffff"];

  if (place === 3 || place === 2) {
    confetti({
      particleCount: place === 2 ? 90 : 60,
      spread: place === 2 ? 75 : 60,
      startVelocity: 38,
      origin: { y: 0.65 },
      colors: palette,
    });
    return;
  }

  // First place — a burst, then cannons from both wings.
  confetti({
    particleCount: 160,
    spread: 85,
    startVelocity: 48,
    origin: { y: 0.62 },
    colors: palette,
  });
  window.setTimeout(() => {
    confetti({
      particleCount: 90,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.75 },
      colors: palette,
    });
    confetti({
      particleCount: 90,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.75 },
      colors: palette,
    });
  }, 280);
  window.setTimeout(() => {
    confetti({
      particleCount: 70,
      spread: 110,
      startVelocity: 30,
      origin: { y: 0.5 },
      colors: palette,
    });
  }, 900);
};

/**
 * Slot-machine reveal: the name shuffles through the registered teams before
 * locking onto the winner, so the room gets a beat of suspense per placement.
 * `onSettle` fires when it locks, which is what triggers the confetti — the
 * celebration lands on the name, not on the card appearing.
 */
function ShufflingName({
  finalName,
  fontSize,
  onSettle,
}: {
  finalName: string;
  fontSize: string;
  onSettle: () => void;
}) {
  const [display, setDisplay] = useState(() => HACKATHON_TEAMS[0] ?? finalName);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const pool = HACKATHON_TEAMS.length > 1 ? HACKATHON_TEAMS : [finalName];
    let ticks = 0;
    const id = window.setInterval(() => {
      ticks += 1;
      if (ticks >= 15) {
        window.clearInterval(id);
        setDisplay(finalName);
        setSettled(true);
        onSettle();
        return;
      }
      setDisplay(pool[Math.floor(Math.random() * pool.length)]);
    }, 75);
    return () => window.clearInterval(id);
  }, [finalName, onSettle]);

  return (
    <motion.div
      animate={settled ? { scale: [1.18, 1] } : {}}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        fontFamily: headingFont,
        fontSize,
        color: settled ? "#F0EEFF" : "rgba(240,238,255,0.45)",
        letterSpacing: "0.05em",
        lineHeight: 1.1,
        minHeight: "1.1em",
        maxWidth: "100%",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
      }}
    >
      {display}
    </motion.div>
  );
}

function PodiumColumn({
  place,
  data,
  isLatest,
}: {
  place: Place;
  data: WinnerPlacement;
  isLatest: boolean;
}) {
  const { color, glow, label, height } = MEDAL[place];
  const first = place === 1;
  const handleSettle = useCallback(() => celebrate(place), [place]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "relative",
        width: first ? 380 : 300,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      {/* Spotlight behind the card that just landed */}
      {isLatest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0.5] }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: "50%",
            top: -40,
            transform: "translateX(-50%)",
            width: first ? 520 : 400,
            height: 420,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(${glow},0.22), transparent 68%)`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      {/* Card */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          minWidth: 0,
          flexShrink: 0,
          background: "rgba(7,2,15,0.85)",
          border: `1px solid ${color}66`,
          borderRadius: 14,
          padding: first ? "28px 26px 24px" : "22px 20px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          textAlign: "center",
          boxShadow: `0 0 ${first ? 70 : 40}px rgba(${glow},${first ? 0.28 : 0.16})`,
        }}
      >
        {/* Medal */}
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: first ? 64 : 50,
            height: first ? 64 : 50,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            background: `radial-gradient(circle at 35% 30%, rgba(${glow},0.35), rgba(7,2,15,0.9))`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: headingFont,
            fontSize: first ? 30 : 24,
            color,
            marginTop: -2,
            boxShadow: `0 0 22px rgba(${glow},0.5)`,
          }}
        >
          {place}
        </motion.div>

        <div
          style={{
            fontFamily: "var(--font-space-mono, monospace)",
            fontSize: first ? 11 : 10,
            color,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {label}
        </div>

        <ShufflingName
          finalName={data.teamName}
          fontSize={first ? "clamp(34px, 4vw, 54px)" : "clamp(24px, 3vw, 36px)"}
          onSettle={handleSettle}
        />

        {data.projectDescription && (
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: first ? 14 : 12.5,
              color: "rgba(240,238,255,0.68)",
              lineHeight: 1.55,
              margin: 0,
              maxWidth: "100%",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {data.projectDescription}
          </p>
        )}

        {data.judgeQuote && (
          <p
            style={{
              fontFamily: "var(--font-space-mono, monospace)",
              fontSize: first ? 12 : 11,
              color: `rgba(${glow},0.75)`,
              lineHeight: 1.55,
              margin: 0,
              fontStyle: "italic",
              maxWidth: "100%",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            &ldquo;{data.judgeQuote}&rdquo;
          </p>
        )}
      </div>

      {/* Podium block — rises out of the floor as the card lands */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: "86%",
          marginTop: 14,
          // Shrinks to give the card room on a short viewport; the copy never does.
          flexShrink: 1,
          minHeight: 26,
          borderRadius: "10px 10px 0 0",
          background: `linear-gradient(180deg, rgba(${glow},0.30), rgba(${glow},0.05))`,
          border: `1px solid ${color}44`,
          borderBottom: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontFamily: headingFont,
            fontSize: first ? 84 : 60,
            color: `rgba(${glow},0.22)`,
            lineHeight: 1,
          }}
        >
          {place}
        </span>
      </motion.div>
    </motion.div>
  );
}

export default function WinnersSection({ revealedCount }: WinnersSectionProps) {
  const [winners, setWinners] = useState<WinnersData | null>(null);

  // Firestore real-time listener — only mounted inside this component
  useEffect(() => {
    const db = getFirestore(getApp());
    const unsub = onSnapshot(doc(db, "events", EVENT_ID, "winners", "data"), (snap) => {
      // A partial or hand-edited doc must not crash the winners slide live —
      // only treat it as populated once at least `first` is present.
      if (snap.exists() && snap.data()?.first) {
        setWinners(snap.data() as WinnersData);
      }
    });
    return unsub;
  }, []);

  // Reveal order is 3rd, then 2nd, then 1st — so the podium fills from the
  // outside in and the winner lands last, in the middle and tallest.
  const revealedPlaces: Place[] = [];
  if (revealedCount >= 1) revealedPlaces.push(3);
  if (revealedCount >= 2) revealedPlaces.push(2);
  if (revealedCount >= 3) revealedPlaces.push(1);
  const latest = revealedPlaces[revealedPlaces.length - 1];

  const columnFor = (place: Place) => {
    if (!revealedPlaces.includes(place) || !winners) return null;
    // A hand-edited doc may be missing a placement even though `first` is
    // present — render nothing for that column instead of crashing.
    const data = place === 1 ? winners.first : place === 2 ? winners.second : winners.third;
    if (!data) return null;
    return <PodiumColumn key={place} place={place} data={data} isLatest={latest === place} />;
  };

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
        padding: "44px 40px 76px",
        boxSizing: "border-box",
      }}
    >
      <SlideBackground />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          width: "100%",
          maxWidth: 1300,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: headingFont,
            fontSize: "clamp(42px, 6vw, 76px)",
            color: "#FFD600",
            letterSpacing: "0.06em",
            margin: "0 0 8px 0",
            flexShrink: 0,
            textShadow: "0 0 46px rgba(255,214,0,0.3)",
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
          <>
            <p
              style={{
                fontFamily: "var(--font-space-mono, monospace)",
                fontSize: 12,
                color: "rgba(240,238,255,0.4)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                margin: "0 0 18px 0",
                flexShrink: 0,
              }}
            >
              {revealedCount < 3
                ? `${revealedCount}/3 revealed. Press Space to reveal next`
                : "All winners revealed!"}
            </p>

            {/* Podium: 2nd on the left, 1st in the middle, 3rd on the right */}
            <div
              style={{
                display: "flex",
                gap: 20,
                alignItems: "flex-end",
                justifyContent: "center",
                width: "100%",
                flex: 1,
                minHeight: 0,
              }}
            >
              <AnimatePresence>{columnFor(2)}</AnimatePresence>
              <AnimatePresence>{columnFor(1)}</AnimatePresence>
              <AnimatePresence>{columnFor(3)}</AnimatePresence>
            </div>

            {/* Stage floor the podium blocks sit on */}
            <div
              style={{
                height: 2,
                width: "100%",
                maxWidth: 1120,
                margin: "0 auto",
                flexShrink: 0,
                background:
                  "linear-gradient(90deg, transparent, rgba(108,43,217,0.65), transparent)",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
