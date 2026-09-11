"use client";

import { motion } from "framer-motion";
import SlideShell from "../SlideShell";
import CountdownTimer, { type TimerState } from "../CountdownTimer";
import { EVENT, SUBMISSION_RULES, SUBMISSION_WINDOW, headingFont } from "../../../constants";

type Props = { timer: TimerState };

export default function SubmissionSection({ timer }: Props) {
  return (
    <SlideShell
      eyebrow={SUBMISSION_WINDOW.window}
      title={SUBMISSION_WINDOW.title}
      subtitle={SUBMISSION_WINDOW.blurb}
      maxWidth={1240}
    >
      <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <CountdownTimer state={timer} totalMs={SUBMISSION_WINDOW.minutes * 60_000} />
        </div>

        <motion.ul
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            flex: 1,
            listStyle: "none",
            padding: "26px 30px",
            margin: 0,
            textAlign: "left",
            background: "rgba(108,43,217,0.06)",
            border: "1px solid rgba(108,43,217,0.35)",
            borderRadius: 12,
          }}
        >
          <li
            style={{
              fontFamily: headingFont,
              fontSize: 28,
              color: "#FFD600",
              letterSpacing: "0.06em",
              marginBottom: 16,
            }}
          >
            Submission Rules
          </li>
          {SUBMISSION_RULES.map((rule) => (
            <li
              key={rule.text}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "10px 0",
                borderTop: "1px solid rgba(108,43,217,0.2)",
                fontFamily: "Inter, sans-serif",
                fontSize: 14.5,
                lineHeight: 1.55,
                color: "rgba(240,238,255,0.72)",
              }}
            >
              <span aria-hidden style={{ color: "#00F5FF", flexShrink: 0 }}>
                →
              </span>
              {rule.text}
            </li>
          ))}
        </motion.ul>
      </div>

      <div
        style={{
          fontFamily: "var(--font-space-mono, monospace)",
          fontSize: 12,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(240,238,255,0.42)",
          marginTop: 28,
        }}
      >
        Submit at {EVENT.name} · ask an organiser if you cannot reach the form
      </div>
    </SlideShell>
  );
}
