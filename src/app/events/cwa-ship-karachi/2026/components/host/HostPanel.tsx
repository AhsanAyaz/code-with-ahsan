"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ControlBar, { SECTION_NAMES } from "./ControlBar";
import SlideChrome from "./SlideChrome";
import { createTimer, isRunning, remainingOf, type TimerState } from "./CountdownTimer";
import { GATE_COUNTDOWN_SECONDS, type GateState } from "./CountdownGate";
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
const SLIDE_PERKS = 19;
const SLIDE_WRAP_UP = 20;
// Derived, never hardcoded: ControlBar disables [N] on SECTION_NAMES.length - 1,
// and a second literal here is what let the two drift apart before.
const TOTAL_SLIDES = SECTION_NAMES.length;

const WINNER_PLACEMENTS = 3;

/**
 * Everything the host would lose to an accidental Cmd+R at hour six. Timers are
 * stored as absolute `endsAt` timestamps, so a clock that kept running (or
 * expired) while the page was closed comes back showing the real time left.
 */
const STORAGE_KEY = "cwa-ship-karachi-2026-host-state";

type PersistedState = {
  slideIndex: number;
  /** Reveal step within the current slide, so a refresh mid-reveal does not
      replay the winners slot-machine and confetti from third place. */
  revealedCount: number;
  timers: Record<number, TimerState>;
  phaseOneGate: GateState;
  countingEndsAt: number | null;
};

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
  // Tracks which slide the reveal state belongs to. Declared up here (rather
  // than next to the reset below) because the rehydration effect has to move it
  // in step with a restored slideIndex, or the reset would wipe the restored
  // revealedCount on the first render after a reload.
  const [renderedSlide, setRenderedSlide] = useState(slideIndex);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Timers live here, not in the slide, so navigating away and back does not
  // reset a clock that is already running in the room.
  const [timers, setTimers] = useState<Record<number, TimerState>>({});

  // Phase 1 opens with a 10-to-1 countdown. Deliberately NOT reset when the
  // slide changes — stepping back to re-check something and returning must not
  // replay the countdown mid-hackathon. R on that slide re-arms it. The
  // countdown itself is an absolute timestamp for the same reason the timers
  // are: the digit is derived from the wall clock, not from a local counter.
  const [phaseOneGate, setPhaseOneGate] = useState<GateState>("idle");
  const [countingEndsAt, setCountingEndsAt] = useState<number | null>(null);

  // Rehydrate after mount, never during render — reading localStorage in the
  // render path would make the server and client markup disagree.
  const [hydrated, setHydrated] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- localStorage is an
     external system and cannot be read during render without a hydration
     mismatch, so this one-shot restore has to happen in a mount effect. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PersistedState>;
        if (typeof saved.slideIndex === "number") {
          setSlideIndex(Math.min(Math.max(0, saved.slideIndex), TOTAL_SLIDES - 1));
        }
        if (typeof saved.revealedCount === "number") {
          setRevealedCount(Math.max(0, saved.revealedCount));
          setRenderedSlide(Math.min(Math.max(0, saved.slideIndex ?? 0), TOTAL_SLIDES - 1));
        }
        if (saved.timers) setTimers(saved.timers);
        if (saved.phaseOneGate) setPhaseOneGate(saved.phaseOneGate);
        if (typeof saved.countingEndsAt === "number") setCountingEndsAt(saved.countingEndsAt);
      }
    } catch {
      // Private windows throw on access — the deck just starts from the top.
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    // Guarded on `hydrated` so the first paint's defaults never overwrite the
    // state we are about to restore.
    if (!hydrated) return;
    try {
      const payload: PersistedState = {
        slideIndex,
        revealedCount,
        timers,
        phaseOneGate,
        countingEndsAt,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage unavailable or full — the deck keeps working in memory.
    }
  }, [hydrated, slideIndex, revealedCount, timers, phaseOneGate, countingEndsAt]);

  const timerFor = useCallback(
    (index: number): TimerState => timers[index] ?? createTimer(TIMED_SLIDES[index]?.minutes ?? 0),
    [timers]
  );

  const toggleTimer = useCallback((index: number) => {
    const phase = TIMED_SLIDES[index];
    if (!phase) return;
    setTimers((prev) => {
      const current = prev[index] ?? createTimer(phase.minutes);
      const left = remainingOf(current);
      // Restart is checked first: a finished timer still carries an `endsAt`,
      // so testing isRunning first would "pause" it at zero and force the host
      // to press T twice to get the restart the hint promises.
      if (left <= 0) {
        const full = phase.minutes * 60_000;
        return { ...prev, [index]: { endsAt: Date.now() + full, remainingMs: full } };
      }
      if (isRunning(current)) {
        // Pause: freeze what is left.
        return { ...prev, [index]: { endsAt: null, remainingMs: left } };
      }
      // Start or resume from where it was paused.
      return { ...prev, [index]: { endsAt: Date.now() + left, remainingMs: left } };
    });
  }, []);

  const resetTimer = useCallback((index: number) => {
    const phase = TIMED_SLIDES[index];
    if (!phase) return;
    setTimers((prev) => ({ ...prev, [index]: createTimer(phase.minutes) }));
    // R is "reset this slide", so on Phase 1 it re-arms the countdown too.
    if (index === SLIDE_PHASE_ONE) {
      setPhaseOneGate("idle");
      setCountingEndsAt(null);
    }
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
  if (renderedSlide !== slideIndex) {
    setRenderedSlide(slideIndex);
    setRevealedCount(0);
  }

  const handleAdvance = useCallback(() => {
    switch (slideIndex) {
      case SLIDE_PHASE_ONE:
        // Space arms the countdown, is ignored while it runs, then advances.
        if (phaseOneGate === "idle") {
          setCountingEndsAt(Date.now() + GATE_COUNTDOWN_SECONDS * 1000);
          setPhaseOneGate("counting");
        } else if (phaseOneGate === "open") advanceSlide();
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
      // Browser chords stay with the browser: Cmd+R must reload, not reset the
      // running timer, and Cmd+T must open a tab, not toggle the clock.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // A held Space used to auto-repeat through the whole winners reveal in
      // under a second.
      if (e.repeat) return;

      // Never swallow keys aimed at a field (the winners admin form, say).
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

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
          // A real toggle, as the control bar advertises. Both calls reject on
          // an untrusted gesture or a redundant request, so both are caught.
          if (document.fullscreenElement) {
            void document.exitFullscreen?.()?.catch(() => {});
          } else {
            void document.documentElement.requestFullscreen?.()?.catch(() => {});
          }
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
            gateEndsAt={countingEndsAt}
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
      case SLIDE_PERKS:
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
