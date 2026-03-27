"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ControlBar, { SECTION_NAMES } from "./ControlBar";
import KeynoteSection from "./sections/KeynoteSection";
import CommunitySection from "./sections/CommunitySection";
import SponsorsSection from "./sections/SponsorsSection";
import JudgesSection from "./sections/JudgesSection";
import MentorsSection from "./sections/MentorsSection";
import TeamRollCallSection from "./sections/TeamRollCallSection";
import ThemesSection from "./sections/ThemesSection";
import TwistRevealSection from "./sections/TwistRevealSection";
import SendOffSection from "./sections/SendOffSection";
import WinnersSection from "./sections/WinnersSection";

// Section indexes
const SECTION_ROLLCALL = 5;
const SECTION_JUDGES = 3;
const SECTION_TWIST = 7;
const SECTION_WINNERS = 9;
const TOTAL_SECTIONS = 10;

export default function HostPanel() {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [twistPhase, setTwistPhase] = useState<"idle" | "countdown" | "revealed">("idle");

  const advanceSection = useCallback(() => {
    setSectionIndex((prev) => {
      const next = Math.min(prev + 1, TOTAL_SECTIONS - 1);
      return next;
    });
  }, []);

  const retreatSection = useCallback(() => {
    setSectionIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Reset per-section state when section changes
  useEffect(() => {
    setRevealedCount(0);
    setTwistPhase("idle");
  }, [sectionIndex]);

  const handleAdvance = useCallback(() => {
    switch (sectionIndex) {
      case SECTION_ROLLCALL:
        if (revealedCount < 10) {
          setRevealedCount((c) => c + 1);
        } else {
          advanceSection();
        }
        break;
      case SECTION_JUDGES:
        if (revealedCount < 4) {
          setRevealedCount((c) => c + 1);
        } else {
          advanceSection();
        }
        break;
      case SECTION_TWIST:
        if (twistPhase === "idle") {
          setTwistPhase("countdown");
        } else if (twistPhase === "revealed") {
          advanceSection();
        }
        // During "countdown" phase — do nothing (let countdown finish)
        break;
      case SECTION_WINNERS:
        if (revealedCount < 3) {
          setRevealedCount((c) => Math.min(c + 1, 3));
        } else {
          advanceSection();
        }
        break;
      default:
        advanceSection();
        break;
    }
  }, [sectionIndex, revealedCount, twistPhase, advanceSection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default space scrolling
      if (e.code === "Space") {
        e.preventDefault();
      }

      switch (e.code) {
        case "KeyN":
          advanceSection();
          break;
        case "KeyP":
          retreatSection();
          break;
        case "KeyH":
          setControlsVisible((v) => !v);
          break;
        case "KeyF":
          document.documentElement.requestFullscreen?.();
          break;
        case "ArrowLeft":
          retreatSection();
          break;
        case "Space":
        case "ArrowRight":
          handleAdvance();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [advanceSection, retreatSection, handleAdvance]);

  const renderSection = () => {
    switch (sectionIndex) {
      case 0:
        return <KeynoteSection />;
      case 1:
        return <CommunitySection />;
      case 2:
        return <SponsorsSection />;
      case 3:
        return <JudgesSection revealedCount={revealedCount} />;
      case 4:
        return <MentorsSection />;
      case 5:
        return (
          <TeamRollCallSection
            revealedCount={revealedCount}
            onReveal={() => setRevealedCount((c) => c + 1)}
          />
        );
      case 6:
        return <ThemesSection />;
      case 7:
        return (
          <TwistRevealSection
            twistPhase={twistPhase}
            onStartCountdown={() => setTwistPhase("countdown")}
            onRevealed={() => setTwistPhase("revealed")}
          />
        );
      case 8:
        return <SendOffSection />;
      case 9:
        return (
          <WinnersSection
            revealedCount={revealedCount}
            onReveal={() => setRevealedCount((c) => Math.min(c + 1, 3))}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#07020F",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Section indicator — always visible */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 font-mono text-xs tracking-widest"
        style={{
          color: "rgba(240,238,255,0.35)",
          fontFamily: "var(--font-space-mono, monospace)",
        }}
      >
        {sectionIndex + 1} / {TOTAL_SECTIONS}
      </div>

      {/* Active section with transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={sectionIndex}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: "absolute", inset: 0 }}
        >
          {renderSection()}
        </motion.div>
      </AnimatePresence>

      {/* Control bar */}
      <ControlBar
        sectionIndex={sectionIndex}
        sectionName={SECTION_NAMES[sectionIndex]}
        visible={controlsVisible}
        onPrev={retreatSection}
        onNext={advanceSection}
      />
    </div>
  );
}
