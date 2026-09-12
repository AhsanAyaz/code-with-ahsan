"use client";

import { motion } from "framer-motion";
import SlideShell from "../SlideShell";
import { JUDGING_CRITERIA, JUDGING_NOTE, JUDGING_TOTAL, headingFont } from "../../../constants";

const AWARDED = JUDGING_CRITERIA.reduce((sum, c) => sum + c.points, 0);

export default function JudgingCriteriaSection() {
  return (
    <SlideShell
      eyebrow="How you'll be scored"
      title="Judging Criteria"
      subtitle={JUDGING_NOTE}
      maxWidth={1240}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
        {JUDGING_CRITERIA.map((criterion, i) => (
          <motion.div
            key={criterion.name}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.08 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
              background: "rgba(108,43,217,0.06)",
              border: "1px solid rgba(108,43,217,0.3)",
              borderRadius: 12,
              padding: "20px 28px",
            }}
          >
            <div style={{ width: 104, flexShrink: 0, textAlign: "center" }}>
              <span
                style={{
                  fontFamily: headingFont,
                  fontSize: 54,
                  color: "#00F5FF",
                  lineHeight: 1,
                  letterSpacing: "0.02em",
                }}
              >
                {criterion.points}
              </span>
              <div
                style={{
                  fontFamily: "var(--font-space-mono, monospace)",
                  fontSize: 9.5,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(0,245,255,0.55)",
                  marginTop: 4,
                }}
              >
                {criterion.points === 1 ? "point" : "points"}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <h3
                style={{
                  fontFamily: headingFont,
                  fontSize: 28,
                  color: "#F0EEFF",
                  letterSpacing: "0.05em",
                  margin: "0 0 6px",
                  lineHeight: 1.15,
                }}
              >
                {criterion.name}
              </h3>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: "rgba(240,238,255,0.62)",
                  margin: 0,
                }}
              >
                {criterion.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div
        style={{
          fontFamily: "var(--font-space-mono, monospace)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: AWARDED === JUDGING_TOTAL ? "rgba(240,238,255,0.4)" : "#FF3B6B",
          marginTop: 20,
        }}
      >
        Total · {AWARDED} / {JUDGING_TOTAL} points
      </div>
    </SlideShell>
  );
}
