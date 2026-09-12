"use client";

import { motion } from "framer-motion";
import SlideShell from "../SlideShell";
import { DISQUALIFICATIONS, DISQUALIFICATION_NOTE } from "../../../constants";

export default function DisqualificationSection() {
  return (
    <SlideShell
      eyebrow="Every one of these is a hard rule"
      title="Disqualification"
      maxWidth={1240}
    >
      <div
        style={{
          border: "1px solid rgba(255,59,107,0.35)",
          borderRadius: 12,
          overflow: "hidden",
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "flex",
            background: "rgba(255,59,107,0.16)",
            padding: "12px 26px",
            fontFamily: "var(--font-space-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(240,238,255,0.75)",
          }}
        >
          <div style={{ flex: 1.6 }}>Condition</div>
          <div style={{ flex: 1 }}>Type</div>
        </div>

        {DISQUALIFICATIONS.map((row, i) => (
          <motion.div
            key={row.condition}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.38, delay: 0.08 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "13px 26px",
              borderTop: "1px solid rgba(108,43,217,0.2)",
              background: i % 2 ? "rgba(108,43,217,0.05)" : "transparent",
            }}
          >
            <div
              style={{
                flex: 1.6,
                fontFamily: "Inter, sans-serif",
                fontSize: 15.5,
                color: "#F0EEFF",
                lineHeight: 1.4,
              }}
            >
              {row.condition}
            </div>
            <div
              style={{
                flex: 1,
                fontFamily: "var(--font-space-mono, monospace)",
                fontSize: 12.5,
                color: "#FF8DA6",
                lineHeight: 1.45,
              }}
            >
              {row.type}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.55 }}
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 14.5,
          lineHeight: 1.6,
          color: "rgba(255,141,166,0.9)",
          background: "rgba(255,59,107,0.08)",
          border: "1px solid rgba(255,59,107,0.25)",
          borderRadius: 10,
          padding: "16px 22px",
          margin: "18px 0 0",
          textAlign: "left",
          fontWeight: 500,
        }}
      >
        {DISQUALIFICATION_NOTE}
      </motion.p>
    </SlideShell>
  );
}
