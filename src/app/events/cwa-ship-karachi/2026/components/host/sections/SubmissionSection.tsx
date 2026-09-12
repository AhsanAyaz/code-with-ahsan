"use client";

import { motion } from "framer-motion";
import SlideShell from "../SlideShell";
import CountdownTimer, { type TimerState } from "../CountdownTimer";
import {
  EVENT,
  SUBMISSION_QR_SRC,
  SUBMISSION_RULES,
  SUBMISSION_WINDOW,
  headingFont,
} from "../../../constants";

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

      {/* The one slide the room has to act on, so the link is the loudest thing
          on it: a QR to scan from a seat, and the URL to type if scanning fails. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          marginTop: 32,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SUBMISSION_QR_SRC}
          alt={`QR code linking to the ${EVENT.name} submission form`}
          width={148}
          height={148}
          style={{
            width: 148,
            height: 148,
            background: "#FFFFFF",
            padding: 10,
            borderRadius: 12,
            flexShrink: 0,
          }}
        />
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontFamily: "var(--font-space-mono, monospace)",
              fontSize: 12,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(240,238,255,0.42)",
              marginBottom: 8,
            }}
          >
            Scan to submit
          </div>
          <div
            style={{
              fontFamily: headingFont,
              fontSize: 34,
              letterSpacing: "0.04em",
              color: "#00F5FF",
              wordBreak: "break-all",
            }}
          >
            {EVENT.submitUrl.replace(/^https:\/\//, "")}
          </div>
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: "rgba(240,238,255,0.5)",
              marginTop: 8,
            }}
          >
            Ask an organiser if you cannot reach the form.
          </div>
        </div>
      </motion.div>
    </SlideShell>
  );
}
