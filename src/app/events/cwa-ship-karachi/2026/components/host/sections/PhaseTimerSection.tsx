"use client";

import { motion } from "framer-motion";
import SlideShell from "../SlideShell";
import CountdownTimer, { type TimerState } from "../CountdownTimer";
import CountdownGate, { type GateState } from "../CountdownGate";
import type { DeckPhase } from "../../../constants";

/**
 * One component behind slides 13, 14, 15 and 17 — the shape is identical, only
 * the copy and the duration change, so they live in constants as DeckPhase.
 */
type Props = {
  phase: DeckPhase;
  timer: TimerState;
  /** When present, a 10-to-1 countdown gates the slide until it reads "open". */
  gate?: GateState;
  gatePrompt?: string;
  onGateDone?: () => void;
};

export default function PhaseTimerSection({
  phase,
  timer,
  gate,
  gatePrompt = "Ready?",
  onGateDone,
}: Props) {
  if (gate && gate !== "open") {
    return <CountdownGate state={gate} prompt={gatePrompt} onDone={onGateDone ?? (() => {})} />;
  }

  return (
    <SlideShell eyebrow={phase.window} title={phase.title} subtitle={phase.blurb} maxWidth={1100}>
      <CountdownTimer state={timer} totalMs={phase.minutes * 60_000} />

      {phase.points.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            marginTop: 40,
          }}
        >
          {phase.points.map((point) => (
            <div
              key={point}
              style={{
                flex: 1,
                maxWidth: 300,
                background: "rgba(108,43,217,0.06)",
                border: "1px solid rgba(108,43,217,0.3)",
                borderRadius: 10,
                padding: "16px 20px",
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                lineHeight: 1.55,
                color: "rgba(240,238,255,0.68)",
                textAlign: "left",
              }}
            >
              {point}
            </div>
          ))}
        </motion.div>
      )}
    </SlideShell>
  );
}
