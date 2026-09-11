"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ControlBar, { SECTION_NAMES } from "./ControlBar";
import SlideChrome from "./SlideChrome";
import { createTimer, isRunning, remainingOf, type TimerState } from "./CountdownTimer";
import type { GateState } from "./CountdownGate";
import KeynoteSection from "./sections/KeynoteSection";
import SponsorsSection from "./sections/SponsorsSection";
import FounderSection from "./sections/FounderSection";
import ProgramsSection from "./sections/ProgramsSection";
import JudgesSection from "./sections/JudgesSection";
import MentorsSection from "./sections/MentorsSection";
import OrganizersSection from "./sections/OrganizersSection";
import PartnerSessionSection from "./sections/PartnerSessionSection";
import TeamRollCallSection from "./sections/TeamRollCallSection";
import ThemesSection from "./sections/ThemesSection";
import JudgingCriteriaSection from "./sections/JudgingCriteriaSection";
import RulesSection from "./sections/RulesSection";
import DisqualificationSection from "./sections/DisqualificationSection";
import PhaseTimerSection from "./sections/PhaseTimerSection";
import SubmissionSection from "./sections/SubmissionSection";
import WinnersSection from "./sections/WinnersSection";
import PerksSection from "./sections/PerksSection";
import WrapUpSection from "./sections/WrapUpSection";
import {
  HACKATHON_TEAMS,
  JUDGES,
  LUNCH_BREAK,
  PHASE_ONE,
  PHASE_TWO,
  PRESENTATION_WINDOW,
  SUBMISSION_WINDOW,
  type DeckPhase,
} from "../../constants";

// Slide indexes. Named because several of them gate Space on a reveal step
// rather than advancing, and a bare number in that switch is unreadable.
const SLIDE_JUDGES = 4;
const SLIDE_ROLLCALL = 8;
const SLIDE_PHASE_ONE = 13;
const SLIDE_LUNCH = 14;
const SLIDE_PHASE_TWO = 15;
const SLIDE_SUBMISSION = 16;
const SLIDE_PRESENTATIONS = 17;
const SLIDE_WINNERS = 18;
const SLIDE_WRAP_UP = 20;
const TOTAL_SLIDES = 21;

const WINNER_PLACEMENTS = 3;

/** Slides that carry a countdown, and the phase whose duration they run on. */
const TIMED_SLIDES: Record<number, DeckPhase> = {
  [SLIDE_PHASE_ONE]: PHASE_ONE,
  [SLIDE_LUNCH]: LUNCH_BREAK,
  [SLIDE_PHASE_TWO]: PHASE_TWO,
  [SLIDE_SUBMISSION]: SUBMISSION_WINDOW,
  [SLIDE_PRESENTATIONS]: PRESENTATION_WINDOW,
};

export default function HostPanel() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Timers live here, not in the slide, so navigating away and back does not
  // reset a clock that is already running in the room.
  const [timers, setTimers] = useState<Record<number, TimerState>>({});

  // Phase 1 opens with a 10-to-1 countdown. Deliberately NOT reset when the
  // slide changes — stepping back to re-check something and returning must not
  // replay the countdown mid-hackathon. R on that slide re-arms it.
  const [phaseOneGate, setPhaseOneGate] = useState<GateState>("idle");

  const timerFor = useCallback(
    (index: number): TimerState => timers[index] ?? createTimer(TIMED_SLIDES[index].minutes),
    [timers]
  );

  const toggleTimer = useCallback((index: number) => {
    const phase = TIMED_SLIDES[index];
    if (!phase) return;
    setTimers((prev) => {
      const current = prev[index] ?? createTimer(phase.minutes);
      const left = remainingOf(current);
      if (isRunning(current)) {
        // Pause: freeze what is left.
        return { ...prev, [index]: { endsAt: null, remainingMs: left } };
      }
      // Start or resume. A finished timer restarts from the top.
      const ms = left > 0 ? left : phase.minutes * 60_000;
      return { ...prev, [index]: { endsAt: Date.now() + ms, remainingMs: ms } };
    });
  }, []);

  const resetTimer = useCallback((index: number) => {
    const phase = TIMED_SLIDES[index];
    if (!phase) return;
    setTimers((prev) => ({ ...prev, [index]: createTimer(phase.minutes) }));
    // R is "reset this slide", so on Phase 1 it re-arms the countdown too.
    if (index === SLIDE_PHASE_ONE) setPhaseOneGate("idle");
  }, []);

  const openPhaseOneGate = useCallback(() => setPhaseOneGate("open"), []);

  const advanceSlide = useCallback(() => {
    setSlideIndex((prev) => Math.min(prev + 1, TOTAL_SLIDES - 1));
  }, []);

  const retreatSlide = useCallback(() => {
    setSlideIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Reset per-slide reveal state when the slide changes. Adjusting state during
  // render (rather than in an effect) avoids a cascading second render pass.
  // https://react.dev/learn/you-might-not-need-an-effect
  const [renderedSlide, setRenderedSlide] = useState(slideIndex);
  if (renderedSlide !== slideIndex) {
    setRenderedSlide(slideIndex);
    setRevealedCount(0);
  }

  const handleAdvance = useCallback(() => {
    switch (slideIndex) {
      case SLIDE_PHASE_ONE:
        // Space arms the countdown, is ignored while it runs, then advances.
        if (phaseOneGate === "idle") setPhaseOneGate("counting");
        else if (phaseOneGate === "open") advanceSlide();
        break;
      case SLIDE_JUDGES:
        if (revealedCount < JUDGES.length) setRevealedCount((c) => c + 1);
        else advanceSlide();
        break;
      case SLIDE_ROLLCALL:
        if (revealedCount < HACKATHON_TEAMS.length) setRevealedCount((c) => c + 1);
        else advanceSlide();
        break;
      case SLIDE_WINNERS:
        if (revealedCount < WINNER_PLACEMENTS)
          setRevealedCount((c) => Math.min(c + 1, WINNER_PLACEMENTS));
        else advanceSlide();
        break;
      default:
        advanceSlide();
        break;
    }
  }, [slideIndex, revealedCount, phaseOneGate, advanceSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") e.preventDefault();

      switch (e.code) {
        case "KeyN":
          advanceSlide();
          break;
        case "KeyP":
          retreatSlide();
          break;
        case "KeyH":
          setControlsVisible((v) => !v);
          break;
        case "KeyF":
          document.documentElement.requestFullscreen?.();
          break;
        case "KeyT":
          toggleTimer(slideIndex);
          break;
        case "KeyR":
          resetTimer(slideIndex);
          break;
        case "ArrowLeft":
          retreatSlide();
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
  }, [advanceSlide, retreatSlide, handleAdvance, toggleTimer, resetTimer, slideIndex]);

  const renderSlide = () => {
    switch (slideIndex) {
      case 0:
        return <KeynoteSection />;
      case 1:
        return <SponsorsSection />;
      case 2:
        return <FounderSection />;
      case 3:
        return <ProgramsSection />;
      case 4:
        return <JudgesSection revealedCount={revealedCount} />;
      case 5:
        return <MentorsSection />;
      case 6:
        return <OrganizersSection />;
      case 7:
        return <PartnerSessionSection />;
      case 8:
        return (
          <TeamRollCallSection
            revealedCount={revealedCount}
            onReveal={() => setRevealedCount((c) => c + 1)}
          />
        );
      case 9:
        return <ThemesSection />;
      case 10:
        return <JudgingCriteriaSection />;
      case 11:
        return <RulesSection />;
      case 12:
        return <DisqualificationSection />;
      case SLIDE_PHASE_ONE:
        return (
          <PhaseTimerSection
            phase={PHASE_ONE}
            timer={timerFor(SLIDE_PHASE_ONE)}
            gate={phaseOneGate}
            gatePrompt="Ready to build?"
            onGateDone={openPhaseOneGate}
          />
        );
      case SLIDE_LUNCH:
        return <PhaseTimerSection phase={LUNCH_BREAK} timer={timerFor(SLIDE_LUNCH)} />;
      case SLIDE_PHASE_TWO:
        return <PhaseTimerSection phase={PHASE_TWO} timer={timerFor(SLIDE_PHASE_TWO)} />;
      case SLIDE_SUBMISSION:
        return <SubmissionSection timer={timerFor(SLIDE_SUBMISSION)} />;
      case SLIDE_PRESENTATIONS:
        return (
          <PhaseTimerSection phase={PRESENTATION_WINDOW} timer={timerFor(SLIDE_PRESENTATIONS)} />
        );
      case SLIDE_WINNERS:
        return (
          <WinnersSection
            revealedCount={revealedCount}
            onReveal={() => setRevealedCount((c) => Math.min(c + 1, WINNER_PLACEMENTS))}
          />
        );
      case 19:
        return <PerksSection />;
      case SLIDE_WRAP_UP:
        return <WrapUpSection />;
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
      {/* Slide indicator — always visible */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 font-mono text-xs tracking-widest"
        style={{
          color: "rgba(240,238,255,0.35)",
          fontFamily: "var(--font-space-mono, monospace)",
        }}
      >
        {slideIndex + 1} / {TOTAL_SLIDES}
      </div>

      {/* Active slide with transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slideIndex}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: "absolute", inset: 0 }}
        >
          {renderSlide()}
        </motion.div>
      </AnimatePresence>

      {/* Logo + community QR — outside AnimatePresence so they never re-animate */}
      <SlideChrome showQr={slideIndex !== SLIDE_WRAP_UP} />

      <ControlBar
        sectionIndex={slideIndex}
        sectionName={SECTION_NAMES[slideIndex]}
        visible={controlsVisible}
        onPrev={retreatSlide}
        onNext={advanceSlide}
      />
    </div>
  );
}
