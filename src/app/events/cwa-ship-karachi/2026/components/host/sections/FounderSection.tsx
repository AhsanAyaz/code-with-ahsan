"use client";

import { motion } from "framer-motion";
import SlideShell from "../SlideShell";
import { COMMUNITY_VISION, FOUNDER, headingFont } from "../../../constants";

export default function FounderSection() {
  return (
    <SlideShell eyebrow="Why we're here" title="Our Vision">
      <div style={{ display: "flex", gap: 44, alignItems: "stretch", textAlign: "left" }}>
        {/* Founder */}
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: 320,
            flexShrink: 0,
            background: "rgba(108,43,217,0.08)",
            border: "1px solid rgba(108,43,217,0.4)",
            borderRadius: 14,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={FOUNDER.avatarUrl}
            alt={FOUNDER.name}
            style={{
              width: 104,
              height: 104,
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid #6C2BD9",
              boxShadow: "0 0 32px rgba(108,43,217,0.45)",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <h3
            style={{
              fontFamily: headingFont,
              fontSize: 30,
              color: "#F0EEFF",
              letterSpacing: "0.05em",
              margin: "18px 0 4px",
            }}
          >
            {FOUNDER.name}
          </h3>
          <div
            style={{
              fontFamily: "var(--font-space-mono, monospace)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#00F5FF",
            }}
          >
            {FOUNDER.title}
          </div>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13.5,
              lineHeight: 1.7,
              color: "rgba(240,238,255,0.66)",
              margin: "18px 0 0",
            }}
          >
            {FOUNDER.bio}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0", width: "100%" }}>
            {FOUNDER.highlights.map((h) => (
              <li
                key={h}
                style={{
                  fontFamily: "var(--font-space-mono, monospace)",
                  fontSize: 11,
                  color: "rgba(240,238,255,0.5)",
                  padding: "6px 0",
                  borderTop: "1px solid rgba(108,43,217,0.25)",
                }}
              >
                {h}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Vision */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {COMMUNITY_VISION.map((point, i) => (
            <motion.div
              key={point}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 + i * 0.11, ease: [0.16, 1, 0.3, 1] }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 22,
                background: "rgba(108,43,217,0.06)",
                border: "1px solid rgba(108,43,217,0.3)",
                borderLeft: "3px solid #6C2BD9",
                borderRadius: 12,
                padding: "20px 28px",
              }}
            >
              <span
                aria-hidden
                style={{
                  fontFamily: "var(--font-space-mono, monospace)",
                  fontSize: 13,
                  color: "#FFD600",
                  letterSpacing: "0.1em",
                  flexShrink: 0,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontFamily: headingFont,
                  fontSize: 30,
                  color: "#F0EEFF",
                  letterSpacing: "0.04em",
                  lineHeight: 1.2,
                }}
              >
                {point}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}
