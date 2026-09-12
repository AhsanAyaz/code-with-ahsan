"use client";

import { motion } from "framer-motion";
import SlideShell from "../SlideShell";
import { PRIZES, WINNER_PERKS, headingFont } from "../../../constants";

const ROWS: { label: string; key: "prize" | "swag" | "recognition" }[] = [
  { label: "Prize", key: "prize" },
  { label: "Swag", key: "swag" },
  { label: "Recognition", key: "recognition" },
];

export default function PerksSection() {
  return (
    <SlideShell eyebrow="Before you go" title="Prizes, Swag & Certificates" maxWidth={1280}>
      {/* Prize table — one column per placement, so the three read side by side
          the way the published table does. */}
      <div style={{ display: "flex", gap: 18, alignItems: "stretch" }}>
        {PRIZES.map((prize, i) => (
          <motion.div
            key={prize.place}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "rgba(108,43,217,0.07)",
              border: `1px solid ${prize.accent}55`,
              borderTop: `4px solid ${prize.accent}`,
              borderRadius: 12,
              overflow: "hidden",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontFamily: headingFont,
                fontSize: 32,
                color: prize.accent,
                letterSpacing: "0.06em",
                padding: "18px 24px 14px",
              }}
            >
              {prize.place}
            </div>

            {ROWS.map(({ label, key }) => (
              <div
                key={label}
                style={{
                  padding: "14px 24px",
                  borderTop: "1px solid rgba(108,43,217,0.22)",
                  flex: key === "prize" ? 1 : undefined,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-space-mono, monospace)",
                    fontSize: 9.5,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(240,238,255,0.4)",
                    marginBottom: 6,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: key === "prize" ? 16 : 14,
                    fontWeight: key === "prize" ? 600 : 400,
                    lineHeight: 1.5,
                    color: key === "prize" ? "#F0EEFF" : "rgba(240,238,255,0.66)",
                  }}
                >
                  {prize[key]}
                </div>
              </div>
            ))}
          </motion.div>
        ))}
      </div>

      {/* Everyone, not just the podium */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.55 }}
        style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(108,43,217,0.28)" }}
      >
        <div
          style={{
            fontFamily: "var(--font-space-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#00F5FF",
            marginBottom: 16,
          }}
        >
          Everyone who ships
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          {WINNER_PERKS.map((perk) => (
            <div
              key={perk.title}
              style={{
                flex: 1,
                textAlign: "left",
                borderLeft: "2px solid rgba(108,43,217,0.5)",
                padding: "2px 0 2px 16px",
              }}
            >
              <div
                style={{
                  fontFamily: headingFont,
                  fontSize: 22,
                  color: "#F0EEFF",
                  letterSpacing: "0.05em",
                  marginBottom: 5,
                }}
              >
                {perk.title}
              </div>
              <div
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "rgba(240,238,255,0.6)",
                }}
              >
                {perk.description}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </SlideShell>
  );
}
